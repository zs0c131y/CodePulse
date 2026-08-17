import { analyzeRepositorySource } from './services/repositoryAnalyzer.js'
import { parseGitHubRepositoryUrl } from './services/gitClient.js'
import {
  markRepositoryAnalysisCompleted,
  markRepositoryAnalysisFailed,
  markRepositoryAnalysisRunning,
  renewRepositoryAnalysisLease,
  persistRepositoryAnalysis,
  queueRepositoryAnalysis,
} from './services/repositoryStore.js'
import { enqueueRepositoryAnalysis } from './services/analysisQueue.js'
import { ANALYSIS_LEASE_HEARTBEAT_MS, ANALYSIS_LEASE_TTL_MS } from '../../config/index.js'

const defaultControllerDependencies = {
  analyzeRepositorySource,
  markRepositoryAnalysisCompleted,
  markRepositoryAnalysisFailed,
  markRepositoryAnalysisRunning,
  renewRepositoryAnalysisLease,
  parseGitHubRepositoryUrl,
  persistRepositoryAnalysis,
  queueRepositoryAnalysis,
  scheduleAnalysisJob: enqueueRepositoryAnalysis,
  logError: (message, error) => console.error(message, error),
}

function safeAnalysisFailureMessage(error) {
  const statusCode = Number(error?.statusCode)
  const canExpose = (statusCode >= 400 && statusCode < 500) || statusCode === 503

  if (!canExpose) return 'Repository analysis failed.'
  return String(error?.message || 'Repository analysis failed.').slice(0, 500)
}

export async function runRepositoryAnalysisJob(job, deps = defaultControllerDependencies) {
  let leaseHeartbeat = null
  try {
    const claimed = await deps.markRepositoryAnalysisRunning(job, { leaseTtlMs: ANALYSIS_LEASE_TTL_MS })
    if (!claimed) return false

    if (job.workerId && typeof deps.renewRepositoryAnalysisLease === 'function') {
      leaseHeartbeat = setInterval(() => {
        deps.renewRepositoryAnalysisLease(job, { leaseTtlMs: ANALYSIS_LEASE_TTL_MS }).catch(error => {
          deps.logError(`Could not renew analysis lease for repository ${job.repositoryId}.`, error)
        })
      }, ANALYSIS_LEASE_HEARTBEAT_MS)
      leaseHeartbeat.unref?.()
    }

    await deps.analyzeRepositorySource({
      sourceUrl: job.repoUrl,
      userId: job.userId,
      repositoryId: job.repositoryId,
      scanId: job.scanId,
      commitLimit: job.commitLimit,
      persistAnalysis: analysis => deps.persistRepositoryAnalysis(analysis, {
        repositoryId: job.repositoryId,
        scanId: job.scanId,
        status: 'running',
        ...(job.workerId ? { workerId: job.workerId } : {}),
      }),
    })

    const completed = await deps.markRepositoryAnalysisCompleted(job)
    return completed
  } catch (error) {
    try {
      await deps.markRepositoryAnalysisFailed({
        ...job,
        error: safeAnalysisFailureMessage(error),
      })
    } catch (statusError) {
      deps.logError(`Could not persist failed analysis status for repository ${job.repositoryId}.`, statusError)
    }

    deps.logError(`Repository analysis failed for ${job.repositoryId}.`, error)
    return false
  } finally {
    if (leaseHeartbeat) clearInterval(leaseHeartbeat)
  }
}

export function createRepositoryController(deps = defaultControllerDependencies) {
  return async function analyzeRepository(request, response, next) {
    try {
      const body = request.body || {}
      const repoUrl = String(body.repoUrl || body.repositoryUrl || '').trim()
      const commitLimit = body.commitLimit === undefined ? 100 : body.commitLimit

      if (!repoUrl) {
        response.status(400).json({ message: 'Repository URL is required.' })
        return
      }

      if (!Number.isInteger(commitLimit) || commitLimit < 1 || commitLimit > 500) {
        response.status(400).json({ message: 'Commit limit must be an integer between 1 and 500.' })
        return
      }

      const repository = deps.parseGitHubRepositoryUrl(repoUrl)
      if (!repository) {
        response.status(400).json({ message: 'A valid public GitHub repository URL is required.' })
        return
      }

      const queued = await deps.queueRepositoryAnalysis({
        userId: request.user._id,
        repository,
        commitLimit,
      })
      const repositoryId = queued.repositoryId.toString()

      if (queued.shouldStart) {
        const job = {
          userId: request.user._id,
          repositoryId: queued.repositoryId,
          scanId: queued.scanId,
          repoUrl: repository.webUrl,
          commitLimit,
        }

        if (typeof deps.scheduleAnalysisJob === 'function') {
          deps.scheduleAnalysisJob(job)
        } else {
          // Retained as an injection seam for deterministic unit tests.
          deps.scheduleBackgroundTask(() => runRepositoryAnalysisJob(job, deps))
        }
      }

      const message = queued.shouldStart
        ? 'Repository analysis queued. Poll the status endpoint for progress.'
        : `Repository analysis is already ${queued.status}. Poll the status endpoint for progress.`

      response.status(202).json({
        message,
        repositoryId,
        status: queued.status,
      })
    } catch (error) {
      if (error.statusCode) {
        response.status(error.statusCode).json({ message: error.message })
        return
      }

      next(error)
    }
  }
}

export const analyzeRepository = createRepositoryController()

