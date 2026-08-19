import { ObjectId } from 'mongodb'
import { findRepositoryForUser } from '../repositories/services/repositoryQueries.js'
import { aiExplainabilityService, AiProviderError } from './services/aiExplainabilityService.js'

function parseRepositoryId(value) {
  return typeof value === 'string' && ObjectId.isValid(value) ? new ObjectId(value) : null
}

function trimmedString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function createAiController(service = aiExplainabilityService, deps = { findRepositoryForUser }) {
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

  async function getAiStatus(request, response, next) {
    try {
      response.json({ configured: service.isAiExplainabilityConfigured() })
    } catch (error) {
      next(error)
    }
  }

  async function postRiskExplanation(request, response, next) {
    try {
      const repository = await requireOwnedRepository(request, response)
      if (!repository) return

      const modulePath = trimmedString(request.body?.modulePath)
      if (!modulePath) {
        response.status(400).json({ message: 'modulePath is required.' })
        return
      }

      const result = await service.generateRiskExplanation(repository._id, modulePath)
      if (result.kind === 'not-configured') {
        response.status(503).json({ message: 'AI explanations are not configured for this deployment.' })
        return
      }
      if (result.kind === 'module-not-found') {
        response.status(404).json({ message: 'No technical debt metrics found for this module.' })
        return
      }

      response.status(201).json({ explanation: result.explanation })
    } catch (error) {
      if (error instanceof AiProviderError) {
        response.status(502).json({ message: error.message })
        return
      }
      next(error)
    }
  }

  async function getRiskExplanation(request, response, next) {
    try {
      const repository = await requireOwnedRepository(request, response)
      if (!repository) return

      const modulePath = trimmedString(request.query?.modulePath)
      if (!modulePath) {
        response.status(400).json({ message: 'modulePath is required.' })
        return
      }

      const explanation = await service.getRiskExplanation(repository._id, modulePath)
      if (!explanation) {
        response.status(404).json({ message: 'No AI explanation has been generated for this module yet.' })
        return
      }

      response.json({ explanation })
    } catch (error) {
      next(error)
    }
  }

  async function postExecutiveSummary(request, response, next) {
    try {
      const repository = await requireOwnedRepository(request, response)
      if (!repository) return

      const result = await service.generateExecutiveSummary(repository._id, repository.repo_name)
      if (result.kind === 'not-configured') {
        response.status(503).json({ message: 'AI explanations are not configured for this deployment.' })
        return
      }
      if (result.kind === 'analysis-unavailable') {
        response.status(409).json({ message: 'A completed analysis is required before generating a summary.' })
        return
      }

      response.status(201).json({ explanation: result.explanation })
    } catch (error) {
      if (error instanceof AiProviderError) {
        response.status(502).json({ message: error.message })
        return
      }
      next(error)
    }
  }

  async function getExecutiveSummary(request, response, next) {
    try {
      const repository = await requireOwnedRepository(request, response)
      if (!repository) return

      const explanation = await service.getExecutiveSummary(repository._id)
      if (!explanation) {
        response.status(404).json({ message: 'No AI executive summary has been generated for this repository yet.' })
        return
      }

      response.json({ explanation })
    } catch (error) {
      next(error)
    }
  }

  return {
    getAiStatus,
    postRiskExplanation,
    getRiskExplanation,
    postExecutiveSummary,
    getExecutiveSummary,
    requireOwnedRepository,
  }
}

export const {
  getAiStatus,
  postRiskExplanation,
  getRiskExplanation,
  postExecutiveSummary,
  getExecutiveSummary,
} = createAiController()
