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

export const FRONTEND_URL = (process.env.AUTH_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')
export const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '')

function readPositiveIntegerEnv(name, fallback) {
  const value = Number(process.env[name])
  return Number.isInteger(value) && value > 0 ? value : fallback
}

function readNonNegativeIntegerEnv(name, fallback) {
  const value = Number(process.env[name])
  return Number.isInteger(value) && value >= 0 ? value : fallback
}

export const REPOSITORY_CLONE_TIMEOUT_MS = readPositiveIntegerEnv('REPOSITORY_CLONE_TIMEOUT_MS', 10 * 60 * 1000)
// Five commits is the minimum history window used by Technical Debt churn and
// staleness scoring. This remains a shallow clone while allowing those signals
// to be available on a normal scan.
export const REPOSITORY_CLONE_DEPTH = readPositiveIntegerEnv('REPOSITORY_CLONE_DEPTH', 5)
export const REPOSITORY_MAX_SIZE_KB = readNonNegativeIntegerEnv(
  'REPOSITORY_MAX_SIZE_KB',
  1024 * 1024,
)
export const REPOSITORY_MAX_FILES = readPositiveIntegerEnv('REPOSITORY_MAX_FILES', 10000)
export const REPOSITORY_MAX_DOCUMENTATION_FILES = readPositiveIntegerEnv('REPOSITORY_MAX_DOCUMENTATION_FILES', 500)
export const REPOSITORY_MAX_DOCUMENTATION_TOTAL_BYTES = readPositiveIntegerEnv(
  'REPOSITORY_MAX_DOCUMENTATION_TOTAL_BYTES',
  16 * 1024 * 1024,
)
export const REPOSITORY_MAX_DEPENDENCY_EDGES = readPositiveIntegerEnv('REPOSITORY_MAX_DEPENDENCY_EDGES', 50_000)
export const REPOSITORY_MAX_DEPENDENCY_SOURCE_FILES = readPositiveIntegerEnv(
  'REPOSITORY_MAX_DEPENDENCY_SOURCE_FILES',
  2000,
)
export const REPOSITORY_MAX_DEPENDENCY_FILE_BYTES = readPositiveIntegerEnv(
  'REPOSITORY_MAX_DEPENDENCY_FILE_BYTES',
  1024 * 1024,
)
export const ANALYSIS_MAX_CONCURRENCY = readPositiveIntegerEnv('ANALYSIS_MAX_CONCURRENCY', 1)
export const ANALYSIS_WORKER_MAX_OLD_GENERATION_MB = readPositiveIntegerEnv(
  'ANALYSIS_WORKER_MAX_OLD_GENERATION_MB',
  256,
)
export const ANALYSIS_MAX_QUEUE_SIZE = readPositiveIntegerEnv('ANALYSIS_MAX_QUEUE_SIZE', 100)
export const ANALYSIS_MAX_ACTIVE_PER_USER = readPositiveIntegerEnv('ANALYSIS_MAX_ACTIVE_PER_USER', 2)
export const ANALYSIS_LEASE_TTL_MS = readPositiveIntegerEnv('ANALYSIS_LEASE_TTL_MS', 10 * 60 * 1000)
export const ANALYSIS_LEASE_HEARTBEAT_MS = readPositiveIntegerEnv('ANALYSIS_LEASE_HEARTBEAT_MS', 30 * 1000)
export const REPORT_SHARE_TTL_DAYS = readPositiveIntegerEnv('REPORT_SHARE_TTL_DAYS', 7)

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

// --- Gemma inference (self-hosted Ollama, reached via Cloudflare Tunnel) ---

export const GEMMA_API_URL = (process.env.GEMMA_API_URL || 'https://gemma.ardend.dev').replace(/\/+$/, '')
export const GEMMA_MODEL = process.env.GEMMA_MODEL || 'gemma4:e2b'
export const GEMMA_REQUEST_TIMEOUT_MS = readPositiveIntegerEnv('GEMMA_REQUEST_TIMEOUT_MS', 60 * 1000)
export const CF_ACCESS_CLIENT_ID = process.env.CF_ACCESS_CLIENT_ID || null
export const CF_ACCESS_CLIENT_SECRET = process.env.CF_ACCESS_CLIENT_SECRET || null
