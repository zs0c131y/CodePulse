function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toIso(value) {
  const date = toDate(value)
  return date ? date.toISOString() : null
}

async function upsertByRepository(collection, repositoryId, patch, now) {
  const existing = await collection.findOne({ repository_id: repositoryId })

  if (existing) {
    await collection.updateOne({ _id: existing._id }, { $set: patch })
    return { ...existing, ...patch }
  }

  const record = { repository_id: repositoryId, ...patch, created_at: now }
  const result = await collection.insertOne(record)
  return { _id: result.insertedId, ...record }
}

async function replaceModuleMetrics(collection, repositoryId, records) {
  await collection.deleteMany({ repository_id: repositoryId })
  if (records.length > 0) await collection.insertMany(records, { ordered: false })
}

function technicalMetricRecord(repositoryId, module, now) {
  return {
    repository_id: repositoryId,
    file_path: module.path,
    owner: module.owner,
    size: module.size,
    complexity: module.complexity,
    complexity_method: module.complexityMethod,
    churn_percent: module.churnPercent,
    observed_churn_percent: module.observedChurnPercent,
    churn_available: module.churnAvailable,
    contributor_count: module.contributorCount,
    contributor_concentration_percent: module.contributorConcentrationPercent,
    bug_fix_count: module.bugFixCount,
    bug_fix_percent: module.bugFixPercent,
    duplication_percent: module.duplicationPercent,
    dependency_depth: module.dependencyDepth,
    coverage_percent: module.coveragePercent,
    coverage_available: module.coverageAvailable,
    last_changed_at: toDate(module.lastChangedAt),
    is_large_file: module.large,
    is_high_complexity: module.highComplexity,
    is_circular: module.circular,
    is_orphan: module.orphan,
    is_stale: module.stale,
    dependency_graph_available: module.dependencyGraphAvailable,
    debt_score: module.debtScore,
    risk: module.risk,
    reasons: module.reasons,
    created_at: now,
    updated_at: now,
  }
}

function knowledgeMetricRecord(repositoryId, module, now) {
  return {
    repository_id: repositoryId,
    module_path: module.path,
    documented: module.documented,
    missing_reason: module.missingReason,
    api_routes: module.apiRoutes ?? 0,
    documented_api_routes: module.documentedApiRoutes ?? 0,
    undocumented_api_routes: module.undocumentedApiRoutes ?? 0,
    explainability_score: module.explainabilityScore ?? 0,
    complexity: module.complexity ?? null,
    complexity_penalty: module.complexityPenalty ?? 0,
    created_at: now,
    updated_at: now,
  }
}

function driftFindingRecord(repositoryId, finding, now) {
  return {
    repository_id: repositoryId,
    finding_key: finding.key,
    drift_type: finding.type,
    title: finding.title,
    file_path: finding.filePath,
    module_path: finding.modulePath,
    description: finding.title,
    severity: finding.severity,
    evidence: finding.evidence,
    age_days: finding.ageDays,
    semantic: finding.semantic || null,
    review_status: null,
    reviewed_at: null,
    created_at: now,
    updated_at: now,
  }
}

function recommendationRecord(repositoryId, recommendation, now) {
  return {
    repository_id: repositoryId,
    recommendation_key: recommendation.id,
    category: recommendation.category,
    title: recommendation.title,
    impact: recommendation.impact,
    effort: recommendation.effort,
    reason: recommendation.reason,
    steps: recommendation.steps,
    order: recommendation.order,
    created_at: now,
    updated_at: now,
  }
}

function scoreHistoryRecord(repositoryId, scores, now) {
  return {
    repository_id: repositoryId,
    health_score: scores.healthScore,
    technical_debt_score: scores.technicalDebt?.score ?? 0,
    knowledge_debt_score: scores.knowledgeDebt?.score ?? 0,
    drift_score: scores.drift?.score ?? 0,
    risk_score: scores.risk?.score ?? 0,
    analyzed_at: now,
    created_at: now,
  }
}

export async function persistAnalysisResultsWithCollections({ repositoryId, results, now }, collections) {
  const analyzedAt = toDate(now) || new Date()
  const scores = results.scores
  const technicalDebt = results.technicalDebt
  const knowledgeDebt = results.knowledgeDebt
  const drift = results.drift || { findings: [] }
  const recommendations = results.recommendations || []

  const repositoryScore = await upsertByRepository(
    collections.repositoryScores,
    repositoryId,
    {
      analysis_version: 2,
      health_score: scores.healthScore,
      health_trend: scores.healthTrend,
      technical_debt: {
        score: technicalDebt.score,
        grade: technicalDebt.grade,
        metrics: technicalDebt.metrics,
      },
      knowledge_debt: {
        score: knowledgeDebt.score,
        documentation_coverage: knowledgeDebt.metrics.documentationCoverage,
        onboarding_difficulty_score: knowledgeDebt.metrics.onboardingDifficultyScore,
        metrics: knowledgeDebt.metrics,
      },
      drift: scores.drift,
      risk: scores.risk,
      recommendations_ready: scores.recommendationsReady,
      analyzed_at: analyzedAt,
      updated_at: analyzedAt,
    },
    analyzedAt,
  )

  if (collections.repositoryScoreHistory) {
    await collections.repositoryScoreHistory.insertOne(
      scoreHistoryRecord(repositoryId, scores, analyzedAt),
    )
  }

  await replaceModuleMetrics(
    collections.technicalDebtMetrics,
    repositoryId,
    technicalDebt.modules.map(module => technicalMetricRecord(repositoryId, module, analyzedAt)),
  )
  await replaceModuleMetrics(
    collections.knowledgeDebtMetrics,
    repositoryId,
    knowledgeDebt.moduleMetrics.map(module => knowledgeMetricRecord(repositoryId, module, analyzedAt)),
  )
  await replaceModuleMetrics(
    collections.driftFindings,
    repositoryId,
    drift.findings.map(finding => driftFindingRecord(repositoryId, finding, analyzedAt)),
  )
  await replaceModuleMetrics(
    collections.recommendations,
    repositoryId,
    recommendations.map(recommendation => recommendationRecord(repositoryId, recommendation, analyzedAt)),
  )

  return {
    repositoryScore,
    scoreHistoryCount: collections.repositoryScoreHistory ? 1 : 0,
    technicalDebtMetricCount: technicalDebt.modules.length,
    knowledgeDebtMetricCount: knowledgeDebt.moduleMetrics.length,
    driftFindingCount: drift.findings.length,
    recommendationCount: recommendations.length,
  }
}

export function serializeAnalysisScores(record) {
  if (!record) return null

  const technicalDebt = record.technical_debt || {}
  const knowledgeDebt = record.knowledge_debt || {}
  const risk = record.risk || {}
  const scoreHistory = Array.isArray(record.score_history) ? record.score_history : []
  const healthTrend = scoreHistory.length > 0
    ? scoreHistory.map(entry => entry.health_score ?? 0)
    : (Array.isArray(record.health_trend) ? record.health_trend : [])
  const riskTrend = scoreHistory.length > 0
    ? scoreHistory.map(entry => ({
      label: toIso(entry.analyzed_at)?.slice(5, 16).replace('T', ' ') || 'Unknown',
      value: entry.risk_score ?? 0,
    }))
    : (Array.isArray(risk.trend) ? risk.trend : [])

  return {
    healthScore: record.health_score ?? 0,
    healthTrend,
    technicalDebt: {
      score: technicalDebt.score ?? 0,
      grade: technicalDebt.grade || 'A',
    },
    knowledgeDebt: {
      score: knowledgeDebt.score ?? 0,
      documentationCoverage: knowledgeDebt.documentation_coverage ?? 0,
      onboardingDifficulty: knowledgeDebt.onboarding_difficulty_score ?? 0,
      onboardingDifficultyScore: knowledgeDebt.onboarding_difficulty_score ?? 0,
    },
    drift: record.drift || { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
    risk: {
      score: risk.score ?? 0,
      criticalModules: risk.criticalModules ?? 0,
      trend: riskTrend,
    },
    recommendationsReady: record.recommendations_ready ?? 0,
    generatedAt: toIso(record.analyzed_at || record.updated_at),
  }
}

function serializeTechnicalMetric(record) {
  return {
    path: record.file_path,
    owner: record.owner || 'Unassigned',
    size: record.size ?? 0,
    complexity: record.complexity ?? 0,
    complexityMethod: record.complexity_method || 'metadata-heuristic',
    churnPercent: record.churn_percent ?? 0,
    observedChurnPercent: record.observed_churn_percent ?? record.churn_percent ?? 0,
    churnAvailable: Boolean(record.churn_available),
    contributorCount: record.contributor_count ?? 0,
    contributorConcentrationPercent: record.contributor_concentration_percent ?? 0,
    bugFixCount: record.bug_fix_count ?? 0,
    bugFixPercent: record.bug_fix_percent ?? 0,
    duplicationPercent: record.duplication_percent ?? null,
    dependencyDepth: record.dependency_depth ?? 0,
    coveragePercent: record.coverage_percent ?? null,
    coverageAvailable: Boolean(record.coverage_available),
    lastChangedAt: toIso(record.last_changed_at),
    isLargeFile: Boolean(record.is_large_file),
    isHighComplexity: Boolean(record.is_high_complexity),
    inCircularDependency: Boolean(record.is_circular),
    isOrphan: Boolean(record.is_orphan),
    isStale: Boolean(record.is_stale),
    dependencyGraphAvailable: Boolean(record.dependency_graph_available),
    debtScore: record.debt_score ?? 0,
    risk: record.risk || 'Low',
    reasons: Array.isArray(record.reasons) ? record.reasons : [],
  }
}

export function serializeTechnicalDebt(scoreRecord, metricRecords) {
  if (!scoreRecord) return null

  const technicalDebt = scoreRecord.technical_debt || {}
  const metrics = technicalDebt.metrics || {}
  return {
    metrics: {
      technicalDebtScore: technicalDebt.score ?? 0,
      grade: technicalDebt.grade || 'A',
      averageComplexity: metrics.averageComplexity ?? 0,
      duplicationPercent: metrics.duplicationPercent ?? null,
      circularDependencies: metrics.circularDependencies ?? 0,
      circularDependencyEdges: metrics.circularDependencyEdges ?? 0,
      largeFiles: metrics.largeFiles ?? 0,
      highComplexityFiles: metrics.highComplexityFiles ?? 0,
      orphanModules: metrics.orphanModules ?? 0,
      staleModules: metrics.staleModules ?? 0,
      averageChurnPercent: metrics.averageChurnPercent ?? 0,
      churnSampleSize: metrics.churnSampleSize ?? 0,
      churnAvailable: Boolean(metrics.churnAvailable),
      totalCodeFiles: metrics.totalCodeFiles ?? 0,
      ownershipConcentrationModules: metrics.ownershipConcentrationModules ?? 0,
      bugProneModules: metrics.bugProneModules ?? 0,
      deepDependencyModules: metrics.deepDependencyModules ?? 0,
      longestDependencyChain: metrics.longestDependencyChain ?? 0,
      coverageAvailable: Boolean(metrics.coverageAvailable),
      averageCoveragePercent: metrics.averageCoveragePercent ?? null,
      coverageSampleSize: metrics.coverageSampleSize ?? 0,
      lowCoverageModules: metrics.lowCoverageModules ?? 0,
    },
    modules: (metricRecords || [])
      .map(serializeTechnicalMetric)
      .sort((left, right) => right.debtScore - left.debtScore || left.path.localeCompare(right.path)),
    generatedAt: toIso(scoreRecord.analyzed_at || scoreRecord.updated_at),
  }
}

function serializeKnowledgeMetric(record) {
  return {
    path: record.module_path,
    documented: Boolean(record.documented),
    missingReason: record.missing_reason || null,
    apiRoutes: record.api_routes ?? 0,
    documentedApiRoutes: record.documented_api_routes ?? 0,
    undocumentedApiRoutes: record.undocumented_api_routes ?? 0,
    explainabilityScore: record.explainability_score ?? 0,
    complexity: record.complexity ?? null,
    complexityPenalty: record.complexity_penalty ?? 0,
  }
}

export function serializeKnowledgeDebt(scoreRecord, metricRecords) {
  if (!scoreRecord) return null
  const knowledgeDebt = scoreRecord.knowledge_debt || {}
  const metrics = knowledgeDebt.metrics || {}
  return {
    metrics: {
      knowledgeDebtScore: knowledgeDebt.score ?? 0,
      documentationCoverage: knowledgeDebt.documentation_coverage ?? 0,
      onboardingDifficultyScore: knowledgeDebt.onboarding_difficulty_score ?? 0,
      hasArchitectureDocumentation: Boolean(metrics.hasArchitectureDocumentation),
      hasSetupDocumentation: Boolean(metrics.hasSetupDocumentation),
      totalModules: metrics.totalModules ?? 0,
      undocumentedModules: metrics.undocumentedModules ?? 0,
      totalApiRoutes: metrics.totalApiRoutes ?? 0,
      documentedApiRoutes: metrics.documentedApiRoutes ?? 0,
      undocumentedApiRoutes: metrics.undocumentedApiRoutes ?? 0,
      apiDocumentationCoverage: metrics.apiDocumentationCoverage ?? 100,
      averageModuleExplainability: metrics.averageModuleExplainability ?? 100,
      unexplainedModules: metrics.unexplainedModules ?? 0,
    },
    modules: (metricRecords || [])
      .map(serializeKnowledgeMetric)
      .sort((left, right) => left.explainabilityScore - right.explainabilityScore || left.path.localeCompare(right.path)),
    generatedAt: toIso(scoreRecord.analyzed_at || scoreRecord.updated_at),
  }
}

function ageLabel(value) {
  const days = Number(value)
  if (!Number.isFinite(days)) return 'Unknown'
  if (days <= 0) return 'today'
  return `${days} day${days === 1 ? '' : 's'}`
}

function driftSeverityRank(severity) {
  return ({ Critical: 4, High: 3, Medium: 2, Low: 1 })[severity] || 0
}

export function serializeKnowledgeDrift(scoreRecord, findingRecords) {
  if (!scoreRecord) return null

  const knowledgeDebt = scoreRecord.knowledge_debt || {}
  const knowledgeMetrics = knowledgeDebt.metrics || {}
  return {
    findings: (findingRecords || [])
      .map(record => ({
        id: record._id?.toString?.() || record.finding_key,
        title: record.title || record.description || 'Documentation drift finding',
        filePath: record.file_path || record.module_path || 'Unknown file',
        severity: record.severity || 'Low',
        evidence: record.evidence || 'No evidence recorded.',
        age: ageLabel(record.age_days),
        semantic: record.semantic || null,
        reviewStatus: record.review_status || null,
        reviewedAt: toIso(record.reviewed_at),
      }))
      .sort((left, right) => driftSeverityRank(right.severity) - driftSeverityRank(left.severity) || left.filePath.localeCompare(right.filePath)),
    coverage: [
      { label: 'Module documentation', percent: knowledgeMetrics.documentationCoverage ?? 100 },
      { label: 'API documentation', percent: knowledgeMetrics.apiDocumentationCoverage ?? 100 },
      { label: 'Module explainability', percent: knowledgeMetrics.averageModuleExplainability ?? 100 },
      { label: 'Setup guidance', percent: knowledgeMetrics.hasSetupDocumentation ? 100 : 0 },
      { label: 'Architecture docs', percent: knowledgeMetrics.hasArchitectureDocumentation ? 100 : 0 },
    ],
    generatedAt: toIso(scoreRecord.analyzed_at || scoreRecord.updated_at),
  }
}

export function serializeRecommendations(records) {
  return (records || [])
    .map(record => ({
      id: record._id?.toString?.() || record.recommendation_key,
      category: record.category
        || (String(record.recommendation_key || '').startsWith('drift:') ? 'Documentation' : 'Maintainability'),
      title: record.title,
      impact: record.impact || 'Low',
      effort: record.effort || 'Unknown',
      reason: record.reason || 'No evidence recorded.',
      steps: Array.isArray(record.steps) ? record.steps : [],
      order: record.order ?? 0,
    }))
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title))
}
