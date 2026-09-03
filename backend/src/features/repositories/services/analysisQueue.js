import { Worker } from 'node:worker_threads'
import { randomUUID } from 'node:crypto'
import {
  ANALYSIS_MAX_CONCURRENCY,
  ANALYSIS_MAX_QUEUE_SIZE,
  ANALYSIS_WORKER_MAX_OLD_GENERATION_MB,
  ANALYSIS_MAX_SCAN_DURATION_MS,
} from '../../../config/index.js'
import { getRepositoriesCollection } from '../../../db/index.js'
import { markRepositoryAnalysisFailed } from './repositoryStore.js'
import { getGitHubAccessToken } from '../../integrations/services/accessTokenLookup.js'
import { scansTotal, scanDurationSeconds } from '../../../observability/metrics.js'

const pending = []
const scheduledKeys = new Set()
const activeWorkerHandles = new Map()
let activeWorkers = 0
let completedJobs = 0
let failedWorkers = 0

function jobKey(job) {
  return `${job.repositoryId}:${job.scanId}`
}

function serializableJob(job) {
  return {
    userId: job.userId?.toString?.() || String(job.userId),
    repositoryId: job.repositoryId?.toString?.() || String(job.repositoryId),
    scanId: String(job.scanId),
    workerId: String(job.workerId || randomUUID()),
    repoUrl: String(job.repoUrl),
    commitLimit: Number(job.commitLimit) || 100,
    accessToken: job.accessToken || null,
  }
}

async function recordWorkerFailure(job, error) {
  failedWorkers += 1
  console.error(`Repository analysis worker failed for ${job.repositoryId}.`, error)
  try {
    await markRepositoryAnalysisFailed({
      ...job,
      error: 'Repository analysis worker terminated unexpectedly. The scan can be retried.',
    })
  } catch (statusError) {
    console.error(`Could not persist failed worker status for repository ${job.repositoryId}.`, statusError)
  }
}

function startWorker(job) {
  activeWorkers += 1
  const key = jobKey(job)
  const startedAt = process.hrtime.bigint()
  let acknowledged = false
  let workerError = null
  let timedOut = false
  let forceTerminateTimer = null
  const worker = new Worker(new URL('./repositoryAnalysisWorker.js', import.meta.url), {
    workerData: serializableJob(job),
    resourceLimits: {
      maxOldGenerationSizeMb: ANALYSIS_WORKER_MAX_OLD_GENERATION_MB,
    },
  })
  activeWorkerHandles.set(key, worker)

  // A hung scan (stalled network, stuck clone) would otherwise hold a
  // worker slot forever. terminate() triggers the normal 'exit' handling
  // below — acknowledged stays false, so it is recorded as a failure the
  // same way a crash is, just with a clearer error message.
  const timeoutTimer = setTimeout(() => {
    timedOut = true
    worker.postMessage({ type: 'control', action: 'timeout' })
    forceTerminateTimer = setTimeout(() => worker.terminate().catch(() => {}), 15_000)
    forceTerminateTimer.unref?.()
  }, ANALYSIS_MAX_SCAN_DURATION_MS)
  timeoutTimer.unref?.()

  worker.once('message', message => {
    acknowledged = Boolean(message?.settled)
    if (message?.completed) completedJobs += 1
    if (Number.isFinite(message?.durationSeconds)) {
      scanDurationSeconds.observe({}, message.durationSeconds)
    }
    const outcome = message?.outcome
    const status = message?.completed
      ? 'completed'
      : outcome === 'ANALYSIS_TIMEOUT'
        ? 'timeout'
        : outcome === 'ANALYSIS_PAUSED'
          ? 'paused'
          : outcome === 'ANALYSIS_CANCELLED'
            ? 'cancelled'
            : 'lease_lost'
    scansTotal.inc({ status })
  })
  worker.once('error', error => {
    workerError = error
  })
  worker.once('exit', async code => {
    clearTimeout(timeoutTimer)
    if (forceTerminateTimer) clearTimeout(forceTerminateTimer)

    if (!acknowledged) {
      scanDurationSeconds.observe({}, Number(process.hrtime.bigint() - startedAt) / 1e9)
      scansTotal.inc({ status: timedOut ? 'timeout' : 'crashed' })
      await recordWorkerFailure(
        job,
        timedOut
          ? new Error(`Analysis worker exceeded the maximum scan duration (${ANALYSIS_MAX_SCAN_DURATION_MS}ms) and was terminated.`)
          : workerError || new Error(`Analysis worker exited with code ${code}.`),
      )
    }

    activeWorkers -= 1
    activeWorkerHandles.delete(key)
    scheduledKeys.delete(key)
    pumpQueue()
  })
}

export function requestRepositoryAnalysisControl(input) {
  const key = `${input.repositoryId}:${input.scanId}`
  const worker = activeWorkerHandles.get(key)
  if (!worker) return false
  worker.postMessage({ type: 'control', action: input.action })
  return true
}

function pumpQueue() {
  while (activeWorkers < ANALYSIS_MAX_CONCURRENCY && pending.length > 0) {
    startWorker(pending.shift())
  }
}

export function enqueueRepositoryAnalysis(job) {
  const normalized = serializableJob(job)
  const key = jobKey(normalized)
  if (scheduledKeys.has(key)) return false
  if (scheduledKeys.size >= ANALYSIS_MAX_QUEUE_SIZE) {
    throw Object.assign(new Error('Repository analysis capacity is temporarily full.'), { statusCode: 503 })
  }

  scheduledKeys.add(key)
  pending.push(normalized)
  pumpQueue()
  return true
}

export function getAnalysisQueueSnapshot() {
  return {
    activeWorkers,
    pendingJobs: pending.length,
    scheduledJobs: scheduledKeys.size,
    completedJobs,
    failedWorkers,
    maxConcurrency: ANALYSIS_MAX_CONCURRENCY,
    maxQueueSize: ANALYSIS_MAX_QUEUE_SIZE,
  }
}

export async function recoverRepositoryAnalysisJobs(options = {}) {
  const repositories = options.repositories || await getRepositoriesCollection()
  const enqueue = options.enqueue || enqueueRepositoryAnalysis
  const getAccessToken = options.getGitHubAccessToken || getGitHubAccessToken
  const now = options.now || new Date()
  const records = await repositories.find({
    $or: [
      { status: 'queued' },
      { status: 'running', lease_expires_at: { $lte: now } },
      { status: 'running', lease_expires_at: null },
    ],
  }).toArray()
  let recovered = 0

  for (const record of records) {
    if (record.status === 'running') {
      const reset = await repositories.updateOne(
        {
          _id: record._id,
          scan_id: record.scan_id,
          status: 'running',
          lease_expires_at: record.lease_expires_at ?? null,
        },
        {
          $set: {
            status: 'queued',
            error: null,
            queued_at: now,
            started_at: null,
            worker_id: null,
            lease_expires_at: null,
            updated_at: now,
          },
        },
      )
      if ((reset?.matchedCount ?? reset?.modifiedCount ?? 0) === 0) continue
    }

    const accessToken = await getAccessToken(record.user_id).catch(() => null)

    if (enqueue({
      userId: record.user_id,
      repositoryId: record._id,
      scanId: record.scan_id,
      repoUrl: record.repo_url,
      commitLimit: record.commit_limit || 100,
      accessToken,
    })) recovered += 1
  }

  return recovered
}
