import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { detectReactNativeProject } from "../src/project-detector.js";

async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), "orq-detector-"));
  await mkdir(path.join(directory, "android/app/src/main"), { recursive: true });
  return directory;
}

test("detecta package e activity de projeto React Native nativo", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  await writeFile(
    path.join(directory, "package.json"),
    JSON.stringify({ name: "meu-app", dependencies: { "react-native": "0.81.0" } }),
  );
  await writeFile(
    path.join(directory, "android/app/build.gradle"),
    'android { namespace "com.exemplo.app" defaultConfig { applicationId "com.exemplo.app" } }',
  );
  await writeFile(
    path.join(directory, "android/app/src/main/AndroidManifest.xml"),
    `<manifest package="com.exemplo.app"><application><activity android:name=".LauncherActivity"><intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter></activity></application></manifest>`,
  );

  const result = await detectReactNativeProject(directory);

  assert.equal(result.isReactNative, true);
  assert.equal(result.packageCandidates[0].value, "com.exemplo.app");
  assert.equal(result.activity, ".LauncherActivity");
});

test("prioriza package explícito do Expo", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  await writeFile(
    path.join(directory, "package.json"),
    JSON.stringify({ name: "expo-app", dependencies: { expo: "latest" } }),
  );
  await writeFile(
    path.join(directory, "app.json"),
    JSON.stringify({ expo: { name: "Expo App", android: { package: "br.app.expo" } } }),
  );

  const result = await detectReactNativeProject(directory);

  assert.equal(result.isExpo, true);
  assert.equal(result.appName, "Expo App");
  assert.equal(result.packageCandidates[0].value, "br.app.expo");
});
