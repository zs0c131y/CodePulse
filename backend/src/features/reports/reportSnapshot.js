export const REPORT_SCHEMA = 'codepulse.report.snapshot'
export const REPORT_SCHEMA_VERSION = 1

export const REPORT_SECTION_LIMITS = Object.freeze({
  technicalDebtModules: 250,
  driftFindings: 250,
  recommendations: 100,
  contributors: 100,
})
export const REPORT_SECTION_BYTE_LIMIT = 1024 * 1024

function toIso(value, fieldName) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`${fieldName} must be a valid date.`)
  }
  return date.toISOString()
}

function cloneJson(value) {
  if (value === undefined) return null
  return JSON.parse(JSON.stringify(value))
}

function boundedItems(items, limit, transform = cloneJson) {
  const source = Array.isArray(items) ? items : []
  const included = []
  let includedBytes = 2
  for (const item of source.slice(0, limit)) {
    const candidate = transform(item)
    const candidateBytes = Buffer.byteLength(JSON.stringify(candidate)) + 1
    if (includedBytes + candidateBytes > REPORT_SECTION_BYTE_LIMIT) break
    included.push(candidate)
    includedBytes += candidateBytes
  }

  return {
    totalItems: source.length,
    includedItems: included.length,
    truncated: source.length > included.length,
    includedBytes,
    items: included,
  }
}

function unavailableSection() {
  return {
    status: 'unavailable',
    totalItems: 0,
    includedItems: 0,
    truncated: false,
    items: [],
  }
}

function repositoryIdentity(repository) {
  return {
    id: repository.id,
    name: repository.name,
    fullName: repository.fullName || null,
    url: repository.url,
    defaultBranch: repository.defaultBranch || null,
    scanCompletedAt: repository.updatedAt || null,
    totals: {
      files: repository.totalFiles ?? 0,
      commits: repository.totalCommits ?? 0,
      dependencies: repository.totalDependencies ?? 0,
      documentation: repository.totalDocumentation ?? 0,
    },
  }
}

function technicalDebtSection(technicalDebt) {
  if (!technicalDebt) return { ...unavailableSection(), metrics: null, generatedAt: null }

  return {
    status: 'included',
    ...boundedItems(technicalDebt.modules, REPORT_SECTION_LIMITS.technicalDebtModules),
    metrics: cloneJson(technicalDebt.metrics || {}),
    generatedAt: technicalDebt.generatedAt || null,
  }
}

function knowledgeDriftSection(knowledgeDrift) {
  if (!knowledgeDrift) return { ...unavailableSection(), coverage: [], generatedAt: null }

  return {
    status: 'included',
    ...boundedItems(knowledgeDrift.findings, REPORT_SECTION_LIMITS.driftFindings),
    coverage: cloneJson(knowledgeDrift.coverage || []),
    generatedAt: knowledgeDrift.generatedAt || null,
  }
}

/**
 * Builds the immutable JSON payload persisted for a generated report.
 *
 * Evidence arrays are intentionally bounded so a large repository cannot
 * exceed MongoDB's document limit. Counts make any truncation explicit to
 * API consumers and future renderers.
 */
export function buildReportSnapshot({
  repository,
  scores,
  technicalDebt,
  knowledgeDrift,
  recommendations,
  contributors,
  analysisVersion,
  generatedAt = new Date(),
}) {
  if (!repository?.id) throw new TypeError('repository is required.')
  if (!scores) throw new TypeError('scores are required.')

  const generatedAtIso = toIso(generatedAt, 'generatedAt')
  const recommendationSection = boundedItems(recommendations, REPORT_SECTION_LIMITS.recommendations)
  const contributorSection = boundedItems(
    contributors,
    REPORT_SECTION_LIMITS.contributors,
    contributor => ({
      name: String(contributor?.name || 'Unknown').slice(0, 300),
      commitCount: Math.max(0, Number(contributor?.commitCount) || 0),
      firstCommitAt: contributor?.firstCommitAt || null,
      lastCommitAt: contributor?.lastCommitAt || null,
    }),
  )

  return {
    schema: REPORT_SCHEMA,
    version: REPORT_SCHEMA_VERSION,
    generatedAt: generatedAtIso,
    sourceAnalysis: {
      version: Number.isInteger(analysisVersion) ? analysisVersion : null,
      analyzedAt: scores.generatedAt || null,
    },
    repository: repositoryIdentity(repository),
    summary: {
      healthScore: scores.healthScore ?? null,
      technicalDebt: cloneJson(scores.technicalDebt || null),
      knowledgeDebt: cloneJson(scores.knowledgeDebt || null),
      drift: cloneJson(scores.drift || null),
      risk: cloneJson(scores.risk || null),
      recommendationsReady: scores.recommendationsReady ?? recommendationSection.totalItems,
    },
    sections: {
      technicalDebt: technicalDebtSection(technicalDebt),
      knowledgeDrift: knowledgeDriftSection(knowledgeDrift),
      recommendations: {
        status: 'included',
        ...recommendationSection,
      },
      contributors: {
        status: 'included',
        ...contributorSection,
      },
    },
  }
}
