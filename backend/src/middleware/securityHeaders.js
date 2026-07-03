import { isProduction } from '../config/index.js'

export function securityHeaders(request, response, next) {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  if (isProduction || request.secure) {
    response.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
  }

  next()
}
