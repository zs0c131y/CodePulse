import { analyzeTechnicalDebt } from './technicalDebtAnalyzer.js'
import { analyzeKnowledgeDebt } from './knowledgeDebtAnalyzer.js'
import { persistAnalysisResults } from './analysisStore.js'

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function round(value) {
  return Math.round(value)
}

/**
 * Combines the two currently implemented debt engines into the score shape
 * consumed by the dashboard. Higher debt scores are worse; health is the
 * inverse weighted composite and intentionally does not claim to include the
 * future drift or AI/risk engines.
 */
export function buildAnalysisResults(analysis, options = {}) {
  const technicalDebt = analyzeTechnicalDebt(analysis, options)
  const knowledgeDebt = analyzeKnowledgeDebt(analysis, options)
  const compositeDebt = technicalDebt.score * 0.65 + knowledgeDebt.score * 0.35
  const healthScore = round(clamp(100 - compositeDebt, 0, 100))
  const riskScore = round(clamp(compositeDebt, 0, 100))

  return {
    scores: {
      healthScore,
      // A score snapshot is created on every scan, but the analysis engine
      // does not yet retain historical snapshots. Do not represent one point
      // as a trend.
      healthTrend: [],
      technicalDebt: {
        score: technicalDebt.score,
        grade: technicalDebt.grade,
      },
      knowledgeDebt: {
        score: knowledgeDebt.score,
        documentationCoverage: knowledgeDebt.metrics.documentationCoverage,
        onboardingDifficulty: knowledgeDebt.metrics.onboardingDifficultyScore,
        onboardingDifficultyScore: knowledgeDebt.metrics.onboardingDifficultyScore,
      },
      drift: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      risk: {
        score: riskScore,
        criticalModules: technicalDebt.metrics.criticalModules,
        trend: [],
      },
      recommendationsReady: 0,
    },
    technicalDebt,
    knowledgeDebt,
  }
}

export async function scoreRepositoryAnalysis({ repositoryId, analysis, now, persistResults = persistAnalysisResults }) {
  const results = buildAnalysisResults(analysis, { now })
  const persisted = await persistResults({ repositoryId, results, now })

  return { ...results, persisted }
}
