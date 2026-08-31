import { Codex } from "@openai/codex-sdk";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { codeReviewer } from "../agents/code-reviewer.js";
import { featureLead } from "../agents/feature-lead.js";
import { marketAnalyst, marketLanes } from "../agents/market-analyst.js";
import { tester } from "../agents/tester.js";
import { uxAuditor } from "../agents/ux-auditor.js";
import {
  codeReviewerOutputSchema,
  featurePlanOutputSchema,
  implementationOutputSchema,
  marketLaneOutputSchema,
  auditorOutputSchema,
  testerOutputSchema,
} from "./schemas.js";
import {
  AgentTimeoutError,
  compactOptions,
  parseStructuredResponse,
  runMarketLanes,
  safeProgress,
} from "./runtime-common.js";

export { AgentTimeoutError } from "./runtime-common.js";

const FALLBACK_MCP_SERVERS = [
  "expo_mcp",
  "figma",
  "github",
  "filesystem",
  "http_mcp",
  "metro_mcp",
  "react_native_mcp",
  "openaiDeveloperDocs",
  "businessmap_cards",
  "node_repl",
  "computer-use",
];

export function discoverCodexMcpServers(
  configPath = path.join(os.homedir(), ".codex", "config.toml"),
) {
  try {
    const raw = readFileSync(configPath, "utf8");
    const names = new Set();
    for (const match of raw.matchAll(/^\s*\[+\s*mcp_servers\.([A-Za-z0-9_.-]+)/gm)) {
      names.add(match[1].split(".")[0]);
    }
    return names.size ? [...names] : FALLBACK_MCP_SERVERS;
  } catch {
    return FALLBACK_MCP_SERVERS;
  }
}

export function buildInternalCodexConfig(disabledMcpServers) {
  const servers = disabledMcpServers ?? discoverCodexMcpServers();
  return {
    mcp_servers: Object.fromEntries(
      servers.map((server) => [server, { enabled: false }]),
    ),
  };
}

function shorten(value, maxLength = 60) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

function progressDetail(event) {
  if (event.type === "thread.started") return "sessão iniciada";
  if (event.type === "turn.started") return "turno iniciado";
  if (event.type === "turn.completed") return "resposta concluída";
  if (!event.item) return event.type;
  if (event.item.type === "command_execution") {
    const command = shorten(event.item.command, 52);
    if (event.type === "item.completed") {
      return `comando concluído (${event.item.exit_code ?? "?"})${command ? `: ${command}` : ""}`;
    }
    return command ? `rodando: ${command}` : "rodando comando";
  }
  if (event.item.type === "file_change") {
    const names = (event.item.changes ?? [])
      .map((change) => change.path?.split("/").pop())
      .filter(Boolean)
      .slice(0, 3);
    return names.length
      ? `editando ${names.join(", ")}`
      : `arquivos atualizados: ${event.item.changes.length}`;
  }
  if (event.item.type === "web_search") {
    return event.item.query
      ? `pesquisando "${shorten(event.item.query, 44)}"`
      : "pesquisando na web";
  }
  if (event.item.type === "mcp_tool_call") return "ferramenta externa";
  if (event.item.type === "todo_list") return "plano atualizado";
  if (event.item.type === "reasoning") return "raciocinando";
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
    disabledMcpServers,
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
    this.openMarketLane = (laneId) => {
      const name = `market_analyst:${laneId}`;
      if (!this.threadSlots[name]) {
        this.threadSlots[name] = {
          savedId: null,
          options: compactOptions({
            ...this.threadSlots.market_analyst.options,
            threadSource: `orquestrador-features/market-analyst-${laneId}`,
          }),
          thread: null,
        };
      }
      return this.openThread(name);
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
      imageInput(featureLead.buildPlanningPrompt(context), context.baselineEvidence),
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

  runMarketAnalysis(context, { onProgress, lanes = marketLanes } = {}) {
    return runMarketLanes({
      lanes,
      runLane: (lane) =>
        this.run(
          this.openMarketLane(lane.id),
          marketAnalyst.buildLanePrompt({ ...context, lane }),
          marketLaneOutputSchema,
          `${marketAnalyst.name}:${lane.id}`,
          (progress) => onProgress?.({ ...progress, lane: lane.id }),
        ),
    });
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
