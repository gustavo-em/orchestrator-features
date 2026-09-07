import assert from "node:assert/strict";
import { lstatSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  ClaudeAgentRuntime,
  SKILLS_BY_AGENT,
  prepareClaudeSkills,
} from "../src/claude-agent.js";
import { createAgentRuntime } from "../src/runtime-factory.js";

function declaredSkills({ agentName, phase }) {
  return {
    names: SKILLS_BY_AGENT[agentName]?.[phase] ?? [],
    additionalDirectories: [],
  };
}

function successfulQuery(calls, responses) {
  let index = 0;
  return function queryFunction(parameters) {
    calls.push(parameters);
    const response = responses[index++];
    return (async function* () {
      yield {
        type: "system",
        subtype: "init",
        session_id: "claude-session-1",
      };
      yield {
        type: "assistant",
        session_id: "claude-session-1",
        message: {
          content: [{ type: "tool_use", name: response.tool ?? "Read" }],
        },
      };
      yield {
        type: "result",
        subtype: "success",
        is_error: false,
        session_id: "claude-session-1",
        result: JSON.stringify(response.value),
        structured_output: response.value,
        modelUsage: {
          "claude-test": {
            inputTokens: 10,
            cacheCreationInputTokens: 2,
            cacheReadInputTokens: 3,
            outputTokens: 4,
          },
        },
      };
    })();
  };
}

test("Claude mantém sessão e alterna high para design e low para código", async () => {
  const calls = [];
  const queryFunction = successfulQuery(calls, [
    { value: { status: "READY", summary: "brief" } },
    {
      tool: "Edit",
      value: {
        status: "FINISHED",
        summary: "feito",
        changes: [],
        tests: [],
        blockers: [],
      },
    },
    { value: { status: "READY", summary: "brief revisto" } },
  ]);
  const runtime = new ClaudeAgentRuntime({
    projectPath: "/tmp/app",
    queryFunction,
    heartbeatMs: 50,
    skillResolver: declaredSkills,
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
  assert.equal(calls[0].options.effort, "high");
  assert.equal(calls[0].options.resume, undefined);
  assert.equal(calls[0].options.permissionMode, "dontAsk");
  assert.equal(calls[0].options.tools.includes("Edit"), false);
  assert.ok(calls[0].options.skills.includes("feature-design-orchestrator"));
  assert.ok(calls[0].options.skills.includes("mobile-design"));
  assert.equal(calls[1].options.effort, "low");
  assert.equal(calls[1].options.resume, "claude-session-1");
  assert.equal(calls[1].options.permissionMode, "acceptEdits");
  assert.equal(calls[1].options.tools.includes("Edit"), true);
  assert.deepEqual(calls[1].options.skills, [
    "vercel-react-native-skills",
    "firebase-rn",
  ]);
  assert.equal(calls[2].options.effort, "high");
  assert.equal(calls[2].options.resume, "claude-session-1");
  assert.deepEqual(runtime.getReasoningProfile(), {
    design: "high",
    code: "low",
  });
  assert.equal(runtime.getSessionIds().feature_lead, "claude-session-1");
  assert.equal(runtime.getProvider(), "claude");
});

test("Claude normaliza usage e libera diretório de screenshots ao tester", async () => {
  const calls = [];
  const queryFunction = successfulQuery(calls, [
    {
      value: {
        status: "PASS",
        summary: "ok",
        findings: [],
        observations: [],
      },
    },
  ]);
  const runtime = new ClaudeAgentRuntime({
    projectPath: "/tmp/app",
    queryFunction,
    skillResolver: declaredSkills,
  });
  const progress = [];
  const screenshot = "/tmp/orquestrador-runs/device/inicial.png";

  const result = await runtime.runTester(
    {
      task: "Tarefa",
      acceptanceCriteria: "Critério",
      cycle: 1,
      implementationResult: {},
      evidence: {
        screenshots: [{ name: "inicial", path: screenshot }],
      },
    },
    { onProgress: (event) => progress.push(event) },
  );

  assert.equal(result.status, "PASS");
  assert.ok(
    calls[0].options.additionalDirectories.includes(path.dirname(screenshot)),
  );
  assert.deepEqual(
    progress.find((event) => event.kind === "usage").usage,
    {
      input_tokens: 12,
      cached_input_tokens: 3,
      output_tokens: 4,
      reasoning_output_tokens: 0,
    },
  );
});

test("Claude limita ferramentas dos especialistas", async () => {
  const calls = [];
  const queryFunction = successfulQuery(calls, [
    {
      tool: "WebSearch",
      value: {
        status: "COMPLETE",
        summary: "mercado",
        competitors: [],
        opportunities: [],
        risks: [],
        featureContext: [],
        accessedAt: "2026-08-31",
      },
    },
  ]);
  const runtime = new ClaudeAgentRuntime({
    projectPath: "/tmp/app",
    queryFunction,
    skillResolver: declaredSkills,
  });

  await runtime.runMarketAnalysis({
    task: "Tarefa",
    acceptanceCriteria: "Critério",
    appContext: {},
    competitors: [],
  });

  assert.equal(calls[0].options.tools.includes("WebSearch"), true);
  assert.equal(calls[0].options.tools.includes("Edit"), false);
  assert.equal(calls[0].options.permissionMode, "dontAsk");
});

test("Claude cancela no timeout", async () => {
  function queryFunction({ options }) {
    return (async function* () {
      await new Promise((resolve, reject) => {
        options.abortController.signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
      yield null;
    })();
  }
  const runtime = new ClaudeAgentRuntime({
    projectPath: "/tmp/app",
    queryFunction,
    agentTimeoutMs: 20,
    heartbeatMs: 5,
    skillResolver: declaredSkills,
  });

  await assert.rejects(
    runtime.planFeature({
      task: "Tarefa",
      acceptanceCriteria: "Critério",
      marketAnalysis: null,
    }),
    (error) => error.code === "AGENT_TIMEOUT",
  );
});

test("factory seleciona Claude ou Codex", async () => {
  const claude = await createAgentRuntime({
    provider: "claude",
    projectPath: "/tmp/app",
    queryFunction: () => null,
  });
  const codex = await createAgentRuntime({
    provider: "codex",
    projectPath: "/tmp/app",
    codex: {},
  });

  assert.equal(claude.getProvider(), "claude");
  assert.equal(codex.getProvider(), "codex");
  await assert.rejects(
    createAgentRuntime({ provider: "outro", projectPath: "/tmp/app" }),
    /Provedor inválido/,
  );
});

async function installSkill(root, name) {
  const directory = path.join(root, name);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "SKILL.md"), "# skill\n");
  return directory;
}

test("prepareClaudeSkills usa skills nativas e liga as do Codex por symlink", async () => {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), "orq-skills-"));
  try {
    const home = path.join(sandbox, "home");
    const projectPath = path.join(sandbox, "app");
    const bridgeRoot = path.join(sandbox, "bridge");
    await installSkill(path.join(home, ".claude", "skills"), "mobile-design");
    const external = await installSkill(
      path.join(home, ".codex", "skills"),
      "feature-design-orchestrator",
    );

    const resolved = await prepareClaudeSkills({
      agentName: "feature_lead",
      phase: "design",
      projectPath,
      bridgeRoot,
      homeDirectory: home,
    });

    assert.deepEqual(resolved.names.sort(), [
      "feature-design-orchestrator",
      "mobile-design",
    ]);
    assert.deepEqual(resolved.additionalDirectories, [bridgeRoot]);
    const link = path.join(
      bridgeRoot,
      ".claude",
      "skills",
      "feature-design-orchestrator",
    );
    assert.equal(lstatSync(link).isSymbolicLink(), true);
    assert.equal(external.startsWith(home), true);
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
});

test("prepareClaudeSkills não bloqueia quando a skill não existe", async () => {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), "orq-skills-"));
  try {
    const resolved = await prepareClaudeSkills({
      agentName: "feature_lead",
      phase: "code",
      projectPath: path.join(sandbox, "app"),
      bridgeRoot: path.join(sandbox, "bridge"),
      homeDirectory: path.join(sandbox, "home"),
    });

    assert.deepEqual(resolved.names, []);
    assert.deepEqual(resolved.additionalDirectories, []);
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
});
