import test from 'node:test'
import assert from 'node:assert/strict'
import { checkLiveness } from '../src/features/health/controller.js'

test('liveness check responds without requiring a database connection', () => {
  const response = {
    body: undefined,
    json(payload) {
      this.body = payload
    },
  }

  checkLiveness({}, response)

  assert.deepEqual(response.body, { status: 'ok' })
})
