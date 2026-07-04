import dns from 'node:dns'
import '../utils/env.js'

export const PORT = Number(process.env.API_PORT || process.env.PORT || 3000)
export const IS_PRODUCTION = process.env.NODE_ENV === 'production'
export const refreshCookieName = 'codepulse_refresh'
export const accessTokenTtlSeconds = 15 * 60
export const refreshTokenTtlMs = 7 * 24 * 60 * 60 * 1000
export const verificationTokenTtlMs = 24 * 60 * 60 * 1000
export const resetTokenTtlMs = 60 * 60 * 1000
export const loginLockTtlMs = 15 * 60 * 1000
export const maxLoginFailures = 5
export const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
)

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET

  if (IS_PRODUCTION) {
    throw new Error('JWT_SECRET is required in production.')
  }

  return 'dev-only-codepulse-jwt-secret-change-me'
}

export const JWT_SECRET = getJwtSecret()

// --- MongoDB connection ---

function getDatabaseNameFromUri(uri) {
  try {
    const parsed = new URL(uri)
    return decodeURIComponent(parsed.pathname.replace(/^\//, '')) || ''
  } catch {
    return ''
  }
}

// Outside production, `MONGO_URI` may still point at a docker-compose service
// name (e.g. `mongo`) that only resolves inside the compose network. Rewrite
// it to a host reachable from wherever the backend is actually running.
function getRuntimeMongoUri(uri) {
  if (IS_PRODUCTION) return uri

  const localMongoHost = process.env.MONGO_LOCAL_HOST || (process.platform === 'win32' ? '127.0.0.1' : '')
  if (!localMongoHost) return uri

  try {
    const parsed = new URL(uri)
    if (parsed.hostname === 'mongo') {
      parsed.hostname = localMongoHost
      return parsed.toString()
    }
  } catch {
    return uri
  }

  return uri
}

// `mongodb+srv://` lookups need SRV/TXT records, which some local network
// resolvers don't forward correctly — pin known-good DNS servers outside
// production.
function configureLocalDns(uri) {
  if (IS_PRODUCTION || !uri.startsWith('mongodb+srv://')) return

  const dnsServers = (process.env.MONGO_DNS_SERVERS || '1.1.1.1,8.8.8.8')
    .split(',')
    .map(server => server.trim())
    .filter(Boolean)

  if (dnsServers.length > 0) {
    dns.setServers(dnsServers)
  }
}

export const MONGO_URI = getRuntimeMongoUri(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/codepulse')
export const MONGO_DB_NAME = process.env.MONGO_DB_NAME || getDatabaseNameFromUri(MONGO_URI) || 'codepulse'

configureLocalDns(MONGO_URI)

// --- Public URLs (frontend/backend, used for redirects and OAuth callbacks) ---

export const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')
export const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '')

// --- OAuth provider credentials (optional — null when not configured) ---

export const GITHUB_ID = process.env.GITHUB_ID || null
export const GITHUB_SECRET = process.env.GITHUB_SECRET || null
export const GITLAB_ID = process.env.GITLAB_ID || null
export const GITLAB_SECRET = process.env.GITLAB_SECRET || null

// --- Auth email delivery (SMTP2GO primary, webhook fallback) ---

export const EMAIL_KEY = process.env.EMAIL_KEY || null
export const VERIFICATION_EMAIL = process.env.VERIFICATION_EMAIL || null
export const PASSWORD_RESET_EMAIL = process.env.PASSWORD_RESET_EMAIL || null
export const AUTH_EMAIL_WEBHOOK_URL = process.env.AUTH_EMAIL_WEBHOOK_URL || null
export const AUTH_EMAIL_WEBHOOK_TOKEN = process.env.AUTH_EMAIL_WEBHOOK_TOKEN || null
