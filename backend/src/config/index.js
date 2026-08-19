import dns from 'node:dns'
import '../utils/env.js'

export const PORT = Number(process.env.API_PORT || process.env.PORT || 3000)
export const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// --- Controlled load-testing security bypass (never usable in production) ---
//
// Only the exact string "true" enables this — "false", "0", empty, or unset
// all leave security fully enabled. This disables application-level
// traffic-shaping (rate limiting, login-attempt lockout), never
// authentication/authorization/input-validation/business logic. See
// docs/backend/BACKEND.md "Controlled Load Testing" for the full contract.
export const SECURITY_DISABLED = process.env.DISABLE_SEC === 'true'

if (SECURITY_DISABLED && IS_PRODUCTION) {
  throw new Error([
    '',
    '='.repeat(70),
    'FATAL: DISABLE_SEC=true is not allowed when NODE_ENV=production.',
    'DISABLE_SEC disables application-level rate limiting and login-attempt',
    'lockout for controlled load testing. It must never run in production.',
    'Refusing to start.',
    '='.repeat(70),
    '',
  ].join('\n'))
}
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

// --- Recurring scan scheduling ---

export const SCAN_SCHEDULER_ENABLED = process.env.SCAN_SCHEDULER_ENABLED !== 'false'
export const SCAN_SCHEDULER_INTERVAL_MS = readPositiveIntegerEnv('SCAN_SCHEDULER_INTERVAL_MS', 5 * 60 * 1000)
export const SCAN_SCHEDULER_BATCH_SIZE = readPositiveIntegerEnv('SCAN_SCHEDULER_BATCH_SIZE', 20)
export const MIN_SCAN_INTERVAL_HOURS = readPositiveIntegerEnv('MIN_SCAN_INTERVAL_HOURS', 1)
export const MAX_SCAN_INTERVAL_HOURS = readPositiveIntegerEnv('MAX_SCAN_INTERVAL_HOURS', 24 * 30)

// --- Observability & hardening ---
//
// METRICS_TOKEN is optional but recommended in production: scan volume and
// failure-rate data can hint at what an attacker is probing, so /api/metrics
// requires this shared secret when it is set. Left unset, the endpoint stays
// open (matches typical local/dev and same-network Prometheus setups).
export const METRICS_TOKEN = process.env.METRICS_TOKEN || null
export const ANALYSIS_MAX_SCAN_DURATION_MS = readPositiveIntegerEnv('ANALYSIS_MAX_SCAN_DURATION_MS', 20 * 60 * 1000)
export const MANIFEST_FETCH_TIMEOUT_MS = readPositiveIntegerEnv('MANIFEST_FETCH_TIMEOUT_MS', 10 * 1000)

// --- Optional semantic knowledge-drift analysis ---
//
// The embedding endpoint is intentionally unset by default. A local
// Sentence-Transformers service can be enabled without repository contents
// leaving the deployment boundary; hosted providers require an additional,
// explicit acknowledgement below.
export const SEMANTIC_DRIFT_ENABLED = process.env.SEMANTIC_DRIFT_ENABLED === 'true'
export const SEMANTIC_DRIFT_PROVIDER = process.env.SEMANTIC_DRIFT_PROVIDER || 'local'
export const SEMANTIC_DRIFT_ALLOW_HOSTED = process.env.SEMANTIC_DRIFT_ALLOW_HOSTED === 'true'
export const SEMANTIC_EMBEDDING_URL = (process.env.SEMANTIC_EMBEDDING_URL || '').replace(/\/+$/, '') || null
export const SEMANTIC_EMBEDDING_MODEL = process.env.SEMANTIC_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2'
export const SEMANTIC_DRIFT_SIMILARITY_THRESHOLD = (() => {
  const value = Number(process.env.SEMANTIC_DRIFT_SIMILARITY_THRESHOLD)
  return Number.isFinite(value) && value > 0 && value < 1 ? value : 0.55
})()
export const SEMANTIC_DRIFT_MAX_CODE_FILES = readPositiveIntegerEnv('SEMANTIC_DRIFT_MAX_CODE_FILES', 120)
export const SEMANTIC_DRIFT_MAX_SOURCE_BYTES = readPositiveIntegerEnv('SEMANTIC_DRIFT_MAX_SOURCE_BYTES', 256 * 1024)
export const QDRANT_URL = (process.env.QDRANT_URL || '').replace(/\/+$/, '') || null
export const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'codepulse_semantic_drift'

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
