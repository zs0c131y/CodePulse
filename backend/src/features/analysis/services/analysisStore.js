import { ObjectId } from 'mongodb'
import {
  getRepositoryScoresCollection,
  getTechnicalDebtMetricsCollection,
  getKnowledgeDebtMetricsCollection,
  getDriftFindingsCollection,
  getRecommendationsCollection,
} from '../../../db/index.js'
import {
  persistAnalysisResultsWithCollections,
  serializeAnalysisScores,
  serializeTechnicalDebt,
  serializeKnowledgeDrift,
  serializeRecommendations,
} from './analysisStoreCore.js'

function normalizeMongoId(value) {
  if (value instanceof ObjectId) return value
  if (typeof value === 'string' && ObjectId.isValid(value)) return new ObjectId(value)
  return value
}

export async function getAnalysisCollections(overrides = {}) {
  return {
    repositoryScores: overrides.repositoryScores || (await getRepositoryScoresCollection()),
    technicalDebtMetrics: overrides.technicalDebtMetrics || (await getTechnicalDebtMetricsCollection()),
    knowledgeDebtMetrics: overrides.knowledgeDebtMetrics || (await getKnowledgeDebtMetricsCollection()),
    driftFindings: overrides.driftFindings || (await getDriftFindingsCollection()),
    recommendations: overrides.recommendations || (await getRecommendationsCollection()),
  }
}

export async function persistAnalysisResults({ repositoryId, results, now }, options = {}) {
  const collections = await getAnalysisCollections(options.collections || {})
  return persistAnalysisResultsWithCollections(
    { repositoryId: normalizeMongoId(repositoryId), results, now },
    collections,
  )
}

export async function getRepositoryScore(repositoryId) {
  const repositoryScores = await getRepositoryScoresCollection()
  return repositoryScores.findOne({ repository_id: normalizeMongoId(repositoryId) })
}

export async function getRepositoryTechnicalDebt(repositoryId) {
  const normalizedRepositoryId = normalizeMongoId(repositoryId)
  const [repositoryScores, technicalDebtMetrics] = await Promise.all([
    getRepositoryScoresCollection(),
    getTechnicalDebtMetricsCollection(),
  ])
  const [score, metrics] = await Promise.all([
    repositoryScores.findOne({ repository_id: normalizedRepositoryId }),
    technicalDebtMetrics.find({ repository_id: normalizedRepositoryId }).toArray(),
  ])

  return { score, metrics }
}

export async function getRepositoryKnowledgeDrift(repositoryId) {
  const normalizedRepositoryId = normalizeMongoId(repositoryId)
  const [repositoryScores, driftFindings] = await Promise.all([
    getRepositoryScoresCollection(),
    getDriftFindingsCollection(),
  ])
  const [score, findings] = await Promise.all([
    repositoryScores.findOne({ repository_id: normalizedRepositoryId }),
    driftFindings.find({ repository_id: normalizedRepositoryId }).toArray(),
  ])

  return { score, findings }
}

export async function getRepositoryRecommendations(repositoryId) {
  const normalizedRepositoryId = normalizeMongoId(repositoryId)
  const recommendations = await getRecommendationsCollection()
  return recommendations.find({ repository_id: normalizedRepositoryId }).toArray()
}

export { serializeAnalysisScores, serializeTechnicalDebt, serializeKnowledgeDrift, serializeRecommendations }
