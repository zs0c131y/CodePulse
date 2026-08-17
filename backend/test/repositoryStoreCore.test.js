import test from 'node:test'
import assert from 'node:assert/strict'
import {
  markRepositoryAnalysisCompletedWithCollection,
  markRepositoryAnalysisFailedWithCollection,
  markRepositoryAnalysisRunningWithCollection,
  persistRepositoryAnalysisWithCollections,
  queueRepositoryAnalysisWithCollection,
} from '../src/features/repositories/services/repositoryStoreCore.js'

class FakeCollection {
  constructor() {
    this.records = []
    this.nextId = 1
  }

  matches(record, filter) {
    return Object.entries(filter).every(([key, value]) => {
      if (value && typeof value === 'object' && '$in' in value) {
        return value.$in.includes(record[key])
      }

      if (value && typeof value === 'object' && '$nin' in value) {
        return !value.$nin.includes(record[key])
      }

      return record[key] === value
    })
  }

  async findOne(filter) {
    return this.records.find(record => this.matches(record, filter)) || null
  }

  async insertOne(record) {
    const inserted = { _id: `fake-${this.nextId++}`, ...record }
    this.records.push(inserted)
    return { insertedId: inserted._id }
  }

  async updateOne(filter, update) {
    const record = await this.findOne(filter)
    if (record && update.$set) Object.assign(record, update.$set)
    return { matchedCount: record ? 1 : 0 }
  }

  async findOneAndUpdate(filter, update, options = {}) {
    const record = await this.findOne(filter)

    if (record) {
      if (update.$set) Object.assign(record, update.$set)
      return record
    }

    if (!options.upsert) return null

    const candidate = { ...(update.$setOnInsert || {}), ...(update.$set || {}) }
    const duplicate = this.records.some(existing =>
      existing.user_id === candidate.user_id && existing.repo_url === candidate.repo_url,
    )
    if (duplicate) {
      const error = new Error('duplicate repository')
      error.code = 11000
      throw error
    }

    const result = await this.insertOne(candidate)
    return this.findOne({ _id: result.insertedId })
  }

  async deleteMany(filter) {
    const before = this.records.length
    this.records = this.records.filter(record => !this.matches(record, filter))
    return { deletedCount: before - this.records.length }
  }

  async insertMany(records) {
    for (const record of records) {
      await this.insertOne(record)
    }
    return { insertedCount: records.length }
  }
}

function createCollections() {
  return {
    repositories: new FakeCollection(),
    repoFiles: new FakeCollection(),
    commits: new FakeCollection(),
    dependencies: new FakeCollection(),
    documentation: new FakeCollection(),
  }
}

function createAnalysis(overrides = {}) {
  return {
    userId: 'user-1',
    repository: {
      repoName: 'demo',
      repoFullName: 'owner/demo',
      repoUrl: 'https://github.com/owner/demo',
      cloneUrl: 'https://github.com/owner/demo.git',
      defaultBranch: 'main',
    },
    files: [{ path: 'README.md', name: 'README.md', extension: '.md', file_type: 'documentation', language: 'Markdown', size: 10, depth: 1 }],
    documentation: [{ doc_path: 'README.md', file_name: 'README.md', documentation_type: 'readme', content_summary: 'Demo', content: '# Demo', size: 10, truncated: false }],
    commits: [{ commit_hash: 'abc', author: 'Ada', author_email: 'ada@example.com', message: 'Initial', commit_date: '2026-07-04T10:00:00.000Z', changed_files: ['README.md'] }],
    dependencies: [],
    ...overrides,
  }
}

test('persists repository analysis records across collections', async () => {
  const collections = createCollections()
  const result = await persistRepositoryAnalysisWithCollections(createAnalysis(), collections)

  assert.equal(result.summary.totalFiles, 1)
  assert.equal(collections.repositories.records.length, 1)
  assert.equal(collections.repositories.records[0].status, 'completed')
  assert.equal(collections.repoFiles.records.length, 1)
  assert.equal(collections.documentation.records.length, 1)
  assert.equal(collections.commits.records.length, 1)
  assert.equal(collections.dependencies.records.length, 0)
  assert.equal(collections.repoFiles.records[0].repository_id, result.repositoryId)
})

test('updates existing repository and replaces child records on repeated scans', async () => {
  const collections = createCollections()
  const first = await persistRepositoryAnalysisWithCollections(createAnalysis(), collections)
  const second = await persistRepositoryAnalysisWithCollections(
    createAnalysis({
      files: [
        { path: 'src/index.js', name: 'index.js', extension: '.js', file_type: 'code', language: 'JavaScript', size: 20, depth: 2 },
      ],
      documentation: [],
      commits: [],
      dependencies: [{ source_file: 'src/index.js', target_file: 'express', dependency_type: 'package-import', import_path: 'express', resolved: false }],
    }),
    collections,
  )

  assert.equal(first.repositoryId, second.repositoryId)
  assert.equal(collections.repositories.records.length, 1)
  assert.equal(collections.repoFiles.records.length, 1)
  assert.equal(collections.repoFiles.records[0].file_path, 'src/index.js')
  assert.equal(collections.documentation.records.length, 0)
  assert.equal(collections.commits.records.length, 0)
  assert.equal(collections.dependencies.records.length, 1)
})

test('tracks the queued, running, and completed lifecycle on one durable repository record', async () => {
  const collections = createCollections()
  const queuedAt = new Date('2026-08-01T10:00:00.000Z')
  const startedAt = new Date('2026-08-01T10:00:01.000Z')
  const completedAt = new Date('2026-08-01T10:00:05.000Z')
  const input = {
    userId: 'user-1',
    scanId: 'scan-1',
    commitLimit: 100,
    repository: {
      name: 'demo',
      fullName: 'owner/demo',
      webUrl: 'https://github.com/owner/demo',
      cloneUrl: 'https://github.com/owner/demo.git',
    },
  }

  const queued = await queueRepositoryAnalysisWithCollection(
    input,
    collections.repositories,
    { now: queuedAt },
  )

  assert.equal(queued.status, 'queued')
  assert.equal(queued.shouldStart, true)
  assert.equal(collections.repositories.records.length, 1)
  assert.equal(collections.repositories.records[0].user_id, 'user-1')
  assert.equal(collections.repositories.records[0].queued_at, queuedAt)

  const wrongOwnerClaim = await markRepositoryAnalysisRunningWithCollection(
    { repositoryId: queued.repositoryId, userId: 'user-2', scanId: 'scan-1' },
    collections.repositories,
    { now: startedAt },
  )
  assert.equal(wrongOwnerClaim, false)

  const claimed = await markRepositoryAnalysisRunningWithCollection(
    { repositoryId: queued.repositoryId, userId: 'user-1', scanId: 'scan-1' },
    collections.repositories,
    { now: startedAt },
  )
  assert.equal(claimed, true)
  assert.equal(collections.repositories.records[0].status, 'running')
  assert.equal(collections.repositories.records[0].started_at, startedAt)

  await persistRepositoryAnalysisWithCollections(createAnalysis(), collections, {
    repositoryId: queued.repositoryId,
    scanId: 'scan-1',
    status: 'running',
  })
  assert.equal(collections.repositories.records[0].status, 'running')

  const completed = await markRepositoryAnalysisCompletedWithCollection(
    { repositoryId: queued.repositoryId, userId: 'user-1', scanId: 'scan-1' },
    collections.repositories,
    { now: completedAt },
  )
  assert.equal(completed, true)
  assert.equal(collections.repositories.records[0].status, 'completed')
  assert.equal(collections.repositories.records[0].completed_at, completedAt)
  assert.equal(collections.repositories.records[0].error, null)
})

test('keeps active scans idempotent and scopes re-scans to the repository owner', async () => {
  const collections = createCollections()
  const repository = {
    name: 'demo',
    fullName: 'owner/demo',
    webUrl: 'https://github.com/owner/demo',
    cloneUrl: 'https://github.com/owner/demo.git',
  }
  const first = await queueRepositoryAnalysisWithCollection(
    { userId: 'user-1', scanId: 'scan-1', commitLimit: 100, repository },
    collections.repositories,
  )
  const duplicate = await queueRepositoryAnalysisWithCollection(
    { userId: 'user-1', scanId: 'scan-2', commitLimit: 50, repository },
    collections.repositories,
  )

  assert.equal(duplicate.repositoryId, first.repositoryId)
  assert.equal(duplicate.scanId, 'scan-1')
  assert.equal(duplicate.shouldStart, false)
  assert.equal(collections.repositories.records.length, 1)

  await markRepositoryAnalysisRunningWithCollection(
    { repositoryId: first.repositoryId, userId: 'user-1', scanId: 'scan-1' },
    collections.repositories,
  )
  await markRepositoryAnalysisCompletedWithCollection(
    { repositoryId: first.repositoryId, userId: 'user-1', scanId: 'scan-1' },
    collections.repositories,
  )

  const rescanned = await queueRepositoryAnalysisWithCollection(
    { userId: 'user-1', scanId: 'scan-3', commitLimit: 25, repository },
    collections.repositories,
  )
  const otherOwner = await queueRepositoryAnalysisWithCollection(
    { userId: 'user-2', scanId: 'scan-4', commitLimit: 25, repository },
    collections.repositories,
  )

  assert.equal(rescanned.repositoryId, first.repositoryId)
  assert.equal(collections.repositories.records.find(record => record._id === first.repositoryId).user_id, 'user-1')
  assert.notEqual(otherOwner.repositoryId, first.repositoryId)
  assert.equal(collections.repositories.records.length, 2)
})

test('records a safe failed state only for the active owner scan token', async () => {
  const collections = createCollections()
  const failedAt = new Date('2026-08-01T10:00:05.000Z')
  const queued = await queueRepositoryAnalysisWithCollection(
    {
      userId: 'user-1',
      scanId: 'scan-1',
      commitLimit: 100,
      repository: {
        name: 'demo',
        fullName: 'owner/demo',
        webUrl: 'https://github.com/owner/demo',
        cloneUrl: 'https://github.com/owner/demo.git',
      },
    },
    collections.repositories,
  )

  const staleFailure = await markRepositoryAnalysisFailedWithCollection(
    { repositoryId: queued.repositoryId, userId: 'user-1', scanId: 'stale-scan', error: 'stale' },
    collections.repositories,
    { now: failedAt },
  )
  assert.equal(staleFailure, false)

  const failed = await markRepositoryAnalysisFailedWithCollection(
    { repositoryId: queued.repositoryId, userId: 'user-1', scanId: 'scan-1', error: 'Repository was not found.' },
    collections.repositories,
    { now: failedAt },
  )
  assert.equal(failed, true)
  assert.equal(collections.repositories.records[0].status, 'failed')
  assert.equal(collections.repositories.records[0].error, 'Repository was not found.')
  assert.equal(collections.repositories.records[0].failed_at, failedAt)
})

