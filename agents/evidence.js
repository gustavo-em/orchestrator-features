export function compactEvidence(evidence) {
  if (!evidence) return null;
  return {
    uiNodes: evidence.uiNodes,
    errors: evidence.errors,
    interruptions: evidence.interruptions?.length
      ? evidence.interruptions
      : undefined,
    ineffectiveSteps: evidence.ineffectiveSteps?.length
      ? evidence.ineffectiveSteps
      : undefined,
    trees: evidence.trees?.length ? evidence.trees : undefined,
    screenshots: (evidence.screenshots ?? []).map(({ name, path, keyboard }) => ({
      name,
      path,
      ...(keyboard ? { keyboard: true } : {}),
    })),
  };
}
