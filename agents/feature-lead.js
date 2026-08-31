export const featureLead = {
  name: "feature_lead",
  description:
    "Mantém o contexto da feature, decide UX/visual, implementa e corrige o código na mesma thread.",

  buildPlanningPrompt({
    task,
    acceptanceCriteria,
    marketAnalysis,
    previousBrief,
    redesignFeedback,
  }) {
    const marketContext = compactMarketEvidence(marketAnalysis);
    return `
Você é feature_lead. Você será dono desta feature até a conclusão, nesta mesma thread.

Nesta etapa, planeje a feature; ainda não edite arquivos.

Use $feature-design-orchestrator. Aplique seu roteamento por estágio:
- classifique como meaningful, trivial ou backend_only;
- use mobile-design somente para fluxo, interação, estados, acessibilidade ou convenções móveis;
- use design_director somente para hierarquia, identidade, componentes, assets e motion;
- não chame todos os especialistas por padrão;
- resolva conflitos por: conclusão, usabilidade, clareza, acessibilidade, convenções, consistência e estética.

Regras:
- Esta é a fase de maior investimento intelectual: use reasoning para fechar UX e direção visual profissional antes de pensar em código.
- Não simplifique uma decisão de design relevante apenas para facilitar implementação; preserve usabilidade, acessibilidade e convenções de plataforma.
- Faça uma inspeção dirigida: no máximo 12 arquivos e 6 chamadas de shell.
- Não releia arquivo ou referência. Não carregue pastas inteiras.
- Não execute npm, Metro, Gradle, ADB ou testes nesta etapa.
- Não inicie agentes. Skills são especialistas; você continua responsável pela decisão.
- Entregue decisões mensuráveis e prontas para sua própria implementação no próximo turno.
- Preserve decisões aprovadas; revise somente por feedback material.
- Feche as decisões antes do código: implementationPlan deve ser ordenado, atômico e indicar área/componente e mudança concreta.
- implementationConstraints registra invariantes técnicos, visuais, de acessibilidade e plataforma que o código não pode violar.
- outOfScope registra alternativas, refactors e polimentos que a implementação não deve perseguir.
- A fase de código usará reasoning baixo: não deixe decisões abertas nem instruções vagas como "melhorar" ou "conforme necessário".
- requiresScreenTest=true quando resultado visual/interativo precisa ser visto no device.
- requiresDesignCheck=true quando branding, hierarquia, direção visual ou motion fazem parte do escopo.
- requiresUxAudit=true quando fluxo, interação, estados ou acessibilidade comportamental mudam.
- requiresCodeReview=true somente para auth, persistência, migração, concorrência, módulo nativo, mudança estrutural ampla ou risco equivalente.
- BLOCKED somente quando falta decisão ou material essencial impossível de inferir.
- Máximo 240 caracteres por decisão/check. Pare após evidência suficiente.

Tarefa:
${task}

Critérios:
${acceptanceCriteria}

Contexto de mercado:
${marketContext ? JSON.stringify(marketContext) : "Não solicitado ou indisponível."}

Brief anterior:
${previousBrief ? JSON.stringify(compactDesignBrief(previousBrief)) : "Nenhum."}

Feedback que exige redesenho:
${redesignFeedback || "Nenhum."}

Retorne somente JSON solicitado.
`.trim();
  },

  buildImplementationPrompt({
    task,
    acceptanceCriteria,
    cycle,
    feedback,
    designBrief,
  }) {
    const contract = buildImplementationContract({
      task,
      acceptanceCriteria,
      designBrief,
      feedback,
    });
    return `
Continue como feature_lead na MESMA sessão. Fase de design encerrada. Agora execute o contrato abaixo.

Use $vercel-react-native-skills antes de modificar React Native/Expo. Leia somente regras relevantes aos arquivos tocados.

Regras:
- Preserve alterações existentes e trabalhe somente no escopo.
- Não redesenhe, não compare alternativas, não pesquise mercado e não reabra decisões aprovadas.
- Trate o contrato JSON como fonte de verdade. Execute implementationPlan na ordem e valide acceptanceChecks.
- Inspecione apenas arquivos necessários para localizar os alvos e integrar a mudança.
- Quando faltar detalhe puramente técnico, use o menor padrão já existente no projeto que satisfaça o contrato.
- Não faça refactor, limpeza ou polimento listado em outOfScope.
- Implemente assets, componentes, motion, estados e integração de plataforma pedidos.
- Respeite acessibilidade, teclado, back, safe areas, reduced motion e diferenças iOS/Android quando aplicáveis.
- Prefira verificações direcionadas, curtas e filtradas por RTK.
- Não execute nem bloqueie por ADB ou avaliação visual subjetiva; tester e ux_auditor validam depois.
- Não inicie agentes.
- BLOCKED somente por impossibilidade técnica concreta, permissão/credencial ausente ou material essencial não substituível dentro do contrato.
- Se o workspace contradizer o contrato, pare e descreva a incompatibilidade; não invente outra direção.
- Leia arquivos por trechos; use rg, find, sed -n, head e tail antes de abrir arquivos grandes.

Ciclo: ${cycle}

Contrato exato de execução:
${JSON.stringify(contract)}

Edite o projeto e retorne somente JSON solicitado.
`.trim();
  },

  buildPlanningContinuationPrompt() {
    return `
Continue como feature_lead na MESMA thread. Pare toda inspeção agora.
Use somente a evidência já coletada e emita imediatamente o JSON do brief.
Mantenha itens curtos. BLOCKED somente se faltar decisão impossível de inferir.
Não edite arquivos e não execute comandos.
`.trim();
  },

  buildContinuationPrompt({ cycle, feedback }) {
    return `
Continue como feature_lead na MESMA implementação do ciclo ${cycle}.

O turno anterior atingiu timeout após trabalhar no projeto. Não recomece nem desfaça mudanças.
Inspecione o estado atual, complete somente o que falta do brief e priorize código compilável.
Rode apenas verificações direcionadas. Device pertence ao tester. Não inicie agentes.

Feedback ainda obrigatório:
${feedback || "Nenhum."}

Finalize e retorne somente JSON solicitado.
`.trim();
  },
};

function compactText(value, maxLength = 600) {
  if (typeof value !== "string") return value;
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function compactList(items, maxItems, maxItemLength) {
  if (!Array.isArray(items)) return [];
  return items
    .slice(0, maxItems)
    .map((item) => compactText(item, maxItemLength));
}

export function compactDesignBrief(brief) {
  if (!brief) return null;
  return {
    status: brief.status,
    summary: compactText(brief.summary, 800),
    classification: brief.classification,
    route: brief.route,
    routeSummary: compactText(brief.routeSummary, 300),
    userGoal: compactText(brief.userGoal, 600),
    behaviorDecisions: compactList(brief.behaviorDecisions, 8, 700),
    visualDirection: compactList(brief.visualDirection, 10, 700),
    implementationPlan: compactList(brief.implementationPlan, 10, 700),
    implementationConstraints: compactList(
      brief.implementationConstraints,
      8,
      500,
    ),
    outOfScope: compactList(brief.outOfScope, 6, 500),
    acceptanceChecks: compactList(brief.acceptanceChecks, 10, 700),
    requiresScreenTest: brief.requiresScreenTest,
    requiresDesignCheck: brief.requiresDesignCheck,
    requiresUxAudit: brief.requiresUxAudit,
    requiresCodeReview: brief.requiresCodeReview,
    blockers: compactList(brief.blockers, 5, 400),
  };
}

export function buildImplementationContract({
  task,
  acceptanceCriteria,
  designBrief,
  feedback,
}) {
  const brief = compactDesignBrief(designBrief);
  return {
    objective: compactText(task, 1_000),
    acceptanceCriteria: compactText(acceptanceCriteria, 1_200),
    userGoal: brief?.userGoal,
    behaviorDecisions: brief?.behaviorDecisions ?? [],
    visualDirection: brief?.visualDirection ?? [],
    implementationPlan: brief?.implementationPlan ?? [],
    implementationConstraints: brief?.implementationConstraints ?? [],
    outOfScope: brief?.outOfScope ?? [],
    acceptanceChecks: brief?.acceptanceChecks ?? [],
    requiredValidation: {
      screen: brief?.requiresScreenTest ?? false,
      codeReview: brief?.requiresCodeReview ?? false,
      designAudit: brief?.requiresDesignCheck ?? false,
      uxAudit: brief?.requiresUxAudit ?? false,
    },
    correctionFeedback: compactText(feedback || "Nenhum.", 1_500),
  };
}

export function compactMarketEvidence(analysis) {
  if (!analysis) return null;
  return {
    status: analysis.status,
    summary: compactText(analysis.summary, 700),
    opportunities: compactList(analysis.opportunities, 5, 400),
    risks: compactList(analysis.risks, 5, 400),
    featureContext: compactList(analysis.featureContext, 5, 400),
  };
}
