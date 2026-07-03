import './src/env.js'
import { PORT } from './src/config/index.js'
import { ensureIndexes } from './src/db/index.js'
import app from './src/app.js'

async function start() {
  await ensureIndexes()
  app.listen(PORT, () => {
    console.log(`CodePulse API listening on http://localhost:${PORT}`)
  })
}

start().catch(error => {
  console.error('CodePulse API startup failed:', error.message)
  process.exit(1)
})
