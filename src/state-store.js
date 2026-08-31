import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRunsDirectory = path.resolve(currentDirectory, "../runs");

function createRunId() {
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}`;
}

export class JsonRunStateStore {
  constructor({ runsDirectory = defaultRunsDirectory } = {}) {
    this.runsDirectory = runsDirectory;
    this.runId = createRunId();
    this.filePath = path.join(runsDirectory, `${this.runId}.json`);
  }

  async save(state) {
    await mkdir(this.runsDirectory, { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(temporaryPath, this.filePath);
    return this.filePath;
  }
}
