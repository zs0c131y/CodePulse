import crypto from 'node:crypto'
import { authSecret, accessTokenTtlSeconds } from '../config/index.js'

export function base64Url(value) {
  return Buffer.from(value).toString('base64url')
}

export function signAccessToken(user) {
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64Url(
    JSON.stringify({
      sub: user._id.toString(),
      email: user.email,
      typ: 'access',
      iat: now,
      exp: now + accessTokenTtlSeconds,
    }),
  )
  const signature = crypto
    .createHmac('sha256', authSecret)
    .update(`${header}.${payload}`)
    .digest('base64url')

  return `${header}.${payload}.${signature}`
}

export function verifyAccessToken(token) {
  const parts = String(token || '').split('.')

  if (parts.length !== 3) {
    throw new Error('Malformed token.')
  }

  const [header, payload, signature] = parts
  const expected = crypto
    .createHmac('sha256', authSecret)
    .update(`${header}.${payload}`)
    .digest('base64url')

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    throw new Error('Invalid token signature.')
  }

  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  const now = Math.floor(Date.now() / 1000)

  if (claims.typ !== 'access' || !claims.sub || claims.exp <= now) {
    throw new Error('Expired or invalid token.')
  }

  return claims
}

export function randomToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}
