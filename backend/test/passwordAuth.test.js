import test from 'node:test'
import assert from 'node:assert/strict'
import { passwordMatchesUser } from '../src/utils/passwordAuth.js'

test('OAuth-only and missing accounts fail credential auth without passing null to bcrypt', async () => {
  const comparedHashes = []
  const compare = async (_password, hash) => {
    comparedHashes.push(hash)
    return false
  }

  assert.equal(await passwordMatchesUser('Password1', { password_hash: null }, compare), false)
  assert.equal(await passwordMatchesUser('Password1', null, compare), false)
  assert.equal(comparedHashes.length, 2)
  assert.ok(comparedHashes.every(hash => typeof hash === 'string' && hash.startsWith('$2b$')))
})

test('credential accounts only authenticate when bcrypt validates their stored hash', async () => {
  const user = { password_hash: 'stored-hash' }
  assert.equal(await passwordMatchesUser('Password1', user, async (_password, hash) => hash === 'stored-hash'), true)
  assert.equal(await passwordMatchesUser('Password1', user, async () => false), false)
})
