import '../../../utils/env.js'
import '../../../utils/network.js'
import { parentPort, workerData } from 'node:worker_threads'
import { closeDatabase } from '../../../db/index.js'
import { runRepositoryAnalysisJob } from '../controller.js'

const startedAt = process.hrtime.bigint()
const analysisAbortController = new AbortController()
parentPort?.on('message', message => {
  if (message?.type !== 'control' || analysisAbortController.signal.aborted) return
  const action = String(message.action || '')
  const code = action === 'pause'
    ? 'ANALYSIS_PAUSED'
    : action === 'cancel'
      ? 'ANALYSIS_CANCELLED'
      : 'ANALYSIS_TIMEOUT'
  const error = Object.assign(new Error(`Repository analysis ${action || 'stopped'}.`), { code })
  analysisAbortController.abort(error)
})
let completed = false
try {
  completed = await runRepositoryAnalysisJob(workerData, undefined, { signal: analysisAbortController.signal })
} finally {
  const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9
  await closeDatabase().catch(() => {})
  // Metrics live in the main thread's registry (worker_threads have their
  // own isolated module state), so the outcome/duration is reported back
  // via postMessage rather than recorded here.
  parentPort?.postMessage({
    settled: true,
    completed,
    outcome: analysisAbortController.signal.reason?.code || (completed ? 'completed' : 'settled'),
    durationSeconds,
  })
}
