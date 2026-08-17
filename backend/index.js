import './src/utils/env.js'
import './src/utils/network.js'
import { PORT } from './src/config/index.js'
import { closeDatabase, ensureIndexes } from './src/db/index.js'
import { recoverRepositoryAnalysisJobs } from './src/features/repositories/services/analysisQueue.js'
import app from './src/app.js'

async function start() {
  try {
    await ensureIndexes()
    console.log('CodePulse database indexes are ready.')
    const recovered = await recoverRepositoryAnalysisJobs()
    if (recovered > 0) console.log(`Recovered ${recovered} repository analysis job(s).`)
  } catch (error) {
    console.error('CodePulse API startup failed:', error.message)
    await closeDatabase().catch(() => {})
    process.exit(1)
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CodePulse API listening on http://0.0.0.0:${PORT}`)
  })
}

start().catch(error => {
  console.error('CodePulse API startup failed:', error.message)
  process.exit(1)
})
