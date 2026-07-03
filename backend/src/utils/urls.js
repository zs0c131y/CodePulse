/**
 * Centralized URL utility module.
 *
 * Provides all application URLs (frontend, backend, OAuth callbacks) from a
 * single source. Reads from environment variables and falls back to local
 * development defaults when the variables are not set.
 */

import { isProduction } from '../config/index.js'

const DEV_FRONTEND_URL = 'http://localhost:5174'
const DEV_BACKEND_URL = 'http://localhost:5000'

/** Public frontend URL used for redirects after OAuth and email links. */
export const frontendUrl = (process.env.FRONTEND_URL || DEV_FRONTEND_URL).replace(/\/+$/, '')

/** Public backend URL used for constructing OAuth callback URLs. */
export const backendUrl = (process.env.BACKEND_URL || DEV_BACKEND_URL).replace(/\/+$/, '')

/** GitHub OAuth callback URL registered in the GitHub OAuth App settings. */
export const githubCallbackUrl = `${backendUrl}/auth/github/callback`

/** GitLab OAuth callback URL registered in the GitLab OAuth Application settings. */
export const gitlabCallbackUrl = `${backendUrl}/auth/gitlab/callback`

/**
 * Build a frontend hash link with an optional token query parameter.
 * Example: buildFrontendLink('verify-email', 'abc123') →
 *   http://localhost:5174/#verify-email?token=abc123
 */
export function buildFrontendLink(hashPath, token) {
  if (token) {
    return `${frontendUrl}/#${hashPath}?token=${encodeURIComponent(token)}`
  }

  return `${frontendUrl}/#${hashPath}`
}
