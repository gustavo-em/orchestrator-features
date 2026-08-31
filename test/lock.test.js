import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  acquireLock,
  describeHolder,
  isStale,
  readHolder,
  withLocks,
} from "../src/lock.js";

async function makeDirectory() {
  return mkdtemp(path.join(tmpdir(), "orq-lock-"));
}

test("segundo run no mesmo projeto é recusado com quem está segurando", async () => {
  const directory = await makeDirectory();
  try {
    const release = await acquireLock(
      "projeto-/tmp/app",
      { task: "melhorar a tela de foco" },
      { directory },
    );

    await assert.rejects(
      () => acquireLock("projeto-/tmp/app", {}, { directory }),
      (error) => {
        assert.equal(error.code, "LOCK_BUSY");
        assert.match(error.message, /Já existe uma execução/);
        assert.match(error.message, /melhorar a tela de foco/);
        return true;
      },
    );

    await release();
    const afterRelease = await acquireLock("projeto-/tmp/app", {}, { directory });
    await afterRelease();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("projetos diferentes não disputam a trava", async () => {
  const directory = await makeDirectory();
  try {
    const first = await acquireLock("projeto-/tmp/a", {}, { directory });
    const second = await acquireLock("projeto-/tmp/b", {}, { directory });
    await first();
    await second();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("trava de processo morto é considerada podre e reutilizada", async () => {
  const directory = await makeDirectory();
  try {
    await writeFile(
      path.join(directory, "device-adb-padrao.lock.json"),
      JSON.stringify({
        key: "device-adb-padrao",
        pid: 999_999_999,
        acquiredAt: new Date().toISOString(),
      }),
    );

    const holder = await readHolder("device-adb-padrao", directory);
    assert.equal(isStale(holder), true);

    const release = await acquireLock("device-adb-padrao", {}, { directory });
    const novo = await readHolder("device-adb-padrao", directory);
    assert.equal(novo.pid, process.pid);
    await release();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("trava antiga do mesmo processo também vence por idade", () => {
  const antiga = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString();
  assert.equal(isStale({ pid: process.pid, acquiredAt: antiga }), true);
  assert.equal(
    isStale({ pid: process.pid, acquiredAt: new Date().toISOString() }),
    false,
  );
});

test("withLocks libera tudo mesmo quando a execução falha", async () => {
  const directory = await makeDirectory();
  try {
    await assert.rejects(
      () =>
        withLocks(
          ["projeto-/tmp/app", "device-adb-padrao"],
          {},
          { directory },
          async () => {
            throw new Error("falhou no meio");
          },
        ),
      /falhou no meio/,
    );

    const release = await acquireLock("projeto-/tmp/app", {}, { directory });
    const device = await acquireLock("device-adb-padrao", {}, { directory });
    await release();
    await device();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("descrição do dono mostra pid e tarefa", async () => {
  const directory = await makeDirectory();
  try {
    const release = await acquireLock(
      "projeto-/tmp/app",
      { task: "tela de foco", stateFile: "runs/x.json" },
      { directory },
    );
    const holder = await readHolder("projeto-/tmp/app", directory);
    const text = describeHolder(holder);

    assert.match(text, new RegExp(`pid ${process.pid}`));
    assert.match(text, /tela de foco/);
    assert.match(text, /runs\/x\.json/);
    assert.equal(
      JSON.parse(
        await readFile(path.join(directory, "projeto-tmp-app.lock.json"), "utf8"),
      ).pid,
      process.pid,
    );
    await release();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
