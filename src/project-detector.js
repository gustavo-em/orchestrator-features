import { readFile } from "node:fs/promises";
import path from "node:path";

async function readOptional(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function readJsonOptional(filePath) {
  const text = await readOptional(filePath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function addCandidate(map, value, source, priority) {
  if (!value || typeof value !== "string") return;
  const normalized = value.trim();
  if (!normalized) return;

  const current = map.get(normalized) ?? {
    value: normalized,
    priority,
    sources: [],
  };
  current.priority = Math.min(current.priority, priority);
  if (!current.sources.includes(source)) current.sources.push(source);
  map.set(normalized, current);
}

function gradleValue(text, key) {
  const pattern = new RegExp(`${key}\\s*(?:=\\s*)?["']([^"']+)["']`);
  return text?.match(pattern)?.[1] ?? null;
}

function manifestActivity(manifest) {
  if (!manifest) return null;

  for (const match of manifest.matchAll(/<activity\b([\s\S]*?)<\/activity>/g)) {
    const block = match[0];
    const attributes = match[1];
    if (!/android\.intent\.action\.MAIN/.test(block)) continue;
    if (!/android\.intent\.category\.LAUNCHER/.test(block)) continue;
    return attributes.match(/android:name=["']([^"']+)["']/)?.[1] ?? null;
  }

  return null;
}

export async function detectReactNativeProject(projectPath) {
  const packageJson = await readJsonOptional(path.join(projectPath, "package.json"));
  const appJson = await readJsonOptional(path.join(projectPath, "app.json"));
  const appConfigJson = await readJsonOptional(path.join(projectPath, "app.config.json"));
  const gradleGroovy = await readOptional(
    path.join(projectPath, "android/app/build.gradle"),
  );
  const gradleKotlin = await readOptional(
    path.join(projectPath, "android/app/build.gradle.kts"),
  );
  const manifest = await readOptional(
    path.join(projectPath, "android/app/src/main/AndroidManifest.xml"),
  );

  const dependencies = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
  };
  const expoConfig = appConfigJson?.expo ?? appJson?.expo ?? null;
  const packageCandidates = new Map();

  addCandidate(
    packageCandidates,
    expoConfig?.android?.package,
    expoConfig === appConfigJson?.expo ? "app.config.json" : "app.json",
    1,
  );

  for (const [source, gradle] of [
    ["android/app/build.gradle", gradleGroovy],
    ["android/app/build.gradle.kts", gradleKotlin],
  ]) {
    addCandidate(packageCandidates, gradleValue(gradle, "applicationId"), source, 2);
    addCandidate(packageCandidates, gradleValue(gradle, "namespace"), source, 3);
  }

  addCandidate(
    packageCandidates,
    manifest?.match(/<manifest\b[^>]*\bpackage=["']([^"']+)["']/)?.[1],
    "AndroidManifest.xml",
    4,
  );

  const appName =
    expoConfig?.name ??
    appJson?.displayName ??
    appJson?.name ??
    packageJson?.displayName ??
    packageJson?.name ??
    path.basename(projectPath);

  return {
    projectPath,
    isReactNative: Boolean(dependencies["react-native"] || dependencies.expo),
    isExpo: Boolean(dependencies.expo || expoConfig),
    appName,
    packageCandidates: [...packageCandidates.values()].sort(
      (left, right) => left.priority - right.priority,
    ),
    activity: manifestActivity(manifest) ?? ".MainActivity",
  };
}
