export function compactEvidence(evidence) {
  if (!evidence) return null;
  return {
    uiNodes: evidence.uiNodes,
    errors: evidence.errors,
    screenshots: (evidence.screenshots ?? []).map(({ name, path }) => ({
      name,
      path,
    })),
  };
}
