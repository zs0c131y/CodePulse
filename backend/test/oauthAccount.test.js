import test from 'node:test'
import assert from 'node:assert/strict'
import { linkOAuthAccountWithCollection } from '../src/utils/oauthAccount.js'

class AccountCollection {
  constructor(records = []) {
    this.records = records
    this.raceRecord = null
  }

  async findOne(filter) {
    return this.records.find(record => record.provider === filter.provider && record.provider_user_id === filter.provider_user_id) || null
  }

  async insertOne(record) {
    if (this.raceRecord) {
      this.records.push(this.raceRecord)
      this.raceRecord = null
      const error = new Error('duplicate')
      error.code = 11000
      throw error
    }
    this.records.push({ _id: `account-${this.records.length + 1}`, ...record })
  }

  async updateOne(filter, update) {
    const record = this.records.find(item => item._id === filter._id && String(item.user_id) === String(filter.user_id))
    if (record) Object.assign(record, update.$set)
    return { matchedCount: record ? 1 : 0 }
  }
}

const input = {
  provider: 'github',
  providerUserId: 'provider-1',
  userId: 'user-1',
  email: 'ada@example.com',
  name: 'Ada',
  encryptedAccessToken: 'encrypted',
}

test('provider links are refreshed only for their current owner', async () => {
  const accounts = new AccountCollection([{ _id: 'account-1', provider: 'github', provider_user_id: 'provider-1', user_id: 'user-1' }])
  assert.equal(await linkOAuthAccountWithCollection(input, accounts), true)
  assert.equal(accounts.records[0].provider_access_token, 'encrypted')

  assert.equal(await linkOAuthAccountWithCollection({ ...input, userId: 'user-2' }, accounts), false)
  assert.equal(accounts.records[0].user_id, 'user-1')
})

test('a concurrent first-link race never reassigns another users provider identity', async () => {
  const accounts = new AccountCollection()
  accounts.raceRecord = { _id: 'winner', provider: 'github', provider_user_id: 'provider-1', user_id: 'user-2' }

  const linked = await linkOAuthAccountWithCollection(input, accounts)

  assert.equal(linked, false)
  assert.equal(accounts.records[0].user_id, 'user-2')
})
