import { isRateLimited } from "./preflight.js";
import { workspaceDiff, workspaceFingerprint } from "./workspace.js";

const NEEDS_REDESIGN_PATTERN =
  /redesenh|reabrir decis|reabre decis|explora[çc][ãa]o de alternativas|proibid[oa]s? nesta fase|fora do contrato|contradiz o contrato/i;

/** Quando o feedback exige mudar a direção, a implementação recusa por regra —
 *  e com razão. O caminho não é insistir, é revisar o brief. */
export function needsBriefRevision(implementationResult) {
  const text = [
    implementationResult?.summary,
    ...(implementationResult?.blockers ?? []),
  ]
    .filter(Boolean)
    .join(" ");
  return NEEDS_REDESIGN_PATTERN.test(text);
}

export function resolveGates(designBrief, overrides = {}) {
  const pick = (override, briefValue) =>
    typeof override === "boolean" ? override : Boolean(briefValue);
  return {
    screenTest: pick(overrides.screenTest, designBrief?.requiresScreenTest),
    designCheck: pick(overrides.designCheck, designBrief?.requiresDesignCheck),
    uxAudit: pick(overrides.uxAudit, designBrief?.requiresUxAudit),
    codeReview: pick(overrides.codeReview, designBrief?.requiresCodeReview),
  };
}

function reviewSignature(review) {
  if (!review.findings?.length) {
    return `${review.status}:${review.summary.trim().toLowerCase()}`;
  }
  return review.findings
    .map((finding) =>
      [finding.priority, finding.title, finding.evidence]
        .join(":")
        .trim()
        .toLowerCase(),
    )
    .sort()
    .join("|");
}

function reviewToFeedback(review) {
  return (review.findings ?? [])
    .map(
      (finding, index) =>
        `${index + 1}. [${finding.priority}] ${finding.title}\n` +
        `   Evidência: ${finding.evidence}\n` +
        `   Correção esperada: ${finding.recommendation}`,
    )
    .join("\n");
}

function chooseRetryOrStop({
  state,
  cycle,
  maxCycles,
  madeWorkspaceProgress,
  noProgressStreak = 0,
  signature,
  seenSignatures,
  repeatedReason,
}) {
  if (seenSignatures.has(signature)) {
    state.finalStatus = "STOPPED";
    state.stopReason = repeatedReason;
    return false;
  }
  // Contestação legítima gera um ciclo sem mudança de código com achado NOVO:
  // isso ganha uma folga. Dois ciclos seguidos sem progresso = loop morto.
  if (cycle > 1 && !madeWorkspaceProgress && noProgressStreak >= 1) {
    state.finalStatus = "STOPPED";
    state.stopReason = "no_workspace_progress";
    return false;
  }
  if (cycle === maxCycles) {
    state.finalStatus = "STOPPED";
    state.stopReason = "max_cycles_reached";
    return false;
  }
  seenSignatures.add(signature);
  return true;
}

function makeInitialState({ task, acceptanceCriteria, maxCycles, projectPath }) {
  return {
    version: 5,
    architecture: "persistent_feature_lead_multi_provider",
    provider: null,
    projectPath,
    task,
    acceptanceCriteria,
    maxCycles,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    finalStatus: "RUNNING",
    stopReason: null,
    activeAgent: null,
    threadIds: null,
    sessionIds: null,
    reasoningProfile: null,
    marketAnalysis: null,
    designBrief: null,
    lastFeedback: "",
    usage: {
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      reasoningOutputTokens: 0,
      byAgent: {},
    },
    cycles: [],
  };
}

/** Build quebrado ou tela esperada ausente são corrigíveis pelo feature_lead;
 *  viram FAIL com feedback em vez de encerrar o run. */
function evidenceFailureResult(error) {
  const build = error.code === "BUILD_FAILED";
  return {
    status: "FAIL",
    summary: build
      ? "Build falhou antes do teste de tela."
      : "O fluxo de teste não encontrou a tela esperada no device.",
    findings: [
      {
        priority: "P0",
        title: build ? "Build quebrado" : "Tela esperada não apareceu",
        evidence: String(error.message ?? "").slice(0, 1500),
        recommendation: build
          ? "Corrija o erro de build citado na evidência antes de qualquer outro ajuste."
          : "Garanta que a navegação chegue à tela do critério: verifique rotas, estados de loading/autenticação e o elemento citado.",
      },
    ],
    observations: [],
  };
}

function blockedResult(summary) {
  return {
    status: "BLOCKED",
    summary,
    changes: [],
    tests: [],
    blockers: [summary],
  };
}

export async function runFeatureLoop({
  runtime,
  projectPath,
  task,
  acceptanceCriteria,
  maxCycles = 3,
  stateStore,
  screenTestDriver,
  marketing,
  marketAnalysis: precomputedMarketAnalysis = null,
  appRules = "",
  designBrief: resumedBrief = null,
  resumedFeedback = "",
  tokenBudget = 0,
  gateOverrides = {},
  planOnly = false,
  createEscalationRuntime = null,
  fingerprint = workspaceFingerprint,
  collectDiff = workspaceDiff,
  onEvent = () => {},
}) {
  const state = makeInitialState({
    task,
    acceptanceCriteria,
    maxCycles,
    projectPath,
  });
  state.provider = runtime.getProvider?.() ?? "codex";
  state.reasoningProfile = runtime.getReasoningProfile?.() ?? null;
  const seenIssueSignatures = new Set();
  let feedback = resumedFeedback || "";
  state.lastFeedback = feedback;
  const setFeedback = (value) => {
    feedback = value;
    state.lastFeedback = value;
  };

  // Teto de custo do run: entrada não cacheada + saída. Estourou, para com
  // motivo retomável manualmente — retry automático multiplicaria o teto.
  const budgetExhausted = () =>
    tokenBudget > 0 &&
    state.usage.inputTokens + state.usage.outputTokens >= tokenBudget;
  let marketAnalysis = null;
  let designBrief = null;
  let contractDelivered = false;
  let briefRevisedForBlock = false;
  const primedSpecialists = {
    code_reviewer: false,
    tester: false,
    ux_auditor: false,
  };
  let beforeFingerprint = await fingerprint(projectPath);
  let noProgressStreak = 0;
  let saveChain = Promise.resolve();

  // Fallback de modelo: um agente que trava (BLOCKED) ganha UMA tentativa em um
  // runtime mais forte, com prompt autocontido (sessão nova), antes de encerrar.
  let escalationRuntime = null;
  const escalatedAgents = new Set();
  const tryEscalation = async (agentName, run, blockedSummary = "") => {
    // Limite de uso é da CONTA: o modelo de fallback esbarra no mesmo teto.
    if (isRateLimited(blockedSummary)) return null;
    if (!createEscalationRuntime || escalatedAgents.has(agentName)) return null;
    escalatedAgents.add(agentName);
    onEvent({ type: "escalation.started", agent: agentName });
    try {
      escalationRuntime ??= await createEscalationRuntime();
      const result = await run(escalationRuntime);
      onEvent({ type: "escalation.completed", agent: agentName, result });
      return result?.status === "BLOCKED" ? null : result;
    } catch (error) {
      onEvent({
        type: "escalation.failed",
        agent: agentName,
        message: error.message,
      });
      return null;
    }
  };

  const saveState = () => {
    const snapshot = structuredClone(state);
    // Uma rejeição não pode envenenar a corrente: o run continua e o problema
    // vira evento — perder um snapshot é melhor que perder a noite.
    saveChain = saveChain
      .catch(() => {})
      .then(() => stateStore.save(snapshot))
      .catch((error) => {
        onEvent({ type: "state.save.failed", message: error.message });
      });
    return saveChain;
  };

  // Impasse revisor × implementação: dois ciclos sem mudança de código, ou o
  // mesmo achado repetido após um ciclo de correção. Antes de abandonar, o
  // feature_lead arbitra (uma vez por tipo de impasse por run): julga contra o
  // workspace e contra a visão de produto documentada, e revisa o brief —
  // acomoda no contrato ou descarta em outOfScope com motivo.
  const arbitratedReasons = new Set();
  const arbitrateImpasse = async ({
    cycle,
    review,
    implementationResult,
    reason,
  }) => {
    const kind =
      reason === "no_workspace_progress" ? "no_progress" : "repeated";
    if (arbitratedReasons.has(kind) || cycle >= maxCycles) return false;
    arbitratedReasons.add(kind);
    onEvent({ type: "impasse.arbitration.started", cycle, reason });
    const disputa =
      `Achados do revisor:\n${reviewToFeedback(review)}\n\n` +
      `Posição da implementação:\n${implementationResult?.summary ?? ""}\n\n`;
    const instrucao =
      kind === "repeated"
        ? "IMPASSE: o revisor repetiu o mesmo achado depois de um ciclo de " +
          "correção. Ou a correção não bastou, ou o achado não procede para " +
          "este produto.\n\n" +
          disputa +
          "Arbitre pela VISÃO DE PRODUTO documentada: as regras fixas do dono, " +
          "os documentos de produto no repositório (docs/, se existirem — leia), " +
          "o userGoal e o worthReason deste brief e o contexto de mercado. Se o " +
          "achado serve ao usuário e ao produto, acomode-o no contrato com " +
          "instrução inequívoca de correção; se não serve, descarte-o em " +
          "outOfScope com o motivo de produto. Nenhum veredito vago."
        : "IMPASSE: dois ciclos seguidos sem mudança de código. O revisor " +
          "insiste nos achados e a implementação contesta.\n\n" +
          disputa +
          "Arbitre: confira cada achado no workspace e na evidência real. " +
          "Acomode os procedentes no contrato (implementationPlan/" +
          "acceptanceChecks) e descarte os improcedentes em outOfScope com o " +
          "motivo. Nenhum achado fica sem veredito.";
    const revision = await planFeature({
      previousBrief: designBrief,
      redesignFeedback: instrucao,
    });
    if (revision.status === "BLOCKED") {
      onEvent({
        type: "impasse.arbitration.failed",
        cycle,
        message: revision.summary,
      });
      return false;
    }
    designBrief = revision;
    state.designBrief = revision;
    contractDelivered = false;
    primedSpecialists.code_reviewer = false;
    primedSpecialists.ux_auditor = false;
    setFeedback("");
    noProgressStreak = 0;
    state.finalStatus = "RUNNING";
    state.stopReason = null;
    await saveState();
    onEvent({ type: "impasse.arbitration.completed", cycle, result: revision });
    return true;
  };

  const runStage = async (agent, operation) => {
    const startedAt = new Date().toISOString();
    let lastProgressSave = 0;
    state.activeAgent = {
      name: agent,
      startedAt,
      lastActivityAt: startedAt,
      detail: "iniciado",
    };
    await saveState();

    const onProgress = (progress) => {
      if (!state.activeAgent || state.activeAgent.name !== agent) return;
      state.activeAgent.lastActivityAt = new Date().toISOString();
      state.activeAgent.detail = progress.detail;
      state.activeAgent.elapsedSeconds = progress.elapsedSeconds;
      if (progress.kind === "usage" && progress.usage) {
        const usage = progress.usage;
        const totals = state.usage;
        const agentUsage = totals.byAgent[agent] ?? {
          inputTokens: 0,
          cachedInputTokens: 0,
          outputTokens: 0,
          reasoningOutputTokens: 0,
        };
        const inputTokens = usage.input_tokens ?? 0;
        const cachedInputTokens = usage.cached_input_tokens ?? 0;
        const outputTokens = usage.output_tokens ?? 0;
        const reasoningOutputTokens = usage.reasoning_output_tokens ?? 0;
        totals.inputTokens += inputTokens;
        totals.cachedInputTokens += cachedInputTokens;
        totals.outputTokens += outputTokens;
        totals.reasoningOutputTokens += reasoningOutputTokens;
        agentUsage.inputTokens += inputTokens;
        agentUsage.cachedInputTokens += cachedInputTokens;
        agentUsage.outputTokens += outputTokens;
        agentUsage.reasoningOutputTokens += reasoningOutputTokens;
        totals.byAgent[agent] = agentUsage;
      }
      onEvent({ type: "agent.progress", agent, ...progress });
      if (Date.now() - lastProgressSave >= 15_000) {
        lastProgressSave = Date.now();
        void saveState();
      }
    };

    try {
      return await operation(onProgress);
    } finally {
      state.sessionIds =
        runtime.getSessionIds?.() ?? runtime.getThreadIds?.() ?? null;
      state.threadIds = state.sessionIds;
      state.activeAgent = null;
      await saveState();
    }
  };

  const finish = async (status, reason) => {
    state.finalStatus = status;
    state.stopReason = reason;
    state.finishedAt = new Date().toISOString();
    state.activeAgent = null;
    state.sessionIds =
      runtime.getSessionIds?.() ?? runtime.getThreadIds?.() ?? null;
    state.threadIds = state.sessionIds;
    await saveState();
    onEvent({ type: "loop.completed", status, reason });
    return state;
  };

  let baselineEvidence = null;

  const planFeature = async ({ previousBrief = null, redesignFeedback = "" } = {}) => {
    const revision = Boolean(previousBrief);
    onEvent({ type: revision ? "lead.revision.started" : "lead.planning.started" });
    try {
      const result = await runStage("feature_lead", (onProgress) =>
        runtime.planFeature(
          {
            task,
            acceptanceCriteria,
            marketAnalysis,
            previousBrief,
            redesignFeedback,
            baselineEvidence,
            appRules,
          },
          { onProgress },
        ),
      );
      onEvent({
        type: revision ? "lead.revision.completed" : "lead.planning.completed",
        result,
      });
      return result;
    } catch (error) {
      if (error.code === "AGENT_TIMEOUT" && runtime.continueFeaturePlanning) {
        onEvent({ type: "lead.planning.continuation.started" });
        try {
          const result = await runStage("feature_lead", (onProgress) =>
            runtime.continueFeaturePlanning({ onProgress }),
          );
          onEvent({
            type: revision ? "lead.revision.completed" : "lead.planning.completed",
            result,
          });
          return result;
        } catch (continuationError) {
          error = continuationError;
        }
      }
      const result = {
        status: "BLOCKED",
        summary: error.message,
        blockers: [error.message],
      };
      onEvent({
        type: revision ? "lead.revision.completed" : "lead.planning.completed",
        result,
      });
      return result;
    }
  };

  await saveState();

  if (precomputedMarketAnalysis) {
    marketAnalysis = precomputedMarketAnalysis;
    state.marketAnalysis = marketAnalysis;
    await saveState();
  } else if (marketing && marketing.mode !== "none") {
    onEvent({ type: "marketing.started" });
    try {
      marketAnalysis = await runStage("market_analyst", (onProgress) =>
        runtime.runMarketAnalysis(
          {
            task,
            acceptanceCriteria,
            appContext: marketing.appContext,
            competitors: marketing.competitors,
          },
          { onProgress },
        ),
      );
    } catch (error) {
      marketAnalysis = {
        status: "BLOCKED",
        summary: error.message,
        signals: [],
        opportunities: [],
        risks: [],
        featureContext: [],
        accessedAt: new Date().toISOString(),
      };
    }
    state.marketAnalysis = marketAnalysis;
    await saveState();
    onEvent({ type: "marketing.completed", result: marketAnalysis });
  }

  const wantsBaseline =
    Boolean(screenTestDriver) &&
    (planOnly ||
      gateOverrides.screenTest === true ||
      gateOverrides.designCheck === true);
  if (wantsBaseline) {
    onEvent({ type: "baseline.started" });
    try {
      baselineEvidence = await screenTestDriver.collectEvidence({ cycle: 0 });
      onEvent({ type: "baseline.completed", evidence: baselineEvidence });
    } catch (error) {
      onEvent({ type: "baseline.failed", message: error.message });
    }
  }

  if (resumedBrief) {
    designBrief = resumedBrief;
    state.designBrief = designBrief;
    await saveState();
    onEvent({ type: "plan.resumed", result: designBrief });
  } else {
    designBrief = await planFeature();
    state.designBrief = designBrief;
    await saveState();
  }
  if (designBrief.status === "BLOCKED") {
    const rescue = await tryEscalation("feature_lead", (escalated) =>
      runStage("feature_lead", (onProgress) =>
        escalated.planFeature(
          {
            task,
            acceptanceCriteria,
            marketAnalysis,
            previousBrief: null,
            redesignFeedback: "",
            baselineEvidence,
            appRules,
          },
          { onProgress },
        ),
      ),
      designBrief.summary,
    );
    if (!rescue) return finish("BLOCKED", "feature_lead_blocked");
    designBrief = rescue;
    state.designBrief = designBrief;
    await saveState();
  }
  if (planOnly) {
    onEvent({ type: "plan.only", result: designBrief });
    return finish("STOPPED", "plan_only");
  }
  if (designBrief.worthBuilding === "no") {
    onEvent({ type: "worth.rejected", result: designBrief });
    return finish("STOPPED", "not_worth_building");
  }

  for (let cycle = 1; cycle <= maxCycles; cycle += 1) {
    if (budgetExhausted()) {
      onEvent({ type: "budget.exhausted", usage: state.usage });
      return finish("STOPPED", "token_budget_exhausted");
    }
    onEvent({ type: "cycle.started", cycle });
    let implementationResult;
    try {
      implementationResult = await runStage("feature_lead", (onProgress) =>
        runtime.implementFeature(
          {
            task,
            acceptanceCriteria,
            cycle,
            feedback,
            designBrief,
            marketAnalysis,
            contractDelivered,
          },
          { onProgress },
        ),
      );
    } catch (error) {
      if (error.code === "AGENT_TIMEOUT" && runtime.continueFeatureLead) {
        onEvent({ type: "implementation.continuation.started", cycle });
        try {
          implementationResult = await runStage("feature_lead", (onProgress) =>
            runtime.continueFeatureLead(
              { cycle, feedback },
              { onProgress },
            ),
          );
          onEvent({
            type: "implementation.continuation.completed",
            cycle,
            result: implementationResult,
          });
        } catch (continuationError) {
          implementationResult = blockedResult(continuationError.message);
        }
      } else {
        implementationResult = blockedResult(error.message);
      }
    }
    onEvent({ type: "implementation.completed", cycle, result: implementationResult });
    contractDelivered = true;

    let afterFingerprint = await fingerprint(projectPath);
    let cycleDiff;
    const diffForCycle = async () => {
      if (cycleDiff === undefined) cycleDiff = await collectDiff(projectPath);
      return cycleDiff;
    };
    let madeWorkspaceProgress =
      beforeFingerprint === null ||
      afterFingerprint === null ||
      beforeFingerprint !== afterFingerprint;
    const cycleState = {
      cycle,
      madeWorkspaceProgress,
      implementation: implementationResult,
      codeReview: null,
      tester: null,
      designRevision: null,
      audit: null,
    };

    if (implementationResult.status === "BLOCKED") {
      const escalate =
        needsBriefRevision(implementationResult) &&
        !briefRevisedForBlock &&
        cycle < maxCycles;

      if (!escalate) {
        const rescue = await tryEscalation("feature_lead", (escalated) =>
          runStage("feature_lead", (onProgress) =>
            escalated.implementFeature(
              {
                task,
                acceptanceCriteria,
                cycle,
                feedback,
                designBrief,
                marketAnalysis,
                contractDelivered: false,
              },
              { onProgress },
            ),
          ),
          implementationResult.summary,
        );
        if (!rescue) {
          state.cycles.push(cycleState);
          return finish("BLOCKED", "feature_lead_implementation_blocked");
        }
        implementationResult = rescue;
        cycleState.implementation = rescue;
        afterFingerprint = await fingerprint(projectPath);
        madeWorkspaceProgress =
          beforeFingerprint === null ||
          afterFingerprint === null ||
          beforeFingerprint !== afterFingerprint;
        cycleState.madeWorkspaceProgress = madeWorkspaceProgress;
      }
    }

    if (implementationResult.status === "BLOCKED") {
      briefRevisedForBlock = true;
      onEvent({ type: "redesign.escalated", cycle, result: implementationResult });
      const revision = await planFeature({
        previousBrief: designBrief,
        redesignFeedback:
          `${feedback}\n\nA implementação recusou por exigir mudança de direção:\n` +
          `${implementationResult.summary}\n\n` +
          "Revise o brief para acomodar ou descartar esses achados de forma explícita.",
      });
      cycleState.designRevision = revision;
      state.cycles.push(cycleState);
      if (revision.status === "BLOCKED") {
        return finish("BLOCKED", "feature_lead_revision_blocked");
      }
      designBrief = revision;
      state.designBrief = revision;
      contractDelivered = false;
      primedSpecialists.code_reviewer = false;
      primedSpecialists.ux_auditor = false;
      // O brief novo já absorveu (ou descartou) os achados via redesignFeedback;
      // reinjetar o feedback antigo re-bloquearia a implementação contra o
      // contrato novo.
      setFeedback("");
      await saveState();
      noProgressStreak = madeWorkspaceProgress ? 0 : noProgressStreak + 1;
      beforeFingerprint = afterFingerprint;
      continue;
    }

    if (budgetExhausted()) {
      state.cycles.push(cycleState);
      onEvent({ type: "budget.exhausted", usage: state.usage });
      return finish("STOPPED", "token_budget_exhausted");
    }

    const gates = resolveGates(designBrief, gateOverrides);

    if (gates.codeReview) {
      onEvent({ type: "code_review.started", cycle });
      const codeReviewDiff = await diffForCycle();
      try {
        cycleState.codeReview = await runStage("code_reviewer", (onProgress) =>
          runtime.runCodeReview(
            {
              task,
              acceptanceCriteria,
              cycle,
              designBrief,
              implementationResult,
              diff: codeReviewDiff,
              sessionPrimed: primedSpecialists.code_reviewer,
            },
            { onProgress },
          ),
        );
        primedSpecialists.code_reviewer = true;
      } catch (error) {
        cycleState.codeReview = {
          status: "BLOCKED",
          summary: error.message,
          findings: [],
          checksPerformed: [],
        };
      }
      onEvent({
        type: "code_review.completed",
        cycle,
        result: cycleState.codeReview,
      });

      if (cycleState.codeReview.status === "BLOCKED") {
        const rescue = await tryEscalation("code_reviewer", (escalated) =>
          runStage("code_reviewer", (onProgress) =>
            escalated.runCodeReview(
              {
                task,
                acceptanceCriteria,
                cycle,
                designBrief,
                implementationResult,
                diff: codeReviewDiff,
                sessionPrimed: false,
              },
              { onProgress },
            ),
          ),
          cycleState.codeReview.summary,
        );
        if (!rescue) {
          state.cycles.push(cycleState);
          return finish("BLOCKED", "code_review_blocked");
        }
        cycleState.codeReview = rescue;
      }
      if (cycleState.codeReview.status === "CHANGES_REQUIRED") {
        state.cycles.push(cycleState);
        const shouldRetry = chooseRetryOrStop({
          state,
          cycle,
          maxCycles,
          madeWorkspaceProgress,
          noProgressStreak,
          signature: `code:${reviewSignature(cycleState.codeReview)}`,
          seenSignatures: seenIssueSignatures,
          repeatedReason: "repeated_code_findings",
        });
        if (!shouldRetry) {
          if (
            state.stopReason !== "max_cycles_reached" &&
            (await arbitrateImpasse({
              cycle,
              reason: state.stopReason,
              review: cycleState.codeReview,
              implementationResult,
            }))
          ) {
            beforeFingerprint = afterFingerprint;
            continue;
          }
          return finish(state.finalStatus, state.stopReason);
        }
        setFeedback(reviewToFeedback(cycleState.codeReview));
        await saveState();
        noProgressStreak = madeWorkspaceProgress ? 0 : noProgressStreak + 1;
        beforeFingerprint = afterFingerprint;
        continue;
      }
    }

    if (budgetExhausted()) {
      state.cycles.push(cycleState);
      onEvent({ type: "budget.exhausted", usage: state.usage });
      return finish("STOPPED", "token_budget_exhausted");
    }

    let evidence = null;
    const needsVisualAudit = gates.designCheck || marketing?.mode === "full";
    const needsScreenEvidence = gates.screenTest || needsVisualAudit;
    if (screenTestDriver && needsScreenEvidence) {
      onEvent({ type: "tester.started", cycle });
      try {
        evidence = await screenTestDriver.collectEvidence({ cycle });
      } catch (error) {
        if (error.code !== "BUILD_FAILED" && error.code !== "STEP_FAILED") {
          // Infra (device/Metro/adb) indisponível não é falha da feature:
          // encerra como STOPPED retomável em vez de BLOCKED terminal.
          state.cycles.push(cycleState);
          onEvent({ type: "evidence.unavailable", cycle, message: error.message });
          return finish("STOPPED", "screen_evidence_infra_unavailable");
        }
        cycleState.tester = evidenceFailureResult(error);
      }
      if (!cycleState.tester) {
        try {
          cycleState.tester = await runStage("tester", (onProgress) =>
            runtime.runTester(
              {
                task,
                acceptanceCriteria,
                cycle,
                implementationResult,
                evidence,
                designBrief,
                sessionPrimed: primedSpecialists.tester,
              },
              { onProgress },
            ),
          );
          primedSpecialists.tester = true;
        } catch (error) {
          cycleState.tester = {
            status: "BLOCKED",
            summary: error.message,
            findings: [],
            observations: [],
          };
        }
      }

      // Falta de evidência não é defeito: o tester itera com o DEVICE, não com
      // o lead — até 3 rodadas de captura por ciclo, encerrando cedo se ele
      // repetir exatamente os mesmos passos (não aprendeu, insistir não muda).
      let previousStepsKey = null;
      for (let round = 1; round <= 3; round += 1) {
        // PASS com requestedSteps = "aprovo o que vi, quero confirmar o resto":
        // a rodada roda do mesmo jeito — só BLOCKED não pede evidência.
        if (
          cycleState.tester.status === "BLOCKED" ||
          !cycleState.tester.requestedSteps?.length
        ) {
          break;
        }
        const stepsKey = JSON.stringify(cycleState.tester.requestedSteps);
        if (stepsKey === previousStepsKey) break;
        previousStepsKey = stepsKey;
        onEvent({
          type: "tester.evidence.requested",
          cycle,
          round,
          steps: cycleState.tester.requestedSteps.length,
        });
        try {
          evidence = await screenTestDriver.collectEvidence({
            cycle: `${cycle}-extra${round > 1 ? `-${round}` : ""}`,
            extraSteps: cycleState.tester.requestedSteps,
          });
          cycleState.testerBeforeEvidence = cycleState.tester;
          cycleState.tester = await runStage("tester", (onProgress) =>
            runtime.runTester(
              {
                task,
                acceptanceCriteria,
                cycle,
                implementationResult,
                evidence,
                designBrief,
                sessionPrimed: true,
              },
              { onProgress },
            ),
          );
        } catch (error) {
          onEvent({
            type: "tester.evidence.failed",
            cycle,
            message: error.message,
          });
          break;
        }
        if (budgetExhausted()) break;
      }
      // FAIL sem achados não dá ao lead nada para corrigir: um ciclo inteiro
      // seria queimado à toa. Vira BLOCKED de evidência — rota do fallback.
      if (
        cycleState.tester.status === "FAIL" &&
        !cycleState.tester.findings?.length
      ) {
        cycleState.tester = {
          ...cycleState.tester,
          status: "BLOCKED",
          summary: `FAIL sem achados acionáveis: ${cycleState.tester.summary}`,
        };
      }

      onEvent({ type: "tester.completed", cycle, result: cycleState.tester });

      if (cycleState.tester.status === "BLOCKED") {
        const rescue = await tryEscalation("tester", (escalated) =>
          runStage("tester", (onProgress) =>
            escalated.runTester(
              {
                task,
                acceptanceCriteria,
                cycle,
                implementationResult,
                evidence,
                designBrief,
                sessionPrimed: false,
              },
              { onProgress },
            ),
          ),
          cycleState.tester.summary,
        );
        if (!rescue) {
          state.cycles.push(cycleState);
          return finish("BLOCKED", "tester_blocked");
        }
        cycleState.tester = rescue;
      }
      if (cycleState.tester.status === "FAIL") {
        state.cycles.push(cycleState);
        const shouldRetry = chooseRetryOrStop({
          state,
          cycle,
          maxCycles,
          madeWorkspaceProgress,
          noProgressStreak,
          signature: `tester:${reviewSignature(cycleState.tester)}`,
          seenSignatures: seenIssueSignatures,
          repeatedReason: "repeated_test_findings",
        });
        if (!shouldRetry) {
          if (
            state.stopReason !== "max_cycles_reached" &&
            (await arbitrateImpasse({
              cycle,
              reason: state.stopReason,
              review: cycleState.tester,
              implementationResult,
            }))
          ) {
            beforeFingerprint = afterFingerprint;
            continue;
          }
          return finish(state.finalStatus, state.stopReason);
        }
        setFeedback(reviewToFeedback(cycleState.tester));
        await saveState();
        noProgressStreak = madeWorkspaceProgress ? 0 : noProgressStreak + 1;
        beforeFingerprint = afterFingerprint;
        continue;
      }
    }

    if (needsVisualAudit && !evidence) {
      state.cycles.push(cycleState);
      return finish("STOPPED", "design_evidence_unavailable");
    }

    if (budgetExhausted()) {
      state.cycles.push(cycleState);
      onEvent({ type: "budget.exhausted", usage: state.usage });
      return finish("STOPPED", "token_budget_exhausted");
    }

    const needsAudit = needsVisualAudit || gates.uxAudit;
    if (needsAudit) {
      onEvent({ type: "audit.started", cycle });
      const auditDiff = await diffForCycle();
      try {
        cycleState.audit = await runStage("ux_auditor", (onProgress) =>
          runtime.runAudit(
            {
              task,
              acceptanceCriteria,
              cycle,
              designBrief,
              marketAnalysis,
              implementationResult,
              evidence,
              diff: auditDiff,
              sessionPrimed: primedSpecialists.ux_auditor,
            },
            { onProgress },
          ),
        );
        primedSpecialists.ux_auditor = true;
      } catch (error) {
        cycleState.audit = {
          status: "BLOCKED",
          summary: error.message,
          requiresRedesign: false,
          findings: [],
          checksPerformed: [],
        };
      }
      onEvent({
        type: "audit.completed",
        cycle,
        result: cycleState.audit,
      });

      state.cycles.push(cycleState);
      if (cycleState.audit.status === "PASS") {
        return finish("PASS", "audit_passed");
      }
      if (cycleState.audit.status === "BLOCKED") {
        const rescue = await tryEscalation("ux_auditor", (escalated) =>
          runStage("ux_auditor", (onProgress) =>
            escalated.runAudit(
              {
                task,
                acceptanceCriteria,
                cycle,
                designBrief,
                marketAnalysis,
                implementationResult,
                evidence,
                diff: auditDiff,
                sessionPrimed: false,
              },
              { onProgress },
            ),
          ),
          cycleState.audit.summary,
        );
        if (!rescue) return finish("BLOCKED", "auditor_blocked");
        cycleState.audit = rescue;
        if (rescue.status === "PASS") return finish("PASS", "audit_passed");
      }

      const issueFeedback = reviewToFeedback(cycleState.audit);
      const shouldRetry = chooseRetryOrStop({
        state,
        cycle,
        maxCycles,
        madeWorkspaceProgress,
        noProgressStreak,
        signature: `audit:${reviewSignature(cycleState.audit)}`,
        seenSignatures: seenIssueSignatures,
        repeatedReason: "repeated_audit_findings",
      });
      if (!shouldRetry) {
        if (
          state.stopReason !== "max_cycles_reached" &&
          (await arbitrateImpasse({
            cycle,
            reason: state.stopReason,
            review: cycleState.audit,
            implementationResult,
          }))
        ) {
          beforeFingerprint = afterFingerprint;
          continue;
        }
        return finish(state.finalStatus, state.stopReason);
      }
      if (cycleState.audit.requiresRedesign) {
        const revision = await planFeature({
          previousBrief: designBrief,
          redesignFeedback: issueFeedback,
        });
        cycleState.designRevision = revision;
        if (revision.status === "BLOCKED") {
          return finish("BLOCKED", "feature_lead_revision_blocked");
        }
        designBrief = revision;
        state.designBrief = revision;
        contractDelivered = false;
        primedSpecialists.code_reviewer = false;
        primedSpecialists.ux_auditor = false;
        setFeedback("");
      } else {
        setFeedback(issueFeedback);
      }
      await saveState();
      noProgressStreak = madeWorkspaceProgress ? 0 : noProgressStreak + 1;
      beforeFingerprint = afterFingerprint;
      continue;
    }

    state.cycles.push(cycleState);
    return finish("PASS", "implementation_completed");
  }

  throw new Error("Loop terminou sem estado final.");
}
