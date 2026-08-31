import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { slugify } from "./worktree.js";

function cacheKey(appContext) {
  return slugify(
    appContext?.packageName || appContext?.appName || "app",
    60,
  );
}

export function cachePathFor(directory, appContext) {
  return path.join(directory, `${cacheKey(appContext)}.json`);
}

export async function readMarketCache({ directory, appContext, maxAgeDays }) {
  if (!maxAgeDays) return null;
  try {
    const raw = await readFile(cachePathFor(directory, appContext), "utf8");
    const cached = JSON.parse(raw);
    const ageDays =
      (Date.now() - new Date(cached.accessedAt).getTime()) / 86_400_000;
    if (!Number.isFinite(ageDays) || ageDays > maxAgeDays) return null;
    return { analysis: cached, ageDays };
  } catch {
    return null;
  }
}

export async function writeMarketCache({ directory, appContext, analysis }) {
  if (!analysis || analysis.status === "BLOCKED") return null;
  await mkdir(directory, { recursive: true });
  const filePath = cachePathFor(directory, appContext);
  await writeFile(filePath, `${JSON.stringify(analysis, null, 2)}\n`, "utf8");
  return filePath;
}
