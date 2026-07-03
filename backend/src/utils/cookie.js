import { isProduction, refreshCookieName, refreshTokenTtlMs } from '../config/index.js'

export function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map(cookie => cookie.trim())
      .filter(Boolean)
      .map(cookie => {
        const index = cookie.indexOf('=')
        return [cookie.slice(0, index), decodeURIComponent(cookie.slice(index + 1))]
      }),
  )
}

export function setRefreshCookie(response, token) {
  const parts = [
    `${refreshCookieName}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/api/auth',
    `Max-Age=${Math.floor(refreshTokenTtlMs / 1000)}`,
  ]

  if (isProduction) {
    parts.push('Secure')
  }

  response.setHeader('Set-Cookie', parts.join('; '))
}

export function clearRefreshCookie(response) {
  const parts = [
    `${refreshCookieName}=`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/api/auth',
    'Max-Age=0',
  ]

  if (isProduction) {
    parts.push('Secure')
  }

  response.setHeader('Set-Cookie', parts.join('; '))
}
