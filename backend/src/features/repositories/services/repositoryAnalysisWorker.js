import '../../../utils/env.js'
import '../../../utils/network.js'
import { parentPort, workerData } from 'node:worker_threads'
import { closeDatabase } from '../../../db/index.js'
import { runRepositoryAnalysisJob } from '../controller.js'

let completed = false
try {
  completed = await runRepositoryAnalysisJob(workerData)
} finally {
  await closeDatabase().catch(() => {})
  parentPort?.postMessage({ settled: true, completed })
}
