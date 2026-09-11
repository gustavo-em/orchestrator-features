#!/usr/bin/env bash
# Runs the Aluza (ideias-organize-task) bug queue in order through the
# orchestrator, committing after every PASS. Opus is the first choice; when the
# account hits its limit the task is relaunched on Fable, resuming from the
# saved brief with fresh agent sessions. A lead session that grew past the
# context window ("Prompt is too long") is also relaunched with fresh sessions.
#
# The six tasks came from the owner testing the released app with a second
# person on 2026-09-10. Order: the data-loss bug first (groups never reach the
# other person), then navigation, then the two invite paths, then the
# permission change, then the creation sheets. The web page task runs without
# the device — it is a Cloud Function and the marketing site.
#
# Usage: apps/ideias-organize-task/run-queue.sh [first-task-number]
# Env:   RESUME_STATE=runs/<state>.json  resume the first task from that state
#        PRIMARY_MODEL / FALLBACK_MODEL  (default claude-opus-5 / claude-fable-5-1)
set -u
cd "$(dirname "$0")/../.." || exit 1

PROJECT="$HOME/Documents/ideias-organize-task"
APP_DIR="apps/ideias-organize-task"
LOG_DIR="$APP_DIR/logs"
mkdir -p "$LOG_DIR"

PRIMARY_MODEL="${PRIMARY_MODEL:-claude-opus-5}"
FALLBACK_MODEL="${FALLBACK_MODEL:-claude-fable-5-1}"
DESIGN_REASONING="${DESIGN_REASONING:-max}"
CODE_REASONING="${CODE_REASONING:-max}"
RETRIES="${RETRIES:-3}"
WAIT_MIN="${WAIT_MIN:-45}"
AGENT_TIMEOUT="${AGENT_TIMEOUT:-25}"
POLL_SECONDS=20

# name | device state | screen test
TASKS=(
  "grupos-compartilhados-sync|manter|yes"
  "aba-espacos-volta|manter|yes"
  "convite-com-app-instalado|manter|yes"
  "convite-web-lojas|manter|no"
  "atribuir-qualquer-membro|manter|yes"
  "criar-grupo-em-branco|manter|yes"
)

START="${1:-1}"
RESUME_STATE="${RESUME_STATE:-}"

log() { echo "[runner $(date '+%H:%M:%S')] $*"; }

probe() { node "$APP_DIR/probe-model.mjs" "$1" 2>/dev/null | tail -1; }

pick_model() {
  if [ "$(probe "$PRIMARY_MODEL")" = "ok" ]; then
    echo "$PRIMARY_MODEL"
  elif [ "$(probe "$FALLBACK_MODEL")" = "ok" ]; then
    echo "$FALLBACK_MODEL"
  fi
}

wait_for_model() {
  while :; do
    local choice
    choice="$(pick_model)"
    if [ -n "$choice" ]; then
      echo "$choice"
      return
    fi
    log "os dois modelos estao no limite; nova checagem em 5 min" >&2
    sleep 300
  done
}

fresh_sessions() {
  node -e '
    const fs = require("fs");
    const [src] = process.argv.slice(1);
    const state = JSON.parse(fs.readFileSync(src, "utf8"));
    const cleared = Object.fromEntries(Object.keys(state.sessionIds ?? {}).map((k) => [k, null]));
    state.sessionIds = cleared;
    state.threadIds = cleared;
    const out = src.replace(/\.json$/, `-fresh-${Date.now()}.json`);
    fs.writeFileSync(out, JSON.stringify(state, null, 2));
    console.log(out);
  ' "$1"
}

latest_state_in() { grep -o "runs/[^ ]*\.json" "$1" | grep -v -- "-fresh-" | tail -1; }

if [ -z "$RESUME_STATE" ] && [ -n "$(git -C "$PROJECT" status --porcelain)" ]; then
  echo "The project has uncommitted changes; commit or stash before running the queue (or pass RESUME_STATE)." >&2
  exit 1
fi

index=0
for entry in "${TASKS[@]}"; do
  IFS='|' read -r name state screen <<<"$entry"
  index=$((index + 1))
  if [ "$index" -lt "$START" ]; then continue; fi

  echo
  echo "================================================================"
  echo " task $index/$((${#TASKS[@]})) $name  (device: $state, screen: $screen)  $(date '+%Y-%m-%d %H:%M')"
  echo "================================================================"

  attempt=0
  resume="$RESUME_STATE"
  RESUME_STATE=""
  status=""

  while :; do
    attempt=$((attempt + 1))
    model="$(wait_for_model)"
    log "attempt $attempt on $model${resume:+ (resume $resume)}"
    task_log="$LOG_DIR/$name.$attempt.log"

    marketing=none

    args=(
      --project "$PROJECT"
      --provider claude
      --profile deep
      --model "$model"
      --design-reasoning "$DESIGN_REASONING"
      --code-reasoning "$CODE_REASONING"
      --retries "$RETRIES"
      --wait "$WAIT_MIN"
      --agent-timeout "$AGENT_TIMEOUT"
      --skip-service-check
      --marketing-mode "$marketing"
    )
    if [ -n "$resume" ]; then
      args+=(--resume "$resume")
    else
      args+=(--task-file "$name")
    fi
    if [ "$screen" = "yes" ]; then
      args+=(--adb-steps "$APP_DIR/adb/$name.json" --device-state "$state")
    else
      args+=(--no-screen-test)
    fi

    node src/cli.js "${args[@]}" >"$task_log" 2>&1 &
    cli_pid=$!
    seen=0
    restart=""

    while kill -0 "$cli_pid" 2>/dev/null; do
      sleep "$POLL_SECONDS"
      total=$(wc -l <"$task_log" | tr -d ' ')
      if [ "$total" -gt "$seen" ]; then
        fresh_lines=$(sed -n "$((seen + 1)),${total}p" "$task_log")
        seen=$total
        if grep -q "Prompt is too long" <<<"$fresh_lines"; then
          restart="context"
        elif grep -qi "session limit\|usage limit\|hit your .*limit" <<<"$fresh_lines"; then
          restart="limit"
        fi
        if [ -n "$restart" ]; then
          log "restart needed ($restart); stopping attempt $attempt"
          kill "$cli_pid" 2>/dev/null
          wait "$cli_pid" 2>/dev/null
          break
        fi
      fi
    done

    if [ -n "$restart" ]; then
      last_state="$(latest_state_in "$task_log")"
      if [ -n "$last_state" ] && [ -f "$last_state" ]; then
        resume="$(fresh_sessions "$last_state")"
      elif [ -n "$resume" ] && [ -f "$resume" ]; then
        resume="$(fresh_sessions "$resume")"
      else
        resume=""
      fi
      sleep 5
      continue
    fi

    wait "$cli_pid"; status=$?
    tail -40 "$task_log"
    break
  done

  if [ "$status" -ne 0 ]; then
    echo
    echo "Queue stopped at $name (exit $status). Fix or resume, then run: $0 $index" >&2
    exit "$status"
  fi

  git -C "$PROJECT" add -A
  if ! git -C "$PROJECT" diff --cached --quiet; then
    git -C "$PROJECT" commit -q -m "fix: $name

Implemented by orquestrador-features in an unattended run."
    echo "committed $(git -C "$PROJECT" rev-parse --short HEAD) ($name)"
  else
    echo "nothing to commit for $name"
  fi
done

echo
echo "Queue finished: all tasks passed. $(date '+%Y-%m-%d %H:%M')"
