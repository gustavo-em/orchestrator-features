import assert from "node:assert/strict";
import test from "node:test";

import {
  buildImplementationContract,
  compactDesignBrief,
  compactMarketEvidence,
  featureLead,
} from "../agents/feature-lead.js";
import { codeReviewer } from "../agents/code-reviewer.js";

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
