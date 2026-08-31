import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { parseTaskList, runBatch } from "../src/batch.js";
import { createMutex } from "../src/mutex.js";
import { buildBatchReport } from "../src/report.js";
import { resolveGates } from "../src/orchestrator.js";
import { profiles } from "../src/profiles.js";
import { slugify } from "../src/worktree.js";

const execFileAsync = promisify(execFile);

async function git(cwd, args) {
  await execFileAsync("git", ["-C", cwd, ...args]);
}

async function makeRepository() {
  const root = await mkdtemp(path.join(tmpdir(), "orq-batch-"));
  const repository = path.join(root, "app");
  await execFileAsync("git", ["init", "-q", "-b", "main", repository]);
  await git(repository, ["config", "user.email", "teste@exemplo.com"]);
  await git(repository, ["config", "user.name", "Teste"]);
  await writeFile(path.join(repository, "App.tsx"), "export default null;\n");
  await git(repository, ["add", "-A"]);
  await git(repository, ["commit", "-qm", "base"]);
  return { root, repository };
}

function fakeRuntime(projectPath, log) {
  return {
    async planFeature() {
      return {
        status: "READY",
        summary: "Brief pronto",
        implementationPlan: ["Alterar App.tsx"],
        requiresScreenTest: false,
        requiresDesignCheck: false,
        requiresUxAudit: false,
        requiresCodeReview: false,
      };
    },
    async implementFeature() {
      log.push(projectPath);
      await writeFile(
        path.join(projectPath, "App.tsx"),
        `export default "${path.basename(projectPath)}";\n`,
      );
      return {
        status: "FINISHED",
        summary: "Implementado",
        changes: ["App.tsx"],
        tests: [],
        blockers: [],
      };
    },
    getThreadIds() {
      return {};
    },
    getReasoningProfile() {
      return { design: "medium", code: "low" };
    },
  };
}

test("lote roda cada tarefa em uma worktree própria e commita o resultado", async () => {
  const { root, repository } = await makeRepository();
  const worktreesDirectory = path.join(root, "worktrees");
  const runsDirectory = path.join(root, "runs");
  const seenPaths = [];

  try {
    const { results } = await runBatch({
      repositoryPath: repository,
      tasks: parseTaskList(
        JSON.stringify(["Melhorar o onboarding", { task: "Ajustar o menu" }]),
        (task) => `Critério: ${task}`,
      ),
      baseRef: "HEAD",
      worktreesDirectory,
      concurrency: 2,
      maxCycles: 1,
      createRuntime: async ({ projectPath }) => fakeRuntime(projectPath, seenPaths),
      createStateStore: () => ({
        runsDirectory,
        runId: Math.random().toString(36).slice(2),
        async save() {},
      }),
    });

    assert.equal(results.length, 2);
    assert.deepEqual(
      results.map((result) => result.state.finalStatus),
      ["PASS", "PASS"],
    );
    assert.equal(new Set(results.map((result) => result.worktreePath)).size, 2);
    assert.equal(new Set(seenPaths).size, 2);
    assert.match(results[0].branch, /^orq\/melhorar-o-onboarding-/);
    assert.ok(results.every((result) => result.commit));
    assert.ok(results[0].worktreeSummary.changedFiles.includes("App.tsx"));

    const html = await buildBatchReport({
      results,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    });
    assert.match(html, /Melhorar o onboarding/);
    assert.match(html, /2 de 2/);

    const branches = await readdir(worktreesDirectory);
    assert.equal(branches.length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("mutex serializa o acesso ao device", async () => {
  const lock = createMutex();
  const order = [];
  const slow = (label, delay) =>
    lock(async () => {
      order.push(`${label}:start`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      order.push(`${label}:end`);
    });

  await Promise.all([slow("a", 20), slow("b", 1)]);
  assert.deepEqual(order, ["a:start", "a:end", "b:start", "b:end"]);
});

test("perfil unattended força tela, design e UX mesmo com brief tímido", () => {
  const brief = {
    requiresScreenTest: false,
    requiresDesignCheck: false,
    requiresUxAudit: false,
    requiresCodeReview: false,
  };

  const unattended = resolveGates(brief, profiles.unattended.gateOverrides);
  assert.deepEqual(unattended, {
    screenTest: true,
    designCheck: true,
    uxAudit: true,
    codeReview: false,
  });

  const fast = resolveGates(
    { ...brief, requiresUxAudit: true },
    profiles.fast.gateOverrides,
  );
  assert.equal(fast.uxAudit, false);
  assert.equal(fast.screenTest, true);
});

test("lista de tarefas rejeita entrada inválida", () => {
  assert.throws(() => parseTaskList("[]", () => ""), /array não vazio/);
  assert.throws(() => parseTaskList('[{"acceptance":"x"}]', () => ""), /sem texto/);
  assert.equal(slugify("Ícone do app"), "icone-do-app");
});
