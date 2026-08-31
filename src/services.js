import { execFile } from "node:child_process";
import { createConnection } from "node:net";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function checkPort(port, host = "127.0.0.1", timeoutMs = 1_500) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host });
    const finish = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

export async function metroStatus(port = 8081) {
  const open = await checkPort(port);
  if (!open) return { running: false, port };
  try {
    const { stdout } = await execFileAsync(
      "curl",
      ["-s", "-m", "3", `http://127.0.0.1:${port}/status`],
      { encoding: "utf8" },
    );
    return { running: stdout.includes("packager-status:running"), port, foreign: false };
  } catch {
    return { running: false, port, foreign: true };
  }
}

export async function adbDevices() {
  try {
    const { stdout } = await execFileAsync("adb", ["devices"], { encoding: "utf8" });
    return stdout
      .split("\n")
      .slice(1)
      .map((line) => line.trim())
      .filter((line) => /\sdevice$/.test(line))
      .map((line) => line.split(/\s+/)[0]);
  } catch {
    return [];
  }
}

async function waitFor({ describe, probe, waitMs, pollMs, onWait }) {
  const deadline = Date.now() + waitMs;
  let announced = false;

  while (true) {
    const state = await probe();
    if (state.ready) return state;
    if (Date.now() >= deadline) {
      const error = new Error(
        waitMs
          ? `${describe} não ficou disponível em ${Math.round(waitMs / 60_000)} min: ${state.why}`
          : `${describe}: ${state.why}`,
      );
      error.code = "SERVICE_UNAVAILABLE";
      throw error;
    }
    if (!announced) {
      announced = true;
      onWait?.(state.why);
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

export function waitForMetro({ port = 8081, waitMs = 0, pollMs = 5_000, onWait } = {}) {
  return waitFor({
    describe: `Metro na porta ${port}`,
    waitMs,
    pollMs,
    onWait,
    probe: async () => {
      const status = await metroStatus(port);
      if (status.running) return { ready: true, why: "" };
      return {
        ready: false,
        why: status.foreign
          ? `porta ${port} ocupada por outro processo que não responde como Metro`
          : `Metro não está rodando na porta ${port}`,
      };
    },
  });
}

export function waitForDevice({
  deviceId,
  waitMs = 0,
  pollMs = 5_000,
  onWait,
  list = adbDevices,
} = {}) {
  return waitFor({
    describe: deviceId ? `device ${deviceId}` : "device Android",
    waitMs,
    pollMs,
    onWait,
    probe: async () => {
      const devices = await list();
      if (deviceId) {
        return devices.includes(deviceId)
          ? { ready: true, why: "", devices }
          : { ready: false, why: `${deviceId} não aparece em \`adb devices\`` };
      }
      if (!devices.length) {
        return { ready: false, why: "nenhum device conectado" };
      }
      if (devices.length > 1) {
        return {
          ready: false,
          why: `mais de um device (${devices.join(", ")}); informe --adb-device`,
        };
      }
      return { ready: true, why: "", devices };
    },
  });
}
