import { hashToken, randomToken } from './token.js'
import { getOAuthStatesCollection } from '../db/index.js'

export const oauthStateTtlMs = 10 * 60 * 1000

function normalizeIntent(intent) {
  return intent === 'connect' ? 'connect' : 'signin'
}

export async function createOAuthStateWithCollection(
  { provider, intent = 'signin', userId = null, now = new Date(), token = randomToken() },
  states,
) {
  const expiresAt = new Date(now.getTime() + oauthStateTtlMs)
  await states.insertOne({
    provider,
    intent: normalizeIntent(intent),
    user_id: userId,
    state_hash: hashToken(token),
    created_at: now,
    expires_at: expiresAt,
  })

  return { token, expiresAt }
}

export async function consumeOAuthStateWithCollection(
  { provider, token, now = new Date() },
  states,
) {
  if (!token) return null

  const result = await states.findOneAndDelete({
    provider,
    state_hash: hashToken(token),
    expires_at: { $gt: now },
  })

  if (!result) return null
  return result.value === undefined ? result : result.value
}

export async function createOAuthState(input) {
  return createOAuthStateWithCollection(input, await getOAuthStatesCollection())
}

export async function consumeOAuthState(input) {
  return consumeOAuthStateWithCollection(input, await getOAuthStatesCollection())
}

export function oauthStateCookieName(provider) {
  return `codepulse_${provider}_state`
}

export function setOAuthStateCookie(response, provider, token, { secure = false } = {}) {
  const parts = [
    `${oauthStateCookieName(provider)}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    `Path=/auth/${provider}`,
    `Max-Age=${Math.floor(oauthStateTtlMs / 1000)}`,
  ]
  if (secure) parts.push('Secure')
  response.setHeader('Set-Cookie', parts.join('; '))
}

export function clearOAuthStateCookie(response, provider, { secure = false } = {}) {
  const parts = [
    `${oauthStateCookieName(provider)}=`,
    'HttpOnly',
    'SameSite=Lax',
    `Path=/auth/${provider}`,
    'Max-Age=0',
  ]
  if (secure) parts.push('Secure')
  response.setHeader('Set-Cookie', parts.join('; '))
}

export function readOAuthStateCookie(request, provider) {
  const cookieName = oauthStateCookieName(provider)

  for (const cookie of String(request.headers.cookie || '').split(';')) {
    const item = cookie.trim()
    const separator = item.indexOf('=')
    if (separator <= 0 || item.slice(0, separator) !== cookieName) continue

    try {
      return decodeURIComponent(item.slice(separator + 1))
    } catch {
      return ''
    }
  }

  return ''
}
