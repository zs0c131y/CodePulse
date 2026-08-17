import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createShareToken,
  hashShareToken,
  isValidShareToken,
  serializeReport,
  insertReportWithCollection,
  listReportsForOwnerWithCollection,
  enableSharingWithCollection,
  disableSharingWithCollection,
  findReportByShareTokenWithCollection,
} from '../src/features/reports/reportStoreCore.js'

function matches(record, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (value && typeof value === 'object' && '$gt' in value) return record[key] > value.$gt
    return record[key] === value
  })
}

function createCollection() {
  const records = []
  return {
    records,
    async insertOne(record) {
      records.push({ _id: `report-${records.length + 1}`, ...record })
      return { insertedId: records.at(-1)._id }
    },
    async findOne(filter) {
      return records.find(record => matches(record, filter)) || null
    },
    find(filter) {
      const state = { records: records.filter(record => matches(record, filter)), skip: 0, limit: null }
      const cursor = {
        sort(specification) {
          const fields = Object.entries(specification)
          state.records.sort((left, right) => {
            for (const [field, direction] of fields) {
              const leftValue = left[field]
              const rightValue = right[field]
              const comparison = leftValue instanceof Date || rightValue instanceof Date
                ? new Date(leftValue || 0) - new Date(rightValue || 0)
                : String(leftValue ?? '').localeCompare(String(rightValue ?? ''))
              if (comparison !== 0) return comparison * direction
            }
            return 0
          })
          return cursor
        },
        skip(value) { state.skip = value; return cursor },
        limit(value) { state.limit = value; return cursor },
        async toArray() {
          const end = state.limit === null ? undefined : state.skip + state.limit
          return state.records.slice(state.skip, end)
        },
      }
      return cursor
    },
    async countDocuments(filter) {
      return records.filter(record => matches(record, filter)).length
    },
    async findOneAndUpdate(filter, update) {
      const record = records.find(candidate => matches(candidate, filter))
      if (!record) return null
      Object.assign(record, update.$set || {})
      for (const key of Object.keys(update.$unset || {})) delete record[key]
      return { ...record }
    },
  }
}

function snapshot() {
  return {
    schema: 'codepulse.report.snapshot',
    version: 1,
    generatedAt: '2026-08-12T08:00:00.000Z',
    sourceAnalysis: { version: 1, analyzedAt: '2026-08-11T12:00:00.000Z' },
    repository: { id: 'repo-1', name: 'demo' },
    summary: { healthScore: 81 },
    sections: { recommendations: { status: 'included', items: [] } },
  }
}

test('reports persist immutable snapshots private by default', async () => {
  const reports = createCollection()
  const record = await insertReportWithCollection(
    {
      ownerId: 'user-1',
      repositoryId: 'repo-1',
      snapshot: snapshot(),
      now: new Date('2026-08-12T08:00:00.000Z'),
    },
    reports,
  )

  assert.equal(record.share_token_hash, undefined)
  assert.equal(record.source_analyzed_at.toISOString(), '2026-08-11T12:00:00.000Z')
  assert.deepEqual(serializeReport(record).sharing, { enabled: false, sharedAt: null, expiresAt: null })
  assert.equal(serializeReport(record).sections.recommendations.status, 'included')
})

test('report listings are bounded and paginated in collection order', async () => {
  const reports = createCollection()
  for (const [ownerId, repositoryId, date] of [
    ['user-1', 'repo-1', '2026-08-10T08:00:00.000Z'],
    ['user-1', 'repo-1', '2026-08-11T08:00:00.000Z'],
    ['user-1', 'repo-2', '2026-08-12T08:00:00.000Z'],
    ['user-2', 'repo-1', '2026-08-13T08:00:00.000Z'],
  ]) {
    await insertReportWithCollection({
      ownerId,
      repositoryId,
      snapshot: { ...snapshot(), generatedAt: date },
      now: new Date(date),
    }, reports)
  }

  const page = await listReportsForOwnerWithCollection(
    'user-1',
    null,
    reports,
    { limit: 1, skip: 1 },
  )
  assert.equal(page.total, 3)
  assert.equal(page.limit, 1)
  assert.equal(page.skip, 1)
  assert.equal(page.reports.length, 1)
  assert.equal(page.reports[0].generatedAt, '2026-08-11T08:00:00.000Z')
  assert.equal(page.reports[0].sections, undefined)

  const bounded = await listReportsForOwnerWithCollection(
    'user-1',
    'repo-1',
    reports,
    { limit: 1000, skip: -1 },
  )
  assert.equal(bounded.total, 2)
  assert.equal(bounded.limit, 200)
  assert.equal(bounded.skip, 0)
})

test('share tokens are opaque, hashed at rest, resolvable, and revocable', async () => {
  const reports = createCollection()
  const record = await insertReportWithCollection(
    { ownerId: 'user-1', repositoryId: 'repo-1', snapshot: snapshot(), now: new Date() },
    reports,
  )
  const token = createShareToken(size => Buffer.alloc(size, 7))
  const tokenHash = hashShareToken(token)

  assert.equal(isValidShareToken(token), true)
  assert.equal(token.length, 43)
  assert.notEqual(tokenHash, token)

  const shared = await enableSharingWithCollection(
    {
      ownerId: 'user-1',
      reportId: record._id,
      tokenHash,
      now: new Date('2026-08-12T09:00:00.000Z'),
      expiresAt: new Date('2026-08-19T09:00:00.000Z'),
    },
    reports,
  )
  assert.equal(shared.share_token_hash, tokenHash)
  assert.equal(JSON.stringify(serializeReport(shared)).includes(tokenHash), false)
  assert.equal((await findReportByShareTokenWithCollection(
    tokenHash,
    reports,
    new Date('2026-08-13T09:00:00.000Z'),
  ))._id, record._id)
  assert.equal(await findReportByShareTokenWithCollection(
    tokenHash,
    reports,
    new Date('2026-08-20T09:00:00.000Z'),
  ), null)

  const revoked = await disableSharingWithCollection(
    { ownerId: 'user-1', reportId: record._id, now: new Date('2026-08-12T10:00:00.000Z') },
    reports,
  )
  assert.equal(revoked.share_token_hash, undefined)
  assert.equal(await findReportByShareTokenWithCollection(tokenHash, reports), null)
})

test('malformed share tokens are rejected before hashing', () => {
  assert.equal(isValidShareToken('short'), false)
  assert.equal(hashShareToken('short'), null)
})
