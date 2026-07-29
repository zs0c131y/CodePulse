import './src/utils/env.js'
import './src/utils/network.js'
import { PORT } from './src/config/index.js'
import { ensureIndexes } from './src/db/index.js'
import app from './src/app.js'

async function start() {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`CodePulse API listening on http://0.0.0.0:${PORT}`)
  })

  try {
    await ensureIndexes()
    console.log('CodePulse database indexes are ready.')
  } catch (error) {
    console.error('CodePulse API startup failed:', error.message)
    server.close(() => process.exit(1))
  }
}

start().catch(error => {
  console.error('CodePulse API startup failed:', error.message)
  process.exit(1)
})
