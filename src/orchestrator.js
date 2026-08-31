import { workspaceFingerprint } from "./workspace.js";

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
  signature,
  seenSignatures,
  repeatedReason,
}) {
  if (seenSignatures.has(signature)) {
    state.finalStatus = "STOPPED";
    state.stopReason = repeatedReason;
    return false;
  }
  if (cycle > 1 && !madeWorkspaceProgress) {
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
  fingerprint = workspaceFingerprint,
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
  let feedback = "";
  let marketAnalysis = null;
  let designBrief = null;
  let beforeFingerprint = await fingerprint(projectPath);
  let saveChain = Promise.resolve();

  const saveState = () => {
    const snapshot = structuredClone(state);
    saveChain = saveChain.then(() => stateStore.save(snapshot));
    return saveChain;
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

  if (marketing && marketing.mode !== "none") {
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
        competitors: [],
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

  designBrief = await planFeature();
  state.designBrief = designBrief;
  await saveState();
  if (designBrief.status === "BLOCKED") {
    return finish("BLOCKED", "feature_lead_blocked");
  }

  for (let cycle = 1; cycle <= maxCycles; cycle += 1) {
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

    const afterFingerprint = await fingerprint(projectPath);
    const madeWorkspaceProgress =
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
      state.cycles.push(cycleState);
      return finish("BLOCKED", "feature_lead_implementation_blocked");
    }

    if (designBrief.requiresCodeReview) {
      onEvent({ type: "code_review.started", cycle });
      try {
        cycleState.codeReview = await runStage("code_reviewer", (onProgress) =>
          runtime.runCodeReview(
            {
              task,
              acceptanceCriteria,
              cycle,
              designBrief,
              implementationResult,
            },
            { onProgress },
          ),
        );
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
        state.cycles.push(cycleState);
        return finish("BLOCKED", "code_review_blocked");
      }
      if (cycleState.codeReview.status === "CHANGES_REQUIRED") {
        state.cycles.push(cycleState);
        const shouldRetry = chooseRetryOrStop({
          state,
          cycle,
          maxCycles,
          madeWorkspaceProgress,
          signature: `code:${reviewSignature(cycleState.codeReview)}`,
          seenSignatures: seenIssueSignatures,
          repeatedReason: "repeated_code_findings",
        });
        if (!shouldRetry) return finish(state.finalStatus, state.stopReason);
        feedback = reviewToFeedback(cycleState.codeReview);
        await saveState();
        beforeFingerprint = afterFingerprint;
        continue;
      }
    }

    let evidence = null;
    const needsVisualAudit =
      designBrief.requiresDesignCheck || marketing?.mode === "full";
    const needsScreenEvidence =
      designBrief.requiresScreenTest || needsVisualAudit;
    if (screenTestDriver && needsScreenEvidence) {
      onEvent({ type: "tester.started", cycle });
      try {
        evidence = await screenTestDriver.collectEvidence({ cycle });
        cycleState.tester = await runStage("tester", (onProgress) =>
          runtime.runTester(
            {
              task,
              acceptanceCriteria,
              cycle,
              implementationResult,
              evidence,
            },
            { onProgress },
          ),
        );
      } catch (error) {
        cycleState.tester = {
          status: "BLOCKED",
          summary: error.message,
          findings: [],
          observations: [],
        };
      }
      onEvent({ type: "tester.completed", cycle, result: cycleState.tester });

      if (cycleState.tester.status === "BLOCKED") {
        state.cycles.push(cycleState);
        return finish("BLOCKED", "tester_blocked");
      }
      if (cycleState.tester.status === "FAIL") {
        state.cycles.push(cycleState);
        const shouldRetry = chooseRetryOrStop({
          state,
          cycle,
          maxCycles,
          madeWorkspaceProgress,
          signature: `tester:${reviewSignature(cycleState.tester)}`,
          seenSignatures: seenIssueSignatures,
          repeatedReason: "repeated_test_findings",
        });
        if (!shouldRetry) return finish(state.finalStatus, state.stopReason);
        feedback = reviewToFeedback(cycleState.tester);
        await saveState();
        beforeFingerprint = afterFingerprint;
        continue;
      }
    }

    if (needsVisualAudit && !evidence) {
      state.cycles.push(cycleState);
      return finish("STOPPED", "design_evidence_unavailable");
    }

    const needsAudit = needsVisualAudit || designBrief.requiresUxAudit;
    if (needsAudit) {
      onEvent({ type: "audit.started", cycle });
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
            },
            { onProgress },
          ),
        );
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
        return finish("BLOCKED", "auditor_blocked");
      }

      const issueFeedback = reviewToFeedback(cycleState.audit);
      const shouldRetry = chooseRetryOrStop({
        state,
        cycle,
        maxCycles,
        madeWorkspaceProgress,
        signature: `audit:${reviewSignature(cycleState.audit)}`,
        seenSignatures: seenIssueSignatures,
        repeatedReason: "repeated_audit_findings",
      });
      if (!shouldRetry) return finish(state.finalStatus, state.stopReason);
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
      }
      feedback = issueFeedback;
      await saveState();
      beforeFingerprint = afterFingerprint;
      continue;
    }

    state.cycles.push(cycleState);
    return finish("PASS", "implementation_completed");
  }

  throw new Error("Loop terminou sem estado final.");
}
