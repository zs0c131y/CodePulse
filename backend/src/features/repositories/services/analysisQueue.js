import { Worker } from 'node:worker_threads'
import { randomUUID } from 'node:crypto'
import {
  ANALYSIS_MAX_CONCURRENCY,
  ANALYSIS_MAX_QUEUE_SIZE,
  ANALYSIS_WORKER_MAX_OLD_GENERATION_MB,
} from '../../../config/index.js'
import { getRepositoriesCollection } from '../../../db/index.js'
import { markRepositoryAnalysisFailed } from './repositoryStore.js'

const pending = []
const scheduledKeys = new Set()
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
  let acknowledged = false
  let workerError = null
  const worker = new Worker(new URL('./repositoryAnalysisWorker.js', import.meta.url), {
    workerData: serializableJob(job),
    resourceLimits: {
      maxOldGenerationSizeMb: ANALYSIS_WORKER_MAX_OLD_GENERATION_MB,
    },
  })

  worker.once('message', message => {
    acknowledged = Boolean(message?.settled)
    if (message?.completed) completedJobs += 1
  })
  worker.once('error', error => {
    workerError = error
  })
  worker.once('exit', async code => {
    if (!acknowledged) {
      await recordWorkerFailure(
        job,
        workerError || new Error(`Analysis worker exited with code ${code}.`),
      )
    }

    activeWorkers -= 1
    scheduledKeys.delete(key)
    pumpQueue()
  })
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

    if (enqueue({
      userId: record.user_id,
      repositoryId: record._id,
      scanId: record.scan_id,
      repoUrl: record.repo_url,
      commitLimit: record.commit_limit || 100,
    })) recovered += 1
  }

  return recovered
}
