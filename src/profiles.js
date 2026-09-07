export const profiles = {
  fast: {
    description: "Itera rápido com você olhando: sem mercado, sem auditoria.",
    marketingMode: "none",
    designReasoningEffort: "medium",
    codeReasoningEffort: "low",
    maxCycles: 1,
    gateOverrides: {
      screenTest: true,
      designCheck: false,
      uxAudit: false,
      codeReview: false,
    },
  },
  unattended: {
    description:
      "Roda sem supervisão: valida ideia, mercado, usabilidade e aparência.",
    marketingMode: "context",
    designReasoningEffort: "medium",
    codeReasoningEffort: "low",
    maxCycles: 3,
    gateOverrides: {
      screenTest: true,
      designCheck: true,
      uxAudit: true,
      codeReview: null,
    },
  },
  deep: {
    description:
      "Feature grande sem supervisão (auth, persistência, fluxo novo): " +
      "reasoning alto no design, médio no código, revisão sempre, mais ciclos.",
    marketingMode: "context",
    designReasoningEffort: "high",
    codeReasoningEffort: "medium",
    maxCycles: 5,
    gateOverrides: {
      screenTest: true,
      designCheck: true,
      uxAudit: true,
      codeReview: true,
    },
  },
};

export const profileNames = Object.keys(profiles);

export function resolveProfile(name) {
  if (!name) return null;
  const profile = profiles[name];
  if (!profile) {
    throw new Error(`--profile deve ser ${profileNames.join(" ou ")}.`);
  }
  return profile;
}
