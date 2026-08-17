import test from 'node:test'
import assert from 'node:assert/strict'
import { hashToken } from '../src/utils/token.js'
import { claimPasswordResetTokenWithCollection } from '../src/utils/passwordReset.js'

test('password reset tokens are atomically claimed once', async () => {
  const now = new Date('2026-08-13T10:00:00.000Z')
  const record = {
    _id: 'reset-1',
    token_hash: hashToken('reset-token'),
    expires_at: new Date('2026-08-13T11:00:00.000Z'),
    used_at: null,
  }
  const resetTokens = {
    async findOneAndUpdate(filter, update) {
      if (
        record.token_hash !== filter.token_hash
        || record.used_at !== null
        || record.expires_at <= filter.expires_at.$gt
      ) return null
      record.used_at = update.$set.used_at
      return { ...record }
    },
  }

  const claimed = await claimPasswordResetTokenWithCollection('reset-token', resetTokens, now)
  const replay = await claimPasswordResetTokenWithCollection('reset-token', resetTokens, now)

  assert.equal(claimed._id, 'reset-1')
  assert.equal(claimed.used_at, now)
  assert.equal(replay, null)
})
