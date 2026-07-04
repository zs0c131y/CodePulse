/**
 * Derived URL builders for OAuth callbacks and frontend links.
 *
 * The raw FRONTEND_URL / BACKEND_URL env values live in config/index.js —
 * this module only builds specific paths on top of them.
 */

import { FRONTEND_URL, BACKEND_URL } from '../config/index.js'

/** GitHub OAuth callback URL registered in the GitHub OAuth App settings. */
export const githubCallbackUrl = `${BACKEND_URL}/auth/github/callback`

/** GitLab OAuth callback URL registered in the GitLab OAuth Application settings. */
export const gitlabCallbackUrl = `${BACKEND_URL}/auth/gitlab/callback`

/**
 * Build a frontend client-side route link with an optional token query
 * parameter. Example: buildFrontendLink('verify-email', 'abc123') →
 *   http://localhost:5173/verify-email?token=abc123
 */
export function buildFrontendLink(routePath, token) {
  if (token) {
    return `${FRONTEND_URL}/${routePath}?token=${encodeURIComponent(token)}`
  }

  return `${FRONTEND_URL}/${routePath}`
}
