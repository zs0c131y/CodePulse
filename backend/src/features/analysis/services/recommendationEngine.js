function recommendationForModule(module) {
  const evidence = module.reasons || []
  const hasCircularDependency = evidence.some(reason => /circular/i.test(reason))
  const hasMissingDocumentation = evidence.some(reason => /documentation is missing/i.test(reason))
  const hasHighChurn = evidence.some(reason => /high churn/i.test(reason))

  if (hasCircularDependency) {
    return {
      title: `Break the dependency cycle around ${module.path}`,
      effort: '2–5 days',
      reason: `${module.path} is ${module.level.toLowerCase()} risk because ${evidence.join('; ')}.`,
      steps: [
        'Identify the smallest interface shared by the dependent modules.',
        'Move that interface to a neutral module or invert one dependency.',
        'Add focused tests before changing import boundaries.',
      ],
    }
  }

  if (hasMissingDocumentation) {
    return {
      title: `Document the responsibilities of ${module.modulePath}`,
      effort: '0.5–1 day',
      reason: `${module.path} has no matching module documentation and is ${module.level.toLowerCase()} risk.`,
      steps: [
        'Add a concise module README describing responsibilities and entry points.',
        'Document local setup, dependencies, and common change paths.',
        'Link the module documentation from the repository architecture guide.',
      ],
    }
  }

  if (hasHighChurn) {
    return {
      title: `Stabilize the high-churn module ${module.path}`,
      effort: '1–3 days',
      reason: `${module.path} changes frequently and has accumulated ${module.level.toLowerCase()} risk evidence.`,
      steps: [
        'Review recent changes for recurring defect or feature patterns.',
        'Extract the most volatile responsibility behind a stable interface.',
        'Add regression tests for the most frequently changed behavior.',
      ],
    }
  }

  return {
    title: `Reduce maintainability pressure in ${module.path}`,
    effort: '1–3 days',
    reason: `${module.path} is ${module.level.toLowerCase()} risk because ${evidence.join('; ') || 'its combined debt signals are elevated'}.`,
    steps: [
      'Split unrelated responsibilities into focused modules.',
      'Add tests around the highest-risk behavior before refactoring.',
      'Re-run CodePulse after the change to verify the score improves.',
    ],
  }
}

/**
 * Deterministic explainability fallback. This produces evidence-backed cards
 * without requiring an external LLM or sending repository content away.
 */
export function buildRecommendations({ risk, drift }) {
  const highRiskModules = (risk?.modules || []).filter(module => ['High', 'Critical'].includes(module.level)).slice(0, 5)
  const moduleRecommendations = highRiskModules.map((module, index) => ({
    id: `module:${module.path}`,
    impact: module.level,
    ...recommendationForModule(module),
    order: index,
  }))
  const driftRecommendation = (drift?.findings || []).find(finding => ['High', 'Critical'].includes(finding.severity))

  if (driftRecommendation && moduleRecommendations.length < 6) {
    moduleRecommendations.push({
      id: `drift:${driftRecommendation.key}`,
      impact: driftRecommendation.severity,
      title: `Resolve documentation drift in ${driftRecommendation.filePath}`,
      effort: '0.5–1 day',
      reason: driftRecommendation.evidence,
      steps: [
        'Confirm the referenced implementation and documentation owner.',
        'Update or remove the stale statement with the current behavior.',
        'Add a review checklist item so future changes update this document.',
      ],
      order: moduleRecommendations.length,
    })
  }

  return moduleRecommendations
}
