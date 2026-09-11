#!/usr/bin/env bash
# Runs the Bocado MVP tasks in order through the orchestrator, committing after
# every PASS. Opus is the first-choice model (the owner asked for it after Fable
# ran out); when the account hits its usage limit on Opus the task is relaunched
# on Fable, resuming from the saved brief with fresh agent sessions. A lead session that grew past the context window
# ("Prompt is too long") is also relaunched with fresh sessions.
#
# Usage: apps/bocado/run-queue.sh [first-task-number]
# Env:   RESUME_STATE=runs/<state>.json  resume the first task from that state
#        PRIMARY_MODEL / FALLBACK_MODEL  (default claude-opus-5 / claude-fable-5-1)
set -u
cd "$(dirname "$0")/../.." || exit 1

PROJECT="$HOME/Documents/bocado"
APP_DIR="apps/bocado"
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
  "01-diario-hoje|limpo|yes"
  "02-busca-e-adicao-rapida|manter|yes"
  "03-porcao-e-edicao|manter|yes"
  "04-sugestoes-e-repeticao|manter|yes"
  "05-alimentos-online-e-registro-rapido|manter|yes"
  "06-metas-e-primeiro-uso|limpo|yes"
  # 09-ajustes-do-dono ran between 06 and 07 and is committed (aa721c6); it is
  # off the list so a later `run-queue.sh 7` does not repeat it. Re-add the line
  # to run it again.
  "07-polimento-motion-e-icone|manter|yes"
  "08-qualidade-e-readme|manter|no"
  # Owner adjustments decided by the research in docs/research/05-*: colour,
  # diary row and suggestions first (they share the vertical budget), then the
  # dark theme, then the calendar. Micronutrients are deliberately not here —
  # the research recommends deferring them until the app has been used a month.
  "10-cor-linha-e-sugestoes|manter|yes"
  "11-tema-escuro|manter|yes"
  "12-calendario|manter|yes"
  # Owner's second round, 2026-09-09. Order chosen so the two that share the
  # diary row do not fight each other, and the brand lands before the splash
  # that draws it. 13 reverses decision 9 on purpose — the brief says so.
  "13-macros-na-linha-e-kcal-da-refeicao|manter|yes"
  "14-sugestoes-em-qualquer-dia|manter|yes"
  "15-marca-e-abertura-animada|manter|yes"
  "16-animacao-de-registrar|manter|yes"
  "17-compartilhar-o-dia-e-o-mes|manter|yes"
  # Owner's third round, 2026-09-10, after using the app on the phone. Order:
  # 18 and 19 share the horizontal budget of the meal block (header first, then
  # the row, so the row is measured against a header that will not move); 20 is
  # a data task with one screen and reverses the "no micronutrients" rule on
  # purpose — regras.md carries the owner's amendment; 21 may legitimately end
  # at its discovery document. The design director's verdicts are inside the
  # briefs and are closed.
  "18-cabecalho-da-refeicao|manter|yes"
  "19-macros-em-colunas|manter|yes"
  "20-minerais-do-dia|manter|yes"
  "21-nomes-em-ingles|manter|yes"
  # 22-medidas-caseiras-em-ingles is off the list: the defect it was written
  # for was already fixed by the last cycles of task 21. `entryServingLabel`
  # (src/domain/diary/entryName.ts) matches the stored label against the
  # food's measures in either language and re-reads it in the current one,
  # which is exactly what the brief asked for. Re-add the line only if a case
  # it does not cover turns up.
)

START="${1:-1}"
RESUME_STATE="${RESUME_STATE:-}"

log() { echo "[runner $(date '+%H:%M:%S')] $*"; }

# "ok" when the model answers, "limit" otherwise.
probe() { node "$APP_DIR/probe-model.mjs" "$1" 2>/dev/null | tail -1; }

# Prints a model that answers right now, or nothing when both are at their
# limit. Never assume the fallback is free: the two run out independently.
pick_model() {
  if [ "$(probe "$PRIMARY_MODEL")" = "ok" ]; then
    echo "$PRIMARY_MODEL"
  elif [ "$(probe "$FALLBACK_MODEL")" = "ok" ]; then
    echo "$FALLBACK_MODEL"
  fi
}

# Blocks until one of the two models answers, then prints it.
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

# Writes a copy of a run state with every agent session cleared, so a resume
# starts fresh sessions but keeps the brief, the market research and the last
# feedback. Prints the new path.
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

for entry in "${TASKS[@]}"; do
  IFS='|' read -r name state screen <<<"$entry"
  number=$((10#${name%%-*}))
  if [ "$number" -lt "$START" ]; then continue; fi

  echo
  echo "================================================================"
  echo " task $name  (device: $state, screen: $screen)  $(date '+%Y-%m-%d %H:%M')"
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

    # A task with no screen has no market question either, and the flag may
    # appear only once: repeating it makes the CLI read an array and refuse.
    marketing=full
    [ "$screen" = "yes" ] || marketing=none

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
          # Whichever model ran out, stop and let the probe pick the other one;
          # the two limits renew on their own clocks.
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
    cat "$task_log" | tail -40
    break
  done

  if [ "$status" -ne 0 ]; then
    echo
    echo "Queue stopped at $name (exit $status). Fix or resume, then run: $0 $number" >&2
    exit "$status"
  fi

  git -C "$PROJECT" add -A
  if ! git -C "$PROJECT" diff --cached --quiet; then
    git -C "$PROJECT" commit -q -m "feat: $name

Implemented by orquestrador-features in an unattended run."
    echo "committed $(git -C "$PROJECT" rev-parse --short HEAD) ($name)"
  else
    echo "nothing to commit for $name"
  fi
done

echo
echo "Queue finished: all tasks passed. $(date '+%Y-%m-%d %H:%M')"
