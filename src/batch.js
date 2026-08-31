import path from "node:path";

import { createMutex } from "./mutex.js";
import { runFeatureLoop } from "./orchestrator.js";
import {
  commitWorktree,
  createWorktree,
  slugify,
  summarizeWorktree,
} from "./worktree.js";

function commitMessage(task) {
  const subject = task.replace(/\s+/g, " ").trim().slice(0, 68);
  return `${subject}\n\nImplementado por orquestrador-features em execução não supervisionada.`;
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;

  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (true) {
        const index = next++;
        if (index >= items.length) return;
        results[index] = await worker(items[index], index);
      }
    },
  );

  await Promise.all(runners);
  return results;
}

export async function runBatch({
  repositoryPath,
  tasks,
  baseRef,
  worktreesDirectory,
  concurrency = 2,
  maxCycles = 3,
  marketing,
  marketAnalysis = null,
  appRules = "",
  gateOverrides = {},
  createRuntime,
  createStateStore,
  createScreenDriver = () => null,
  onEvent = () => {},
}) {
  const deviceLock = createMutex();
  const startedAt = new Date().toISOString();

  const results = await runPool(tasks, concurrency, async (entry) => {
    const slug = entry.slug ?? slugify(entry.task);
    const result = {
      task: entry.task,
      acceptanceCriteria: entry.acceptanceCriteria,
      slug,
      branch: null,
      worktreePath: null,
      artifactsDirectory: null,
      state: null,
      error: null,
      commit: null,
      worktreeSummary: null,
    };

    try {
      const worktree = await createWorktree({
        repositoryPath,
        worktreesDirectory,
        slug,
        baseRef,
      });
      result.branch = worktree.branch;
      result.worktreePath = worktree.path;
      onEvent({ type: "task.started", slug, branch: worktree.branch });

      const stateStore = createStateStore();
      const artifactsDirectory = path.join(
        stateStore.runsDirectory,
        `${stateStore.runId}-artifacts`,
      );
      result.artifactsDirectory = artifactsDirectory;

      const runtime = await createRuntime({ projectPath: worktree.path });
      const screenTestDriver = createScreenDriver({
        projectPath: worktree.path,
        artifactsDirectory,
        lock: deviceLock,
      });

      result.state = await runFeatureLoop({
        runtime,
        projectPath: worktree.path,
        task: entry.task,
        acceptanceCriteria: entry.acceptanceCriteria,
        maxCycles,
        stateStore,
        screenTestDriver,
        marketing,
        marketAnalysis,
        appRules,
        gateOverrides,
        onEvent: (event) => onEvent({ ...event, slug }),
      });

      result.worktreeSummary = await summarizeWorktree(worktree.path);
      result.commit = await commitWorktree(worktree.path, commitMessage(entry.task));
    } catch (error) {
      result.error = error.message;
    }

    onEvent({
      type: "task.completed",
      slug,
      status: result.error ? "ERROR" : result.state?.finalStatus,
      reason: result.error ?? result.state?.stopReason,
    });
    return result;
  });

  return { results, startedAt, finishedAt: new Date().toISOString() };
}

function parseRawTasks(raw) {
  const text = raw.trim();
  if (text.startsWith("[")) return JSON.parse(text);
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter((line) => line && !line.startsWith("#"));
}

export function parseTaskList(raw, defaultAcceptance) {
  const parsed = Array.isArray(raw) ? raw : parseRawTasks(raw);
  if (!Array.isArray(parsed) || !parsed.length) {
    throw new Error("Arquivo de tarefas deve conter um array não vazio.");
  }
  if (parsed.length > 20) {
    throw new Error("Máximo de 20 tarefas por lote.");
  }

  return parsed.map((entry, index) => {
    const task = typeof entry === "string" ? entry : entry?.task;
    if (typeof task !== "string" || !task.trim()) {
      throw new Error(`Tarefa ${index + 1} sem texto.`);
    }
    const acceptanceCriteria =
      (typeof entry === "object" ? entry?.acceptance : null) ??
      defaultAcceptance(task);
    return {
      task: task.trim(),
      acceptanceCriteria,
      slug: typeof entry === "object" && entry?.slug ? slugify(entry.slug) : undefined,
    };
  });
}
