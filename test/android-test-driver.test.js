import assert from "node:assert/strict";
import test from "node:test";

import {
  compactUiHierarchy,
  validateAdbSteps,
} from "../src/android-test-driver.js";

test("compacta árvore UI removendo nós sem sinal útil", () => {
  const xml = `
    <hierarchy>
      <node text="" class="android.view.View" clickable="false" bounds="[0,0][10,10]" />
      <node text="Entrar" resource-id="login" class="android.widget.Button" content-desc="Login" clickable="true" enabled="true" bounds="[0,10][100,50]" />
    </hierarchy>
  `;

  const nodes = compactUiHierarchy(xml);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].text, "Entrar");
  assert.equal(nodes[0]["resource-id"], "login");
});

test("rejeita ação ADB arbitrária", () => {
  assert.throws(
    () => validateAdbSteps([{ action: "shell", value: "rm -rf /" }]),
    /não permitida/,
  );
});
