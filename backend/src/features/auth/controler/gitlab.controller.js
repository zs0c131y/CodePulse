import crypto from 'node:crypto'
import { GITLAB_ID, GITLAB_SECRET, IS_PRODUCTION, FRONTEND_URL } from '../../../config/index.js'
import { getUsersCollection, getOAuthAccountsCollection } from '../../../db/index.js'
import { gitlabCallbackUrl } from '../../../utils/urls.js'
import { createSession, getSessionFromCookie } from '../../../utils/session.js'
import { encryptOAuthToken } from '../../../utils/oauthToken.js'

const GITLAB_AUTHORIZE_URL = 'https://gitlab.com/oauth/authorize'
const GITLAB_TOKEN_URL = 'https://gitlab.com/oauth/token'
const GITLAB_USER_URL = 'https://gitlab.com/api/v4/user'
const STATE_COOKIE = 'codepulse_gitlab_state'

/**
 * Redirect the browser to GitLab's OAuth authorization page.
 */
export function redirectToGitlab(_request, response) {
  if (!GITLAB_ID || !GITLAB_SECRET) {
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

  if (IS_PRODUCTION) {
    stateCookieParts.push('Secure')
  }

  response.setHeader('Set-Cookie', stateCookieParts.join('; '))

  const params = new URLSearchParams({
    client_id: GITLAB_ID,
    redirect_uri: gitlabCallbackUrl,
    response_type: 'code',
    scope: 'read_user read_api',
    state,
  })

  response.redirect(`${GITLAB_AUTHORIZE_URL}?${params}`)
}

/**
 * Handle the callback from GitLab after user authorization.
 */
export async function gitlabCallback(request, response, next) {
  try {
    if (!GITLAB_ID || !GITLAB_SECRET) {
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
    if (IS_PRODUCTION) clearParts.push('Secure')
    response.setHeader('Set-Cookie', clearParts.join('; '))

    if (!code || !state || state !== savedState) {
      response.redirect(`${FRONTEND_URL}/#signin?error=${encodeURIComponent('GitLab login failed: invalid state.')}`)
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
        client_id: GITLAB_ID,
        client_secret: GITLAB_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: gitlabCallbackUrl,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      response.redirect(`${FRONTEND_URL}/#signin?error=${encodeURIComponent('GitLab login failed: could not obtain access token.')}`)
      return
    }

    const gitlabAccessToken = tokenData.access_token

    // --- Fetch GitLab user profile ---
    const userResponse = await fetch(GITLAB_USER_URL, {
      headers: { Authorization: `Bearer ${gitlabAccessToken}`, Accept: 'application/json' },
    })

    if (!userResponse.ok) {
      response.redirect(`${FRONTEND_URL}/#signin?error=${encodeURIComponent('GitLab login failed: could not fetch user profile.')}`)
      return
    }

    const gitlabUser = await userResponse.json()

    const email = String(gitlabUser.email || '').trim().toLowerCase()
    const name = gitlabUser.name || gitlabUser.username || 'GitLab User'
    const providerUserId = String(gitlabUser.id)

    if (!email) {
      response.redirect(`${FRONTEND_URL}/#signin?error=${encodeURIComponent('GitLab login failed: no email found on your GitLab account.')}`)
      return
    }

    // --- Find or create user ---
    const oauthAccounts = await getOAuthAccountsCollection()
    const users = await getUsersCollection()

    const activeSession = await getSessionFromCookie(request)
    if (activeSession) {
      const activeUser = await users.findOne({ _id: activeSession.session.user_id, email_verified: true })
      if (activeUser) {
        const existingLink = await oauthAccounts.findOne({ provider: 'gitlab', provider_user_id: providerUserId })
        if (existingLink && !existingLink.user_id.equals(activeUser._id)) {
          response.redirect(`${FRONTEND_URL}/#settings?error=${encodeURIComponent('This GitLab account is already linked to another CodePulse account.')}`)
          return
        }
        await oauthAccounts.updateOne(
          { provider: 'gitlab', provider_user_id: providerUserId },
          { $set: { user_id: activeUser._id, provider_email: email, provider_name: name, provider_access_token: encryptOAuthToken(gitlabAccessToken), updated_at: new Date() }, $setOnInsert: { provider: 'gitlab', provider_user_id: providerUserId, created_at: new Date() } },
          { upsert: true },
        )
        response.redirect(`${FRONTEND_URL}/#settings?connected=gitlab`)
        return
      }
    }

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
          provider_access_token: encryptOAuthToken(gitlabAccessToken),
          created_at: new Date(),
          updated_at: new Date(),
        })
      }
    }

    await oauthAccounts.updateOne(
      { provider: 'gitlab', provider_user_id: providerUserId },
      { $set: { provider_email: email, provider_name: name, provider_access_token: encryptOAuthToken(gitlabAccessToken), updated_at: new Date() } },
    )

    // --- Create session and redirect to frontend ---
    await createSession(response, request, user)
    response.redirect(`${FRONTEND_URL}/#dashboard`)
  } catch (error) {
    next(error)
  }
}
