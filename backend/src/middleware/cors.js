import { allowedOrigins } from '../config/index.js'

export function cors(request, response, next) {
  const origin = request.headers.origin

  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
    response.setHeader('Access-Control-Allow-Credentials', 'true')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  }

  if (request.method === 'OPTIONS') {
    response.sendStatus(204)
    return
  }

  next()
}
