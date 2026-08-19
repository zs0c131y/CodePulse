import test from 'node:test'
import assert from 'node:assert/strict'

// Both must be set before config/index.js is first evaluated by anything.
process.env.NODE_ENV = 'production'
process.env.DISABLE_SEC = 'true'
process.env.JWT_SECRET = 'test-secret-for-production-guard-check'

test('NODE_ENV=production with DISABLE_SEC=true refuses to start', async () => {
  await assert.rejects(
    () => import('../src/config/index.js'),
    error => {
      assert.match(error.message, /FATAL/)
      assert.match(error.message, /DISABLE_SEC=true is not allowed when NODE_ENV=production/)
      return true
    },
  )
})
