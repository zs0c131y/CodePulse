import test from 'node:test'
import assert from 'node:assert/strict'
import { recoverRepositoryAnalysisJobs } from '../src/features/repositories/services/analysisQueue.js'

test('startup recovery requeues interrupted scans and schedules durable queued work', async () => {
  const records = [
    {
      _id: 'repo-running',
      user_id: 'user-1',
      status: 'running',
      scan_id: 'scan-running',
      repo_url: 'https://github.com/example/running',
      commit_limit: 20,
      lease_expires_at: new Date('2026-08-13T09:59:00.000Z'),
    },
    {
      _id: 'repo-queued',
      user_id: 'user-2',
      status: 'queued',
      scan_id: 'scan-queued',
      repo_url: 'https://github.com/example/queued',
      commit_limit: 40,
    },
  ]
  const updates = []
  const enqueued = []
  const repositories = {
    find() {
      return { async toArray() { return records } }
    },
    async updateOne(filter, update) {
      updates.push({ filter, update })
      return { matchedCount: 1 }
    },
  }

  const recovered = await recoverRepositoryAnalysisJobs({
    repositories,
    now: new Date('2026-08-13T10:00:00.000Z'),
    enqueue(job) {
      enqueued.push(job)
      return true
    },
  })

  assert.equal(recovered, 2)
  assert.equal(updates.length, 1)
  assert.equal(updates[0].filter.status, 'running')
  assert.equal(updates[0].filter.lease_expires_at.toISOString(), '2026-08-13T09:59:00.000Z')
  assert.equal(updates[0].update.$set.status, 'queued')
  assert.deepEqual(enqueued.map(job => job.scanId), ['scan-running', 'scan-queued'])
})
