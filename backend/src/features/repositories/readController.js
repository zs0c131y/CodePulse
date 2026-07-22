import { ObjectId } from 'mongodb'
import * as defaultReader from './services/repositoryQueries.js'

function parseRepositoryId(value) {
  return typeof value === 'string' && ObjectId.isValid(value) ? new ObjectId(value) : null
}

export function createReadController(deps = defaultReader) {
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

  async function listRepositories(request, response, next) {
    try {
      const repositories = await deps.listRepositoriesForUser(request.user._id)
      response.json({ repositories })
    } catch (error) {
      next(error)
    }
  }

  async function getRepository(request, response, next) {
    try {
      const repository = await requireOwnedRepository(request, response)
      if (!repository) return

      response.json({ repository: deps.serializeRepository(repository) })
    } catch (error) {
      next(error)
    }
  }

  async function deleteRepository(request, response, next) {
    try {
      const repositoryId = parseRepositoryId(request.params.repositoryId)

      if (!repositoryId) {
        response.status(400).json({ message: 'Invalid repository id.' })
        return
      }

      const deleted = await deps.deleteRepositoryForUser(request.user._id, repositoryId)

      if (!deleted) {
        response.status(404).json({ message: 'Repository not found.' })
        return
      }

      response.json({ message: 'Repository deleted.' })
    } catch (error) {
      next(error)
    }
  }

  return {
    requireOwnedRepository,
    listRepositories,
    getRepository,
    deleteRepository,
  }
}

export const { listRepositories, getRepository, deleteRepository } = createReadController()
