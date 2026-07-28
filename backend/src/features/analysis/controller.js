import { ObjectId } from 'mongodb'
import { findRepositoryForUser } from '../repositories/services/repositoryQueries.js'
import {
  getRepositoryScore,
  getRepositoryTechnicalDebt,
  serializeAnalysisScores,
  serializeTechnicalDebt,
} from './services/analysisStore.js'

const defaultReader = {
  findRepositoryForUser,
  getRepositoryScore,
  getRepositoryTechnicalDebt,
  serializeAnalysisScores,
  serializeTechnicalDebt,
}

function parseRepositoryId(value) {
  return typeof value === 'string' && ObjectId.isValid(value) ? new ObjectId(value) : null
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

  return { getRepositoryScores, getRepositoryDebt, requireOwnedRepository }
}

export const { getRepositoryScores, getRepositoryDebt } = createAnalysisController()
