import { analyzeTechnicalDebt } from './technicalDebtAnalyzer.js'
import { analyzeKnowledgeDebt } from './knowledgeDebtAnalyzer.js'
import { analyzeKnowledgeDrift } from './knowledgeDriftAnalyzer.js'
import { analyzeRiskIntelligence } from './riskIntelligenceEngine.js'
import { buildRecommendations } from './recommendationEngine.js'
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
  const drift = analyzeKnowledgeDrift(analysis, knowledgeDebt, options)
  const risk = analyzeRiskIntelligence({ technicalDebt, knowledgeDebt, drift })
  const riskByPath = new Map(risk.modules.map(module => [module.path, module]))
  const technicalDebtWithRisk = {
    ...technicalDebt,
    modules: technicalDebt.modules.map(module => {
      const moduleRisk = riskByPath.get(module.path)
      return moduleRisk
        ? { ...module, risk: moduleRisk.level, riskScore: moduleRisk.score, reasons: moduleRisk.reasons }
        : module
    }),
  }
  const recommendations = buildRecommendations({ risk, drift })
  const compositeDebt = technicalDebt.score * 0.55 + knowledgeDebt.score * 0.3 + drift.score * 0.15
  const healthScore = round(clamp(100 - compositeDebt, 0, 100))

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
        ...drift.metrics,
      },
      risk: {
        score: risk.score,
        level: risk.level,
        criticalModules: risk.metrics.criticalModules,
        highModules: risk.metrics.highModules,
        trend: [],
      },
      recommendationsReady: recommendations.length,
    },
    technicalDebt: technicalDebtWithRisk,
    knowledgeDebt,
    drift,
    risk,
    recommendations,
  }
}

export async function scoreRepositoryAnalysis({ repositoryId, analysis, now, persistResults = persistAnalysisResults }) {
  const results = buildAnalysisResults(analysis, { now })
  const persisted = await persistResults({ repositoryId, results, now })

  return { ...results, persisted }
}
