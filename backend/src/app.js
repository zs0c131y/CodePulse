import express from 'express'
import { IS_PRODUCTION } from './config/index.js'
import { securityHeaders } from './middleware/securityHeaders.js'
import { cors } from './middleware/cors.js'
import { createRateLimiter } from './middleware/rateLimiter.js'
import healthRouter from './features/health/router.js'
import authRouter from './features/auth/router.js'

const app = express()

app.set('trust proxy', IS_PRODUCTION ? 1 : 0)
app.use(securityHeaders)
app.use(cors)
app.use(express.json({ limit: '1mb' }))
app.use(createRateLimiter({ windowMs: 15 * 60 * 1000, max: 300 }))

app.use(healthRouter)
app.use(authRouter)

app.use((_request, response) => {
  response.status(404).json({ message: 'Route not found.' })
})

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ message: 'Unexpected server error.' })
})

export default app
