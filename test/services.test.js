import assert from "node:assert/strict";
import test from "node:test";

import { waitForDevice } from "../src/services.js";

test("device único é aceito na hora", async () => {
  const state = await waitForDevice({ list: async () => ["emulator-5554"] });
  assert.deepEqual(state.devices, ["emulator-5554"]);
});

test("device pedido por serial é esperado até aparecer", async () => {
  const respostas = [[], [], ["emulator-5556"]];
  const avisos = [];

  const state = await waitForDevice({
    deviceId: "emulator-5556",
    waitMs: 60_000,
    pollMs: 1,
    onWait: (why) => avisos.push(why),
    list: async () => respostas.shift() ?? [],
  });

  assert.equal(state.ready, true);
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /não aparece em/);
});

test("sem device e sem espera, falha explicando", async () => {
  await assert.rejects(
    () => waitForDevice({ list: async () => [] }),
    (error) => {
      assert.equal(error.code, "SERVICE_UNAVAILABLE");
      assert.match(error.message, /nenhum device conectado/);
      return true;
    },
  );
});

test("mais de um device pede o serial em vez de escolher sozinho", async () => {
  await assert.rejects(
    () => waitForDevice({ list: async () => ["emulator-5554", "emulator-5556"] }),
    /informe --adb-device/,
  );
});

test("espera esgotada diz quanto esperou", async () => {
  await assert.rejects(
    () =>
      waitForDevice({
        waitMs: 60_000,
        pollMs: 1,
        list: async () => [],
      }),
    /não ficou disponível em 1 min/,
  );
});
