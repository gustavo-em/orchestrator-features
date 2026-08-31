import assert from "node:assert/strict";
import test from "node:test";

import { classifyOutcome } from "../src/preflight.js";

function state(overrides = {}) {
  return {
    finalStatus: "BLOCKED",
    stopReason: "tester_blocked",
    designBrief: { summary: "brief" },
    cycles: [{ implementation: { summary: "implementado", blockers: [] } }],
    ...overrides,
  };
}

test("evidência faltando é motivo para retomar", () => {
  const verdict = classifyOutcome(state());
  assert.equal(verdict.retry, true);
  assert.match(verdict.why, /evid[êe]ncia/i);
});

test("ciclos esgotados com trabalho em andamento retomam", () => {
  assert.equal(
    classifyOutcome(state({ finalStatus: "STOPPED", stopReason: "max_cycles_reached" }))
      .retry,
    true,
  );
});

test("contradição entre tarefa e regras nunca retoma sozinha", () => {
  const verdict = classifyOutcome(
    state({
      stopReason: "feature_lead_implementation_blocked",
      cycles: [
        {
          implementation: {
            summary:
              "Achado 1 contradiz o próprio contrato desta feature: a cor que o contrato proíbe alterar.",
            blockers: [],
          },
        },
      ],
    }),
  );
  assert.equal(verdict.retry, false);
  assert.match(verdict.why, /decis[ãa]o sua/);
});

test("falha de credencial ou cota não retoma", () => {
  const verdict = classifyOutcome(
    state({
      stopReason: "feature_lead_blocked",
      designBrief: {
        summary: "Failed to authenticate: OAuth session expired",
      },
      cycles: [],
    }),
  );
  assert.equal(verdict.retry, false);
  assert.match(verdict.why, /credencial|cota/);
});

test("decisões do loop e plan-only não retomam", () => {
  for (const reason of [
    "not_worth_building",
    "plan_only",
    "no_workspace_progress",
    "repeated_audit_findings",
  ]) {
    assert.equal(
      classifyOutcome(state({ finalStatus: "STOPPED", stopReason: reason })).retry,
      false,
      reason,
    );
  }
});

test("execução aprovada não retoma", () => {
  assert.equal(
    classifyOutcome(state({ finalStatus: "PASS", stopReason: "audit_passed" })).retry,
    false,
  );
});
