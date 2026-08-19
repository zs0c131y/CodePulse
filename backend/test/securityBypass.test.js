import test from 'node:test'
import assert from 'node:assert/strict'

// SECURITY_DISABLED is a module-level constant in config/index.js, read
// once at import time — it must be set before that module (or anything
// importing it) is first evaluated. Same pattern as
// aiExplainabilityGemmaClient.test.js and observabilityControllerAuth.test.js.
process.env.DISABLE_SEC = 'true'

const { SECURITY_DISABLED } = await import('../src/config/index.js')
const { createRateLimiter, authRateLimiter } = await import('../src/middleware/rateLimiter.js')
const { assertLoginAllowed } = await import('../src/utils/loginAttempts.js')

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

test('DISABLE_SEC=true is parsed into config.SECURITY_DISABLED', () => {
  assert.equal(SECURITY_DISABLED, true)
})

test('createRateLimiter becomes an inert pass-through — requests are never rejected, no matter how many', async () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 1 })
  const request = { ip: '10.0.0.1' }

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const response = createResponse()
    let nextCalled = false
    await limiter(request, response, () => { nextCalled = true })
    assert.equal(nextCalled, true, `request ${attempt} should reach the next handler`)
    assert.equal(response.statusCode, 200, `request ${attempt} should not be rejected`)
  }
})

test('authRateLimiter (the shared auth-route limiter) is also bypassed', async () => {
  const response = createResponse()
  let nextCalled = false
  await authRateLimiter({ ip: '10.0.0.1', path: '/api/auth/signin' }, response, () => { nextCalled = true })

  assert.equal(nextCalled, true)
  assert.equal(response.statusCode, 200)
})

test('assertLoginAllowed bypasses the failed-sign-in lockout without touching the database', async () => {
  // A DB call would throw here, proving the bypass short-circuits before any query.
  const allowed = await assertLoginAllowed('user@example.com', '10.0.0.1')
  assert.equal(allowed, true)
})
