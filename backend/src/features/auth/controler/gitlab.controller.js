import crypto from 'node:crypto'
import { gitlabClientId, gitlabClientSecret, isProduction } from '../../../config/index.js'
import { getUsersCollection, getOAuthAccountsCollection } from '../../../db/index.js'
import { gitlabCallbackUrl, frontendUrl } from '../../../utils/urls.js'
import { createSession } from '../../../utils/session.js'

const GITLAB_AUTHORIZE_URL = 'https://gitlab.com/oauth/authorize'
const GITLAB_TOKEN_URL = 'https://gitlab.com/oauth/token'
const GITLAB_USER_URL = 'https://gitlab.com/api/v4/user'
const STATE_COOKIE = 'codepulse_gitlab_state'

/**
 * Redirect the browser to GitLab's OAuth authorization page.
 */
export function redirectToGitlab(_request, response) {
  if (!gitlabClientId || !gitlabClientSecret) {
    response.status(503).json({ message: 'GitLab login is not configured.' })
    return
  }

  const state = crypto.randomBytes(20).toString('hex')

  const stateCookieParts = [
    `${STATE_COOKIE}=${state}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/auth/gitlab',
    'Max-Age=600',
  ]

  if (isProduction) {
    stateCookieParts.push('Secure')
  }

  response.setHeader('Set-Cookie', stateCookieParts.join('; '))

  const params = new URLSearchParams({
    client_id: gitlabClientId,
    redirect_uri: gitlabCallbackUrl,
    response_type: 'code',
    scope: 'read_user',
    state,
  })

  response.redirect(`${GITLAB_AUTHORIZE_URL}?${params}`)
}

/**
 * Handle the callback from GitLab after user authorization.
 */
export async function gitlabCallback(request, response, next) {
  try {
    if (!gitlabClientId || !gitlabClientSecret) {
      response.status(503).json({ message: 'GitLab login is not configured.' })
      return
    }

    const { code, state } = request.query

    // --- Validate CSRF state ---
    const cookies = (request.headers.cookie || '')
      .split(';')
      .map(c => c.trim())
      .reduce((acc, c) => {
        const idx = c.indexOf('=')
        if (idx > 0) acc[c.slice(0, idx)] = c.slice(idx + 1)
        return acc
      }, {})

    const savedState = cookies[STATE_COOKIE]

    // Clear the state cookie
    const clearParts = [
      `${STATE_COOKIE}=`,
      'HttpOnly',
      'SameSite=Lax',
      'Path=/auth/gitlab',
      'Max-Age=0',
    ]
    if (isProduction) clearParts.push('Secure')
    response.setHeader('Set-Cookie', clearParts.join('; '))

    if (!code || !state || state !== savedState) {
      response.redirect(`${frontendUrl}/#signin?error=${encodeURIComponent('GitLab login failed: invalid state.')}`)
      return
    }

    // --- Exchange code for access token ---
    const tokenResponse = await fetch(GITLAB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: gitlabClientId,
        client_secret: gitlabClientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: gitlabCallbackUrl,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      response.redirect(`${frontendUrl}/#signin?error=${encodeURIComponent('GitLab login failed: could not obtain access token.')}`)
      return
    }

    const gitlabAccessToken = tokenData.access_token

    // --- Fetch GitLab user profile ---
    const userResponse = await fetch(GITLAB_USER_URL, {
      headers: { Authorization: `Bearer ${gitlabAccessToken}`, Accept: 'application/json' },
    })

    if (!userResponse.ok) {
      response.redirect(`${frontendUrl}/#signin?error=${encodeURIComponent('GitLab login failed: could not fetch user profile.')}`)
      return
    }

    const gitlabUser = await userResponse.json()

    const email = String(gitlabUser.email || '').trim().toLowerCase()
    const name = gitlabUser.name || gitlabUser.username || 'GitLab User'
    const providerUserId = String(gitlabUser.id)

    if (!email) {
      response.redirect(`${frontendUrl}/#signin?error=${encodeURIComponent('GitLab login failed: no email found on your GitLab account.')}`)
      return
    }

    // --- Find or create user ---
    const oauthAccounts = await getOAuthAccountsCollection()
    const users = await getUsersCollection()

    // Check if this GitLab account is already linked
    let linked = await oauthAccounts.findOne({ provider: 'gitlab', provider_user_id: providerUserId })
    let user

    if (linked) {
      user = await users.findOne({ _id: linked.user_id })
    }

    if (!user) {
      // Check if a user with this email already exists
      user = await users.findOne({ email })

      if (!user) {
        // Create a new user (auto-verified, no password)
        const now = new Date()
        const result = await users.insertOne({
          name,
          email,
          password_hash: null,
          email_verified: true,
          created_at: now,
          updated_at: now,
        })
        user = { _id: result.insertedId, name, email, email_verified: true, created_at: now }
      } else if (!user.email_verified) {
        // Auto-verify existing unverified accounts when linked via OAuth
        await users.updateOne(
          { _id: user._id },
          { $set: { email_verified: true, updated_at: new Date() } },
        )
        user.email_verified = true
      }

      // Link the OAuth account
      if (!linked) {
        await oauthAccounts.insertOne({
          provider: 'gitlab',
          provider_user_id: providerUserId,
          user_id: user._id,
          provider_email: email,
          provider_name: name,
          created_at: new Date(),
        })
      }
    }

    // --- Create session and redirect to frontend ---
    await createSession(response, request, user)
    response.redirect(`${frontendUrl}/#dashboard`)
  } catch (error) {
    next(error)
  }
}
