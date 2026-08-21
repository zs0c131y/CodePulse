import { randomUUID } from 'node:crypto'
import { ObjectId } from 'mongodb'
import { findRepositoryForUser, serializeRepository } from './services/repositoryQueries.js'
import {
  cancelRepositoryAnalysis,
  pauseRepositoryAnalysis,
  resumeRepositoryAnalysis,
} from './services/repositoryStore.js'
import {
  enqueueRepositoryAnalysis,
  requestRepositoryAnalysisControl,
} from './services/analysisQueue.js'

const defaultDependencies = {
  findRepositoryForUser,
  serializeRepository,
  cancelRepositoryAnalysis,
  pauseRepositoryAnalysis,
  resumeRepositoryAnalysis,
  enqueueRepositoryAnalysis,
  requestRepositoryAnalysisControl,
  randomUUID,
}

function parseRepositoryId(value) {
  return typeof value === 'string' && ObjectId.isValid(value) ? new ObjectId(value) : null
}

export function createScanControlController(deps = defaultDependencies) {
  async function ownedRepository(request, response) {
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

  async function pause(request, response, next) {
    try {
      const repository = await ownedRepository(request, response)
      if (!repository) return
      if (!['queued', 'running'].includes(repository.status)) {
        response.status(409).json({ message: 'Only a queued or running analysis can be paused.' })
        return
      }

      const changed = await deps.pauseRepositoryAnalysis({
        repositoryId: repository._id,
        userId: request.user._id,
        scanId: repository.scan_id,
        progress: repository.analysis_progress,
      })
      if (!changed) {
        response.status(409).json({ message: 'The analysis state changed before it could be paused.' })
        return
      }
      deps.requestRepositoryAnalysisControl({
        repositoryId: repository._id.toString(),
        scanId: String(repository.scan_id),
        action: 'pause',
      })
      response.status(202).json({
        repository: deps.serializeRepository({
          ...repository,
          status: 'paused',
          analysis_progress: {
            ...(repository.analysis_progress || {}),
            message: 'Analysis paused. Resume restarts this scan from the beginning.',
          },
        }),
        message: 'Analysis paused. Resume restarts it from the beginning.',
      })
    } catch (error) {
      next(error)
    }
  }

  async function cancel(request, response, next) {
    try {
      const repository = await ownedRepository(request, response)
      if (!repository) return
      if (!['queued', 'running', 'paused'].includes(repository.status)) {
        response.status(409).json({ message: 'Only a queued, running, or paused analysis can be cancelled.' })
        return
      }

      const changed = await deps.cancelRepositoryAnalysis({
        repositoryId: repository._id,
        userId: request.user._id,
        scanId: repository.scan_id,
        progress: repository.analysis_progress,
      })
      if (!changed) {
        response.status(409).json({ message: 'The analysis state changed before it could be cancelled.' })
        return
      }
      deps.requestRepositoryAnalysisControl({
        repositoryId: repository._id.toString(),
        scanId: String(repository.scan_id),
        action: 'cancel',
      })
      response.status(202).json({
        repository: deps.serializeRepository({
          ...repository,
          status: 'cancelled',
          analysis_progress: {
            ...(repository.analysis_progress || {}),
            message: 'Analysis cancelled.',
          },
        }),
        message: 'Analysis cancelled.',
      })
    } catch (error) {
      next(error)
    }
  }

  async function resume(request, response, next) {
    try {
      const repository = await ownedRepository(request, response)
      if (!repository) return
      if (repository.status !== 'paused') {
        response.status(409).json({ message: 'Only a paused analysis can be resumed.' })
        return
      }

      const scanId = deps.randomUUID()
      const resumed = await deps.resumeRepositoryAnalysis({
        repositoryId: repository._id,
        userId: request.user._id,
        scanId,
      })
      if (!resumed) {
        response.status(409).json({ message: 'The analysis state changed before it could be resumed.' })
        return
      }

      deps.enqueueRepositoryAnalysis({
        userId: request.user._id,
        repositoryId: repository._id,
        scanId,
        repoUrl: repository.repo_url,
        commitLimit: repository.commit_limit || 100,
      })
      response.status(202).json({
        repository: deps.serializeRepository(resumed),
        message: 'Analysis queued to restart from the beginning.',
      })
    } catch (error) {
      next(error)
    }
  }

  return { pause, cancel, resume }
}

export const { pause, cancel, resume } = createScanControlController()
