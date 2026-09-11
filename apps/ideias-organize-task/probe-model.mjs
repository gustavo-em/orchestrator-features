#!/usr/bin/env node
/**
 * Asks one model for a one-word answer to learn whether the account can use it
 * right now. Prints "ok" or "limit" (any error counts as a limit) and exits 0.
 *
 * Usage: node apps/bocado/probe-model.mjs claude-fable-5-1
 */
import { query } from "@anthropic-ai/claude-agent-sdk";

const model = process.argv[2] ?? "claude-fable-5-1";
let verdict = "limit";
try {
  for await (const message of query({
    prompt: "Reply with exactly: OK",
    options: {
      model,
      effort: "low",
      maxTurns: 1,
      tools: [],
      allowedTools: [],
      permissionMode: "dontAsk",
      settingSources: [],
      strictMcpConfig: true,
    },
  })) {
    if (message.type === "result") {
      verdict = message.subtype === "success" && !message.is_error ? "ok" : "limit";
    }
  }
} catch {
  verdict = "limit";
}
console.log(verdict);
