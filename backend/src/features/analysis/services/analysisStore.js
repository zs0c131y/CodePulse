import { ObjectId } from 'mongodb'
import {
  getRepositoryScoresCollection,
  getTechnicalDebtMetricsCollection,
  getKnowledgeDebtMetricsCollection,
} from '../../../db/index.js'
import {
  persistAnalysisResultsWithCollections,
  serializeAnalysisScores,
  serializeTechnicalDebt,
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

export { serializeAnalysisScores, serializeTechnicalDebt }
