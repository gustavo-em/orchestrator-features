import { query as defaultClaudeQuery } from "@anthropic-ai/claude-agent-sdk";
import { existsSync } from "node:fs";
import { lstat, mkdir, readlink, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { codeReviewer } from "../agents/code-reviewer.js";
import { featureLead } from "../agents/feature-lead.js";
import { marketAnalyst } from "../agents/market-analyst.js";
import { tester } from "../agents/tester.js";
import { uxAuditor } from "../agents/ux-auditor.js";
import {
  auditorOutputSchema,
  codeReviewerOutputSchema,
  featurePlanOutputSchema,
  implementationOutputSchema,
  marketAnalysisOutputSchema,
  testerOutputSchema,
} from "./schemas.js";
import {
  AgentTimeoutError,
  compactOptions,
  parseStructuredResponse,
  safeProgress,
} from "./runtime-common.js";

const READ_TOOLS = ["Read", "Glob", "Grep"];
const CODE_TOOLS = [...READ_TOOLS, "Edit", "Write", "Bash"];
const MARKET_TOOLS = [...READ_TOOLS, "WebSearch", "WebFetch"];
const DEFAULT_SKILL_BRIDGE_ROOT = fileURLToPath(
  new URL("../.claude-skill-bridge", import.meta.url),
);

export const SKILLS_BY_AGENT = {
  feature_lead: {
    design: ["feature-design-orchestrator", "mobile-design"],
    code: ["vercel-react-native-skills"],
  },
  market_analyst: { research: ["marketing"] },
  tester: { review: ["tester"] },
  code_reviewer: { review: ["vercel-react-native-skills"] },
  ux_auditor: { review: ["mobile-app-ux-auditor"] },
};

async function ensureSkillBridgeLink(source, destination) {
  await mkdir(path.dirname(destination), { recursive: true });

  try {
    const current = await lstat(destination);
    if (current.isSymbolicLink()) {
      const target = await readlink(destination);
      if (path.resolve(path.dirname(destination), target) === source) return;
    } else if (existsSync(path.join(destination, "SKILL.md"))) {
      return;
    }
    await rm(destination, { recursive: true, force: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  await symlink(source, destination, "dir");
}

export async function prepareClaudeSkills({
  agentName,
  phase,
  projectPath,
  bridgeRoot = DEFAULT_SKILL_BRIDGE_ROOT,
  homeDirectory = os.homedir(),
}) {
  const names = SKILLS_BY_AGENT[agentName]?.[phase] ?? [];
  const nativeRoots = [
    path.join(projectPath, ".claude", "skills"),
    path.join(homeDirectory, ".claude", "skills"),
  ];
  const externalRoots = [
    path.join(homeDirectory, ".codex", "skills"),
    path.join(homeDirectory, ".agents", "skills"),
  ];
  const available = [];
  let bridgeUsed = false;

  for (const name of names) {
    const nativeDirectory = nativeRoots
      .map((root) => path.join(root, name))
      .find((candidate) => existsSync(path.join(candidate, "SKILL.md")));
    if (nativeDirectory) {
      available.push(name);
      continue;
    }

    const externalDirectory = externalRoots
      .map((root) => path.join(root, name))
      .find((candidate) => existsSync(path.join(candidate, "SKILL.md")));
    if (!externalDirectory) continue;

    await ensureSkillBridgeLink(
      externalDirectory,
      path.join(bridgeRoot, ".claude", "skills", name),
    );
    available.push(name);
    bridgeUsed = true;
  }

  return {
    names: available,
    additionalDirectories: bridgeUsed ? [bridgeRoot] : [],
  };
}

function claudePrompt(prompt) {
  return `
Compatibilidade Claude Code:
- Skills citadas como $nome devem ser usadas pela ferramenta de skills quando estiverem instaladas.
- Se uma skill citada não estiver disponível, siga as regras explícitas deste prompt sem bloquear.
- Não crie subagentes; esta execução já é coordenada pelo orquestrador externo.

${prompt}
`.trim();
}

function evidenceDirectories(evidence) {
  return [
    ...new Set(
      (evidence?.screenshots ?? [])
        .map((screenshot) => screenshot.path)
        .filter(Boolean)
        .map((screenshotPath) => path.dirname(path.resolve(screenshotPath))),
    ),
  ];
}

function claudeProgressDetail(message) {
  if (message.type === "system" && message.subtype === "init") {
    return "sessão iniciada";
  }
  if (message.type === "result") return "resposta concluída";
  if (message.type === "assistant") {
    const tool = message.message?.content?.find(
      (block) => block.type === "tool_use",
    );
    if (!tool) return "analisando";
    if (["Edit", "Write", "NotebookEdit"].includes(tool.name)) {
      return "arquivos atualizados: 1";
    }
    if (tool.name === "Bash") return "comando em execução";
    if (["WebSearch", "WebFetch"].includes(tool.name)) return "pesquisa web";
    return `ferramenta em execução: ${tool.name}`;
  }
  if (message.type === "system" && message.subtype === "task_progress") {
    return message.summary || "trabalhando";
  }
  return message.type;
}

function normalizeClaudeUsage(message) {
  const modelUsage = Object.values(message.modelUsage ?? {});
  if (modelUsage.length) {
    return modelUsage.reduce(
      (total, usage) => ({
        input_tokens:
          total.input_tokens +
          (usage.inputTokens ?? 0) +
          (usage.cacheCreationInputTokens ?? 0),
        cached_input_tokens:
          total.cached_input_tokens + (usage.cacheReadInputTokens ?? 0),
        output_tokens: total.output_tokens + (usage.outputTokens ?? 0),
        reasoning_output_tokens: 0,
      }),
      {
        input_tokens: 0,
        cached_input_tokens: 0,
        output_tokens: 0,
        reasoning_output_tokens: 0,
      },
    );
  }

  const usage = message.usage ?? {};
  return {
    input_tokens:
      (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0),
    cached_input_tokens: usage.cache_read_input_tokens ?? 0,
    output_tokens: usage.output_tokens ?? 0,
    reasoning_output_tokens: 0,
  };
}

async function runStructuredClaudeTurn({
  queryFunction,
  prompt,
  options,
  outputSchema,
  agentName,
  timeoutMs,
  heartbeatMs,
  onProgress,
  onSessionId,
}) {
  const controller = new AbortController();
  const startedAt = Date.now();
  let timedOut = false;
  let resultMessage = null;

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
    const messages = queryFunction({
      prompt: claudePrompt(prompt),
      options: compactOptions({
        ...options,
        abortController: controller,
        outputFormat: { type: "json_schema", schema: outputSchema },
      }),
    });

    for await (const message of messages) {
      if (message.session_id) onSessionId(message.session_id);
      if (message.type === "result") {
        resultMessage = message;
        safeProgress(onProgress, {
          kind: "usage",
          detail: "tokens contabilizados",
          elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
          usage: normalizeClaudeUsage(message),
        });
      }
      safeProgress(onProgress, {
        kind: "activity",
        detail: claudeProgressDetail(message),
        elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
      });
    }

    if (!resultMessage) {
      throw new Error(`${agentName} terminou sem mensagem de resultado.`);
    }
    if (resultMessage.subtype !== "success" || resultMessage.is_error) {
      const errors = resultMessage.errors?.join("; ");
      throw new Error(errors || resultMessage.result || `${agentName} falhou.`);
    }
    return parseStructuredResponse(
      resultMessage.structured_output ?? resultMessage.result,
      agentName,
    );
  } catch (error) {
    if (timedOut) throw new AgentTimeoutError(agentName, timeoutMs);
    throw error;
  } finally {
    clearInterval(heartbeat);
    clearTimeout(timeout);
  }
}

export class ClaudeAgentRuntime {
  constructor({
    projectPath,
    model,
    auxiliaryModel,
    reasoningEffort,
    designReasoningEffort = reasoningEffort ?? "high",
    codeReasoningEffort = reasoningEffort ?? "low",
    specialistReasoningEffort = "medium",
    agentTimeoutMs = 10 * 60_000,
    implementationTimeoutMs = Math.max(agentTimeoutMs * 3, 30 * 60_000),
    heartbeatMs = 15_000,
    sessionIds = {},
    queryFunction = defaultClaudeQuery,
    skillResolver = prepareClaudeSkills,
    skillBridgeRoot = DEFAULT_SKILL_BRIDGE_ROOT,
  }) {
    this.projectPath = projectPath;
    this.model = model;
    this.auxiliaryModel = auxiliaryModel ?? model;
    this.queryFunction = queryFunction;
    this.skillResolver = skillResolver;
    this.skillBridgeRoot = skillBridgeRoot;
    this.agentTimeoutMs = agentTimeoutMs;
    this.implementationTimeoutMs = implementationTimeoutMs;
    this.heartbeatMs = heartbeatMs;
    this.reasoningProfile = {
      design: designReasoningEffort,
      code: codeReasoningEffort,
    };
    this.specialistReasoningEffort = specialistReasoningEffort;
    this.sessionIds = {
      feature_lead: sessionIds.feature_lead ?? null,
      code_reviewer: sessionIds.code_reviewer ?? null,
      market_analyst: sessionIds.market_analyst ?? null,
      tester: sessionIds.tester ?? null,
      ux_auditor: sessionIds.ux_auditor ?? null,
    };
  }

  async optionsFor({ agentName, phase, evidence }) {
    const isFeatureLead = agentName === "feature_lead";
    const isCode = isFeatureLead && phase === "code";
    const isMarket = agentName === "market_analyst";
    const baseTools = isCode
      ? CODE_TOOLS
      : isMarket
        ? MARKET_TOOLS
        : READ_TOOLS;
    const effort = isFeatureLead
      ? this.reasoningProfile[phase]
      : ["tester", "code_reviewer"].includes(agentName)
        ? "low"
        : this.specialistReasoningEffort;
    const extraDirectories = evidenceDirectories(evidence);
    const discoveredSkills = await this.skillResolver({
      agentName,
      phase,
      projectPath: this.projectPath,
      bridgeRoot: this.skillBridgeRoot,
    });
    const tools = discoveredSkills.names.length
      ? [...baseTools, "Skill"]
      : baseTools;
    const additionalDirectories = [
      ...new Set([
        ...extraDirectories,
        ...discoveredSkills.additionalDirectories,
      ]),
    ];

    return compactOptions({
      cwd: this.projectPath,
      model: isFeatureLead ? this.model : this.auxiliaryModel,
      effort,
      tools,
      allowedTools: tools,
      permissionMode: isCode ? "acceptEdits" : "dontAsk",
      disallowedTools: isMarket
        ? ["Edit", "Write", "Bash", "Agent", "Task"]
        : ["Agent", "Task", "WebSearch", "WebFetch"],
      settingSources: ["user", "project", "local"],
      skills: discoveredSkills.names.length ? discoveredSkills.names : undefined,
      strictMcpConfig: true,
      additionalDirectories: additionalDirectories.length
        ? additionalDirectories
        : undefined,
      resume: this.sessionIds[agentName] ?? undefined,
    });
  }

  async run(
    agentName,
    phase,
    prompt,
    outputSchema,
    onProgress,
    timeoutMs = this.agentTimeoutMs,
    evidence,
  ) {
    const options = await this.optionsFor({ agentName, phase, evidence });
    return runStructuredClaudeTurn({
      queryFunction: this.queryFunction,
      prompt,
      options,
      outputSchema,
      agentName,
      timeoutMs,
      heartbeatMs: this.heartbeatMs,
      onProgress,
      onSessionId: (sessionId) => {
        this.sessionIds[agentName] = sessionId;
      },
    });
  }

  planFeature(context, { onProgress } = {}) {
    return this.run(
      featureLead.name,
      "design",
      featureLead.buildPlanningPrompt(context),
      featurePlanOutputSchema,
      onProgress,
    );
  }

  implementFeature(context, { onProgress } = {}) {
    return this.run(
      featureLead.name,
      "code",
      featureLead.buildImplementationPrompt(context),
      implementationOutputSchema,
      onProgress,
      this.implementationTimeoutMs,
    );
  }

  continueFeaturePlanning({ onProgress } = {}) {
    return this.run(
      featureLead.name,
      "design",
      featureLead.buildPlanningContinuationPrompt(),
      featurePlanOutputSchema,
      onProgress,
    );
  }

  continueFeatureLead(context, { onProgress } = {}) {
    return this.run(
      featureLead.name,
      "code",
      featureLead.buildContinuationPrompt(context),
      implementationOutputSchema,
      onProgress,
      this.implementationTimeoutMs,
    );
  }

  runTester(context, { onProgress } = {}) {
    return this.run(
      tester.name,
      "review",
      tester.buildPrompt(context),
      testerOutputSchema,
      onProgress,
      this.agentTimeoutMs,
      context.evidence,
    );
  }

  runCodeReview(context, { onProgress } = {}) {
    return this.run(
      codeReviewer.name,
      "review",
      codeReviewer.buildPrompt(context),
      codeReviewerOutputSchema,
      onProgress,
    );
  }

  runAudit(context, { onProgress } = {}) {
    return this.run(
      uxAuditor.name,
      "review",
      uxAuditor.buildPrompt(context),
      auditorOutputSchema,
      onProgress,
      this.agentTimeoutMs,
      context.evidence,
    );
  }

  runMarketAnalysis(context, { onProgress } = {}) {
    return this.run(
      marketAnalyst.name,
      "research",
      marketAnalyst.buildDiscoveryPrompt(context),
      marketAnalysisOutputSchema,
      onProgress,
    );
  }

  getSessionIds() {
    return { ...this.sessionIds };
  }

  getThreadIds() {
    return this.getSessionIds();
  }

  getReasoningProfile() {
    return { ...this.reasoningProfile };
  }

  getProvider() {
    return "claude";
  }
}
