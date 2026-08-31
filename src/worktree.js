import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, symlink } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function git(repositoryPath, args) {
  const { stdout } = await execFileAsync("git", ["-C", repositoryPath, ...args], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return stdout.trim();
}

export function slugify(text, maxLength = 40) {
  const slug = String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return slug || "tarefa";
}

export async function assertCleanRepository(repositoryPath) {
  const status = await git(repositoryPath, ["status", "--porcelain"]);
  if (status) {
    throw new Error(
      "O projeto tem alterações não commitadas. Worktrees partem de um ref limpo: " +
        "commite, faça stash, ou passe --base-ref <ref> para escolher a base.",
    );
  }
}

export async function resolveBaseRef(repositoryPath, baseRef) {
  return git(repositoryPath, ["rev-parse", baseRef ?? "HEAD"]);
}

async function linkNodeModules(repositoryPath, worktreePath) {
  const source = path.join(repositoryPath, "node_modules");
  const destination = path.join(worktreePath, "node_modules");
  if (!existsSync(source) || existsSync(destination)) return false;
  await symlink(source, destination, "dir");
  return true;
}

export async function createWorktree({
  repositoryPath,
  worktreesDirectory,
  slug,
  baseRef,
  branchPrefix = "orq",
}) {
  await mkdir(worktreesDirectory, { recursive: true });
  const unique = Math.random().toString(36).slice(2, 7);
  const branch = `${branchPrefix}/${slug}-${unique}`;
  const worktreePath = path.join(worktreesDirectory, `${slug}-${unique}`);

  await git(repositoryPath, [
    "worktree",
    "add",
    "-b",
    branch,
    worktreePath,
    baseRef,
  ]);
  const linkedNodeModules = await linkNodeModules(repositoryPath, worktreePath);

  return { branch, path: worktreePath, linkedNodeModules };
}

export async function summarizeWorktree(worktreePath) {
  try {
    const [stat, files] = await Promise.all([
      git(worktreePath, ["diff", "--shortstat", "HEAD"]),
      git(worktreePath, ["diff", "--name-only", "HEAD"]),
    ]);
    const untracked = await git(worktreePath, [
      "ls-files",
      "--others",
      "--exclude-standard",
    ]);
    return {
      shortstat: stat,
      changedFiles: [
        ...files.split("\n").filter(Boolean),
        ...untracked.split("\n").filter(Boolean),
      ],
    };
  } catch {
    return { shortstat: "", changedFiles: [] };
  }
}

export async function commitWorktree(worktreePath, message) {
  try {
    await git(worktreePath, ["add", "-A"]);
    const staged = await git(worktreePath, ["diff", "--cached", "--name-only"]);
    if (!staged) return null;
    await git(worktreePath, ["commit", "-m", message]);
    return git(worktreePath, ["rev-parse", "--short", "HEAD"]);
  } catch {
    return null;
  }
}

export async function removeWorktree(repositoryPath, worktreePath) {
  try {
    await git(repositoryPath, ["worktree", "remove", "--force", worktreePath]);
    return true;
  } catch {
    return false;
  }
}
