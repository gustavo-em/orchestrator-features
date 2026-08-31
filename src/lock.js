import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { orchestratorRoot } from "./paths.js";
import { slugify } from "./worktree.js";

export const locksRoot = path.join(orchestratorRoot, "runs", "locks");
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

function lockPath(key, directory) {
  return path.join(directory, `${slugify(key, 80)}.lock.json`);
}

function processAlive(pid) {
  if (!Number.isInteger(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

export function isStale(holder, now = Date.now()) {
  if (!holder) return true;
  if (!processAlive(holder.pid)) return true;
  const age = now - new Date(holder.acquiredAt).getTime();
  return !Number.isFinite(age) || age > STALE_AFTER_MS;
}

export async function readHolder(key, directory = locksRoot) {
  try {
    return JSON.parse(await readFile(lockPath(key, directory), "utf8"));
  } catch {
    return null;
  }
}

export function describeHolder(holder) {
  if (!holder) return "desconhecido";
  const since = holder.acquiredAt
    ? new Date(holder.acquiredAt).toLocaleTimeString("pt-BR")
    : "?";
  const minutes = holder.acquiredAt
    ? Math.round((Date.now() - new Date(holder.acquiredAt).getTime()) / 60_000)
    : 0;
  return (
    `pid ${holder.pid}, desde ${since} (${minutes} min)` +
    (holder.task ? `, tarefa: ${holder.task}` : "") +
    (holder.stateFile ? `, estado: ${holder.stateFile}` : "")
  );
}

export async function acquireLock(
  key,
  metadata = {},
  { directory = locksRoot, waitMs = 0, pollMs = 5_000 } = {},
) {
  await mkdir(directory, { recursive: true });
  const file = lockPath(key, directory);
  const deadline = Date.now() + waitMs;

  while (true) {
    try {
      await writeFile(
        file,
        `${JSON.stringify(
          { key, pid: process.pid, acquiredAt: new Date().toISOString(), ...metadata },
          null,
          2,
        )}\n`,
        { encoding: "utf8", flag: "wx" },
      );
      let released = false;
      return async () => {
        if (released) return;
        released = true;
        await rm(file, { force: true });
      };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;

      const holder = await readHolder(key, directory);
      if (isStale(holder)) {
        await rm(file, { force: true });
        continue;
      }
      if (Date.now() >= deadline) {
        const conflict = new Error(
          `Já existe uma execução em ${key}: ${describeHolder(holder)}. ` +
            "Espere ela terminar, use --wait <minutos> para entrar na fila, " +
            "ou rode em outro projeto/device.",
        );
        conflict.code = "LOCK_BUSY";
        conflict.holder = holder;
        throw conflict;
      }
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  }
}

export async function withLocks(keys, metadata, options, operation) {
  const releases = [];
  try {
    for (const key of keys.filter(Boolean)) {
      releases.push(await acquireLock(key, metadata, options));
    }
    return await operation();
  } finally {
    for (const release of releases.reverse()) {
      await release().catch(() => {});
    }
  }
}
