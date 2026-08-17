import test from 'node:test'
import assert from 'node:assert/strict'
import {
  consumeOAuthStateWithCollection,
  createOAuthStateWithCollection,
  oauthStateTtlMs,
} from '../src/utils/oauthState.js'

class StateCollection {
  constructor() {
    this.records = []
  }

  async insertOne(record) {
    this.records.push(record)
    return { insertedId: this.records.length }
  }

  async findOneAndDelete(filter) {
    const index = this.records.findIndex(record => (
      record.provider === filter.provider
      && record.state_hash === filter.state_hash
      && record.expires_at > filter.expires_at.$gt
    ))
    if (index === -1) return null
    return this.records.splice(index, 1)[0]
  }
}

test('OAuth state binds a connect flow to its initiating user and expires', async () => {
  const states = new StateCollection()
  const now = new Date('2026-08-13T10:00:00.000Z')
  const created = await createOAuthStateWithCollection({
    provider: 'github',
    intent: 'connect',
    userId: 'user-1',
    token: 'state-token',
    now,
  }, states)

  assert.equal(created.expiresAt.getTime(), now.getTime() + oauthStateTtlMs)
  assert.notEqual(states.records[0].state_hash, 'state-token')
  assert.equal(states.records[0].user_id, 'user-1')
  assert.equal(states.records[0].intent, 'connect')
})

test('OAuth state is consumed atomically and cannot be replayed', async () => {
  const states = new StateCollection()
  const now = new Date('2026-08-13T10:00:00.000Z')
  await createOAuthStateWithCollection({
    provider: 'gitlab',
    intent: 'signin',
    token: 'one-time-state',
    now,
  }, states)

  const first = await consumeOAuthStateWithCollection({
    provider: 'gitlab',
    token: 'one-time-state',
    now,
  }, states)
  const replay = await consumeOAuthStateWithCollection({
    provider: 'gitlab',
    token: 'one-time-state',
    now,
  }, states)

  assert.equal(first.intent, 'signin')
  assert.equal(replay, null)
})

test('expired OAuth state is rejected', async () => {
  const states = new StateCollection()
  const createdAt = new Date('2026-08-13T10:00:00.000Z')
  await createOAuthStateWithCollection({
    provider: 'github',
    token: 'expired-state',
    now: createdAt,
  }, states)

  const result = await consumeOAuthStateWithCollection({
    provider: 'github',
    token: 'expired-state',
    now: new Date(createdAt.getTime() + oauthStateTtlMs + 1),
  }, states)

  assert.equal(result, null)
})
