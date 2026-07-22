import express from 'express'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { IS_PRODUCTION } from './config/index.js'
import { securityHeaders } from './middleware/securityHeaders.js'
import { cors } from './middleware/cors.js'
import { createRateLimiter } from './middleware/rateLimiter.js'
import healthRouter from './features/health/router.js'
import authRouter from './features/auth/router.js'
import repositoriesRouter from './features/repositories/router.js'
import integrationsRouter from './features/integrations/router.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Built frontend assets, produced by `npm run build` (Vite `outDir`).
// Only present in production images — never required for local development.
const frontendDistPath = join(__dirname, '../../dist')
const frontendIndexPath = join(frontendDistPath, 'index.html')

const app = express()

app.set('trust proxy', IS_PRODUCTION ? 1 : 0)
app.use(securityHeaders)
app.use(cors)
app.use(express.json({ limit: '1mb' }))
app.use(createRateLimiter({ windowMs: 15 * 60 * 1000, max: 300 }))

app.use(healthRouter)
app.use(authRouter)
app.use(repositoriesRouter)
app.use(integrationsRouter)

// Serve the built frontend in production only. Local development uses the
// Vite dev server instead (see `npm run dev`), which is never built to disk.
if (IS_PRODUCTION) {
  app.use(express.static(frontendDistPath))

  // Any GET route not already handled above is a client-side (SPA) route,
  // e.g. a deep link or a browser refresh on `/dashboard` — hand it the
  // frontend shell so React Router can take over. API routes fall through
  // to the 404 handler below instead of getting the HTML shell.
  app.use((request, response, next) => {
    const isApiRoute = request.path.startsWith('/api') || request.path.startsWith('/auth')
    if (request.method !== 'GET' || isApiRoute) {
      return next()
    }

    response.sendFile(frontendIndexPath)
  })
}

app.use((_request, response) => {
  response.status(404).json({ message: 'Route not found.' })
})

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ message: 'Unexpected server error.' })
})

export default app
