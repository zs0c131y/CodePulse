import { ObjectId } from 'mongodb'
import { getRepositoryCollections } from './repositoryStore.js'
import {
  getRepositoryScoresCollection,
  getRepositoryScoreHistoryCollection,
  getTechnicalDebtMetricsCollection,
  getKnowledgeDebtMetricsCollection,
  getDriftFindingsCollection,
  getRecommendationsCollection,
  getCodeAnalysisSummariesCollection,
  getCodeFactsCollection,
  getDocumentationAnalysisSummariesCollection,
  getDocumentationFactsCollection,
} from '../../../db/index.js'
import {
  serializeRepository,
  listRepositoriesForUserWithCollections,
  findRepositoryForUserWithCollections,
  deleteRepositoryForUserWithCollections,
  setRepositoryScanScheduleWithCollections,
  listRepoFilesWithCollections,
  listCommitsForRepositoryWithCollections,
  listAllCommitsForRepositoryWithCollections,
  listDependenciesForRepositoryWithCollections,
  listDocumentationForRepositoryWithCollections,
  getCodeAnalysisWithCollections,
  getDocumentationAnalysisWithCollections,
} from './repositoryQueriesCore.js'

function normalizeMongoId(value) {
  if (value instanceof ObjectId) return value
  if (typeof value === 'string' && ObjectId.isValid(value)) return new ObjectId(value)
  return value
}

export { serializeRepository }

export async function listRepositoriesForUser(userId) {
  const collections = await getRepositoryCollections()
  return listRepositoriesForUserWithCollections(normalizeMongoId(userId), collections)
}

export async function findRepositoryForUser(userId, repositoryId) {
  const collections = await getRepositoryCollections()
  return findRepositoryForUserWithCollections(normalizeMongoId(userId), normalizeMongoId(repositoryId), collections)
}

export async function deleteRepositoryForUser(userId, repositoryId) {
  const [
    collections,
    repositoryScores,
    repositoryScoreHistory,
    technicalDebtMetrics,
    knowledgeDebtMetrics,
    driftFindings,
    recommendations,
    codeAnalysisSummaries,
    codeFacts,
    documentationAnalysisSummaries,
    documentationFacts,
  ] = await Promise.all([
    getRepositoryCollections(),
    getRepositoryScoresCollection(),
    getRepositoryScoreHistoryCollection(),
    getTechnicalDebtMetricsCollection(),
    getKnowledgeDebtMetricsCollection(),
    getDriftFindingsCollection(),
    getRecommendationsCollection(),
    getCodeAnalysisSummariesCollection(),
    getCodeFactsCollection(),
    getDocumentationAnalysisSummariesCollection(),
    getDocumentationFactsCollection(),
  ])
  return deleteRepositoryForUserWithCollections(
    normalizeMongoId(userId),
    normalizeMongoId(repositoryId),
    {
      ...collections,
      repositoryScores,
      repositoryScoreHistory,
      technicalDebtMetrics,
      knowledgeDebtMetrics,
      driftFindings,
      recommendations,
      codeAnalysisSummaries,
      codeFacts,
      documentationAnalysisSummaries,
      documentationFacts,
    },
  )
}

export async function setRepositoryScanSchedule(userId, repositoryId, intervalHours) {
  const collections = await getRepositoryCollections()
  return setRepositoryScanScheduleWithCollections(normalizeMongoId(userId), normalizeMongoId(repositoryId), intervalHours, collections)
}

export async function listRepoFilesForRepository(repositoryId, options) {
  const collections = await getRepositoryCollections()
  return listRepoFilesWithCollections(normalizeMongoId(repositoryId), collections, options)
}

export async function listCommitsForRepository(repositoryId, options) {
  const collections = await getRepositoryCollections()
  return listCommitsForRepositoryWithCollections(normalizeMongoId(repositoryId), collections, options)
}

export async function listAllCommitsForRepository(repositoryId) {
  const collections = await getRepositoryCollections()
  return listAllCommitsForRepositoryWithCollections(normalizeMongoId(repositoryId), collections)
}

export async function listDependenciesForRepository(repositoryId, options) {
  const collections = await getRepositoryCollections()
  return listDependenciesForRepositoryWithCollections(normalizeMongoId(repositoryId), collections, options)
}

export async function listDocumentationForRepository(repositoryId, options) {
  const collections = await getRepositoryCollections()
  return listDocumentationForRepositoryWithCollections(normalizeMongoId(repositoryId), collections, options)
}

export async function getCodeAnalysisForRepository(repositoryId, options) {
  const collections = await getRepositoryCollections()
  return getCodeAnalysisWithCollections(normalizeMongoId(repositoryId), collections, options)
}

export async function getDocumentationAnalysisForRepository(repositoryId, options) {
  const collections = await getRepositoryCollections()
  return getDocumentationAnalysisWithCollections(normalizeMongoId(repositoryId), collections, options)
}
