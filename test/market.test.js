import assert from "node:assert/strict";
import test from "node:test";

import {
  marketAnalyst,
  marketLanes,
  mergeMarketLanes,
} from "../agents/market-analyst.js";
import { compactMarketEvidence } from "../agents/feature-lead.js";
import { runMarketLanes } from "../src/runtime-common.js";
import { createPrinter } from "../src/ui.js";

function lane(id, overrides = {}) {
  return {
    status: "COMPLETE",
    lane: id,
    summary: `resumo ${id}`,
    signals: [],
    opportunities: [],
    risks: [],
    featureContext: [],
    ...overrides,
  };
}

test("prompt de faixa pede motivo do usuário, não comparação de features", () => {
  const prompt = marketAnalyst.buildLanePrompt({
    lane: marketLanes[0],
    task: "Melhorar constância",
    acceptanceCriteria: "Usuário volta no dia seguinte",
    appContext: { appName: "App" },
    competitors: ["Concorrente"],
  });

  assert.match(prompt, /Comparação de features não é o entregável/);
  assert.match(prompt, /citação curta e literal/);
  assert.match(prompt, /Reddit/);
  assert.match(prompt, /amostra enviesada/);
  assert.match(prompt, /desinstalei/);
});

test("faixas rodam em paralelo e uma falha não derruba as outras", async () => {
  const started = [];
  let running = 0;
  let peak = 0;

  const merged = await runMarketLanes({
    lanes: marketLanes,
    runLane: async ({ id }) => {
      started.push(id);
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      if (id === "monetizacao") throw new Error("sem rede");
      return lane(id, {
        signals: [
          {
            quote: `citação ${id}`,
            meaning: "significado",
            app: "Concorrente",
            source: "https://exemplo",
            accessedAt: "2026-08-31",
            strength: id === "abandono" ? "recorrente" : "isolado",
          },
        ],
        opportunities: ["oportunidade comum"],
      });
    },
  });

  assert.equal(started.length, 3);
  assert.equal(peak, 3);
  assert.equal(merged.status, "COMPLETE");
  assert.equal(merged.signals.length, 2);
  assert.equal(merged.signals[0].strength, "recorrente");
  assert.deepEqual(merged.opportunities, ["oportunidade comum"]);
  assert.equal(
    merged.lanes.find((item) => item.lane === "monetizacao").status,
    "BLOCKED",
  );
});

test("merge trunca citação longa e some com duplicata", () => {
  const long = "x".repeat(400);
  const signal = {
    quote: long,
    meaning: "m",
    app: "A",
    source: "u",
    accessedAt: "2026-08-31",
    strength: "isolado",
  };
  const merged = mergeMarketLanes([
    lane("abandono", { signals: [signal] }),
    lane("adocao", { signals: [signal] }),
  ]);

  assert.equal(merged.signals.length, 1);
  assert.equal(merged.signals[0].quote.length, 200);
});

test("handoff leva citações mas nunca o catálogo bruto", () => {
  const compact = compactMarketEvidence({
    status: "COMPLETE",
    summary: "resumo",
    competitors: [{ name: "não deve chegar" }],
    signals: Array.from({ length: 10 }, (_, index) => ({
      quote: `citação ${index}`,
      meaning: "significado",
      app: "App",
      source: "https://exemplo",
      strength: "recorrente",
    })),
    opportunities: [],
    risks: [],
    featureContext: [],
  });

  assert.equal("competitors" in compact, false);
  assert.equal(compact.signals.length, 6);
  assert.equal("source" in compact.signals[0], false);
});

test("terminal identifica cada agente e não repete o mesmo detalhe", () => {
  const lines = [];
  const print = createPrinter({ batch: true, log: (line) => lines.push(line) });

  print({ type: "task.started", slug: "onboarding", branch: "orq/onboarding-1" });
  print({
    type: "agent.progress",
    slug: "onboarding",
    agent: "feature_lead",
    kind: "activity",
    detail: "editando App.tsx",
    elapsedSeconds: 12,
  });
  print({
    type: "agent.progress",
    slug: "onboarding",
    agent: "feature_lead",
    kind: "activity",
    detail: "editando App.tsx",
    elapsedSeconds: 14,
  });
  print({
    type: "audit.completed",
    slug: "onboarding",
    result: {
      status: "CHANGES_REQUIRED",
      summary: "Faltou contraste",
      findings: [
        { priority: "high", title: "Texto ilegível", recommendation: "Subir contraste" },
      ],
    },
  });

  assert.equal(lines.length, 4);
  assert.match(lines[1], /lead\s+editando App\.tsx 12s/);
  assert.match(lines[2], /ux\s+CHANGES_REQUIRED Faltou contraste/);
  assert.match(lines[3], /\[high\] Texto ilegível/);
});
