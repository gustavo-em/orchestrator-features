import assert from "node:assert/strict";
import test from "node:test";

import {
  buildImplementationContract,
  compactDesignBrief,
  compactMarketEvidence,
  featureLead,
} from "../agents/feature-lead.js";
import { codeReviewer } from "../agents/code-reviewer.js";
import { tester } from "../agents/tester.js";
import { uxAuditor } from "../agents/ux-auditor.js";

test("feature_lead low recebe contrato exato e não reabre design", () => {
  const prompt = featureLead.buildImplementationPrompt({
    task: "Criar splash",
    acceptanceCriteria: "Animação fluida",
    cycle: 1,
    feedback: "",
    designBrief: {
      userGoal: "Abrir app sem ansiedade",
      behaviorDecisions: ["Splash não bloqueia navegação"],
      visualDirection: ["Motion de 420ms"],
      implementationPlan: ["AppSplash: aplicar motion de 420ms"],
      implementationConstraints: ["Respeitar reduced motion"],
      outOfScope: ["Redesenhar tela inicial"],
      acceptanceChecks: ["Splash encerra em 420ms"],
    },
  });

  assert.match(prompt, /\$vercel-react-native-skills/);
  assert.match(prompt, /Contrato exato de execução/);
  assert.match(prompt, /Criar splash/);
  assert.match(prompt, /Motion de 420ms/);
  assert.match(prompt, /Não redesenhe/);
  assert.match(prompt, /outOfScope/);
});

test("contrato separa decisões obrigatórias e fora de escopo", () => {
  const contract = buildImplementationContract({
    task: "Criar filtros",
    acceptanceCriteria: "Filtros persistem",
    feedback: "Corrigir estado recolhido",
    designBrief: {
      userGoal: "Encontrar tarefas",
      implementationPlan: ["TodayScreen: integrar filtros"],
      implementationConstraints: ["Persistir expansão"],
      outOfScope: ["Trocar navegação"],
      acceptanceChecks: ["Estado sobrevive reload"],
    },
  });

  assert.deepEqual(contract.implementationConstraints, ["Persistir expansão"]);
  assert.deepEqual(contract.outOfScope, ["Trocar navegação"]);
  assert.equal(contract.correctionFeedback, "Corrigir estado recolhido");
});

test("handoff para especialistas compacta texto e omite concorrentes", () => {
  const longText = "x".repeat(3_000);
  const brief = compactDesignBrief({
    status: "READY",
    acceptanceChecks: [longText],
    behaviorDecisions: [longText],
    implementationConstraints: [longText],
    outOfScope: [longText],
    requiresCodeReview: false,
  });
  const market = compactMarketEvidence({
    status: "COMPLETE",
    summary: longText,
    competitors: [{ name: "Não deve chegar ao dev" }],
  });

  assert.ok(brief.acceptanceChecks[0].length <= 700);
  assert.ok(brief.behaviorDecisions[0].length <= 700);
  assert.ok(brief.implementationConstraints[0].length <= 500);
  assert.equal("competitors" in market, false);
});

test("continuação do feature_lead reutiliza trabalho existente", () => {
  const prompt = featureLead.buildContinuationPrompt({ cycle: 1, feedback: "" });
  assert.match(prompt, /MESMA implementação/);
  assert.match(prompt, /Não recomece/);
});

test("continuação do planejamento encerra pesquisa sem reiniciar", () => {
  const prompt = featureLead.buildPlanningContinuationPrompt();
  assert.match(prompt, /MESMA thread/);
  assert.match(prompt, /Pare toda inspeção/);
});

test("feature_lead limita inspeção e recebe mercado compacto", () => {
  const prompt = featureLead.buildPlanningPrompt({
    task: "Redesenhar logo",
    acceptanceCriteria: "Parecer profissional",
    marketAnalysis: {
      status: "COMPLETE",
      summary: "ok",
      competitors: [{ name: "catálogo omitido" }],
    },
  });
  const context = compactMarketEvidence({
    status: "COMPLETE",
    summary: "ok",
    competitors: [{ name: "catálogo omitido" }],
  });

  assert.match(prompt, /no máximo 12 arquivos/);
  assert.match(prompt, /Não releia arquivo/);
  assert.match(prompt, /requiresCodeReview=true somente/);
  assert.equal("competitors" in context, false);
});

test("code_reviewer recebe apenas handoff compacto", () => {
  const prompt = codeReviewer.buildPrompt({
    task: "Migrar persistência",
    acceptanceCriteria: "Sem perda de dados",
    cycle: 1,
    designBrief: { summary: "Migração", requiresCodeReview: true },
    implementationResult: { changes: ["storage.ts"] },
  });

  assert.match(prompt, /mudança como arriscada/);
  assert.match(prompt, /Não faça revisão estética/);
});

test("ciclo seguinte manda só o delta e não repete o contrato", () => {
  const context = {
    task: "Criar splash",
    acceptanceCriteria: "Animação fluida",
    designBrief: {
      userGoal: "Abrir app sem ansiedade",
      implementationPlan: ["AppSplash: aplicar motion de 420ms"],
      outOfScope: ["Redesenhar tela inicial"],
      acceptanceChecks: ["Splash encerra em 420ms"],
    },
  };
  const full = featureLead.buildImplementationPrompt({
    ...context,
    cycle: 1,
    feedback: "",
  });
  const delta = featureLead.buildImplementationPrompt({
    ...context,
    cycle: 2,
    feedback: "1. [high] Motion ignora reduced motion",
    contractDelivered: true,
  });

  assert.match(full, /Contrato exato de execução/);
  assert.doesNotMatch(delta, /Contrato exato de execução/);
  assert.doesNotMatch(delta, /Redesenhar tela inicial/);
  assert.match(delta, /Motion ignora reduced motion/);
  assert.match(delta, /MESMA sessão/);
  assert.ok(delta.length < full.length / 2);
});

test("ux_auditor compacta brief, mercado e evidência e recebe o diff", () => {
  const longText = "x".repeat(3_000);
  const prompt = uxAuditor.buildPrompt({
    task: "Criar filtros",
    acceptanceCriteria: "Filtros persistem",
    cycle: 1,
    designBrief: { status: "READY", summary: longText, requiresUxAudit: true },
    marketAnalysis: {
      status: "COMPLETE",
      summary: "ok",
      competitors: [{ name: "catálogo omitido" }],
    },
    implementationResult: { status: "FINISHED", changes: ["Filters.tsx"] },
    evidence: {
      device: "emulator-5554",
      packageName: "com.exemplo.app",
      activity: ".MainActivity",
      launch: longText,
      uiNodes: "árvore",
      errors: "",
      screenshots: [{ name: "final", path: "/tmp/final.png", bytes: 1 }],
    },
    diff: "diff --git a/Filters.tsx b/Filters.tsx",
  });

  assert.doesNotMatch(prompt, /catálogo omitido/);
  assert.doesNotMatch(prompt, /emulator-5554/);
  assert.doesNotMatch(prompt, /com\.exemplo\.app/);
  assert.match(prompt, /diff --git/);
  assert.match(prompt, /\/tmp\/final\.png/);
  assert.ok(!prompt.includes(longText));
});

test("tester recebe evidência projetada, sem device nem launch", () => {
  const prompt = tester.buildPrompt({
    task: "Validar splash",
    acceptanceCriteria: "Splash aparece",
    cycle: 1,
    implementationResult: { status: "FINISHED", changes: [] },
    evidence: {
      device: "emulator-5554",
      packageName: "com.exemplo.app",
      activity: ".MainActivity",
      launch: "Status: ok\nTotalTime: 812",
      uiNodes: "árvore",
      errors: "",
      screenshots: [{ name: "final", path: "/tmp/final.png" }],
    },
  });

  assert.doesNotMatch(prompt, /emulator-5554/);
  assert.doesNotMatch(prompt, /TotalTime/);
  assert.match(prompt, /árvore/);
  assert.match(prompt, /\/tmp\/final\.png/);
});

test("code_reviewer recebe o diff real do ciclo", () => {
  const prompt = codeReviewer.buildPrompt({
    task: "Migrar persistência",
    acceptanceCriteria: "Sem perda de dados",
    cycle: 1,
    designBrief: { summary: "Migração", requiresCodeReview: true },
    implementationResult: { changes: ["storage.ts"] },
    diff: "diff --git a/storage.ts b/storage.ts",
  });

  assert.match(prompt, /fonte primária/);
  assert.match(prompt, /diff --git a\/storage\.ts/);
});

test("especialistas retomados recebem só o que mudou", () => {
  const auditContext = {
    task: "Criar filtros",
    acceptanceCriteria: "Filtros persistem",
    cycle: 2,
    designBrief: { status: "READY", summary: "Brief", requiresUxAudit: true },
    marketAnalysis: { status: "COMPLETE", summary: "ok" },
    implementationResult: { status: "FINISHED", changes: ["Filters.tsx"] },
    evidence: { uiNodes: "árvore", errors: "", screenshots: [] },
    diff: "diff --git a/Filters.tsx b/Filters.tsx",
  };
  const auditFull = uxAuditor.buildPrompt(auditContext);
  const auditDelta = uxAuditor.buildPrompt({
    ...auditContext,
    sessionPrimed: true,
  });

  assert.match(auditFull, /Critérios de aceitação/);
  assert.doesNotMatch(auditDelta, /Critérios de aceitação/);
  assert.doesNotMatch(auditDelta, /Brief aprovado/);
  assert.match(auditDelta, /MESMA sessão/);
  assert.match(auditDelta, /diff --git/);
  assert.ok(auditDelta.length < auditFull.length / 2);

  const reviewContext = {
    task: "Migrar persistência",
    acceptanceCriteria: "Sem perda de dados",
    cycle: 2,
    designBrief: { summary: "Migração", requiresCodeReview: true },
    implementationResult: { changes: ["storage.ts"] },
    diff: "diff --git a/storage.ts b/storage.ts",
  };
  const reviewDelta = codeReviewer.buildPrompt({
    ...reviewContext,
    sessionPrimed: true,
  });
  assert.doesNotMatch(reviewDelta, /Critérios:/);
  assert.match(reviewDelta, /diff --git a\/storage\.ts/);

  const testerDelta = tester.buildPrompt({
    task: "Validar splash",
    acceptanceCriteria: "Splash aparece",
    cycle: 2,
    implementationResult: { status: "FINISHED", changes: [] },
    evidence: { uiNodes: "árvore", errors: "", screenshots: [] },
    sessionPrimed: true,
  });
  assert.doesNotMatch(testerDelta, /Splash aparece/);
  assert.match(testerDelta, /MESMA sessão/);
  assert.match(testerDelta, /árvore/);
});

test("regras do dono do app entram no planejamento como invariante", () => {
  const prompt = featureLead.buildPlanningPrompt({
    task: "Melhorar a tela",
    acceptanceCriteria: "Ficar bonita",
    appRules: "Filete de seção fica. Nada de card dentro de card.",
  });

  assert.match(prompt, /São invariantes/);
  assert.match(prompt, /Filete de seção fica/);
  assert.match(prompt, /diga isso em blockers/);

  const semRegras = featureLead.buildPlanningPrompt({
    task: "Melhorar a tela",
    acceptanceCriteria: "Ficar bonita",
  });
  assert.match(semRegras, /Nenhuma registrada/);
});
