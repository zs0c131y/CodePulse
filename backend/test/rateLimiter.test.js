import test from 'node:test'
import assert from 'node:assert/strict'
import { createRateLimiter } from '../src/middleware/rateLimiter.js'

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
  }
}

/**
 * Normal-mode behavior (DISABLE_SEC unset/false in this process) — the
 * existing rate limiter must work exactly as before. The bypass behavior
 * (DISABLE_SEC=true) is covered separately in securityBypass.test.js, since
 * it is a module-level constant that has to be set before import.
 */
test('createRateLimiter allows requests under the limit and rejects once it is exceeded', async () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2 })
  const request = { ip: '10.0.0.1' }

  const first = createResponse()
  await limiter(request, first, () => {})
  assert.equal(first.statusCode, 200)

  const second = createResponse()
  await limiter(request, second, () => {})
  assert.equal(second.statusCode, 200)

  const third = createResponse()
  let nextCalled = false
  await limiter(request, third, () => { nextCalled = true })
  assert.equal(third.statusCode, 429)
  assert.equal(nextCalled, false)
  assert.equal(third.body.message, 'Too many requests. Try again later.')
})

test('createRateLimiter tracks separate buckets per key and resets after the window', async () => {
  const limiter = createRateLimiter({ windowMs: 10, max: 1, key: request => request.ip })

  const userA = createResponse()
  await limiter({ ip: 'a' }, userA, () => {})
  assert.equal(userA.statusCode, 200)

  // A different key is unaffected by userA's usage.
  const userB = createResponse()
  await limiter({ ip: 'b' }, userB, () => {})
  assert.equal(userB.statusCode, 200)

  // userA is now over the limit within the window.
  const userABlocked = createResponse()
  await limiter({ ip: 'a' }, userABlocked, () => {})
  assert.equal(userABlocked.statusCode, 429)

  // After the window elapses, userA is allowed again.
  await new Promise(resolve => setTimeout(resolve, 20))
  const userAAfterWindow = createResponse()
  await limiter({ ip: 'a' }, userAAfterWindow, () => {})
  assert.equal(userAAfterWindow.statusCode, 200)
})
