import './src/utils/env.js'
import './src/utils/network.js'
import { PORT } from './src/config/index.js'
import { ensureIndexes } from './src/db/index.js'
import app from './src/app.js'

async function start() {
  await ensureIndexes()
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CodePulse API listening on http://0.0.0.0:${PORT}`)
  })
}

start().catch(error => {
  console.error('CodePulse API startup failed:', error.message)
  process.exit(1)
})
