export const LARGE_FILE_BYTES = 50 * 1024
export const HIGH_COMPLEXITY_THRESHOLD = 15
export const STALE_MODULE_DAYS = 180
export const MINIMUM_CHURN_SAMPLE_SIZE = 5

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
      }

      signal.changeCount += 1
      signal.owners.set(owner, (signal.owners.get(owner) || 0) + 1)

      if (date && (!signal.lastChangedAt || date > signal.lastChangedAt)) {
        signal.lastChangedAt = date
      }

      byPath.set(path, signal)
    }
  }

  return byPath
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

function debtScoreForModule({ file, complexity, churnPercent, circular, orphan, stale }) {
  const sizeContribution = clamp((Number(file.size) || 0) / LARGE_FILE_BYTES, 0, 1) * 20 + (Number(file.size) >= LARGE_FILE_BYTES ? 10 : 0)
  const complexityContribution = clamp(complexity / HIGH_COMPLEXITY_THRESHOLD, 0, 1) * 30
  const churnContribution = clamp(churnPercent, 0, 100) * 0.15
  const structuralContribution = circular ? 20 : orphan ? 6 : 0
  const staleContribution = stale ? 5 : 0

  return round(clamp(sizeContribution + complexityContribution + churnContribution + structuralContribution + staleContribution, 0, 100))
}

/**
 * Calculates an intentionally transparent, metadata-based debt estimate.
 * It is not a cyclomatic-complexity parser: the complexity score combines
 * source-file size with resolved internal dependency fan-in/fan-out so it can
 * run from the repository facts already persisted by Repository Intelligence.
 */
export function analyzeTechnicalDebt(analysis, options = {}) {
  const files = Array.isArray(analysis?.files) ? analysis.files : []
  const commits = Array.isArray(analysis?.commits) ? analysis.commits : []
  const dependencies = Array.isArray(analysis?.dependencies) ? analysis.dependencies : []
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
    const complexity = clamp(1 + Math.ceil((Number(file.size) || 0) / 1024) + outgoing * 2 + inbound, 1, 100)
    const observedChurnPercent = commits.length > 0 ? round(((signal?.changeCount || 0) / commits.length) * 100, 1) : 0
    const churnPercent = churnAvailable ? observedChurnPercent : 0
    const lastChangedAt = signal?.lastChangedAt || null
    const stale = Boolean(churnAvailable && lastChangedAt && lastChangedAt < staleCutoff && latestCommitAt >= staleCutoff)
    const circular = circularPaths.has(path)
    const dependencyGraphAvailable = supportsDependencyGraph(file) && (!scannedDependencyPaths || scannedDependencyPaths.has(path))
    const orphan = dependencyGraphAvailable && !circular && !isEntrypoint(path) && outgoing === 0 && inbound === 0
    const large = (Number(file.size) || 0) >= LARGE_FILE_BYTES
    const highComplexity = complexity >= HIGH_COMPLEXITY_THRESHOLD
    const debtScore = debtScoreForModule({ file, complexity, churnPercent, circular, orphan, stale })
    const reasons = []

    if (large) reasons.push(`Large source file (${file.size} bytes)`)
    if (highComplexity) reasons.push(`High complexity heuristic (${complexity})`)
    if (churnAvailable && churnPercent >= 50) reasons.push(`High churn (${churnPercent}%)`)
    if (circular) reasons.push('Circular internal dependency')
    if (orphan) reasons.push('No resolved internal dependencies')
    if (stale) reasons.push(`No observed changes in ${STALE_MODULE_DAYS}+ days`)

    return {
      path,
      owner: topOwner(signal?.owners),
      size: Number(file.size) || 0,
      complexity,
      churnPercent,
      observedChurnPercent,
      churnAvailable,
      duplicationPercent: null,
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
      duplicationPercent: null,
      circularDependencies: circularGroups.length,
      circularDependencyEdges,
      orphanModules,
      staleModules,
      criticalModules,
    },
    modules,
    circularGroups,
  }
}
