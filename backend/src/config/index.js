import dotenv from 'dotenv'

dotenv.config({ quiet: true })

export const port = Number(process.env.API_PORT || process.env.PORT || 5000)
export const isProduction = process.env.NODE_ENV === 'production'
export const refreshCookieName = 'codepulse_refresh'
export const accessTokenTtlSeconds = 15 * 60
export const refreshTokenTtlMs = 7 * 24 * 60 * 60 * 1000
export const verificationTokenTtlMs = 24 * 60 * 60 * 1000
export const resetTokenTtlMs = 60 * 60 * 1000
export const loginLockTtlMs = 15 * 60 * 1000
export const maxLoginFailures = 5
export const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || 'http://localhost:5174,http://127.0.0.1:5174')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
)

function getAuthSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET

  if (isProduction) {
    throw new Error('JWT_SECRET is required in production.')
  }

  return 'dev-only-codepulse-jwt-secret-change-me'
}

export const authSecret = getAuthSecret()

// --- OAuth provider credentials (optional — null when not configured) ---

export const githubClientId = process.env.GITHUB_ID || null
export const githubClientSecret = process.env.GITHUB_SECRET || null
export const gitlabClientId = process.env.GITLAB_ID || null
export const gitlabClientSecret = process.env.GITLAB_SECRET || null
