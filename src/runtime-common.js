export class AgentTimeoutError extends Error {
  constructor(agentName, timeoutMs) {
    super(`${agentName} excedeu timeout de ${Math.ceil(timeoutMs / 60_000)} min.`);
    this.name = "AgentTimeoutError";
    this.code = "AGENT_TIMEOUT";
    this.agentName = agentName;
    this.timeoutMs = timeoutMs;
  }
}

export function parseStructuredResponse(response, agentName) {
  if (response && typeof response === "object") return response;
  if (!response) throw new Error(`${agentName} terminou sem resposta final.`);
  try {
    return JSON.parse(response);
  } catch (error) {
    throw new Error(
      `${agentName} devolveu resposta inválida para schema: ${error.message}`,
    );
  }
}

export function compactOptions(options) {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined),
  );
}

export function safeProgress(onProgress, progress) {
  try {
    onProgress?.(progress);
  } catch {
    // Progresso nunca pode derrubar execução do agente.
  }
}

export async function runMarketLanes({ lanes, runLane }) {
  const { mergeMarketLanes } = await import("../agents/market-analyst.js");
  const results = await Promise.all(
    lanes.map(async (lane) => {
      try {
        const result = await runLane(lane);
        return { ...result, lane: result?.lane || lane.id };
      } catch (error) {
        return {
          status: "BLOCKED",
          lane: lane.id,
          summary: error.message,
          signals: [],
          opportunities: [],
          risks: [],
          featureContext: [],
        };
      }
    }),
  );
  return mergeMarketLanes(results);
}
