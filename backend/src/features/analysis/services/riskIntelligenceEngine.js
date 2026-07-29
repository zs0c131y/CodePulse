function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function round(value) {
  return Math.round(value)
}

function directoryOf(path) {
  const normalized = String(path || '').replaceAll('\\', '/').replace(/^\.\//, '')
  const separator = normalized.lastIndexOf('/')
  return separator === -1 ? '.' : normalized.slice(0, separator) || '.'
}

export function riskLevelForScore(score) {
  if (score >= 75) return 'Critical'
  if (score >= 50) return 'High'
  if (score >= 25) return 'Medium'
  return 'Low'
}

function severityWeight(severity) {
  return ({ Low: 25, Medium: 50, High: 75, Critical: 100 })[severity] || 0
}

function highestDriftForModule(modulePath, findings) {
  return findings
    .filter(finding => finding.modulePath === modulePath || finding.filePath === modulePath || finding.filePath.startsWith(`${modulePath}/`))
    .sort((left, right) => severityWeight(right.severity) - severityWeight(left.severity))[0] || null
}

/**
 * Converts technical, knowledge, and documentation-drift evidence into a
 * module risk ranking. It is deterministic so every score has inspectable
 * evidence and can later be augmented by an LLM explanation layer.
 */
export function analyzeRiskIntelligence({ technicalDebt, knowledgeDebt, drift }) {
  const documentationByModule = new Map(
    (knowledgeDebt?.moduleMetrics || []).map(module => [module.path, module]),
  )
  const findings = drift?.findings || []
  const modules = (technicalDebt?.modules || []).map(module => {
    const modulePath = directoryOf(module.path)
    const documentation = documentationByModule.get(modulePath)
    const documentationPenalty = documentation && !documentation.documented ? 100 : 0
    const driftFinding = highestDriftForModule(modulePath, findings)
    const driftPenalty = driftFinding ? severityWeight(driftFinding.severity) : 0
    const score = round(clamp(
      Number(module.debtScore || 0) * 0.6
      + documentationPenalty * 0.2
      + driftPenalty * 0.15
      + Number(module.churnPercent || 0) * 0.05,
      0,
      100,
    ))
    const reasons = [...(module.reasons || [])]

    if (documentationPenalty) reasons.push('Module documentation is missing')
    if (driftFinding) reasons.push(`Documentation drift: ${driftFinding.title}`)

    return {
      path: module.path,
      modulePath,
      score,
      level: riskLevelForScore(score),
      reasons,
    }
  }).sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))

  const averageScore = modules.length === 0
    ? 0
    : modules.reduce((sum, module) => sum + module.score, 0) / modules.length
  const highestScore = modules[0]?.score || 0
  const score = round(clamp(averageScore * 0.7 + highestScore * 0.3, 0, 100))
  const count = level => modules.filter(module => module.level === level).length

  return {
    score,
    level: riskLevelForScore(score),
    modules,
    metrics: {
      totalModules: modules.length,
      criticalModules: count('Critical'),
      highModules: count('High'),
      mediumModules: count('Medium'),
      lowModules: count('Low'),
    },
  }
}
