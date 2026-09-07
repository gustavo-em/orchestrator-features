import assert from "node:assert/strict";
import test from "node:test";

import { buildImplementationContract } from "../agents/feature-lead.js";
import { needsBriefRevision, runFeatureLoop } from "../src/orchestrator.js";

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

test("infra indisponível na evidência encerra como STOPPED retomável", async () => {
  const runtime = fakeRuntime({
    designs: [brief({ requiresScreenTest: true })],
  });
  const events = [];

  const result = await runFeatureLoop({
    ...base,
    runtime,
    screenTestDriver: {
      async collectEvidence() {
        throw new Error("nenhum device conectado");
      },
    },
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
    onEvent: (event) => events.push(event.type),
  });

  assert.equal(result.finalStatus, "STOPPED");
  assert.equal(result.stopReason, "screen_evidence_infra_unavailable");
  assert.ok(events.includes("evidence.unavailable"));
  assert.equal(runtime.testerIndex, 0);
});

test("build quebrado vira feedback para o feature_lead em vez de encerrar", async () => {
  let calls = 0;
  const runtime = fakeRuntime({
    designs: [brief({ requiresScreenTest: true })],
    executors: [executorResult("v1"), executorResult("v2")],
    testers: [testerResult("PASS")],
    audits: [review("PASS")],
  });
  const fingerprints = ["a", "b", "c"];

  const result = await runFeatureLoop({
    ...base,
    runtime,
    screenTestDriver: {
      async collectEvidence() {
        calls += 1;
        if (calls === 1) {
          const failure = new Error(
            "Build falhou antes do teste de tela.\nerror TS2304",
          );
          failure.code = "BUILD_FAILED";
          throw failure;
        }
        return { screenshots: [], uiNodes: [], errors: "" };
      },
    },
    stateStore: new MemoryStore(),
    fingerprint: async () => fingerprints.shift(),
  });

  assert.equal(result.finalStatus, "PASS");
  assert.match(runtime.executorContexts[1].feedback, /build/i);
  assert.equal(runtime.testerIndex, 1);
});

test("tester pede evidência extra e aprova no mesmo ciclo", async () => {
  const failPedindoEvidencia = {
    ...testerResult("FAIL"),
    requestedSteps: [
      { action: "tapText", value: "Entrar" },
      { action: "checkpoint", name: "pos-login" },
    ],
  };
  const captures = [];
  const runtime = fakeRuntime({
    designs: [brief({ requiresScreenTest: true })],
    testers: [failPedindoEvidencia, testerResult("PASS")],
    audits: [review("PASS")],
  });
  const events = [];

  const result = await runFeatureLoop({
    ...base,
    runtime,
    screenTestDriver: {
      async collectEvidence({ cycle, extraSteps = [] }) {
        captures.push({ cycle, extraSteps });
        return { screenshots: [], uiNodes: [], errors: "" };
      },
    },
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
    onEvent: (event) => events.push(event.type),
  });

  assert.equal(result.finalStatus, "PASS");
  assert.equal(result.cycles.length, 1);
  assert.equal(runtime.testerIndex, 2);
  assert.equal(captures.length, 2);
  assert.equal(captures[1].cycle, "1-extra");
  assert.equal(captures[1].extraSteps.length, 2);
  assert.ok(events.includes("tester.evidence.requested"));
  assert.equal(result.cycles[0].testerBeforeEvidence.status, "FAIL");
});

test("tester itera com o device em várias rodadas sem acordar o lead", async () => {
  const pede = (nome) => ({
    ...testerResult("FAIL"),
    requestedSteps: [{ action: "checkpoint", name: nome }],
  });
  const captures = [];
  const runtime = fakeRuntime({
    designs: [brief({ requiresScreenTest: true })],
    testers: [pede("um"), pede("dois"), testerResult("PASS")],
    audits: [review("PASS")],
  });

  const result = await runFeatureLoop({
    ...base,
    runtime,
    screenTestDriver: {
      async collectEvidence({ cycle, extraSteps = [] }) {
        captures.push({ cycle, extraSteps });
        return { screenshots: [], uiNodes: [], errors: "" };
      },
    },
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
  });

  assert.equal(result.finalStatus, "PASS");
  assert.equal(result.cycles.length, 1);
  assert.equal(runtime.executorIndex, 1);
  assert.equal(runtime.testerIndex, 3);
  assert.equal(captures.length, 3);
  assert.equal(captures[2].cycle, "1-extra-2");
});

test("rodadas param cedo quando o tester repete os mesmos passos", async () => {
  const mesmoPedido = () => ({
    ...testerResult("FAIL"),
    requestedSteps: [{ action: "checkpoint", name: "igual" }],
  });
  let captures = 0;
  const runtime = fakeRuntime({
    designs: [brief({ requiresScreenTest: true })],
    executors: [executorResult("v1"), executorResult("v2")],
    testers: [mesmoPedido(), mesmoPedido(), testerResult("PASS")],
    audits: [review("PASS")],
  });
  const fingerprints = ["a", "b", "c"];

  const result = await runFeatureLoop({
    ...base,
    runtime,
    screenTestDriver: {
      async collectEvidence() {
        captures += 1;
        return { screenshots: [], uiNodes: [], errors: "" };
      },
    },
    stateStore: new MemoryStore(),
    fingerprint: async () => fingerprints.shift(),
  });

  assert.equal(result.finalStatus, "PASS");
  assert.equal(captures, 3);
  assert.equal(result.cycles.length, 2);
});

test("captura extra que falha mantém o veredito original", async () => {
  let calls = 0;
  const failPedindoEvidencia = {
    ...testerResult("FAIL"),
    requestedSteps: [{ action: "checkpoint", name: "x" }],
  };
  const runtime = fakeRuntime({
    designs: [brief({ requiresScreenTest: true })],
    executors: [executorResult("v1"), executorResult("v2")],
    testers: [failPedindoEvidencia, testerResult("PASS")],
    audits: [review("PASS")],
  });
  const fingerprints = ["a", "b", "c"];

  const result = await runFeatureLoop({
    ...base,
    runtime,
    screenTestDriver: {
      async collectEvidence({ extraSteps = [] }) {
        calls += 1;
        if (extraSteps.length) throw new Error("device sumiu no meio");
        return { screenshots: [], uiNodes: [], errors: "" };
      },
    },
    stateStore: new MemoryStore(),
    fingerprint: async () => fingerprints.shift(),
  });

  assert.equal(result.finalStatus, "PASS");
  assert.equal(result.cycles[0].tester.status, "FAIL");
  assert.equal(calls, 3);
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

test("recusa por exigir redesenho revisa o brief em vez de encerrar", async () => {
  const runtime = fakeRuntime({
    designs: [brief(), brief({ summary: "Brief revisado" })],
    executors: [
      {
        status: "BLOCKED",
        summary:
          "Achados pedem redesenho e exploração de alternativas, proibidos nesta fase.",
        changes: [],
        tests: [],
        blockers: ["redesenho fora do contrato"],
      },
      executorResult("Implementado com o brief novo"),
    ],
    audits: [review("PASS")],
  });
  const eventos = [];

  const result = await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
    onEvent: (event) => eventos.push(event.type),
  });

  assert.equal(result.finalStatus, "PASS");
  assert.equal(runtime.designerIndex, 2);
  assert.ok(eventos.includes("redesign.escalated"));
  assert.equal(runtime.executorContexts[1].contractDelivered, false);
});

test("implementação travada ganha uma tentativa no runtime de fallback", async () => {
  const runtime = fakeRuntime({
    executors: [
      {
        status: "BLOCKED",
        summary: "Falta a credencial do serviço de mapas.",
        changes: [],
        tests: [],
        blockers: ["credencial ausente"],
      },
    ],
    audits: [review("PASS")],
  });
  const escalationRuntime = fakeRuntime({
    executors: [executorResult("Resolvido pelo fallback")],
  });
  const events = [];
  const fingerprints = ["a", "a", "b"];

  const result = await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => fingerprints.shift(),
    createEscalationRuntime: async () => escalationRuntime,
    onEvent: (event) => events.push(event.type),
  });

  assert.equal(result.finalStatus, "PASS");
  assert.equal(escalationRuntime.executorIndex, 1);
  assert.equal(
    escalationRuntime.executorContexts[0].contractDelivered,
    false,
  );
  assert.ok(events.includes("escalation.started"));
  assert.equal(
    result.cycles[0].implementation.summary,
    "Resolvido pelo fallback",
  );
});

test("fallback que também trava encerra e não roda duas vezes", async () => {
  const blocked = {
    status: "BLOCKED",
    summary: "Sem saída.",
    changes: [],
    tests: [],
    blockers: ["impasse"],
  };
  const runtime = fakeRuntime({ executors: [blocked] });
  const escalationRuntime = fakeRuntime({ executors: [blocked] });

  const result = await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
    createEscalationRuntime: async () => escalationRuntime,
  });

  assert.equal(result.finalStatus, "BLOCKED");
  assert.equal(result.stopReason, "feature_lead_implementation_blocked");
  assert.equal(escalationRuntime.executorIndex, 1);
});

test("tester travado é resgatado pelo fallback sem encerrar o run", async () => {
  const runtime = fakeRuntime({
    designs: [brief({ requiresScreenTest: true })],
    audits: [review("PASS")],
  });
  runtime.runTester = async () => {
    throw new Error("tester caiu");
  };
  const escalationRuntime = fakeRuntime({ testers: [testerResult("PASS")] });

  const result = await runFeatureLoop({
    ...base,
    runtime,
    screenTestDriver: screenDriver,
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
    createEscalationRuntime: async () => escalationRuntime,
  });

  assert.equal(result.finalStatus, "PASS");
  assert.equal(escalationRuntime.testerIndex, 1);
  assert.equal(result.cycles[0].tester.status, "PASS");
});

test("teto de tokens para o run antes do próximo gasto grande", async () => {
  const runtime = fakeRuntime({
    executors: [executorResult("v1"), executorResult("v2")],
    audits: [review("CHANGES_REQUIRED"), review("PASS")],
  });
  const originalImplement = runtime.implementFeature.bind(runtime);
  runtime.implementFeature = async function implementFeature(context, extra) {
    extra.onProgress({
      kind: "usage",
      detail: "tokens",
      elapsedSeconds: 1,
      usage: {
        input_tokens: 90_000,
        cached_input_tokens: 0,
        output_tokens: 20_000,
        reasoning_output_tokens: 0,
      },
    });
    return originalImplement(context, extra);
  };
  const fingerprints = ["a", "b", "c"];

  const result = await runFeatureLoop({
    ...base,
    runtime,
    tokenBudget: 100_000,
    stateStore: new MemoryStore(),
    fingerprint: async () => fingerprints.shift(),
  });

  assert.equal(result.finalStatus, "STOPPED");
  assert.equal(result.stopReason, "token_budget_exhausted");
  assert.equal(runtime.executorIndex, 1);
  assert.equal(runtime.auditIndex, 0);
});

test("contestação com achado novo ganha um ciclo de folga sem progresso", async () => {
  const runtime = fakeRuntime({
    designs: [brief({ requiresScreenTest: true })],
    executors: [
      executorResult("v1"),
      executorResult("contestei, sem mudança"),
      executorResult("corrigi o tema escuro"),
    ],
    testers: [
      testerResult("FAIL"),
      {
        ...testerResult("FAIL"),
        findings: [{
          priority: "high",
          title: "Tema escuro não aplicado",
          evidence: "Screenshot tema-escuro mostra fundo claro.",
          recommendation: "Aplicar tokens de dark theme.",
        }],
      },
      testerResult("PASS"),
    ],
    audits: [review("PASS")],
  });
  const fingerprints = ["a", "b", "b", "c"];

  const result = await runFeatureLoop({
    ...base,
    runtime,
    maxCycles: 5,
    screenTestDriver: screenDriver,
    stateStore: new MemoryStore(),
    fingerprint: async () => fingerprints.shift(),
  });

  assert.equal(result.finalStatus, "PASS");
  assert.equal(result.cycles.length, 3);
  assert.match(runtime.executorContexts[2].feedback, /Tema escuro/);
});

const distinctFail = (title) => ({
  ...testerResult("FAIL"),
  findings: [{
    priority: "high",
    title,
    evidence: `Evidência de ${title}.`,
    recommendation: "Corrigir.",
  }],
});

test("impasse de dois ciclos convoca arbitragem e o run continua", async () => {
  const arbitrated = brief({
    requiresScreenTest: true,
    summary: "Brief arbitrado: achados improcedentes descartados",
  });
  const runtime = fakeRuntime({
    designs: [brief({ requiresScreenTest: true }), arbitrated],
    executors: [
      executorResult("v1"),
      executorResult("contestei"),
      executorResult("contestei de novo"),
      executorResult("corrigi conforme o brief arbitrado"),
    ],
    testers: [
      distinctFail("um"),
      distinctFail("dois"),
      distinctFail("três"),
      testerResult("PASS"),
    ],
    audits: [review("PASS")],
  });
  const events = [];
  const fingerprints = ["a", "b", "b", "b", "c"];

  const result = await runFeatureLoop({
    ...base,
    runtime,
    maxCycles: 6,
    screenTestDriver: screenDriver,
    stateStore: new MemoryStore(),
    fingerprint: async () => fingerprints.shift(),
    onEvent: (event) => events.push(event.type),
  });

  assert.equal(result.finalStatus, "PASS");
  assert.equal(runtime.designerIndex, 2);
  assert.ok(events.includes("impasse.arbitration.started"));
  assert.ok(events.includes("impasse.arbitration.completed"));
  assert.match(
    runtime.planningContexts[1].redesignFeedback,
    /IMPASSE.*Posição da implementação/s,
  );
  assert.equal(runtime.executorContexts[3].contractDelivered, false);
});

test("achado repetido convoca o árbitro de produto em vez de parar", async () => {
  const arbitrated = brief({
    requiresScreenTest: true,
    summary: "Arbitrado pela visão de produto",
    outOfScope: ["Achado do revisor descartado: não serve ao userGoal"],
  });
  const runtime = fakeRuntime({
    designs: [brief({ requiresScreenTest: true }), arbitrated],
    executors: [
      executorResult("v1"),
      executorResult("tentei corrigir"),
      executorResult("segui o brief arbitrado"),
    ],
    testers: [distinctFail("mesmo"), distinctFail("mesmo"), testerResult("PASS")],
    audits: [review("PASS")],
  });
  const events = [];
  const fingerprints = ["a", "b", "c", "d"];

  const result = await runFeatureLoop({
    ...base,
    runtime,
    maxCycles: 5,
    screenTestDriver: screenDriver,
    stateStore: new MemoryStore(),
    fingerprint: async () => fingerprints.shift(),
    onEvent: (event) => events.push(event),
  });

  assert.equal(result.finalStatus, "PASS");
  assert.equal(runtime.designerIndex, 2);
  const started = events.find(
    (event) => event.type === "impasse.arbitration.started",
  );
  assert.equal(started.reason, "repeated_test_findings");
  assert.match(
    runtime.planningContexts[1].redesignFeedback,
    /VISÃO DE PRODUTO.*userGoal/s,
  );
});

test("impasse sem arbitragem possível ainda para o loop", async () => {
  const runtime = fakeRuntime({
    designs: [
      brief({ requiresScreenTest: true }),
      { status: "BLOCKED", summary: "Sem base para arbitrar", blockers: [] },
    ],
    executors: [executorResult("v1"), executorResult("v2"), executorResult("v3")],
    testers: [distinctFail("um"), distinctFail("dois"), distinctFail("três")],
  });
  const fingerprints = ["a", "b", "b", "b"];

  const result = await runFeatureLoop({
    ...base,
    runtime,
    maxCycles: 5,
    screenTestDriver: screenDriver,
    stateStore: new MemoryStore(),
    fingerprint: async () => fingerprints.shift(),
  });

  assert.equal(result.finalStatus, "STOPPED");
  assert.equal(result.stopReason, "no_workspace_progress");
  assert.equal(result.cycles.length, 3);
});

test("FAIL sem achados vira BLOCKED e cai no fallback do tester", async () => {
  const failVazio = { ...testerResult("FAIL"), findings: [] };
  const runtime = fakeRuntime({
    designs: [brief({ requiresScreenTest: true })],
    testers: [failVazio],
    audits: [review("PASS")],
  });
  const escalationRuntime = fakeRuntime({ testers: [testerResult("PASS")] });

  const result = await runFeatureLoop({
    ...base,
    runtime,
    screenTestDriver: screenDriver,
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
    createEscalationRuntime: async () => escalationRuntime,
  });

  assert.equal(result.finalStatus, "PASS");
  assert.equal(escalationRuntime.testerIndex, 1);
});

test("resume injeta o feedback do run anterior no primeiro ciclo", async () => {
  const runtime = fakeRuntime({ audits: [review("PASS")] });

  const result = await runFeatureLoop({
    ...base,
    runtime,
    designBrief: brief(),
    resumedFeedback: "1. [high] CTA cortado\n   Correção esperada: Corrigir safe area.",
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
  });

  assert.equal(result.finalStatus, "PASS");
  assert.match(runtime.executorContexts[0].feedback, /CTA cortado/);
  assert.match(result.lastFeedback, /CTA cortado/);
});

test("recusa por outro motivo continua encerrando o loop", async () => {
  const runtime = fakeRuntime({
    executors: [
      {
        status: "BLOCKED",
        summary: "Falta a credencial do serviço de mapas.",
        changes: [],
        tests: [],
        blockers: ["credencial ausente"],
      },
    ],
  });

  const result = await runFeatureLoop({
    ...base,
    runtime,
    stateStore: new MemoryStore(),
    fingerprint: async () => "a",
  });

  assert.equal(result.finalStatus, "BLOCKED");
  assert.equal(result.stopReason, "feature_lead_implementation_blocked");
  assert.equal(runtime.designerIndex, 1);
});

test("escalada acontece uma vez só, sem virar laço", () => {
  assert.equal(
    needsBriefRevision({ summary: "pedem redesenho, proibidos nesta fase" }),
    true,
  );
  assert.equal(
    needsBriefRevision({ summary: "ok", blockers: ["contradiz o contrato"] }),
    true,
  );
  assert.equal(needsBriefRevision({ summary: "faltou credencial" }), false);
});
