import {
  refreshCookieName,
  refreshTokenTtlMs,
  accessTokenTtlSeconds,
  verificationTokenTtlMs,
} from '../config/index.js'
import {
  getSessionsCollection,
  getVerificationTokensCollection,
} from '../db/index.js'
import { randomToken, hashToken, signAccessToken } from './token.js'
import { parseCookies, setRefreshCookie } from './cookie.js'

export async function createVerificationToken(userId, email) {
  const token = randomToken()
  const verificationTokens = await getVerificationTokensCollection()

  await verificationTokens.deleteMany({ user_id: userId })
  await verificationTokens.insertOne({
    user_id: userId,
    email,
    token_hash: hashToken(token),
    created_at: new Date(),
    expires_at: new Date(Date.now() + verificationTokenTtlMs),
  })

  return token
}

export async function createSession(response, request, user) {
  const token = randomToken()
  const sessions = await getSessionsCollection()

  await sessions.insertOne({
    user_id: user._id,
    token_hash: hashToken(token),
    user_agent: request.headers['user-agent'] || '',
    ip: request.ip,
    created_at: new Date(),
    expires_at: new Date(Date.now() + refreshTokenTtlMs),
    revoked_at: null,
  })

  setRefreshCookie(response, token)

  return {
    accessToken: signAccessToken(user),
    expiresIn: accessTokenTtlSeconds,
  }
}

export async function getSessionFromCookie(request) {
  const cookies = parseCookies(request.headers.cookie)
  const refreshToken = cookies[refreshCookieName]

  if (!refreshToken) {
    return null
  }

  const sessions = await getSessionsCollection()
  const session = await sessions.findOne({
    token_hash: hashToken(refreshToken),
    revoked_at: null,
    expires_at: { $gt: new Date() },
  })

  return session ? { session, refreshToken } : null
}
