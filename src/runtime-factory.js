export const supportedProviders = new Set(["codex", "claude"]);

export function validateProvider(provider) {
  if (!supportedProviders.has(provider)) {
    throw new Error(`Provedor inválido: ${provider}. Use codex ou claude.`);
  }
}

export async function createAgentRuntime(options) {
  const provider = options.provider ?? "codex";
  validateProvider(provider);
  const Runtime =
    provider === "claude"
      ? (await import("./claude-agent.js")).ClaudeAgentRuntime
      : (await import("./codex-agent.js")).CodexAgentRuntime;
  return new Runtime(options);
}
