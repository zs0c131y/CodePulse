import '../../../utils/env.js'
import '../../../utils/network.js'
import { parentPort, workerData } from 'node:worker_threads'
import { closeDatabase } from '../../../db/index.js'
import { runRepositoryAnalysisJob } from '../controller.js'

const startedAt = process.hrtime.bigint()
let completed = false
try {
  completed = await runRepositoryAnalysisJob(workerData)
} finally {
  const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9
  await closeDatabase().catch(() => {})
  // Metrics live in the main thread's registry (worker_threads have their
  // own isolated module state), so the outcome/duration is reported back
  // via postMessage rather than recorded here.
  parentPort?.postMessage({ settled: true, completed, durationSeconds })
}
