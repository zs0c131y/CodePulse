import { analyzeRepositorySource } from './services/repositoryAnalyzer.js'
import { parseGitHubRepositoryUrl } from './services/gitClient.js'
import {
  markRepositoryAnalysisCompleted,
  markRepositoryAnalysisFailed,
  markRepositoryAnalysisRunning,
  renewRepositoryAnalysisLease,
  persistRepositoryAnalysis,
  queueRepositoryAnalysis,
  updateRepositoryAnalysisProgress,
} from './services/repositoryStore.js'
import { enqueueRepositoryAnalysis } from './services/analysisQueue.js'
import { getGitHubAccessToken } from '../integrations/services/accessTokenLookup.js'
import { ANALYSIS_LEASE_HEARTBEAT_MS, ANALYSIS_LEASE_TTL_MS } from '../../config/index.js'

const defaultControllerDependencies = {
  analyzeRepositorySource,
  markRepositoryAnalysisCompleted,
  markRepositoryAnalysisFailed,
  markRepositoryAnalysisRunning,
  renewRepositoryAnalysisLease,
  updateRepositoryAnalysisProgress,
  parseGitHubRepositoryUrl,
  persistRepositoryAnalysis,
  queueRepositoryAnalysis,
  scheduleAnalysisJob: enqueueRepositoryAnalysis,
  getGitHubAccessToken,
  logError: (message, error) => console.error(message, error),
}

const controlledStopCodes = new Set(['ANALYSIS_PAUSED', 'ANALYSIS_CANCELLED'])

function createProgressReporter(job, deps) {
  let lastPersistedAt = 0
  let lastPhase = null
  let chain = Promise.resolve()

  function report(progress = {}) {
    const now = Date.now()
    const phaseChanged = progress.phase && progress.phase !== lastPhase
    const shouldPersist = phaseChanged || progress.overallProgress === 100 || now - lastPersistedAt >= 1000
    if (!shouldPersist || typeof deps.updateRepositoryAnalysisProgress !== 'function') return chain

    lastPersistedAt = now
    lastPhase = progress.phase || lastPhase
    chain = chain
      .then(() => deps.updateRepositoryAnalysisProgress({ ...job, progress }))
      .catch(error => deps.logError(`Could not persist analysis progress for repository ${job.repositoryId}.`, error))
    return chain
  }

  report.flush = () => chain
  return report
}

function safeAnalysisFailureMessage(error) {
  const statusCode = Number(error?.statusCode)
  const canExpose = (statusCode >= 400 && statusCode < 500) || statusCode === 503

  if (!canExpose) return 'Repository analysis failed.'
  return String(error?.message || 'Repository analysis failed.').slice(0, 500)
}

export async function runRepositoryAnalysisJob(job, deps = defaultControllerDependencies, options = {}) {
  let leaseHeartbeat = null
  const reportProgress = createProgressReporter(job, deps)
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
      cloneOptions: job.accessToken ? { accessToken: job.accessToken } : undefined,
      signal: options.signal,
      onProgress: reportProgress,
      persistAnalysis: analysis => deps.persistRepositoryAnalysis(analysis, {
        repositoryId: job.repositoryId,
        scanId: job.scanId,
        status: 'running',
        ...(job.workerId ? { workerId: job.workerId } : {}),
      }),
    })

    await reportProgress.flush()
    const completed = await deps.markRepositoryAnalysisCompleted(job)
    return completed
  } catch (error) {
    if (controlledStopCodes.has(error?.code)) return false

    const failureMessage = error?.code === 'ANALYSIS_TIMEOUT'
      ? 'Repository analysis exceeded the maximum scan duration.'
      : safeAnalysisFailureMessage(error)
    try {
      await deps.markRepositoryAnalysisFailed({
        ...job,
        error: failureMessage,
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
        // Fetched fresh rather than persisted with the queued scan, so a
        // connected account's token is never written to the repository record.
        const accessToken = typeof deps.getGitHubAccessToken === 'function'
          ? await deps.getGitHubAccessToken(request.user._id)
          : null
        const job = {
          userId: request.user._id,
          repositoryId: queued.repositoryId,
          scanId: queued.scanId,
          repoUrl: repository.webUrl,
          commitLimit,
          accessToken,
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
