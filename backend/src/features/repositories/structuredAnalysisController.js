import { ObjectId } from 'mongodb'
import { findRepositoryForUser } from './services/repositoryQueries.js'
import {
  getCodeAnalysis,
  getDocumentationAnalysis,
} from './services/structuredAnalysisStore.js'

const defaultReader = {
  findRepositoryForUser,
  getCodeAnalysis,
  getDocumentationAnalysis,
}

function parseRepositoryId(value) {
  return typeof value === 'string' && ObjectId.isValid(value) ? new ObjectId(value) : null
}

function pagination(query = {}) {
  return { limit: query.limit, skip: query.skip }
}

export function createStructuredAnalysisController(deps = defaultReader) {
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

  async function getRepositoryCodeAnalysis(request, response, next) {
    try {
      const repository = await requireOwnedRepository(request, response)
      if (!repository) return
      const analysis = await deps.getCodeAnalysis(repository._id, pagination(request.query))
      if (!analysis) {
        response.status(404).json({ message: 'Code analysis is not available for this repository yet.' })
        return
      }
      response.json({ analysis })
    } catch (error) {
      next(error)
    }
  }

  async function getRepositoryDocumentationAnalysis(request, response, next) {
    try {
      const repository = await requireOwnedRepository(request, response)
      if (!repository) return
      const analysis = await deps.getDocumentationAnalysis(repository._id, pagination(request.query))
      if (!analysis) {
        response.status(404).json({ message: 'Documentation analysis is not available for this repository yet.' })
        return
      }
      response.json({ analysis })
    } catch (error) {
      next(error)
    }
  }

  return {
    requireOwnedRepository,
    getRepositoryCodeAnalysis,
    getRepositoryDocumentationAnalysis,
  }
}

export const {
  getRepositoryCodeAnalysis,
  getRepositoryDocumentationAnalysis,
} = createStructuredAnalysisController()
