import { ObjectId } from 'mongodb'
import { findRepositoryForUser } from '../repositories/services/repositoryQueries.js'
import {
  getRepositoryScore,
  getRepositoryTechnicalDebt,
  getRepositoryKnowledgeDrift,
  getRepositoryRecommendations,
  serializeAnalysisScores,
  serializeTechnicalDebt,
  serializeKnowledgeDrift,
  serializeRecommendations,
} from './services/analysisStore.js'

const defaultReader = {
  findRepositoryForUser,
  getRepositoryScore,
  getRepositoryTechnicalDebt,
  getRepositoryKnowledgeDrift,
  getRepositoryRecommendations,
  serializeAnalysisScores,
  serializeTechnicalDebt,
  serializeKnowledgeDrift,
  serializeRecommendations,
}

function parseRepositoryId(value) {
  return typeof value === 'string' && ObjectId.isValid(value) ? new ObjectId(value) : null
}

function toIso(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function createAnalysisController(deps = defaultReader) {
  async function requireOwnedRepository(request, response) {
    const repositoryId = parseRepositoryId(request.params.repositoryId)

    if (!repositoryId) {
      response.status(400).json({ message: 'Invalid repository id.' })
      return null
    }

    const repository = await deps.findRepositoryForUser(request.user._id, repositoryId)
    if (!repository) {
      response.status(404).json({ message: 'Repository not found.' })
      return null
    }

    return repository
  }

  async function getRepositoryScores(request, response, next) {
    try {
      const repository = await requireOwnedRepository(request, response)
      if (!repository) return

      const score = await deps.getRepositoryScore(repository._id)
      if (!score) {
        response.status(404).json({ message: 'Scores are not available for this repository yet.' })
        return
      }

      response.json({ scores: deps.serializeAnalysisScores(score) })
    } catch (error) {
      next(error)
    }
  }

  async function getRepositoryDebt(request, response, next) {
    try {
      const repository = await requireOwnedRepository(request, response)
      if (!repository) return

      const debt = await deps.getRepositoryTechnicalDebt(repository._id)
      if (!debt?.score) {
        response.status(404).json({ message: 'Technical debt metrics are not available for this repository yet.' })
        return
      }

      response.json(deps.serializeTechnicalDebt(debt.score, debt.metrics))
    } catch (error) {
      next(error)
    }
  }

  async function getRepositoryStatus(request, response, next) {
    try {
      const repository = await requireOwnedRepository(request, response)
      if (!repository) return

      const status = repository.status || 'completed'

      response.json({
        repositoryId: repository._id.toString(),
        status,
        message: status === 'failed'
          ? repository.error || 'Repository analysis failed.'
          : null,
        queuedAt: toIso(repository.queued_at),
        startedAt: toIso(repository.started_at),
        completedAt: toIso(repository.completed_at),
        failedAt: toIso(repository.failed_at),
        updatedAt: toIso(repository.updated_at),
      })
    } catch (error) {
      next(error)
    }
  }

  async function getRepositoryDrift(request, response, next) {
    try {
      const repository = await requireOwnedRepository(request, response)
      if (!repository) return

      const drift = await deps.getRepositoryKnowledgeDrift(repository._id)
      if (!drift?.score) {
        response.status(404).json({ message: 'Knowledge drift findings are not available for this repository yet.' })
        return
      }

      response.json(deps.serializeKnowledgeDrift(drift.score, drift.findings))
    } catch (error) {
      next(error)
    }
  }

  async function getRepositoryRecommendationList(request, response, next) {
    try {
      const repository = await requireOwnedRepository(request, response)
      if (!repository) return

      const score = await deps.getRepositoryScore(repository._id)
      if (!score) {
        response.status(404).json({ message: 'Recommendations are not available for this repository yet.' })
        return
      }

      const recommendations = await deps.getRepositoryRecommendations(repository._id)
      response.json({ recommendations: deps.serializeRecommendations(recommendations) })
    } catch (error) {
      next(error)
    }
  }

  return {
    getRepositoryScores,
    getRepositoryDebt,
    getRepositoryStatus,
    getRepositoryDrift,
    getRepositoryRecommendationList,
    requireOwnedRepository,
  }
}

export const {
  getRepositoryScores,
  getRepositoryDebt,
  getRepositoryStatus,
  getRepositoryDrift,
  getRepositoryRecommendationList,
} = createAnalysisController()
