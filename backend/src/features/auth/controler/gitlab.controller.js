import { GITLAB_ID, GITLAB_SECRET, IS_PRODUCTION, FRONTEND_URL } from '../../../config/index.js'
import { getUsersCollection, getOAuthAccountsCollection } from '../../../db/index.js'
import { gitlabCallbackUrl } from '../../../utils/urls.js'
import { createSession } from '../../../utils/session.js'
import { encryptOAuthToken } from '../../../utils/oauthToken.js'
import { linkOAuthAccountWithCollection } from '../../../utils/oauthAccount.js'
import {
  clearOAuthStateCookie,
  consumeOAuthState,
  createOAuthState,
  readOAuthStateCookie,
  setOAuthStateCookie,
} from '../../../utils/oauthState.js'

const GITLAB_AUTHORIZE_URL = 'https://gitlab.com/oauth/authorize'
const GITLAB_TOKEN_URL = 'https://gitlab.com/oauth/token'
const GITLAB_USER_URL = 'https://gitlab.com/api/v4/user'
const PROVIDER = 'gitlab'

function redirectError(response, intent, message) {
  const route = intent === 'connect' ? 'settings' : 'signin'
  response.redirect(`${FRONTEND_URL}/${route}?error=${encodeURIComponent(message)}`)
}

/**
 * Redirect the browser to GitLab's OAuth authorization page.
 */
export async function redirectToGitlab(request, response, next) {
  if (!GITLAB_ID || !GITLAB_SECRET) {
    response.status(503).json({ message: 'GitLab login is not configured.' })
    return
  }

  try {
    const intent = request.user ? 'connect' : 'signin'
    const { token } = await createOAuthState({
      provider: PROVIDER,
      intent,
      userId: request.user?._id || null,
    })
    setOAuthStateCookie(response, PROVIDER, token, { secure: IS_PRODUCTION })

    const params = new URLSearchParams({
      client_id: GITLAB_ID,
      redirect_uri: gitlabCallbackUrl,
      response_type: 'code',
      scope: 'read_user read_api',
      state: token,
    })

    response.redirect(`${GITLAB_AUTHORIZE_URL}?${params}`)
  } catch (error) {
    next(error)
  }
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
    const savedState = readOAuthStateCookie(request, PROVIDER)

    if (!code || !state) {
      redirectError(response, 'signin', 'GitLab login failed: invalid state.')
      return
    }

    if (state !== savedState) {
      redirectError(response, 'signin', 'GitLab login failed: invalid state.')
      return
    }

    const oauthState = await consumeOAuthState({ provider: PROVIDER, token: state })
    if (!oauthState) {
      redirectError(response, 'signin', 'GitLab login failed: invalid or expired state.')
      return
    }
    const intent = oauthState.intent === 'connect' ? 'connect' : 'signin'
    clearOAuthStateCookie(response, PROVIDER, { secure: IS_PRODUCTION })

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
      redirectError(response, intent, 'GitLab login failed: could not obtain access token.')
      return
    }

    const gitlabAccessToken = tokenData.access_token

    // --- Fetch GitLab user profile ---
    const userResponse = await fetch(GITLAB_USER_URL, {
      headers: { Authorization: `Bearer ${gitlabAccessToken}`, Accept: 'application/json' },
    })

    if (!userResponse.ok) {
      redirectError(response, intent, 'GitLab login failed: could not fetch user profile.')
      return
    }

    const gitlabUser = await userResponse.json()

    const email = String(gitlabUser.email || '').trim().toLowerCase()
    const name = gitlabUser.name || gitlabUser.username || 'GitLab User'
    const providerUserId = String(gitlabUser.id)

    if (!email) {
      redirectError(response, intent, 'GitLab login failed: no email found on your GitLab account.')
      return
    }

    // --- Find or create user ---
    const oauthAccounts = await getOAuthAccountsCollection()
    const users = await getUsersCollection()

    if (intent === 'connect') {
      const activeUser = oauthState.user_id
        ? await users.findOne({ _id: oauthState.user_id, email_verified: true })
        : null
      if (!activeUser) {
        redirectError(response, intent, 'GitLab connection failed: the initiating account is no longer available.')
        return
      }

      const linkedToActiveUser = await linkOAuthAccountWithCollection({
        provider: PROVIDER,
        providerUserId,
        userId: activeUser._id,
        email,
        name,
        encryptedAccessToken: encryptOAuthToken(gitlabAccessToken),
      }, oauthAccounts)
      if (!linkedToActiveUser) {
        redirectError(response, intent, 'This GitLab account is already linked to another CodePulse account.')
        return
      }
      response.redirect(`${FRONTEND_URL}/settings?connected=gitlab`)
      return
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
    response.redirect(`${FRONTEND_URL}/dashboard`)
  } catch (error) {
    next(error)
  }
}
