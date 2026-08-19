export const LARGE_FILE_BYTES = 50 * 1024
export const HIGH_COMPLEXITY_THRESHOLD = 15
export const STALE_MODULE_DAYS = 180
export const MINIMUM_CHURN_SAMPLE_SIZE = 5
export const DEEP_DEPENDENCY_THRESHOLD = 6
export const LOW_COVERAGE_THRESHOLD = 40

const bugFixCommitPattern = /\b(?:bug|defect|fix(?:ed|es|ing)?|hotfix|patch|regression)\b/i

const dependencyGraphLanguages = new Set([
  'JavaScript',
  'JavaScript JSX',
  'TypeScript',
  'TypeScript JSX',
  'Python',
])

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function round(value, precision = 0) {
  const multiplier = 10 ** precision
  return Math.round(value * multiplier) / multiplier
}

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizePath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '')
}

function isCodeFile(file) {
  return file?.file_type === 'code'
}

function supportsDependencyGraph(file) {
  return dependencyGraphLanguages.has(file?.language)
}

function isEntrypoint(path) {
  return /(^|\/)(index|main|app|server|cli)\.[^.]+$|(^|\/)(manage\.py|__init__\.py)$/i.test(path)
}

function topOwner(owners) {
  if (!owners || owners.size === 0) return 'Unassigned'

  return [...owners.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0][0]
}

function buildCommitSignals(commits) {
  const byPath = new Map()

  for (const commit of commits || []) {
    const date = toDate(commit.commit_date)
    const owner = String(commit.author || commit.author_email || 'Unassigned').trim() || 'Unassigned'
    const isBugFix = bugFixCommitPattern.test(String(commit.message || ''))
    const changedFiles = new Set(
      (Array.isArray(commit.changed_files) ? commit.changed_files : [])
        .map(normalizePath)
        .filter(Boolean),
    )

    for (const path of changedFiles) {
      const signal = byPath.get(path) || {
        changeCount: 0,
        lastChangedAt: null,
        owners: new Map(),
        bugFixCount: 0,
      }

      signal.changeCount += 1
      signal.owners.set(owner, (signal.owners.get(owner) || 0) + 1)
      if (isBugFix) signal.bugFixCount += 1

      if (date && (!signal.lastChangedAt || date > signal.lastChangedAt)) {
        signal.lastChangedAt = date
      }

      byPath.set(path, signal)
    }
  }

  return byPath
}

function findDependencyDepths(graph) {
  const memo = new Map()

  function visit(node, active) {
    if (memo.has(node)) return memo.get(node)
    if (active.has(node)) return 0

    const nextActive = new Set(active).add(node)
    let depth = 0
    for (const target of graph.get(node) || []) {
      depth = Math.max(depth, 1 + visit(target, nextActive))
    }
    memo.set(node, depth)
    return depth
  }

  for (const node of graph.keys()) visit(node, new Set())
  return memo
}

function buildResolvedGraph(codePaths, dependencies) {
  const graph = new Map()
  const incoming = new Map()
  const pathSet = new Set(codePaths)

  for (const path of codePaths) {
    graph.set(path, new Set())
    incoming.set(path, new Set())
  }

  for (const dependency of dependencies || []) {
    const source = normalizePath(dependency.source_file)
    const target = normalizePath(dependency.target_file)

    if (!dependency.resolved || !pathSet.has(source) || !pathSet.has(target)) continue

    graph.get(source).add(target)
    incoming.get(target).add(source)
  }

  return { graph, incoming }
}

function findCircularGroups(graph) {
  let nextIndex = 0
  const indexes = new Map()
  const lowLinks = new Map()
  const stack = []
  const onStack = new Set()
  const groups = []

  function visit(node) {
    indexes.set(node, nextIndex)
    lowLinks.set(node, nextIndex)
    nextIndex += 1
    stack.push(node)
    onStack.add(node)

    for (const target of graph.get(node) || []) {
      if (!indexes.has(target)) {
        visit(target)
        lowLinks.set(node, Math.min(lowLinks.get(node), lowLinks.get(target)))
      } else if (onStack.has(target)) {
        lowLinks.set(node, Math.min(lowLinks.get(node), indexes.get(target)))
      }
    }

    if (lowLinks.get(node) !== indexes.get(node)) return

    const group = []
    let member
    do {
      member = stack.pop()
      onStack.delete(member)
      group.push(member)
    } while (member !== node)

    const isSelfCycle = group.length === 1 && (graph.get(group[0]) || new Set()).has(group[0])
    if (group.length > 1 || isSelfCycle) groups.push(group.sort((left, right) => left.localeCompare(right)))
  }

  for (const node of graph.keys()) {
    if (!indexes.has(node)) visit(node)
  }

  return groups.sort((left, right) => left[0].localeCompare(right[0]))
}

function riskForScore(score) {
  if (score >= 75) return 'Critical'
  if (score >= 50) return 'High'
  if (score >= 25) return 'Medium'
  return 'Low'
}

export function gradeForTechnicalDebt(score) {
  if (score <= 20) return 'A'
  if (score <= 40) return 'B'
  if (score <= 60) return 'C'
  if (score <= 80) return 'D'
  return 'F'
}

function debtScoreForModule({
  file,
  complexity,
  churnPercent,
  duplicationPercent,
  circular,
  orphan,
  stale,
  contributorConcentrationPercent,
  bugFixPercent,
  dependencyDepth,
  coverageAvailable,
  coveragePercent,
}) {
  const sizeContribution = clamp((Number(file.size) || 0) / LARGE_FILE_BYTES, 0, 1) * 20 + (Number(file.size) >= LARGE_FILE_BYTES ? 10 : 0)
  const complexityContribution = clamp(complexity / HIGH_COMPLEXITY_THRESHOLD, 0, 1) * 30
  const churnContribution = clamp(churnPercent, 0, 100) * 0.15
  const duplicationContribution = clamp(duplicationPercent || 0, 0, 100) * 0.15
  const structuralContribution = circular ? 20 : orphan ? 6 : 0
  const staleContribution = stale ? 5 : 0
  const ownershipContribution = contributorConcentrationPercent >= 75 ? 5 : 0
  const bugPronenessContribution = bugFixPercent >= 50 ? 5 : 0
  const dependencyDepthContribution = dependencyDepth >= DEEP_DEPENDENCY_THRESHOLD ? 5 : 0
  const lowCoverageContribution = coverageAvailable && coveragePercent < LOW_COVERAGE_THRESHOLD ? 5 : 0

  return round(clamp(
    sizeContribution
      + complexityContribution
      + churnContribution
      + duplicationContribution
      + structuralContribution
      + staleContribution
      + ownershipContribution
      + bugPronenessContribution
      + dependencyDepthContribution
      + lowCoverageContribution,
    0,
    100,
  ))
}

/**
 * Calculates an intentionally transparent debt estimate. Source-supported
 * files use bounded structural heuristics; unsupported or skipped files fall
 * back to size and resolved dependency metadata, and expose which method won.
 */
export function analyzeTechnicalDebt(analysis, options = {}) {
  const files = Array.isArray(analysis?.files) ? analysis.files : []
  const commits = Array.isArray(analysis?.commits) ? analysis.commits : []
  const dependencies = Array.isArray(analysis?.dependencies) ? analysis.dependencies : []
  const codeFactsByPath = new Map(
    (analysis?.codeAnalysis?.files || []).map(fact => [normalizePath(fact.filePath), fact]),
  )
  const coverageAvailable = Boolean(analysis?.coverage?.available)
  const coverageByPath = new Map(
    (analysis?.coverage?.modules || []).map(module => [normalizePath(module.filePath), module]),
  )
  const scannedDependencyPaths = Array.isArray(analysis?.dependencyGraph?.scannedFilePaths)
    ? new Set(analysis.dependencyGraph.scannedFilePaths.map(normalizePath))
    : null
  const now = toDate(options.now) || new Date()
  const staleCutoff = new Date(now.getTime() - STALE_MODULE_DAYS * 24 * 60 * 60 * 1000)
  const codeFiles = files.filter(isCodeFile).map(file => ({ ...file, path: normalizePath(file.path) }))
  const codePaths = codeFiles.map(file => file.path)
  const signals = buildCommitSignals(commits)
  const commitDates = commits.map(commit => toDate(commit.commit_date)).filter(Boolean)
  const latestCommitAt = commitDates.length > 0 ? new Date(Math.max(...commitDates.map(date => date.getTime()))) : now
  const churnAvailable = commits.length >= MINIMUM_CHURN_SAMPLE_SIZE
  const { graph, incoming } = buildResolvedGraph(codePaths, dependencies)
  const dependencyDepths = findDependencyDepths(graph)
  const circularGroups = findCircularGroups(graph)
  const circularPaths = new Set(circularGroups.flat())
  const circularGroupByPath = new Map()
  circularGroups.forEach((group, index) => group.forEach(path => circularGroupByPath.set(path, index)))
  const circularDependencyEdges = dependencies.filter(dependency => {
    if (!dependency.resolved) return false
    const sourceGroup = circularGroupByPath.get(normalizePath(dependency.source_file))
    const targetGroup = circularGroupByPath.get(normalizePath(dependency.target_file))
    return sourceGroup !== undefined && sourceGroup === targetGroup
  }).length

  const modules = codeFiles.map(file => {
    const path = file.path
    const signal = signals.get(path)
    const outgoing = graph.get(path)?.size || 0
    const inbound = incoming.get(path)?.size || 0
    const codeFact = codeFactsByPath.get(path)
    const measuredComplexity = Number(codeFact?.metrics?.cyclomaticComplexity)
    const complexity = Number.isFinite(measuredComplexity)
      ? clamp(measuredComplexity, 1, 100)
      : clamp(1 + Math.ceil((Number(file.size) || 0) / 1024) + outgoing * 2 + inbound, 1, 100)
    const complexityMethod = Number.isFinite(measuredComplexity) ? 'source-heuristic' : 'metadata-heuristic'
    const measuredDuplication = Number(codeFact?.metrics?.duplicationPercent)
    const duplicationPercent = Number.isFinite(measuredDuplication) ? measuredDuplication : null
    const observedChurnPercent = commits.length > 0 ? round(((signal?.changeCount || 0) / commits.length) * 100, 1) : 0
    const churnPercent = churnAvailable ? observedChurnPercent : 0
    const lastChangedAt = signal?.lastChangedAt || null
    const ownerCounts = [...(signal?.owners?.values?.() || [])]
    const contributorCount = ownerCounts.length
    const contributorConcentrationPercent = signal?.changeCount
      ? round((Math.max(...ownerCounts) / signal.changeCount) * 100, 1)
      : 0
    const bugFixCount = signal?.bugFixCount || 0
    const bugFixPercent = signal?.changeCount
      ? round((bugFixCount / signal.changeCount) * 100, 1)
      : 0
    const stale = Boolean(churnAvailable && lastChangedAt && lastChangedAt < staleCutoff && latestCommitAt >= staleCutoff)
    const circular = circularPaths.has(path)
    const dependencyGraphAvailable = supportsDependencyGraph(file) && (!scannedDependencyPaths || scannedDependencyPaths.has(path))
    const orphan = dependencyGraphAvailable && !circular && !isEntrypoint(path) && outgoing === 0 && inbound === 0
    const large = (Number(file.size) || 0) >= LARGE_FILE_BYTES
    const highComplexity = complexity >= HIGH_COMPLEXITY_THRESHOLD
    const dependencyDepth = dependencyDepths.get(path) || 0
    const coverageRecord = coverageAvailable ? coverageByPath.get(path) : null
    const moduleCoverageAvailable = Boolean(coverageRecord && coverageRecord.coveredPercent !== null)
    const coveragePercent = moduleCoverageAvailable ? coverageRecord.coveredPercent : null
    const debtScore = debtScoreForModule({
      file,
      complexity,
      churnPercent,
      duplicationPercent,
      circular,
      orphan,
      stale,
      contributorConcentrationPercent,
      bugFixPercent,
      dependencyDepth,
      coverageAvailable: moduleCoverageAvailable,
      coveragePercent,
    })
    const reasons = []

    if (large) reasons.push(`Large source file (${file.size} bytes)`)
    if (highComplexity) reasons.push(`High complexity heuristic (${complexity})`)
    if (duplicationPercent >= 20) reasons.push(`Repeated source blocks (${duplicationPercent}%)`)
    if ((codeFact?.metrics?.longFunctionCount || 0) > 0) reasons.push(`${codeFact.metrics.longFunctionCount} long function(s)`)
    if (churnAvailable && churnPercent >= 50) reasons.push(`High churn (${churnPercent}%)`)
    if (circular) reasons.push('Circular internal dependency')
    if (orphan) reasons.push('No resolved internal dependencies')
    if (stale) reasons.push(`No observed changes in ${STALE_MODULE_DAYS}+ days`)
    if (churnAvailable && signal?.changeCount >= 3 && contributorConcentrationPercent >= 75) {
      reasons.push(`Contributor concentration (${contributorConcentrationPercent}% by one contributor)`)
    }
    if (bugFixCount >= 2 && bugFixPercent >= 50) reasons.push(`Bug-fix hotspot (${bugFixCount} captured fixes)`)
    if (dependencyDepth >= DEEP_DEPENDENCY_THRESHOLD) reasons.push(`Deep dependency chain (${dependencyDepth} edges)`)
    if (moduleCoverageAvailable && coveragePercent < LOW_COVERAGE_THRESHOLD) {
      reasons.push(`Low test coverage (${coveragePercent}%)`)
    }

    return {
      path,
      owner: topOwner(signal?.owners),
      size: Number(file.size) || 0,
      complexity,
      complexityMethod,
      churnPercent,
      observedChurnPercent,
      churnAvailable,
      contributorCount,
      contributorConcentrationPercent,
      bugFixCount,
      bugFixPercent,
      duplicationPercent,
      dependencyDepth,
      coveragePercent,
      coverageAvailable: moduleCoverageAvailable,
      lastChangedAt: lastChangedAt ? lastChangedAt.toISOString() : null,
      large,
      highComplexity,
      circular,
      orphan,
      dependencyGraphAvailable,
      stale,
      debtScore,
      risk: riskForScore(debtScore),
      reasons,
    }
  }).sort((left, right) => right.debtScore - left.debtScore || left.path.localeCompare(right.path))

  const totalCodeFiles = modules.length
  const count = predicate => modules.filter(predicate).length
  const average = key => totalCodeFiles === 0 ? 0 : round(modules.reduce((sum, module) => sum + Number(module[key] || 0), 0) / totalCodeFiles, 1)
  const largeFiles = count(module => module.large)
  const staleModules = count(module => module.stale)
  const orphanModules = count(module => module.orphan)
  const highComplexityFiles = count(module => module.highComplexity)
  const criticalModules = count(module => module.risk === 'Critical')
  const ownershipConcentrationModules = count(module => (
    module.churnAvailable
      && module.contributorConcentrationPercent >= 75
      && (signals.get(module.path)?.changeCount || 0) >= 3
  ))
  const bugProneModules = count(module => module.bugFixCount >= 2 && module.bugFixPercent >= 50)
  const deepDependencyModules = count(module => module.dependencyDepth >= DEEP_DEPENDENCY_THRESHOLD)
  const duplicationModules = modules.filter(module => module.duplicationPercent !== null)
  const coverageModules = modules.filter(module => module.coverageAvailable)
  const lowCoverageModules = count(module => module.coverageAvailable && module.coveragePercent < LOW_COVERAGE_THRESHOLD)
  const averageModuleDebt = average('debtScore')
  const score = totalCodeFiles === 0
    ? 0
    : round(clamp(
      averageModuleDebt * 0.7 +
      (circularGroups.length / totalCodeFiles) * 100 * 0.15 +
      (largeFiles / totalCodeFiles) * 100 * 0.1 +
      (staleModules / totalCodeFiles) * 100 * 0.05,
      0,
      100,
    ))

  return {
    score,
    grade: gradeForTechnicalDebt(score),
    metrics: {
      totalCodeFiles,
      largeFiles,
      highComplexityFiles,
      averageComplexity: average('complexity'),
      averageChurnPercent: average('churnPercent'),
      churnSampleSize: commits.length,
      churnAvailable,
      duplicationPercent: duplicationModules.length === 0
        ? null
        : round(duplicationModules.reduce((sum, module) => sum + module.duplicationPercent, 0) / duplicationModules.length, 1),
      circularDependencies: circularGroups.length,
      circularDependencyEdges,
      orphanModules,
      staleModules,
      criticalModules,
      ownershipConcentrationModules,
      bugProneModules,
      deepDependencyModules,
      longestDependencyChain: modules.reduce((maximum, module) => Math.max(maximum, module.dependencyDepth), 0),
      coverageAvailable,
      averageCoveragePercent: coverageModules.length === 0
        ? null
        : round(coverageModules.reduce((sum, module) => sum + module.coveragePercent, 0) / coverageModules.length, 1),
      coverageSampleSize: coverageModules.length,
      lowCoverageModules,
    },
    modules,
    circularGroups,
  }
}
