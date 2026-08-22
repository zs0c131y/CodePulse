import { getRepositoriesCollection } from '../../../db/index.js'
import { parseGitHubRepositoryUrl } from './gitClient.js'
import { queueRepositoryAnalysis } from './repositoryStore.js'
import { enqueueRepositoryAnalysis } from './analysisQueue.js'
import { SCAN_SCHEDULER_INTERVAL_MS, SCAN_SCHEDULER_BATCH_SIZE } from '../../../config/index.js'
import { scheduledScansTotal } from '../../../observability/metrics.js'

const ACTIVE_ANALYSIS_STATUSES = ['queued', 'running', 'paused']

/**
 * Repositories with a recurring schedule (`scan_interval_hours` set) whose
 * `next_scan_at` has passed and are not already mid-scan. Bounded per tick
 * so one scheduler pass can never flood the analysis queue.
 */
export async function findDueScheduledRepositories(now, options = {}) {
  const repositories = options.repositories || await getRepositoriesCollection()
  return repositories
    .find({
      scan_interval_hours: { $ne: null },
      next_scan_at: { $lte: now },
      status: { $nin: ACTIVE_ANALYSIS_STATUSES },
    })
    .limit(options.batchSize || SCAN_SCHEDULER_BATCH_SIZE)
    .toArray()
}

/**
 * One scheduler tick: enqueues a scan for every due repository and advances
 * `next_scan_at` regardless of outcome, so a single bad repository (dead
 * URL, GitHub API failure) retries on its next scheduled interval instead of
 * spinning every tick. This is the scheduler's retry policy — a failed
 * scheduled scan is retried at the same cadence as a successful one, not
 * with a tighter backoff loop.
 */
export async function runScheduledScans(options = {}) {
  const now = options.now || new Date()
  const repositories = options.repositories || await getRepositoriesCollection()
  const parseUrl = options.parseGitHubRepositoryUrl || parseGitHubRepositoryUrl
  const queue = options.queueRepositoryAnalysis || queueRepositoryAnalysis
  const enqueue = options.enqueueRepositoryAnalysis || enqueueRepositoryAnalysis
  const logError = options.logError || ((message, error) => console.error(message, error))

  const due = await findDueScheduledRepositories(now, { repositories, batchSize: options.batchSize })
  let started = 0
  let skipped = 0

  for (const record of due) {
    const intervalHours = Number(record.scan_interval_hours) || 0
    const nextScanAt = new Date(now.getTime() + intervalHours * 60 * 60 * 1000)

    try {
      const repository = parseUrl(record.repo_url)
      if (!repository) {
        logError(`Scheduled scan skipped: repository ${record._id} has an unparseable repo_url (${record.repo_url}).`)
        skipped += 1
        scheduledScansTotal.inc({ outcome: 'unparseable_url' })
        continue
      }

      const queued = await queue(
        { userId: record.user_id, repository, commitLimit: record.commit_limit || 100 },
        { collections: { repositories } },
      )

      if (queued.shouldStart) {
        enqueue({
          userId: record.user_id,
          repositoryId: queued.repositoryId,
          scanId: queued.scanId,
          repoUrl: repository.webUrl,
          commitLimit: record.commit_limit || 100,
        })
        started += 1
        scheduledScansTotal.inc({ outcome: 'started' })
      } else {
        // Already active from a manual trigger; the next scheduled tick
        // will try again.
        skipped += 1
        scheduledScansTotal.inc({ outcome: 'skipped' })
      }
    } catch (error) {
      logError(`Scheduled scan failed to start for repository ${record._id}.`, error)
      skipped += 1
      scheduledScansTotal.inc({ outcome: 'error' })
    } finally {
      await repositories.updateOne({ _id: record._id }, { $set: { next_scan_at: nextScanAt } })
    }
  }

  return { checked: due.length, started, skipped }
}

let timer = null

/** Idempotent: calling this more than once keeps the first interval running. */
export function startScanScheduler(options = {}) {
  if (timer) return timer

  const intervalMs = options.intervalMs || SCAN_SCHEDULER_INTERVAL_MS
  timer = setInterval(() => {
    runScheduledScans(options).catch(error => {
      const logError = options.logError || ((message, err) => console.error(message, err))
      logError('Scheduled scan tick failed.', error)
    })
  }, intervalMs)
  timer.unref?.()

  return timer
}

export function stopScanScheduler() {
  if (timer) clearInterval(timer)
  timer = null
}
