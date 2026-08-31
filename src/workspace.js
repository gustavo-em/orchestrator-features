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
