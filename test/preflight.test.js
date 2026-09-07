import assert from "node:assert/strict";
import test from "node:test";

import {
  checkProviderAuth,
  classifyOutcome,
  explainAgentError,
} from "../src/preflight.js";
import { mergeMarketLanes } from "../agents/market-analyst.js";

test("erro de autenticação vira dica acionável", () => {
  assert.match(
    explainAgentError(
      "Claude Code returned an error result: Failed to authenticate: OAuth session expired and could not be refreshed",
    ),
    /claude setup-token/,
  );
  assert.match(
    explainAgentError("ERROR: You've hit your usage limit. Upgrade to Pro"),
    /Limite de uso/,
  );
  assert.match(
    explainAgentError("Native CLI binary for linux-arm64 not found"),
    /--omit=optional/,
  );
  assert.equal(explainAgentError("qualquer outra coisa"), "");
});

test("credencial é reconhecida por variável de ambiente", () => {
  assert.equal(
    checkProviderAuth("claude", { CLAUDE_CODE_OAUTH_TOKEN: "x" }).ok,
    true,
  );
  assert.equal(checkProviderAuth("claude", { ANTHROPIC_API_KEY: "x" }).ok, true);
  assert.equal(checkProviderAuth("codex", { OPENAI_API_KEY: "x" }).ok, true);
});

test("lote de mercado sem sucesso mostra o motivo real", () => {
  const merged = mergeMarketLanes([
    {
      status: "BLOCKED",
      lane: "abandono",
      summary: "Failed to authenticate: OAuth session expired",
      signals: [],
    },
  ]);

  assert.equal(merged.status, "BLOCKED");
  assert.match(merged.summary, /OAuth session expired/);
});

test("limite de uso renovável espera e retenta; credencial não", () => {
  const rateLimited = classifyOutcome({
    finalStatus: "BLOCKED",
    stopReason: "feature_lead_blocked",
    designBrief: { summary: "429 rate limit exceeded, retry later" },
    cycles: [],
  });
  assert.equal(rateLimited.retry, true);
  assert.equal(rateLimited.waitMs, 20 * 60_000);

  const badAuth = classifyOutcome({
    finalStatus: "BLOCKED",
    stopReason: "feature_lead_blocked",
    designBrief: { summary: "Failed to authenticate: OAuth session expired" },
    cycles: [],
  });
  assert.equal(badAuth.retry, false);
});
