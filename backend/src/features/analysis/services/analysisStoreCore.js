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
    churn_percent: module.churnPercent,
    observed_churn_percent: module.observedChurnPercent,
    churn_available: module.churnAvailable,
    duplication_percent: module.duplicationPercent,
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
    created_at: now,
    updated_at: now,
  }
}

export async function persistAnalysisResultsWithCollections({ repositoryId, results, now }, collections) {
  const analyzedAt = toDate(now) || new Date()
  const scores = results.scores
  const technicalDebt = results.technicalDebt
  const knowledgeDebt = results.knowledgeDebt

  const repositoryScore = await upsertByRepository(
    collections.repositoryScores,
    repositoryId,
    {
      analysis_version: 1,
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

  return {
    repositoryScore,
    technicalDebtMetricCount: technicalDebt.modules.length,
    knowledgeDebtMetricCount: knowledgeDebt.moduleMetrics.length,
  }
}

export function serializeAnalysisScores(record) {
  if (!record) return null

  const technicalDebt = record.technical_debt || {}
  const knowledgeDebt = record.knowledge_debt || {}
  const risk = record.risk || {}

  return {
    healthScore: record.health_score ?? 0,
    healthTrend: Array.isArray(record.health_trend) ? record.health_trend : [],
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
      trend: Array.isArray(risk.trend) ? risk.trend : [],
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
    churnPercent: record.churn_percent ?? 0,
    observedChurnPercent: record.observed_churn_percent ?? record.churn_percent ?? 0,
    churnAvailable: Boolean(record.churn_available),
    duplicationPercent: record.duplication_percent ?? null,
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
    },
    modules: (metricRecords || [])
      .map(serializeTechnicalMetric)
      .sort((left, right) => right.debtScore - left.debtScore || left.path.localeCompare(right.path)),
    generatedAt: toIso(scoreRecord.analyzed_at || scoreRecord.updated_at),
  }
}
