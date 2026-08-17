import { ObjectId } from 'mongodb'
import * as repositoryQueries from './services/repositoryQueries.js'
import { aggregateContributors } from './services/contributorAggregator.js'
import { fetchRepositoryManifests } from './services/manifestFetcher.js'

const defaultReader = { ...repositoryQueries, fetchRepositoryManifests }

function parseRepositoryId(value) {
  return typeof value === 'string' && ObjectId.isValid(value) ? new ObjectId(value) : null
}

function parsePagination(query = {}) {
  return { limit: query.limit, skip: query.skip }
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

      if (deleted === 'active') {
        response.status(409).json({ message: 'Wait for the active repository analysis to finish before deleting it.' })
        return
      }

      if (!deleted) {
        response.status(404).json({ message: 'Repository not found.' })
        return
      }

      response.json({ message: 'Repository deleted.' })
    } catch (error) {
      next(error)
    }
  }

  async function getRepositoryFiles(request, response, next) {
    try {
      const repository = await requireOwnedRepository(request, response)
      if (!repository) return

      const result = await deps.listRepoFilesForRepository(repository._id, parsePagination(request.query))
      response.json(result)
    } catch (error) {
      next(error)
    }
  }

  async function getRepositoryCommits(request, response, next) {
    try {
      const repository = await requireOwnedRepository(request, response)
      if (!repository) return

      const result = await deps.listCommitsForRepository(repository._id, parsePagination(request.query))
      response.json(result)
    } catch (error) {
      next(error)
    }
  }

  async function getRepositoryDependencies(request, response, next) {
    try {
      const repository = await requireOwnedRepository(request, response)
      if (!repository) return

      const result = await deps.listDependenciesForRepository(repository._id, parsePagination(request.query))
      response.json(result)
    } catch (error) {
      next(error)
    }
  }

  async function getRepositoryDocumentation(request, response, next) {
    try {
      const repository = await requireOwnedRepository(request, response)
      if (!repository) return

      const result = await deps.listDocumentationForRepository(repository._id, parsePagination(request.query))
      response.json(result)
    } catch (error) {
      next(error)
    }
  }

  async function getRepositoryContributors(request, response, next) {
    try {
      const repository = await requireOwnedRepository(request, response)
      if (!repository) return

      const commits = await deps.listAllCommitsForRepository(repository._id)
      response.json({ contributors: aggregateContributors(commits) })
    } catch (error) {
      next(error)
    }
  }

  async function getRepositoryManifest(request, response, next) {
    try {
      const repository = await requireOwnedRepository(request, response)
      if (!repository) return

      const manifests = await deps.fetchRepositoryManifests({
        repoFullName: repository.repo_full_name,
        defaultBranch: repository.default_branch,
      })
      response.json({ manifests })
    } catch (error) {
      next(error)
    }
  }

  return {
    requireOwnedRepository,
    listRepositories,
    getRepository,
    deleteRepository,
    getRepositoryFiles,
    getRepositoryCommits,
    getRepositoryDependencies,
    getRepositoryDocumentation,
    getRepositoryContributors,
    getRepositoryManifest,
  }
}

export const {
  listRepositories,
  getRepository,
  deleteRepository,
  getRepositoryFiles,
  getRepositoryCommits,
  getRepositoryDependencies,
  getRepositoryDocumentation,
  getRepositoryContributors,
  getRepositoryManifest,
} = createReadController()
