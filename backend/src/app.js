import express from 'express'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { IS_PRODUCTION, SECURITY_DISABLED } from './config/index.js'
import { securityHeaders } from './middleware/securityHeaders.js'
import { cors } from './middleware/cors.js'
import { createRateLimiter } from './middleware/rateLimiter.js'
import { httpRequestsTotal } from './observability/metrics.js'
import healthRouter from './features/health/router.js'
import authRouter from './features/auth/router.js'
import repositoriesRouter from './features/repositories/router.js'
import integrationsRouter from './features/integrations/router.js'
import analysisRouter from './features/analysis/router.js'
import reportsRouter from './features/reports/router.js'
import observabilityRouter from './features/observability/router.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Built frontend assets, produced by `npm run build` (Vite `outDir`).
// Only present in production images — never required for local development.
const frontendDistPath = join(__dirname, '../../dist')
const frontendIndexPath = join(frontendDistPath, 'index.html')

if (SECURITY_DISABLED) {
  // Printed once at module load, never per-request.
  console.warn([
    '',
    '='.repeat(50),
    'WARNING: SECURITY RATE-LIMIT PROTECTIONS DISABLED',
    'Controlled load-testing mode is ACTIVE.',
    'DO NOT USE THIS CONFIGURATION IN PRODUCTION.',
    '='.repeat(50),
    '',
  ].join('\n'))
}

const app = express()

app.set('trust proxy', IS_PRODUCTION ? 1 : 0)
app.use(securityHeaders)
app.use(cors)
app.use(express.json({ limit: '1mb' }))
app.use(createRateLimiter({ windowMs: 15 * 60 * 1000, max: 300 }))
app.use((request, response, next) => {
  response.on('finish', () => {
    httpRequestsTotal.inc({ status_class: `${Math.floor(response.statusCode / 100)}xx` })
  })
  next()
})

app.use(healthRouter)
app.use(authRouter)
app.use(analysisRouter)
app.use(repositoriesRouter)
app.use(integrationsRouter)
app.use(reportsRouter)
app.use(observabilityRouter)

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
