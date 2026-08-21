import './src/utils/env.js'
import './src/utils/network.js'
import { PORT, SCAN_SCHEDULER_ENABLED } from './src/config/index.js'
import { closeDatabase, ensureIndexes } from './src/db/index.js'
import { recoverRepositoryAnalysisJobs } from './src/features/repositories/services/analysisQueue.js'
import { startScanScheduler } from './src/features/repositories/services/scanScheduler.js'
import app from './src/app.js'

async function start() {
  // Open the port before the DB warm-up below (43 sequential createIndex
  // round-trips to Atlas) so Fly's proxy sees the machine reachable right
  // away on cold start, instead of giving up and dropping the request while
  // index creation is still running.
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CodePulse API listening on http://0.0.0.0:${PORT}`)
  })

  try {
    await ensureIndexes()
    console.log('CodePulse database indexes are ready.')
    const recovered = await recoverRepositoryAnalysisJobs()
    if (recovered > 0) console.log(`Recovered ${recovered} repository analysis job(s).`)
    if (SCAN_SCHEDULER_ENABLED) {
      startScanScheduler()
      console.log('Recurring scan scheduler started.')
    }
  } catch (error) {
    console.error('CodePulse API startup failed:', error.message)
    await closeDatabase().catch(() => {})
    process.exit(1)
  }
}

start().catch(error => {
  console.error('CodePulse API startup failed:', error.message)
  process.exit(1)
})
