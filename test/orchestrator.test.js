import assert from "node:assert/strict";
import test from "node:test";

import { buildImplementationContract } from "../agents/feature-lead.js";
import { runFeatureLoop } from "../src/orchestrator.js";

class MemoryStore {
  constructor() {
    this.states = [];
  }
  async save(state) {
    this.states.push(structuredClone(state));
  }
}

function brief(overrides = {}) {
  return {
    status: "READY",
    summary: "Brief pronto",
    classification: "meaningful",
    route: ["mobile-design"],
    routeSummary: "mobile-design → implementação → UX audit",
    userGoal: "Concluir tarefa facilmente",
    behaviorDecisions: [],
    visualDirection: [],
    implementationPlan: ["Implementar feature"],
    implementationConstraints: ["Preservar padrões existentes"],
    outOfScope: ["Refactors não relacionados"],
    acceptanceChecks: ["Fluxo funciona"],
    requiresScreenTest: false,
    requiresDesignCheck: false,
    requiresUxAudit: true,
    requiresCodeReview: false,
    blockers: [],
    ...overrides,
  };
}

function executorResult(summary = "Implementado") {
  return {
    status: "FINISHED",
    summary,
    changes: ["Feature alterada"],
    tests: ["Testes executados"],
    blockers: [],
  };
}

function review(status, { title = "Ajustar estado vazio", redesign = false } = {}) {
  return {
    status,
    summary: status === "PASS" ? "Aprovado" : "Correções necessárias",
    requiresRedesign: redesign,
    findings:
      status === "CHANGES_REQUIRED"
        ? [{
            priority: "high",
            title,
            evidence: "Estado vazio ausente.",
            recommendation: "Adicionar estado vazio.",
          }]
        : [],
    checksPerformed: ["Fluxo principal"],
  };
}

function testerResult(status) {
  return {
    status,
    summary: status === "PASS" ? "Tela ok" : "Falha visual",
    findings:
      status === "FAIL"
        ? [{
            priority: "high",
            title: "CTA cortado",
            evidence: "Screenshot mostra CTA fora da safe area.",
            recommendation: "Corrigir safe area.",
          }]
        : [],
    observations: [],
  };
}

function designReview(status, { redesign = false } = {}) {
  return {
    status,
    summary: status === "PASS" ? "Design aprovado" : "Design precisa ajuste",
    requiresRedesign: redesign,
    findings:
      status === "CHANGES_REQUIRED"
        ? [{
            priority: "medium",
            title: "Motion inconsistente",
            evidence: "Splash diverge do brief.",
            recommendation: "Aplicar timing de 450ms definido no brief.",
          }]
        : [],
    checksPerformed: ["Fidelidade ao brief"],
  };
}

function marketAnalysis() {
  return {
    status: "COMPLETE",
    summary: "Mercado analisado",
    competitors: [],
    opportunities: ["Comunicar simplicidade"],
    risks: [],
    featureContext: ["Evitar sobrecarga"],
    accessedAt: "2026-08-31",
  };
}

function fakeRuntime({
  designs = [brief()],
  executors = [executorResult()],
  audits = [],
  testers = [],
  codeReviews = [],
  markets = [],
  continuations = [],
} = {}) {
  return {
    designerIndex: 0,
    executorIndex: 0,
    auditIndex: 0,
    testerIndex: 0,
    codeReviewIndex: 0,
    marketIndex: 0,
    continuationIndex: 0,
    planningContexts: [],
    executorContexts: [],
    auditContexts: [],
    codeReviewContexts: [],
    async planFeature(context) {
      this.planningContexts.push(context);
      return designs[this.designerIndex++];
    },
    async implementFeature(context) {
      this.executorContexts.push(context);
      return executors[this.executorIndex++];
    },
    async continueFeatureLead(context) {
      this.executorContexts.push({ ...context, continuation: true });
      return continuations[this.continuationIndex++];
    },
    async runAudit(context) {
      this.auditContexts.push(context);
      return audits[this.auditIndex++];
    },
    async runTester() {
      return testers[this.testerIndex++];
    },
    async runCodeReview(context) {
      this.codeReviewContexts.push(context);
      return codeReviews[this.codeReviewIndex++];
    },
    async runMarketAnalysis() {
      return markets[this.marketIndex++];
    },
    getThreadIds() {
      return {
        feature_lead: "lead-1",
        code_reviewer: "code-review-1",
        market_analyst: "market-1",
        tester: "tester-1",
        ux_auditor: "auditor-1",
      };
    },
    getReasoningProfile() {
      return { design: "high", code: "low" };
    },
  };
}

test("timeout da implementação continua na mesma thread do feature_lead", async () => {
  const timeout = new Error("feature_lead excedeu timeout de 30 min.");
  timeout.code = "AGENT_TIMEOUT";
  const runtime = fakeRuntime({
    continuations: [executorResult("Concluído na continuação")],
    audits: [review("PASS")],
  });
  runtime.implementFeature = async function implementFeature(context) {
    this.executorContexts.push(context);
    throw timeout;
  };

  const result = await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
  });

  assert.equal(result.finalStatus, "PASS");
  assert.equal(runtime.continuationIndex, 1);
  assert.equal(runtime.executorContexts[1].continuation, true);
});

test("timeout do planejamento emite brief na mesma thread", async () => {
  const timeout = new Error("feature_lead excedeu timeout de 10 min.");
  timeout.code = "AGENT_TIMEOUT";
  const runtime = fakeRuntime({ audits: [review("PASS")] });
  runtime.planFeature = async () => {
    throw timeout;
  };
  runtime.continueFeaturePlanning = async () => brief();

  const result = await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
  });

  assert.equal(result.finalStatus, "PASS");
  assert.equal(runtime.executorIndex, 1);
});

const screenDriver = {
  async collectEvidence() {
    return { screenshots: [], uiNodes: [], errors: "" };
  },
};

const base = {
  projectPath: "/tmp/app",
  task: "Criar feature",
  acceptanceCriteria: "Funcionar e ser acessível",
  collectDiff: async () => null,
};

test("feature_lead planeja, implementa na mesma sessão e UX aprova", async () => {
  const runtime = fakeRuntime({ audits: [review("PASS")] });
  const store = new MemoryStore();
  const result = await runFeatureLoop({
    ...base,
    runtime,
    stateStore: store,
    fingerprint: async () => "a",
  });

  assert.equal(result.finalStatus, "PASS");
  assert.equal(runtime.designerIndex, 1);
  assert.equal(runtime.executorIndex, 1);
  assert.equal(runtime.auditIndex, 1);
  assert.ok(
    store.states.some((state) => state.activeAgent?.name === "feature_lead"),
  );
  assert.equal(result.architecture, "persistent_feature_lead_multi_provider");
  assert.equal(result.provider, "codex");
  assert.deepEqual(result.reasoningProfile, { design: "high", code: "low" });
  assert.equal(store.states.at(-1).activeAgent, null);
});

test("feedback UX volta ao mesmo feature_lead", async () => {
  const runtime = fakeRuntime({
    executors: [executorResult("v1"), executorResult("v2")],
    audits: [review("CHANGES_REQUIRED"), review("PASS")],
  });
  const fingerprints = ["a", "b", "c"];
  const result = await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => fingerprints.shift(),
  });

  assert.equal(result.finalStatus, "PASS");
  assert.match(runtime.executorContexts[1].feedback, /Adicionar estado vazio/);
  assert.equal(runtime.designerIndex, 1);
});

test("achado material revisa brief antes do próximo dev", async () => {
  const revised = brief({ summary: "Brief revisado" });
  const runtime = fakeRuntime({
    designs: [brief(), revised],
    executors: [executorResult("v1"), executorResult("v2")],
    audits: [review("CHANGES_REQUIRED", { redesign: true }), review("PASS")],
  });
  const fingerprints = ["a", "b", "c"];
  const result = await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => fingerprints.shift(),
  });

  assert.equal(result.finalStatus, "PASS");
  assert.equal(runtime.designerIndex, 2);
  assert.deepEqual(runtime.executorContexts[1].designBrief, revised);
});

test("feature_lead bloqueado no planejamento impede implementação", async () => {
  const runtime = fakeRuntime({
    designs: [{ status: "BLOCKED", summary: "Nome exige decisão", blockers: ["Escolher nome"] }],
    executors: [],
  });
  const result = await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
  });

  assert.equal(result.finalStatus, "BLOCKED");
  assert.equal(result.stopReason, "feature_lead_blocked");
  assert.equal(runtime.executorIndex, 0);
});

test("tester falho volta ao dev antes das revisões", async () => {
  const visualBrief = brief({ requiresScreenTest: true });
  const runtime = fakeRuntime({
    designs: [visualBrief],
    executors: [executorResult("v1"), executorResult("v2")],
    testers: [testerResult("FAIL"), testerResult("PASS")],
    audits: [review("PASS")],
  });
  const fingerprints = ["a", "b", "c"];
  const result = await runFeatureLoop({
    ...base,
    runtime,
    screenTestDriver: screenDriver,
    stateStore: new MemoryStore(),
    fingerprint: async () => fingerprints.shift(),
  });

  assert.equal(result.finalStatus, "PASS");
  assert.match(runtime.executorContexts[1].feedback, /Corrigir safe area/);
  assert.equal(runtime.auditIndex, 1);
});

test("ux_auditor combina checagem visual e corrige sem redesenhar", async () => {
  const visualBrief = brief({
    route: ["design_director"],
    requiresScreenTest: true,
    requiresDesignCheck: true,
    requiresUxAudit: false,
  });
  const runtime = fakeRuntime({
    designs: [visualBrief],
    executors: [executorResult("v1"), executorResult("v2")],
    testers: [testerResult("PASS"), testerResult("PASS")],
    audits: [designReview("CHANGES_REQUIRED"), designReview("PASS")],
  });
  const fingerprints = ["a", "b", "c"];
  const result = await runFeatureLoop({
    ...base,
    runtime,
    screenTestDriver: screenDriver,
    stateStore: new MemoryStore(),
    fingerprint: async () => fingerprints.shift(),
  });

  assert.equal(result.finalStatus, "PASS");
  assert.equal(result.stopReason, "audit_passed");
  assert.equal(runtime.designerIndex, 1);
  assert.match(runtime.executorContexts[1].feedback, /450ms/);
});

test("design sem screenshot não recebe falso PASS", async () => {
  const runtime = fakeRuntime({
    designs: [brief({ requiresDesignCheck: true, requiresUxAudit: false })],
  });
  const result = await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
  });

  assert.equal(result.finalStatus, "STOPPED");
  assert.equal(result.stopReason, "design_evidence_unavailable");
});

test("mercado alimenta o planejamento do feature_lead", async () => {
  const market = marketAnalysis();
  const runtime = fakeRuntime({
    markets: [market],
    audits: [review("PASS")],
  });
  await runFeatureLoop({
    ...base,
    runtime,
    marketing: {
      mode: "context",
      appContext: { appName: "App", category: "Produtividade" },
      competitors: [],
    },
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
  });

  assert.deepEqual(runtime.planningContexts[0].marketAnalysis, market);
  assert.deepEqual(runtime.executorContexts[0].designBrief, brief());
});

test("code_reviewer roda somente quando o feature_lead marca risco", async () => {
  const riskyBrief = brief({
    requiresCodeReview: true,
    requiresUxAudit: false,
  });
  const runtime = fakeRuntime({
    designs: [riskyBrief],
    executors: [executorResult("v1"), executorResult("v2")],
    codeReviews: [review("CHANGES_REQUIRED"), review("PASS")],
  });
  const fingerprints = ["a", "b", "c"];

  const result = await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => fingerprints.shift(),
  });

  assert.equal(result.finalStatus, "PASS");
  assert.equal(runtime.codeReviewIndex, 2);
  assert.match(runtime.executorContexts[1].feedback, /Adicionar estado vazio/);
});

test("mudança comum não inicializa revisão de código", async () => {
  const runtime = fakeRuntime({ audits: [review("PASS")] });

  await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
  });

  assert.equal(runtime.codeReviewIndex, 0);
});

test("estado contabiliza tokens por agente e cache", async () => {
  const runtime = fakeRuntime({
    designs: [brief({ requiresUxAudit: false })],
  });
  runtime.planFeature = async function planFeature(context, { onProgress }) {
    this.planningContexts.push(context);
    this.designerIndex += 1;
    onProgress({
      kind: "usage",
      detail: "tokens",
      elapsedSeconds: 1,
      usage: {
        input_tokens: 10,
        cached_input_tokens: 4,
        output_tokens: 3,
        reasoning_output_tokens: 2,
      },
    });
    return brief({ requiresUxAudit: false });
  };
  runtime.implementFeature = async function implementFeature(context, { onProgress }) {
    this.executorContexts.push(context);
    this.executorIndex += 1;
    onProgress({
      kind: "usage",
      detail: "tokens",
      elapsedSeconds: 1,
      usage: {
        input_tokens: 20,
        cached_input_tokens: 12,
        output_tokens: 5,
        reasoning_output_tokens: 4,
      },
    });
    return executorResult();
  };

  const result = await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
  });

  assert.equal(result.usage.inputTokens, 30);
  assert.equal(result.usage.cachedInputTokens, 16);
  assert.equal(result.usage.byAgent.feature_lead.outputTokens, 8);
});

test("revisores recebem o diff do ciclo e o dev não repete o contrato", async () => {
  const runtime = fakeRuntime({
    designs: [brief({ requiresCodeReview: true })],
    executors: [executorResult(), executorResult("Corrigido")],
    codeReviews: [review("CHANGES_REQUIRED"), review("PASS")],
    audits: [review("PASS")],
  });
  let diffCalls = 0;

  const result = await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => `f${diffCalls}`,
    collectDiff: async () => {
      diffCalls += 1;
      return `diff-${diffCalls}`;
    },
  });

  assert.equal(result.finalStatus, "PASS");
  assert.equal(runtime.codeReviewContexts[0].diff, "diff-1");
  assert.equal(runtime.codeReviewContexts[1].diff, "diff-2");
  assert.equal(runtime.auditContexts[0].diff, "diff-2");
  assert.equal(runtime.executorContexts[0].contractDelivered, false);
  assert.equal(runtime.executorContexts[1].contractDelivered, true);
  assert.equal(runtime.codeReviewContexts[0].sessionPrimed, false);
  assert.equal(runtime.codeReviewContexts[1].sessionPrimed, true);
  assert.equal(runtime.auditContexts[0].sessionPrimed, false);
});

test("redesenho do brief obriga o dev a receber o contrato novo", async () => {
  const runtime = fakeRuntime({
    designs: [brief(), brief({ summary: "Brief revisado" })],
    executors: [executorResult(), executorResult("Corrigido")],
    audits: [review("CHANGES_REQUIRED", { redesign: true }), review("PASS")],
  });
  const fingerprints = ["a", "b", "c"];

  const result = await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => fingerprints.shift(),
  });

  assert.equal(result.finalStatus, "PASS");
  assert.equal(runtime.executorContexts[1].contractDelivered, false);
  assert.equal(runtime.auditContexts[1].sessionPrimed, false);
});

test("brief que julga a feature sem retorno para o loop antes do código", async () => {
  const runtime = fakeRuntime({
    designs: [
      brief({
        worthBuilding: "no",
        worthReason: "O app já resolve isso em dois toques na tela inicial.",
      }),
    ],
  });

  const result = await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
  });

  assert.equal(result.finalStatus, "STOPPED");
  assert.equal(result.stopReason, "not_worth_building");
  assert.equal(runtime.executorIndex, 0);
  assert.equal(result.cycles.length, 0);
});

test("escopo reduzido chega ao contrato de implementação", async () => {
  const runtime = fakeRuntime({
    designs: [
      brief({ worthBuilding: "reduce", reducedScope: ["Só renomear a aba"] }),
    ],
    audits: [review("PASS")],
  });

  await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
  });

  const contract = buildImplementationContract({
    task: base.task,
    acceptanceCriteria: base.acceptanceCriteria,
    designBrief: runtime.executorContexts[0].designBrief,
    feedback: "",
  });
  assert.deepEqual(contract.reducedScope, ["Só renomear a aba"]);
});

test("plan-only entrega o brief sem tocar em arquivo", async () => {
  const runtime = fakeRuntime();

  const result = await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
    planOnly: true,
  });

  assert.equal(result.finalStatus, "STOPPED");
  assert.equal(result.stopReason, "plan_only");
  assert.equal(runtime.executorIndex, 0);
  assert.ok(result.designBrief.summary);
});

test("plan-only captura a tela atual antes de decidir", async () => {
  const runtime = fakeRuntime();
  const captured = [];
  const screenTestDriver = {
    async collectEvidence({ cycle }) {
      captured.push(cycle);
      return { uiNodes: "arvore", errors: "", screenshots: [{ name: "hoje", path: "/tmp/a.png" }] };
    },
  };

  const result = await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
    screenTestDriver,
    planOnly: true,
  });

  assert.equal(result.stopReason, "plan_only");
  assert.deepEqual(captured, [0]);
  assert.equal(
    runtime.planningContexts[0].baselineEvidence.screenshots[0].name,
    "hoje",
  );
});

test("sem gate visual o loop não gasta captura antes do planejamento", async () => {
  const runtime = fakeRuntime({ audits: [review("PASS")] });
  let calls = 0;

  await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
    screenTestDriver: {
      async collectEvidence() {
        calls += 1;
        return { screenshots: [], uiNodes: "", errors: "" };
      },
    },
  });

  assert.equal(calls, 0);
  assert.equal(runtime.planningContexts[0].baselineEvidence, null);
});
