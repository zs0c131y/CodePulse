import { findRepositoryForUser, serializeRepository, listAllCommitsForRepository } from '../repositories/services/repositoryQueries.js'
import { aggregateContributors } from '../repositories/services/contributorAggregator.js'
import {
  getRepositoryScore,
  getRepositoryTechnicalDebt,
  getRepositoryKnowledgeDrift,
  getRepositoryRecommendations,
  serializeAnalysisScores,
  serializeTechnicalDebt,
  serializeKnowledgeDrift,
  serializeRecommendations,
} from '../analysis/services/analysisStore.js'
import { buildReportSnapshot } from './reportSnapshot.js'
import {
  persistReport,
  listReportsForOwner,
  getReportForOwner,
  enableReportSharing,
  disableReportSharing,
  getReportByShareToken,
} from './reportStore.js'

const defaultDeps = {
  findRepositoryForUser,
  serializeRepository,
  listAllCommitsForRepository,
  aggregateContributors,
  getRepositoryScore,
  getRepositoryTechnicalDebt,
  getRepositoryKnowledgeDrift,
  getRepositoryRecommendations,
  serializeAnalysisScores,
  serializeTechnicalDebt,
  serializeKnowledgeDrift,
  serializeRecommendations,
  buildReportSnapshot,
  persistReport,
  listReportsForOwner,
  getReportForOwner,
  enableReportSharing,
  disableReportSharing,
  getReportByShareToken,
  now: () => new Date(),
}

export function createReportService(deps = defaultDeps) {
  async function createRepositoryReport(ownerId, repositoryId) {
    const repository = await deps.findRepositoryForUser(ownerId, repositoryId)
    if (!repository) return { kind: 'repository-not-found' }
    if (repository.status && repository.status !== 'completed') {
      return { kind: 'analysis-unavailable' }
    }

    const [score, technicalDebt, knowledgeDrift, recommendations, commits] = await Promise.all([
      deps.getRepositoryScore(repository._id),
      deps.getRepositoryTechnicalDebt(repository._id),
      deps.getRepositoryKnowledgeDrift(repository._id),
      deps.getRepositoryRecommendations(repository._id),
      deps.listAllCommitsForRepository(repository._id),
    ])

    if (!score) return { kind: 'analysis-unavailable' }

    const generatedAt = deps.now()
    const snapshot = deps.buildReportSnapshot({
      repository: deps.serializeRepository(repository),
      scores: deps.serializeAnalysisScores(score),
      technicalDebt: technicalDebt?.score
        ? deps.serializeTechnicalDebt(technicalDebt.score, technicalDebt.metrics)
        : null,
      knowledgeDrift: knowledgeDrift?.score
        ? deps.serializeKnowledgeDrift(knowledgeDrift.score, knowledgeDrift.findings)
        : null,
      recommendations: deps.serializeRecommendations(recommendations),
      contributors: deps.aggregateContributors(commits),
      analysisVersion: score.analysis_version,
      generatedAt,
    })

    const report = await deps.persistReport({
      ownerId,
      repositoryId: repository._id,
      snapshot,
      now: generatedAt,
    })
    return { kind: 'created', report }
  }

  return {
    createRepositoryReport,
    listReportsForOwner: deps.listReportsForOwner,
    getReportForOwner: deps.getReportForOwner,
    enableReportSharing: deps.enableReportSharing,
    disableReportSharing: deps.disableReportSharing,
    getReportByShareToken: deps.getReportByShareToken,
  }
}

export const reportService = createReportService()
