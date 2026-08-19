import { randomUUID } from 'node:crypto'

export const STRUCTURED_FACT_LIMIT = 5_000
export const STRUCTURED_SUMMARY_BYTE_LIMIT = 512 * 1024
export const DEFAULT_FACT_PAGE_LIMIT = 50
export const MAX_FACT_PAGE_LIMIT = 200

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toIso(value) {
  return toDate(value)?.toISOString() || null
}

function bounded(items, limit = STRUCTURED_FACT_LIMIT, byteLimit = STRUCTURED_SUMMARY_BYTE_LIMIT) {
  const source = Array.isArray(items) ? items : []
  const selected = []
  let bytes = 2
  for (const item of source.slice(0, limit)) {
    const itemBytes = Buffer.byteLength(JSON.stringify(item)) + 1
    if (bytes + itemBytes > byteLimit) break
    selected.push(item)
    bytes += itemBytes
  }
  return {
    items: selected,
    total: source.length,
    truncated: source.length > selected.length,
  }
}

export function normalizeFactPagination(options = {}) {
  const requestedLimit = Number(options.limit)
  const requestedSkip = Number(options.skip)
  return {
    limit: Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_FACT_PAGE_LIMIT)
      : DEFAULT_FACT_PAGE_LIMIT,
    skip: Number.isInteger(requestedSkip) && requestedSkip >= 0 ? requestedSkip : 0,
  }
}

function paginate(records, options) {
  const { limit, skip } = normalizeFactPagination(options)
  const source = Array.isArray(records) ? records : []
  if (options.prePaginated) {
    return { items: source, total: options.total ?? source.length, limit, skip }
  }
  return {
    items: source.slice(skip, skip + limit),
    total: source.length,
    limit,
    skip,
  }
}

async function upsertSummary(collection, repositoryId, patch, now) {
  const existing = await collection.findOne({ repository_id: repositoryId })
  if (existing) {
    await collection.updateOne({ _id: existing._id }, { $set: patch })
    return { ...existing, ...patch }
  }

  const record = { repository_id: repositoryId, ...patch, created_at: now }
  const result = await collection.insertOne(record)
  return { _id: result.insertedId, ...record }
}

async function insertFactsForScan(collection, repositoryId, scanId, facts) {
  await collection.deleteMany({ repository_id: repositoryId, scan_id: scanId })
  if (facts.length > 0) await collection.insertMany(facts, { ordered: false })
}

function compactCoverage(coverage = {}) {
  const modules = coverage.modules || {}
  const api = coverage.api || {}
  return {
    overallPercent: coverage.overallPercent ?? null,
    components: coverage.components || [],
    modules: {
      available: Boolean(modules.available),
      percent: modules.percent ?? null,
      total: modules.total ?? 0,
      documented: bounded(modules.documented).items,
      undocumented: bounded(modules.undocumented).items,
    },
    api: {
      available: Boolean(api.available),
      percent: api.percent ?? null,
      total: api.total ?? 0,
      documented: bounded(api.documented).items,
      undocumented: bounded(api.undocumented).items,
    },
    setup: coverage.setup || { present: false, percent: 0 },
    architecture: coverage.architecture || { present: false, percent: 0 },
  }
}

function codeSummaryPatch(codeAnalysis, now) {
  const modules = bounded(codeAnalysis?.modules)
  const routes = bounded(codeAnalysis?.routes)
  const orphanFiles = bounded(codeAnalysis?.orphanFiles)
  const skippedFiles = bounded(codeAnalysis?.skippedFiles)
  const duplicateGroups = bounded(codeAnalysis?.duplicateGroups)
  return {
    analysis_version: codeAnalysis?.analysisVersion ?? 1,
    metrics: codeAnalysis?.metrics || {},
    modules: modules.items,
    routes: routes.items,
    orphan_files: orphanFiles.items,
    skipped_files: skippedFiles.items,
    duplicate_groups: duplicateGroups.items,
    totals: {
      modules: modules.total,
      routes: routes.total,
      orphanFiles: orphanFiles.total,
      skippedFiles: skippedFiles.total,
      duplicateGroups: duplicateGroups.total,
    },
    truncated: {
      modules: modules.truncated,
      routes: routes.truncated,
      orphanFiles: orphanFiles.truncated,
      skippedFiles: skippedFiles.truncated,
      duplicateGroups: duplicateGroups.truncated,
    },
    analyzed_at: now,
    updated_at: now,
  }
}

function documentationSummaryPatch(documentationAnalysis, now) {
  const sourceFacts = documentationAnalysis?.facts || {}
  const setupSteps = bounded(sourceFacts.setup?.steps)
  const setupCommands = bounded(sourceFacts.setup?.commands)
  const apiEndpoints = bounded(sourceFacts.api?.endpoints)
  const architectureNotes = bounded(sourceFacts.architecture?.notes)
  const sourceReferences = bounded(sourceFacts.sourceReferences)

  return {
    analysis_version: documentationAnalysis?.analysisVersion ?? 1,
    metrics: documentationAnalysis?.metrics || {},
    coverage: compactCoverage(documentationAnalysis?.coverage),
    facts: {
      setup: {
        present: Boolean(sourceFacts.setup?.present),
        steps: setupSteps.items,
        commands: setupCommands.items,
      },
      api: {
        present: Boolean(sourceFacts.api?.present),
        endpoints: apiEndpoints.items,
      },
      architecture: {
        present: Boolean(sourceFacts.architecture?.present),
        notes: architectureNotes.items,
      },
      sourceReferences: sourceReferences.items,
    },
    totals: {
      setupSteps: setupSteps.total,
      setupCommands: setupCommands.total,
      apiEndpoints: apiEndpoints.total,
      architectureNotes: architectureNotes.total,
      sourceReferences: sourceReferences.total,
    },
    truncated: {
      setupSteps: setupSteps.truncated,
      setupCommands: setupCommands.truncated,
      apiEndpoints: apiEndpoints.truncated,
      architectureNotes: architectureNotes.truncated,
      sourceReferences: sourceReferences.truncated,
    },
    analyzed_at: now,
    updated_at: now,
  }
}

export async function persistStructuredAnalysisWithCollections({
  repositoryId,
  scanId,
  codeAnalysis,
  documentationAnalysis,
  now = new Date(),
}, collections) {
  const analyzedAt = toDate(now) || new Date()
  const currentScanId = scanId || randomUUID()
  const [previousCodeSummary, previousDocumentationSummary] = await Promise.all([
    collections.codeAnalysisSummaries.findOne({ repository_id: repositoryId }),
    collections.documentationAnalysisSummaries.findOne({ repository_id: repositoryId }),
  ])
  const previousCodeScanId = previousCodeSummary?.scan_id
  const previousDocumentationScanId = previousDocumentationSummary?.scan_id

  const codeFacts = (codeAnalysis?.files || []).map(file => ({
    repository_id: repositoryId,
    scan_id: currentScanId,
    file_path: file.filePath,
    module_path: file.modulePath,
    module_name: file.moduleName,
    language: file.language,
    is_test: Boolean(file.isTest),
    line_count: file.lineCount,
    metrics: file.metrics || {},
    parser: file.parser || {},
    imports: file.imports || [],
    exports: file.exports || [],
    functions: file.functions || [],
    classes: file.classes || [],
    routes: file.routes || [],
    created_at: analyzedAt,
    updated_at: analyzedAt,
  }))
  const documentationFacts = (documentationAnalysis?.documents || []).map(document => ({
    repository_id: repositoryId,
    scan_id: currentScanId,
    doc_path: document.docPath,
    documentation_type: document.type,
    title: document.title,
    truncated: Boolean(document.truncated),
    headings: document.headings || [],
    setup: document.setup || {},
    api: document.api || {},
    architecture: document.architecture || {},
    source_references: document.sourceReferences || [],
    created_at: analyzedAt,
    updated_at: analyzedAt,
  }))

  await Promise.all([
    insertFactsForScan(collections.codeFacts, repositoryId, currentScanId, codeFacts),
    insertFactsForScan(collections.documentationFacts, repositoryId, currentScanId, documentationFacts),
  ])

  const [codeSummary, documentationSummary] = await Promise.all([
    upsertSummary(
      collections.codeAnalysisSummaries,
      repositoryId,
      { ...codeSummaryPatch(codeAnalysis, analyzedAt), scan_id: currentScanId },
      analyzedAt,
    ),
    upsertSummary(
      collections.documentationAnalysisSummaries,
      repositoryId,
      { ...documentationSummaryPatch(documentationAnalysis, analyzedAt), scan_id: currentScanId },
      analyzedAt,
    ),
  ])

  const staleDeletes = []
  if (previousCodeScanId && previousCodeScanId !== currentScanId) {
    staleDeletes.push(collections.codeFacts.deleteMany({
      repository_id: repositoryId,
      scan_id: previousCodeScanId,
    }))
  }
  if (previousDocumentationScanId && previousDocumentationScanId !== currentScanId) {
    staleDeletes.push(collections.documentationFacts.deleteMany({
      repository_id: repositoryId,
      scan_id: previousDocumentationScanId,
    }))
  }
  await Promise.all(staleDeletes)

  return {
    codeSummary,
    documentationSummary,
    codeFactCount: codeFacts.length,
    documentationFactCount: documentationFacts.length,
  }
}

function serializeCodeFact(record) {
  return {
    filePath: record.file_path,
    modulePath: record.module_path,
    moduleName: record.module_name,
    language: record.language,
    isTest: Boolean(record.is_test),
    lineCount: record.line_count ?? 0,
    metrics: record.metrics || {},
    parser: record.parser || {},
    imports: record.imports || [],
    exports: record.exports || [],
    functions: record.functions || [],
    classes: record.classes || [],
    routes: record.routes || [],
  }
}

function serializeDocumentationFact(record) {
  return {
    docPath: record.doc_path,
    type: record.documentation_type,
    title: record.title,
    truncated: Boolean(record.truncated),
    headings: record.headings || [],
    setup: record.setup || {},
    api: record.api || {},
    architecture: record.architecture || {},
    sourceReferences: record.source_references || [],
  }
}

export function serializeCodeAnalysis(summary, facts, options = {}) {
  if (!summary) return null
  const sorted = [...(facts || [])]
    .sort((left, right) => String(left.file_path).localeCompare(String(right.file_path)))
  const page = paginate(sorted, options)
  return {
    analysisVersion: summary.analysis_version ?? 1,
    metrics: summary.metrics || {},
    modules: summary.modules || [],
    routes: summary.routes || [],
    orphanFiles: summary.orphan_files || [],
    skippedFiles: summary.skipped_files || [],
    duplicateGroups: summary.duplicate_groups || [],
    totals: summary.totals || {},
    truncated: summary.truncated || {},
    files: { ...page, items: page.items.map(serializeCodeFact) },
    generatedAt: toIso(summary.analyzed_at || summary.updated_at),
  }
}

export function serializeDocumentationAnalysis(summary, facts, options = {}) {
  if (!summary) return null
  const sorted = [...(facts || [])]
    .sort((left, right) => String(left.doc_path).localeCompare(String(right.doc_path)))
  const page = paginate(sorted, options)
  return {
    analysisVersion: summary.analysis_version ?? 1,
    metrics: summary.metrics || {},
    coverage: summary.coverage || {},
    facts: summary.facts || {},
    totals: summary.totals || {},
    truncated: summary.truncated || {},
    documents: { ...page, items: page.items.map(serializeDocumentationFact) },
    generatedAt: toIso(summary.analyzed_at || summary.updated_at),
  }
}
