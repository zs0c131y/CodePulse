import test from 'node:test'
import assert from 'node:assert/strict'
import { findDueScheduledRepositories, runScheduledScans } from '../src/features/repositories/services/scanScheduler.js'

function createRepositoriesCollection(records) {
  const updates = []
  return {
    records,
    updates,
    find(filter) {
      const matched = records.filter(record => {
        if (filter.scan_interval_hours && record.scan_interval_hours == null) return false
        if (filter.next_scan_at && !(record.next_scan_at <= filter.next_scan_at.$lte)) return false
        if (filter.status && filter.status.$nin.includes(record.status)) return false
        return true
      })
      return {
        limit(count) {
          this._limit = count
          return this
        },
        async toArray() { return matched.slice(0, this._limit ?? matched.length) },
      }
    },
    async updateOne(filter, update) {
      updates.push({ filter, update })
      const record = records.find(item => item._id === filter._id)
      if (record) Object.assign(record, update.$set)
      return { matchedCount: record ? 1 : 0 }
    },
  }
}

const NOW = new Date('2026-08-19T12:00:00.000Z')

function dueRepository(overrides = {}) {
  return {
    _id: 'repo-1',
    user_id: 'user-1',
    status: 'completed',
    repo_url: 'https://github.com/example/demo',
    commit_limit: 100,
    scan_interval_hours: 24,
    next_scan_at: new Date('2026-08-19T00:00:00.000Z'),
    ...overrides,
  }
}

test('findDueScheduledRepositories only returns scheduled, due, and inactive repositories', async () => {
  const repositories = createRepositoriesCollection([
    dueRepository({ _id: 'due' }),
    dueRepository({ _id: 'not-scheduled', scan_interval_hours: null, next_scan_at: null }),
    dueRepository({ _id: 'not-due-yet', next_scan_at: new Date('2026-08-20T00:00:00.000Z') }),
    dueRepository({ _id: 'already-running', status: 'running' }),
    dueRepository({ _id: 'already-queued', status: 'queued' }),
  ])

  const due = await findDueScheduledRepositories(NOW, { repositories })
  assert.deepEqual(due.map(record => record._id), ['due'])
})

test('runScheduledScans enqueues a scan for each due repository and advances next_scan_at', async () => {
  const repositories = createRepositoriesCollection([dueRepository()])
  const enqueued = []

  const result = await runScheduledScans({
    now: NOW,
    repositories,
    parseGitHubRepositoryUrl: url => ({ webUrl: url, name: 'demo', fullName: 'example/demo', cloneUrl: `${url}.git` }),
    async queueRepositoryAnalysis(input) {
      assert.equal(input.userId, 'user-1')
      assert.equal(input.commitLimit, 100)
      return { repositoryId: 'repo-1', scanId: 'scan-123', status: 'queued', shouldStart: true }
    },
    getGitHubAccessToken: async () => null,
    enqueueRepositoryAnalysis(job) {
      enqueued.push(job)
      return true
    },
  })

  assert.deepEqual(result, { checked: 1, started: 1, skipped: 0 })
  assert.equal(enqueued.length, 1)
  assert.equal(enqueued[0].scanId, 'scan-123')
  assert.equal(enqueued[0].repoUrl, 'https://github.com/example/demo')

  const [update] = repositories.updates
  assert.equal(update.filter._id, 'repo-1')
  assert.equal(update.update.$set.next_scan_at.toISOString(), '2026-08-20T12:00:00.000Z')
})

test('runScheduledScans still advances next_scan_at when the repository is already active from a manual trigger', async () => {
  const repositories = createRepositoriesCollection([dueRepository()])

  const result = await runScheduledScans({
    now: NOW,
    repositories,
    parseGitHubRepositoryUrl: url => ({ webUrl: url, name: 'demo', fullName: 'example/demo', cloneUrl: `${url}.git` }),
    async queueRepositoryAnalysis() {
      return { repositoryId: 'repo-1', scanId: null, status: 'running', shouldStart: false }
    },
    enqueueRepositoryAnalysis() { assert.fail('should not enqueue when shouldStart is false') },
  })

  assert.deepEqual(result, { checked: 1, started: 0, skipped: 1 })
  assert.equal(repositories.records[0].next_scan_at.toISOString(), '2026-08-20T12:00:00.000Z')
})

test('runScheduledScans advances next_scan_at even when the repo_url is unparseable, so it does not retry every tick', async () => {
  const repositories = createRepositoriesCollection([dueRepository({ repo_url: 'not-a-url' })])
  const errors = []

  const result = await runScheduledScans({
    now: NOW,
    repositories,
    parseGitHubRepositoryUrl: () => null,
    logError: message => errors.push(message),
  })

  assert.deepEqual(result, { checked: 1, started: 0, skipped: 1 })
  assert.equal(errors.length, 1)
  assert.equal(repositories.records[0].next_scan_at.toISOString(), '2026-08-20T12:00:00.000Z')
})

test('runScheduledScans advances next_scan_at even when queueing throws, so one bad repository does not block the batch', async () => {
  const repositories = createRepositoriesCollection([
    dueRepository({ _id: 'failing' }),
    dueRepository({ _id: 'healthy' }),
  ])
  const started = []
  let callCount = 0

  const result = await runScheduledScans({
    now: NOW,
    repositories,
    parseGitHubRepositoryUrl: url => ({ webUrl: url, name: 'demo', fullName: 'example/demo', cloneUrl: `${url}.git` }),
    async queueRepositoryAnalysis() {
      callCount += 1
      if (callCount === 1) throw new Error('GitHub API unavailable')
      return { repositoryId: 'repo-ok', scanId: 'scan-ok', status: 'queued', shouldStart: true }
    },
    getGitHubAccessToken: async () => null,
    enqueueRepositoryAnalysis(job) { started.push(job) },
    logError: () => {},
  })

  assert.equal(result.checked, 2)
  assert.equal(result.started, 1)
  assert.equal(result.skipped, 1)
  assert.equal(repositories.updates.length, 2)
  assert.equal(started.length, 1)
})

test('respects the batchSize option', async () => {
  const repositories = createRepositoriesCollection([
    dueRepository({ _id: 'a' }),
    dueRepository({ _id: 'b' }),
    dueRepository({ _id: 'c' }),
  ])

  const due = await findDueScheduledRepositories(NOW, { repositories, batchSize: 2 })
  assert.equal(due.length, 2)
})
