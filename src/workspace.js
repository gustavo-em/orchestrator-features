import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function runGit(projectPath, args) {
  const { stdout } = await execFileAsync("git", ["-C", projectPath, ...args], {
    encoding: "buffer",
    maxBuffer: 50 * 1024 * 1024,
  });
  return stdout;
}

export async function workspaceFingerprint(projectPath) {
  try {
    const [status, diff, stagedDiff, untrackedNames] = await Promise.all([
      runGit(projectPath, ["status", "--porcelain=v1", "-z", "-uall"]),
      runGit(projectPath, ["diff", "--binary", "--no-ext-diff"]),
      runGit(projectPath, ["diff", "--cached", "--binary", "--no-ext-diff"]),
      runGit(projectPath, ["ls-files", "--others", "--exclude-standard", "-z"]),
    ]);

    const hash = createHash("sha256");
    hash.update(status);
    hash.update(diff);
    hash.update(stagedDiff);

    const names = untrackedNames
      .toString("utf8")
      .split("\0")
      .filter(Boolean)
      .sort();

    for (const relativePath of names) {
      hash.update(relativePath);
      try {
        hash.update(await readFile(path.join(projectPath, relativePath)));
      } catch {
        hash.update("<unreadable>");
      }
    }

    return hash.digest("hex");
  } catch {
    return null;
  }
}

const MAX_DIFF_CHARS = 24_000;
const MAX_UNTRACKED_FILE_CHARS = 4_000;
const NON_TEXT_EXTENSIONS = new Set([
  ".aab",
  ".apk",
  ".gif",
  ".ico",
  ".jar",
  ".jpeg",
  ".jpg",
  ".keystore",
  ".mp3",
  ".mp4",
  ".otf",
  ".pdf",
  ".png",
  ".so",
  ".ttf",
  ".webp",
  ".woff",
  ".woff2",
  ".zip",
]);

async function trackedDiff(projectPath) {
  const flags = ["--no-ext-diff", "--no-color", "--unified=3"];
  try {
    const diff = await runGit(projectPath, ["diff", ...flags, "HEAD"]);
    return diff.toString("utf8");
  } catch {
    const [unstaged, staged] = await Promise.all([
      runGit(projectPath, ["diff", ...flags]),
      runGit(projectPath, ["diff", "--cached", ...flags]),
    ]);
    return `${unstaged.toString("utf8")}${staged.toString("utf8")}`;
  }
}

export async function workspaceDiff(projectPath, { maxChars = MAX_DIFF_CHARS } = {}) {
  try {
    const [tracked, untrackedNames] = await Promise.all([
      trackedDiff(projectPath),
      runGit(projectPath, ["ls-files", "--others", "--exclude-standard", "-z"]),
    ]);

    const sections = tracked.trim() ? [tracked.trimEnd()] : [];
    const names = untrackedNames
      .toString("utf8")
      .split("\0")
      .filter(Boolean)
      .sort();

    for (const relativePath of names) {
      if (NON_TEXT_EXTENSIONS.has(path.extname(relativePath).toLowerCase())) {
        sections.push(`--- arquivo novo (binário, conteúdo omitido): ${relativePath}`);
        continue;
      }
      let content;
      try {
        content = await readFile(path.join(projectPath, relativePath), "utf8");
      } catch {
        sections.push(`--- arquivo novo (ilegível): ${relativePath}`);
        continue;
      }
      const truncated =
        content.length > MAX_UNTRACKED_FILE_CHARS
          ? `${content.slice(0, MAX_UNTRACKED_FILE_CHARS)}\n… (arquivo truncado)`
          : content;
      sections.push(`--- arquivo novo: ${relativePath}\n${truncated.trimEnd()}`);
    }

    if (!sections.length) return null;

    const diff = sections.join("\n\n");
    if (diff.length <= maxChars) return diff;
    return `${diff.slice(0, maxChars)}\n… (diff truncado em ${maxChars} caracteres)`;
  } catch {
    return null;
  }
}
