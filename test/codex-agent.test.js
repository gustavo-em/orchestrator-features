import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInternalCodexConfig,
  discoverCodexMcpServers,
  CodexAgentRuntime,
} from "../src/codex-agent.js";
import { featurePlanOutputSchema } from "../src/schemas.js";

class FakeCodex {
  constructor(threadFactory) {
    this.threadFactory = threadFactory;
    this.options = [];
  }

  startThread(options) {
    this.options.push(options);
    return this.threadFactory(options, this.options.length - 1);
  }

  resumeThread(id, options) {
    this.options.push({ ...options, resumedId: id });
    return this.threadFactory(options, this.options.length - 1);
  }
}

function completedThread(response) {
  return {
    id: "thread-1",
    async runStreamed() {
      return {
        events: (async function* () {
          yield { type: "turn.started" };
          yield {
            type: "item.completed",
            item: { id: "message-1", type: "agent_message", text: response },
          };
          yield {
            type: "turn.completed",
            usage: {
              input_tokens: 1,
              cached_input_tokens: 0,
              cache_write_input_tokens: 0,
              output_tokens: 1,
              reasoning_output_tokens: 0,
            },
          };
        })(),
      };
    },
  };
}

test("desativa todo MCP nas execuções internas", () => {
  assert.deepEqual(buildInternalCodexConfig(["expo_mcp", "figma"]), {
    mcp_servers: {
      expo_mcp: { enabled: false },
      figma: { enabled: false },
    },
  });

  const discovered = discoverCodexMcpServers("/caminho/inexistente.toml");
  assert.ok(discovered.includes("expo_mcp"));
  assert.ok(discovered.includes("figma"));
  assert.ok(discovered.includes("github"));

  const config = buildInternalCodexConfig();
  assert.ok(Object.keys(config.mcp_servers).length >= 3);
  assert.ok(
    Object.values(config.mcp_servers).every((server) => server.enabled === false),
  );
});

test("schema do planejamento usa somente restrições aceitas pelo Codex", () => {
  assert.equal(
    Object.hasOwn(featurePlanOutputSchema.properties.route, "uniqueItems"),
    false,
  );
});

test("runtime usa uma thread gravável para planejamento e implementação", async () => {
  const response = JSON.stringify({ status: "READY", summary: "ok" });
  const codex = new FakeCodex(() => completedThread(response));
  const runtime = new CodexAgentRuntime({
    projectPath: "/tmp/app",
    codex,
    agentTimeoutMs: 1_000,
    heartbeatMs: 50,
  });
  const progress = [];

  const result = await runtime.planFeature(
    {
      task: "Tarefa",
      acceptanceCriteria: "Critério",
      marketAnalysis: null,
      previousBrief: null,
      redesignFeedback: "",
    },
    { onProgress: (event) => progress.push(event) },
  );

  assert.equal(result.status, "READY");
  assert.equal(codex.options[0].sandboxMode, "workspace-write");
  assert.equal(codex.options[0].modelReasoningEffort, "high");
  assert.deepEqual(runtime.getReasoningProfile(), {
    design: "high",
    code: "low",
  });
  assert.equal(runtime.getThreadIds().feature_lead, "thread-1");
  assert.ok(progress.some((event) => event.kind === "activity"));
  assert.ok(progress.some((event) => event.kind === "usage"));
});

test("runtime cancela agente no timeout e emite heartbeat", async () => {
  const hangingThread = {
    id: null,
    async runStreamed(_input, { signal }) {
      return {
        events: (async function* () {
          await new Promise((resolve, reject) => {
            signal.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          });
          yield { type: "turn.started" };
        })(),
      };
    },
  };
  const codex = new FakeCodex(() => hangingThread);
  const runtime = new CodexAgentRuntime({
    projectPath: "/tmp/app",
    codex,
    agentTimeoutMs: 30,
    heartbeatMs: 5,
  });
  const progress = [];

  await assert.rejects(
    runtime.planFeature(
      {
        task: "Tarefa",
        acceptanceCriteria: "Critério",
        marketAnalysis: null,
        previousBrief: null,
        redesignFeedback: "",
      },
      { onProgress: (event) => progress.push(event) },
    ),
    (error) => error.code === "AGENT_TIMEOUT",
  );
  assert.ok(progress.some((event) => event.kind === "heartbeat"));
});

test("feature_lead recebe timeout maior e retoma uma única thread salva", async () => {
  const response = JSON.stringify({
    status: "FINISHED",
    summary: "ok",
    changes: [],
    tests: [],
    blockers: [],
  });
  const codex = new FakeCodex(() => completedThread(response));
  const runtime = new CodexAgentRuntime({
    projectPath: "/tmp/app",
    codex,
    agentTimeoutMs: 1_000,
    implementationTimeoutMs: 5_000,
    threadIds: { feature_lead: "lead-salvo" },
  });

  assert.equal(runtime.implementationTimeoutMs, 5_000);
  const result = await runtime.continueFeatureLead({ cycle: 1, feedback: "" });
  assert.equal(codex.options[0].resumedId, "lead-salvo");
  assert.equal(result.status, "FINISHED");
});

test("planejamento high e código low retomam o mesmo ID de sessão", async () => {
  const calls = [];
  const thread = completedThread(JSON.stringify({ status: "READY", summary: "ok" }));
  thread.runStreamed = async function runStreamed(input) {
    calls.push(input);
    return {
      events: (async function* () {
        yield {
          type: "item.completed",
          item: {
            id: "message",
            type: "agent_message",
            text: calls.length === 1 || calls.length === 3
              ? JSON.stringify({ status: "READY", summary: "ok" })
              : JSON.stringify({
                  status: "FINISHED",
                  summary: "feito",
                  changes: [],
                  tests: [],
                  blockers: [],
                }),
          },
        };
      })(),
    };
  };
  const codex = new FakeCodex(() => thread);
  const runtime = new CodexAgentRuntime({ projectPath: "/tmp/app", codex });
  assert.equal(codex.options.length, 0);
  assert.deepEqual(runtime.getThreadIds(), {
    feature_lead: null,
    code_reviewer: null,
    market_analyst: null,
    tester: null,
    ux_auditor: null,
  });

  await runtime.planFeature({
    task: "Tarefa",
    acceptanceCriteria: "Critério",
    marketAnalysis: null,
  });
  await runtime.implementFeature({
    task: "Tarefa",
    acceptanceCriteria: "Critério",
    cycle: 1,
    feedback: "",
    designBrief: {},
  });
  await runtime.planFeature({
    task: "Tarefa",
    acceptanceCriteria: "Critério",
    marketAnalysis: null,
    previousBrief: {},
    redesignFeedback: "Rever motion",
  });

  assert.equal(calls.length, 3);
  assert.equal(codex.options.length, 3);
  assert.equal(codex.options[0].modelReasoningEffort, "high");
  assert.equal(codex.options[1].modelReasoningEffort, "low");
  assert.equal(codex.options[1].resumedId, "thread-1");
  assert.equal(codex.options[2].modelReasoningEffort, "high");
  assert.equal(codex.options[2].resumedId, "thread-1");
});
