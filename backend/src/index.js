import { port } from './config/index.js'
import { ensureIndexes } from './db/index.js'
import app from './app.js'

async function start() {
  await ensureIndexes()
  app.listen(port, () => {
    console.log(`CodePulse API listening on http://localhost:${port}`)
  })
}

start().catch(error => {
  console.error('CodePulse API startup failed:', error.message)
  process.exit(1)
})
