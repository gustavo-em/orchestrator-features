import { Codex } from "@openai/codex-sdk";

import { codeReviewer } from "../agents/code-reviewer.js";
import { featureLead } from "../agents/feature-lead.js";
import { marketAnalyst } from "../agents/market-analyst.js";
import { tester } from "../agents/tester.js";
import { uxAuditor } from "../agents/ux-auditor.js";
import {
  codeReviewerOutputSchema,
  featurePlanOutputSchema,
  implementationOutputSchema,
  marketAnalysisOutputSchema,
  auditorOutputSchema,
  testerOutputSchema,
} from "./schemas.js";
import {
  AgentTimeoutError,
  compactOptions,
  parseStructuredResponse,
  safeProgress,
} from "./runtime-common.js";

export { AgentTimeoutError } from "./runtime-common.js";

export function buildInternalCodexConfig(
  disabledMcpServers = ["expo_mcp"],
) {
  return {
    mcp_servers: Object.fromEntries(
      disabledMcpServers.map((server) => [server, { enabled: false }]),
    ),
  };
}

function progressDetail(event) {
  if (event.type === "thread.started") return "thread iniciada";
  if (event.type === "turn.started") return "turno iniciado";
  if (event.type === "turn.completed") return "resposta concluída";
  if (!event.item) return event.type;
  if (event.item.type === "command_execution") {
    return event.type === "item.completed"
      ? `comando concluído (${event.item.exit_code ?? "?"})`
      : "comando em execução";
  }
  if (event.item.type === "file_change") {
    return `arquivos atualizados: ${event.item.changes.length}`;
  }
  if (event.item.type === "web_search") return "pesquisa web";
  if (event.item.type === "mcp_tool_call") return "ferramenta em execução";
  if (event.item.type === "todo_list") return "plano atualizado";
  if (event.item.type === "reasoning") return "analisando";
  if (event.item.type === "agent_message") return "preparando resposta";
  if (event.item.type === "error") return "erro reportado";
  return event.item.type;
}

async function runStructuredTurn({
  thread,
  input,
  outputSchema,
  agentName,
  timeoutMs,
  heartbeatMs,
  onProgress,
}) {
  const controller = new AbortController();
  const startedAt = Date.now();
  let timedOut = false;
  let finalResponse = "";
  let turnFailure = null;

  const heartbeat = setInterval(() => {
    safeProgress(onProgress, {
      kind: "heartbeat",
      detail: "trabalhando",
      elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
    });
  }, heartbeatMs);
  heartbeat.unref?.();

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  safeProgress(onProgress, {
    kind: "started",
    detail: "iniciado",
    elapsedSeconds: 0,
  });

  try {
    const streamed = await thread.runStreamed(input, {
      outputSchema,
      signal: controller.signal,
    });
    for await (const event of streamed.events) {
      if (
        event.type === "item.completed" &&
        event.item.type === "agent_message"
      ) {
        finalResponse = event.item.text;
      } else if (event.type === "turn.failed") {
        turnFailure = event.error;
      } else if (event.type === "error") {
        turnFailure = { message: event.message };
      }
      if (event.type === "turn.completed") {
        safeProgress(onProgress, {
          kind: "usage",
          detail: "tokens contabilizados",
          elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
          usage: event.usage,
        });
      }
      safeProgress(onProgress, {
        kind: "activity",
        detail: progressDetail(event),
        elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
      });
    }
    if (turnFailure) throw new Error(turnFailure.message);
    return parseStructuredResponse(finalResponse, agentName);
  } catch (error) {
    if (timedOut) throw new AgentTimeoutError(agentName, timeoutMs);
    throw error;
  } finally {
    clearInterval(heartbeat);
    clearTimeout(timeout);
  }
}

function imageInput(prompt, evidence) {
  return [
    { type: "text", text: prompt },
    ...(evidence?.screenshots ?? []).map((screenshot) => ({
      type: "local_image",
      path: screenshot.path,
    })),
  ];
}

export class CodexAgentRuntime {
  constructor({
    projectPath,
    model,
    reasoningEffort,
    designReasoningEffort = reasoningEffort ?? "high",
    codeReasoningEffort = reasoningEffort ?? "low",
    specialistReasoningEffort = "medium",
    agentTimeoutMs = 10 * 60_000,
    implementationTimeoutMs = Math.max(agentTimeoutMs * 3, 30 * 60_000),
    heartbeatMs = 15_000,
    codex,
    disabledMcpServers = ["expo_mcp"],
    threadIds = {},
    auxiliaryModel,
  }) {
    const codexClient =
      codex ??
      new Codex({
        config: buildInternalCodexConfig(disabledMcpServers),
      });
    this.agentTimeoutMs = agentTimeoutMs;
    this.implementationTimeoutMs = implementationTimeoutMs;
    this.heartbeatMs = heartbeatMs;
    this.reasoningProfile = {
      design: designReasoningEffort,
      code: codeReasoningEffort,
    };
    const sharedOptions = {
      workingDirectory: projectPath,
      skipGitRepoCheck: true,
      model,
      networkAccessEnabled: false,
      webSearchMode: "disabled",
      approvalPolicy: "never",
    };

    const specialistOptions = compactOptions({
      ...sharedOptions,
      model: auxiliaryModel ?? model,
      sandboxMode: "read-only",
    });
    this.threadSlots = {
      feature_lead: {
        savedId: threadIds.feature_lead,
        optionsByPhase: {
          design: compactOptions({
            ...sharedOptions,
            threadSource: "orquestrador-features/feature-lead-design",
            sandboxMode: "workspace-write",
            modelReasoningEffort: designReasoningEffort,
          }),
          code: compactOptions({
            ...sharedOptions,
            threadSource: "orquestrador-features/feature-lead-code",
            sandboxMode: "workspace-write",
            modelReasoningEffort: codeReasoningEffort,
          }),
        },
        phase: null,
        thread: null,
      },
      ux_auditor: {
        savedId: threadIds.ux_auditor,
        options: compactOptions({
          ...specialistOptions,
          threadSource: "orquestrador-features/ux-auditor",
          modelReasoningEffort: specialistReasoningEffort,
        }),
        thread: null,
      },
      tester: {
        savedId: threadIds.tester,
        options: compactOptions({
          ...specialistOptions,
          threadSource: "orquestrador-features/tester",
          modelReasoningEffort: "low",
        }),
        thread: null,
      },
      code_reviewer: {
        savedId: threadIds.code_reviewer,
        options: compactOptions({
          ...specialistOptions,
          threadSource: "orquestrador-features/code-reviewer",
          modelReasoningEffort: "low",
        }),
        thread: null,
      },
      market_analyst: {
        savedId: threadIds.market_analyst,
        options: compactOptions({
          ...specialistOptions,
          threadSource: "orquestrador-features/market-analyst",
          modelReasoningEffort: specialistReasoningEffort,
          networkAccessEnabled: true,
          webSearchMode: "live",
        }),
        thread: null,
      },
    };
    this.openThread = (agentName) => {
      const slot = this.threadSlots[agentName];
      if (!slot.thread) {
        slot.thread = slot.savedId
          ? codexClient.resumeThread(slot.savedId, slot.options)
          : codexClient.startThread(slot.options);
      }
      return slot.thread;
    };
    this.openFeatureLead = (phase) => {
      const slot = this.threadSlots.feature_lead;
      const options = slot.optionsByPhase[phase];
      if (!slot.thread) {
        slot.thread = slot.savedId
          ? codexClient.resumeThread(slot.savedId, options)
          : codexClient.startThread(options);
        slot.phase = phase;
        return slot.thread;
      }
      if (slot.phase === phase) return slot.thread;

      const sessionId = slot.thread.id ?? slot.savedId;
      if (!sessionId) {
        throw new Error(
          `feature_lead não possui ID para trocar reasoning para ${phase}.`,
        );
      }
      slot.savedId = sessionId;
      slot.thread = codexClient.resumeThread(sessionId, options);
      slot.phase = phase;
      return slot.thread;
    };
  }

  run(
    thread,
    input,
    outputSchema,
    agentName,
    onProgress,
    timeoutMs = this.agentTimeoutMs,
  ) {
    return runStructuredTurn({
      thread,
      input,
      outputSchema,
      agentName,
      timeoutMs,
      heartbeatMs: this.heartbeatMs,
      onProgress,
    });
  }

  planFeature(context, { onProgress } = {}) {
    return this.run(
      this.openFeatureLead("design"),
      featureLead.buildPlanningPrompt(context),
      featurePlanOutputSchema,
      featureLead.name,
      onProgress,
    );
  }

  implementFeature(context, { onProgress } = {}) {
    return this.run(
      this.openFeatureLead("code"),
      featureLead.buildImplementationPrompt(context),
      implementationOutputSchema,
      featureLead.name,
      onProgress,
      this.implementationTimeoutMs,
    );
  }

  continueFeaturePlanning({ onProgress } = {}) {
    return this.run(
      this.openFeatureLead("design"),
      featureLead.buildPlanningContinuationPrompt(),
      featurePlanOutputSchema,
      featureLead.name,
      onProgress,
    );
  }

  continueFeatureLead(context, { onProgress } = {}) {
    return this.run(
      this.openFeatureLead("code"),
      featureLead.buildContinuationPrompt(context),
      implementationOutputSchema,
      featureLead.name,
      onProgress,
      this.implementationTimeoutMs,
    );
  }

  runTester(context, { onProgress } = {}) {
    return this.run(this.openThread("tester"), imageInput(tester.buildPrompt(context), context.evidence), testerOutputSchema, tester.name, onProgress);
  }

  runCodeReview(context, { onProgress } = {}) {
    return this.run(
      this.openThread("code_reviewer"),
      codeReviewer.buildPrompt(context),
      codeReviewerOutputSchema,
      codeReviewer.name,
      onProgress,
    );
  }

  runAudit(context, { onProgress } = {}) {
    return this.run(this.openThread("ux_auditor"), imageInput(uxAuditor.buildPrompt(context), context.evidence), auditorOutputSchema, uxAuditor.name, onProgress);
  }

  runMarketAnalysis(context, { onProgress } = {}) {
    return this.run(this.openThread("market_analyst"), marketAnalyst.buildDiscoveryPrompt(context), marketAnalysisOutputSchema, marketAnalyst.name, onProgress);
  }

  getThreadIds() {
    return {
      feature_lead: this.threadSlots.feature_lead.thread?.id ?? null,
      code_reviewer: this.threadSlots.code_reviewer.thread?.id ?? null,
      market_analyst: this.threadSlots.market_analyst.thread?.id ?? null,
      tester: this.threadSlots.tester.thread?.id ?? null,
      ux_auditor: this.threadSlots.ux_auditor.thread?.id ?? null,
    };
  }

  getSessionIds() {
    return this.getThreadIds();
  }

  getProvider() {
    return "codex";
  }

  getReasoningProfile() {
    return { ...this.reasoningProfile };
  }
}
