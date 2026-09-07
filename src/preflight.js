import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const HINTS = [
  {
    pattern: /OAuth session expired|Failed to authenticate|invalid_api_key|401/i,
    provider: "claude",
    hint:
      "Sessão do Claude Code sem credencial válida para o SDK. Rode `claude setup-token` e " +
      "exporte o token como CLAUDE_CODE_OAUTH_TOKEN, ou exporte ANTHROPIC_API_KEY.",
  },
  {
    pattern: /usage limit|quota|rate.?limit|429/i,
    hint:
      "Limite de uso do provedor atingido. Espere a renovação, compre créditos ou rode com " +
      "`--provider` no outro provedor.",
  },
  {
    pattern: /Native CLI binary for .* not found/i,
    provider: "claude",
    hint:
      "Binário nativo do SDK ausente. Reinstale sem --omit=optional: `npm install @anthropic-ai/claude-agent-sdk`.",
  },
  {
    pattern: /AuthRequired|www_authenticate/i,
    hint:
      "Um MCP server exigiu autenticação. As execuções internas já desligam MCP; se persistir, " +
      "confira `~/.codex/config.toml`.",
  },
  {
    pattern: /ECONNREFUSED|ENOTFOUND|network/i,
    hint: "Falha de rede ao falar com o provedor. Verifique a conexão e tente de novo.",
  },
];

export function explainAgentError(message) {
  const text = String(message ?? "");
  return HINTS.find((entry) => entry.pattern.test(text))?.hint ?? "";
}

export function checkProviderAuth(provider, environment = process.env) {
  if (provider === "claude") {
    if (environment.ANTHROPIC_API_KEY || environment.CLAUDE_CODE_OAUTH_TOKEN) {
      return { ok: true, source: "variável de ambiente" };
    }
    const credentials = path.join(os.homedir(), ".claude", ".credentials.json");
    if (existsSync(credentials)) return { ok: true, source: "~/.claude/.credentials.json" };
    return {
      ok: false,
      hint:
        "Nenhuma credencial visível para o SDK do Claude: sem ANTHROPIC_API_KEY, sem " +
        "CLAUDE_CODE_OAUTH_TOKEN e sem ~/.claude/.credentials.json. Rode `claude setup-token` " +
        "e exporte CLAUDE_CODE_OAUTH_TOKEN antes de executar. (Se você usa o Keychain do macOS, " +
        "a execução ainda pode funcionar; isto é só um aviso.)",
    };
  }

  if (environment.OPENAI_API_KEY) return { ok: true, source: "OPENAI_API_KEY" };
  const auth = path.join(os.homedir(), ".codex", "auth.json");
  if (existsSync(auth)) return { ok: true, source: "~/.codex/auth.json" };
  return {
    ok: false,
    hint: "Nenhuma credencial do Codex encontrada. Rode `codex login` antes de executar.",
  };
}

const RETRYABLE_REASONS = new Set([
  "tester_blocked",
  "auditor_blocked",
  "code_review_blocked",
  "design_evidence_unavailable",
  "screen_evidence_infra_unavailable",
]);

const NEVER_RETRY_REASONS = new Set([
  "not_worth_building",
  "plan_only",
  "no_workspace_progress",
  "repeated_code_findings",
  "repeated_test_findings",
  "repeated_audit_findings",
]);

const CONTRADICTION_PATTERN =
  /contradiz|contradi[çc][ãa]o|conflita|incompat[íi]vel com o contrato|proíbe|proibe/i;

const RATE_LIMIT_PATTERN =
  /usage limit|session limit|hit your .*limit|resets \d|quota|rate.?limit|429|overloaded|529/i;

export function isRateLimited(text) {
  return RATE_LIMIT_PATTERN.test(String(text ?? ""));
}
const AUTH_PATTERN =
  /OAuth session expired|Failed to authenticate|invalid_api_key|401/i;

export function classifyOutcome(state) {
  const reason = state?.stopReason ?? "";
  const messages = [
    state?.designBrief?.summary,
    state?.cycles?.at(-1)?.implementation?.summary,
    ...(state?.cycles?.at(-1)?.implementation?.blockers ?? []),
  ]
    .filter(Boolean)
    .join(" ");

  if (state?.finalStatus === "PASS") {
    return { retry: false, why: "concluído" };
  }
  if (reason === "token_budget_exhausted") {
    return {
      retry: false,
      why: "teto de tokens do run atingido; retome manualmente para gastar mais",
    };
  }
  if (NEVER_RETRY_REASONS.has(reason)) {
    return { retry: false, why: "decisão do loop, repetir não muda nada" };
  }
  if (CONTRADICTION_PATTERN.test(messages)) {
    return {
      retry: false,
      why: "o agente apontou contradição entre a tarefa e as regras; isso precisa de decisão sua",
    };
  }
  if (AUTH_PATTERN.test(messages)) {
    return { retry: false, why: "falha de credencial; repetir não resolve" };
  }
  // Limite de uso renova sozinho: vale esperar e retomar, ao contrário de
  // credencial quebrada.
  if (RATE_LIMIT_PATTERN.test(messages)) {
    return {
      retry: true,
      waitMs: 20 * 60_000,
      why: "limite de uso do provedor; esperando a renovação antes de retomar",
    };
  }
  if (explainAgentError(messages)) {
    return { retry: false, why: "falha de credencial ou de cota; repetir não resolve" };
  }
  if (RETRYABLE_REASONS.has(reason)) {
    return { retry: true, why: "faltou evidência da tela; vale capturar de novo" };
  }
  if (reason === "max_cycles_reached") {
    return { retry: true, why: "acabaram os ciclos com trabalho em andamento" };
  }
  return { retry: false, why: "motivo não reconhecido como recuperável" };
}
