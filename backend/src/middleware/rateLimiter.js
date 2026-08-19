import { rateLimitedRequestsTotal } from '../observability/metrics.js'

export function createRateLimiter({ windowMs, max, key = request => request.ip, maxBuckets = 10_000 }) {
  const hits = new Map()

  return (request, response, next) => {
    const now = Date.now()
    if (hits.size >= maxBuckets) {
      for (const [candidateKey, candidate] of hits) {
        if (candidate.resetAt <= now) hits.delete(candidateKey)
      }
      while (hits.size >= maxBuckets) hits.delete(hits.keys().next().value)
    }
    const bucketKey = key(request)
    const bucket = hits.get(bucketKey)

    if (!bucket || bucket.resetAt <= now) {
      hits.set(bucketKey, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    bucket.count += 1
    response.setHeader('X-RateLimit-Limit', String(max))
    response.setHeader('X-RateLimit-Remaining', String(Math.max(max - bucket.count, 0)))
    response.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)))

    if (bucket.count > max) {
      // No path/user label here: it's attacker-influenced input and would
      // give this counter unbounded cardinality.
      rateLimitedRequestsTotal.inc({})
      response.status(429).json({ message: 'Too many requests. Try again later.' })
      return
    }

    next()
  }
}

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  key: request => `${request.ip}:${request.path}`,
})
