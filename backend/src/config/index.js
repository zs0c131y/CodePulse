import '../env.js'

export const PORT = Number(process.env.API_PORT || process.env.PORT || 5000)
export const IS_PRODUCTION = process.env.NODE_ENV === 'production'
export const refreshCookieName = 'codepulse_refresh'
export const accessTokenTtlSeconds = 15 * 60
export const refreshTokenTtlMs = 7 * 24 * 60 * 60 * 1000
export const verificationTokenTtlMs = 24 * 60 * 60 * 1000
export const resetTokenTtlMs = 60 * 60 * 1000
export const loginLockTtlMs = 15 * 60 * 1000
export const maxLoginFailures = 5
export const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || 'http://localhost:5174,http://127.0.0.1:5174')
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

export const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/codepulse'
export const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'codepulse'

// --- Public URLs (frontend/backend, used for redirects and OAuth callbacks) ---

export const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5174').replace(/\/+$/, '')
export const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/+$/, '')

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
