const STALE_DOCUMENTATION_DAYS = 30
const sourcePathPattern = /`((?:(?:[\w@.-]+\/)+)?[\w.-]+\.(?:[cm]?[jt]sx?|py|java|go|rb|php|cs))`/gi

function normalizeEndpointPath(value) {
  const path = String(value || '').trim().replace(/[),.;:`]+$/, '')
  if (!path || path === '/') return '/'
  return path.replace(/\/+$/, '') || '/'
}

function endpointKey(endpoint) {
  return `${String(endpoint?.method || '').toUpperCase()} ${normalizeEndpointPath(endpoint?.path)}`
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function round(value) {
  return Math.round(value)
}

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizePath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '')
}

function directoryOf(path) {
  const normalized = normalizePath(path)
  const separator = normalized.lastIndexOf('/')
  return separator === -1 ? '.' : normalized.slice(0, separator) || '.'
}

function isCodeFile(file) {
  return file?.file_type === 'code'
}

function toAgeDays(value, now) {
  const date = toDate(value)
  if (!date) return null
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000)))
}

function severityWeight(severity) {
  return ({ Low: 25, Medium: 50, High: 75, Critical: 100 })[severity] || 0
}

function summarizeFindings(findings, knowledgeDebt, semanticMetrics = null) {
  const sortedFindings = [...findings]
    .sort((left, right) => severityWeight(right.severity) - severityWeight(left.severity) || left.filePath.localeCompare(right.filePath))
  const totalModules = knowledgeDebt?.metrics?.totalModules || 0
  const findingPressure = totalModules === 0 ? 0 : (sortedFindings.length / totalModules) * 50
  const severityPressure = sortedFindings.length === 0
    ? 0
    : sortedFindings.reduce((sum, item) => sum + severityWeight(item.severity), 0) / sortedFindings.length
  const countBySeverity = severity => sortedFindings.filter(item => item.severity === severity).length

  return {
    score: round(clamp(findingPressure + severityPressure * 0.5, 0, 100)),
    findings: sortedFindings,
    metrics: {
      total: sortedFindings.length,
      critical: countBySeverity('Critical'),
      high: countBySeverity('High'),
      medium: countBySeverity('Medium'),
      low: countBySeverity('Low'),
      documentationCoverage: knowledgeDebt?.metrics?.documentationCoverage ?? 100,
      setupCoverage: knowledgeDebt?.metrics?.hasSetupDocumentation ? 100 : 0,
      architectureCoverage: knowledgeDebt?.metrics?.hasArchitectureDocumentation ? 100 : 0,
      semantic: semanticMetrics,
    },
  }
}

function buildLastChangedByPath(commits) {
  const byPath = new Map()

  for (const commit of commits || []) {
    const date = toDate(commit.commit_date)
    if (!date) continue

    for (const path of new Set((commit.changed_files || []).map(normalizePath).filter(Boolean))) {
      const current = byPath.get(path)
      if (!current || date > current) byPath.set(path, date)
    }
  }

  return byPath
}

function latestChangeForDirectory(directory, files, lastChangedByPath) {
  const prefix = directory === '.' ? '' : `${directory}/`
  const dates = files
    .filter(file => directory === '.' ? !normalizePath(file.path).includes('/') : normalizePath(file.path).startsWith(prefix))
    .map(file => lastChangedByPath.get(normalizePath(file.path)))
    .filter(Boolean)

  return dates.length === 0 ? null : new Date(Math.max(...dates.map(date => date.getTime())))
}

function documentationMatchesModule(documentationPath, modulePath) {
  const path = normalizePath(documentationPath).toLowerCase()
  const module = normalizePath(modulePath).toLowerCase()
  const docDirectory = directoryOf(path).toLowerCase()
  const leaf = module.split('/').at(-1)
  const docBaseName = path.split('/').at(-1).replace(/\.[^.]+$/, '')

  return docDirectory === module
    || (module !== '.' && path.startsWith(`${module}/`))
    || docBaseName === leaf
    || (module !== '.' && path.endsWith(`/${module}.md`))
    || (module === '.' && docBaseName === 'readme')
}

function finding({ type, title, filePath, modulePath, severity, evidence, ageDays = null, identity = '' }) {
  return {
    key: `${type}:${filePath}:${modulePath || ''}:${identity}`,
    type,
    title,
    filePath,
    modulePath: modulePath || null,
    severity,
    evidence,
    ageDays,
  }
}

/**
 * Produces reproducible documentation-drift findings from repository facts.
 * This is intentionally structural rather than semantic/embedding based: it
 * detects missing module documentation, documentation that lags recent code,
 * API contract mismatches, and backticked source paths that no longer exist.
 */
export function analyzeKnowledgeDrift(analysis, knowledgeDebt, options = {}) {
  const now = toDate(options.now) || new Date()
  const files = Array.isArray(analysis?.files) ? analysis.files : []
  const codeFiles = files.filter(isCodeFile)
  const documentation = Array.isArray(analysis?.documentation) ? analysis.documentation : []
  const lastChangedByPath = buildLastChangedByPath(analysis?.commits)
  const moduleMetrics = Array.isArray(knowledgeDebt?.moduleMetrics) ? knowledgeDebt.moduleMetrics : []
  const codePathSet = new Set(codeFiles.map(file => normalizePath(file.path)))
  const findings = []

  for (const module of moduleMetrics) {
    if (module.documented) continue
    const moduleFileCount = codeFiles.filter(file => directoryOf(file.path) === module.path).length
    findings.push(finding({
      type: 'missing_documentation',
      title: `No documentation found for ${module.path === '.' ? 'root module' : module.path}`,
      filePath: module.path,
      modulePath: module.path,
      severity: moduleFileCount >= 5 ? 'High' : 'Medium',
      evidence: module.missingReason || 'No adjacent or module-named documentation was found.',
    }))
  }

  for (const route of knowledgeDebt?.apiRoutes || []) {
    if (route.documented) continue
    findings.push(finding({
      type: 'undocumented_api',
      title: `API endpoint ${route.method} ${route.path} is not documented`,
      filePath: route.sourcePath,
      modulePath: route.modulePath,
      severity: 'Medium',
      evidence: `The scanned route ${route.method} ${route.path} was not found in the extracted documentation corpus.`,
    }))
  }

  for (const module of moduleMetrics.filter(metric => metric.documented)) {
    const codeChangedAt = latestChangeForDirectory(module.path, codeFiles, lastChangedByPath)
    if (!codeChangedAt) continue

    const matchingDocs = documentation.filter(doc => documentationMatchesModule(doc.doc_path, module.path))
    const latestDocumentationAt = matchingDocs
      .map(doc => lastChangedByPath.get(normalizePath(doc.doc_path)))
      .filter(Boolean)
      .sort((left, right) => right - left)[0]

    if (!latestDocumentationAt) continue
    const lagDays = Math.floor((codeChangedAt.getTime() - latestDocumentationAt.getTime()) / (24 * 60 * 60 * 1000))
    if (lagDays < STALE_DOCUMENTATION_DAYS) continue

    const document = matchingDocs.find(doc => lastChangedByPath.get(normalizePath(doc.doc_path))?.getTime() === latestDocumentationAt.getTime()) || matchingDocs[0]
    findings.push(finding({
      type: 'outdated_documentation',
      title: `Documentation may lag ${module.path === '.' ? 'root code' : module.path}`,
      filePath: normalizePath(document.doc_path),
      modulePath: module.path,
      severity: lagDays >= STALE_DOCUMENTATION_DAYS * 3 ? 'High' : 'Medium',
      evidence: `Captured code changes are ${lagDays} days newer than this documentation file.`,
      ageDays: toAgeDays(latestDocumentationAt, now),
    }))
  }

  for (const document of documentation) {
    const seenReferences = new Set()
    for (const match of String(document.content || '').matchAll(sourcePathPattern)) {
      const referencedPath = normalizePath(match[1])
      if (codePathSet.has(referencedPath) || seenReferences.has(referencedPath)) continue
      seenReferences.add(referencedPath)
      findings.push(finding({
        type: 'dead_reference',
        title: `Documentation references missing source file ${referencedPath}`,
        filePath: normalizePath(document.doc_path),
        severity: 'Low',
        evidence: `The backticked path \`${referencedPath}\` was not found in the scanned repository.`,
        ageDays: toAgeDays(lastChangedByPath.get(normalizePath(document.doc_path)), now),
        identity: referencedPath,
      }))
      if (seenReferences.size >= 3) break
    }
  }

  const codeRoutes = Array.isArray(analysis?.codeAnalysis?.routes) ? analysis.codeAnalysis.routes : []
  const documentedEndpoints = Array.isArray(analysis?.documentationAnalysis?.facts?.api?.endpoints)
    ? analysis.documentationAnalysis.facts.api.endpoints
    : []
  const codeRouteKeys = new Set(codeRoutes.map(endpointKey))
  const documentedEndpointKeys = new Set(documentedEndpoints.map(endpointKey))

  for (const route of codeRoutes) {
    const key = endpointKey(route)
    if (documentedEndpointKeys.has(key)) continue
    findings.push(finding({
      type: 'undocumented_api',
      title: `${key} is implemented but not documented`,
      filePath: normalizePath(route.filePath || 'API'),
      severity: 'Medium',
      evidence: `The structured code scan found ${key}, but no matching documentation endpoint was captured.`,
      identity: key,
    }))
  }

  for (const endpoint of documentedEndpoints) {
    const key = endpointKey(endpoint)
    if (codeRouteKeys.has(key)) continue
    findings.push(finding({
      type: 'stale_api_documentation',
      title: `${key} is documented but was not found in code`,
      filePath: normalizePath(endpoint.docPath || 'documentation'),
      severity: 'Medium',
      evidence: `Documentation declares ${key}, but the supported-language route scan found no matching implementation.`,
      identity: key,
    }))
  }

  return summarizeFindings(findings, knowledgeDebt)
}

export function mergeSemanticDrift(structuralDrift, semanticDrift, knowledgeDebt) {
  const structuralFindings = Array.isArray(structuralDrift?.findings) ? structuralDrift.findings : []
  const semanticFindings = Array.isArray(semanticDrift?.findings) ? semanticDrift.findings : []
  return summarizeFindings([...structuralFindings, ...semanticFindings], knowledgeDebt, semanticDrift?.metrics || null)
}
