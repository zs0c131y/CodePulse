import crypto from 'node:crypto'
import { GITHUB_ID, GITHUB_SECRET, IS_PRODUCTION, FRONTEND_URL } from '../../../config/index.js'
import { getUsersCollection, getOAuthAccountsCollection } from '../../../db/index.js'
import { githubCallbackUrl } from '../../../utils/urls.js'
import { createSession, getSessionFromCookie } from '../../../utils/session.js'
import { encryptOAuthToken } from '../../../utils/oauthToken.js'

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL = 'https://api.github.com/user'
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails'
const STATE_COOKIE = 'codepulse_github_state'

/**
 * Redirect the browser to GitHub's OAuth authorization page.
 */
export function redirectToGithub(_request, response) {
  if (!GITHUB_ID || !GITHUB_SECRET) {
    response.status(503).json({ message: 'GitHub login is not configured.' })
    return
  }

  const state = crypto.randomBytes(20).toString('hex')

  const stateCookieParts = [
    `${STATE_COOKIE}=${state}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/auth/github',
    'Max-Age=600',
  ]

  if (IS_PRODUCTION) {
    stateCookieParts.push('Secure')
  }

  response.setHeader('Set-Cookie', stateCookieParts.join('; '))

  const params = new URLSearchParams({
    client_id: GITHUB_ID,
    redirect_uri: githubCallbackUrl,
    scope: 'read:user user:email repo',
    state,
  })

  response.redirect(`${GITHUB_AUTHORIZE_URL}?${params}`)
}

/**
 * Handle the callback from GitHub after user authorization.
 */
export async function githubCallback(request, response, next) {
  try {
    if (!GITHUB_ID || !GITHUB_SECRET) {
      response.status(503).json({ message: 'GitHub login is not configured.' })
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
      'Path=/auth/github',
      'Max-Age=0',
    ]
    if (IS_PRODUCTION) clearParts.push('Secure')
    response.setHeader('Set-Cookie', clearParts.join('; '))

    if (!code || !state || state !== savedState) {
      response.redirect(`${FRONTEND_URL}/signin?error=${encodeURIComponent('GitHub login failed: invalid state.')}`)
      return
    }

    // --- Exchange code for access token ---
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_ID,
        client_secret: GITHUB_SECRET,
        code,
        redirect_uri: githubCallbackUrl,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      response.redirect(`${FRONTEND_URL}/signin?error=${encodeURIComponent('GitHub login failed: could not obtain access token.')}`)
      return
    }

    const githubAccessToken = tokenData.access_token

    // --- Fetch GitHub user profile ---
    const [userResponse, emailsResponse] = await Promise.all([
      fetch(GITHUB_USER_URL, {
        headers: { Authorization: `Bearer ${githubAccessToken}`, Accept: 'application/json' },
      }),
      fetch(GITHUB_EMAILS_URL, {
        headers: { Authorization: `Bearer ${githubAccessToken}`, Accept: 'application/json' },
      }),
    ])

    if (!userResponse.ok) {
      response.redirect(`${FRONTEND_URL}/signin?error=${encodeURIComponent('GitHub login failed: could not fetch user profile.')}`)
      return
    }

    const githubUser = await userResponse.json()
    const githubEmails = emailsResponse.ok ? await emailsResponse.json() : []

    // Prefer the primary verified email, fall back to the profile email
    const primaryEmail = githubEmails.find?.(e => e.primary && e.verified)
    const email = (primaryEmail?.email || githubUser.email || '').trim().toLowerCase()
    const name = githubUser.name || githubUser.login || 'GitHub User'
    const providerUserId = String(githubUser.id)

    if (!email) {
      response.redirect(`${FRONTEND_URL}/signin?error=${encodeURIComponent('GitHub login failed: no verified email found on your GitHub account.')}`)
      return
    }

    // --- Find or create user ---
    const oauthAccounts = await getOAuthAccountsCollection()
    const users = await getUsersCollection()

    // A signed-in browser is explicitly linking a repository source. Keep the
    // current CodePulse account instead of treating this as a second sign-in.
    const activeSession = await getSessionFromCookie(request)
    if (activeSession) {
      const activeUser = await users.findOne({ _id: activeSession.session.user_id, email_verified: true })
      if (activeUser) {
        const existingLink = await oauthAccounts.findOne({ provider: 'github', provider_user_id: providerUserId })
        if (existingLink && !existingLink.user_id.equals(activeUser._id)) {
          response.redirect(`${FRONTEND_URL}/settings?error=${encodeURIComponent('This GitHub account is already linked to another CodePulse account.')}`)
          return
        }
        await oauthAccounts.updateOne(
          { provider: 'github', provider_user_id: providerUserId },
          { $set: { user_id: activeUser._id, provider_email: email, provider_name: name, provider_access_token: encryptOAuthToken(githubAccessToken), updated_at: new Date() }, $setOnInsert: { provider: 'github', provider_user_id: providerUserId, created_at: new Date() } },
          { upsert: true },
        )
        response.redirect(`${FRONTEND_URL}/settings?connected=github`)
        return
      }
    }

    // Check if this GitHub account is already linked
    let linked = await oauthAccounts.findOne({ provider: 'github', provider_user_id: providerUserId })
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
          provider: 'github',
          provider_user_id: providerUserId,
          user_id: user._id,
          provider_email: email,
          provider_name: name,
          provider_access_token: encryptOAuthToken(githubAccessToken),
          created_at: new Date(),
          updated_at: new Date(),
        })
      }
    }

    await oauthAccounts.updateOne(
      { provider: 'github', provider_user_id: providerUserId },
      { $set: { provider_email: email, provider_name: name, provider_access_token: encryptOAuthToken(githubAccessToken), updated_at: new Date() } },
    )

    // --- Create session and redirect to frontend ---
    await createSession(response, request, user)
    response.redirect(`${FRONTEND_URL}/dashboard`)
  } catch (error) {
    next(error)
  }
}
