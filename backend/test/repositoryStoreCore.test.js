import test from 'node:test'
import assert from 'node:assert/strict'
import { persistRepositoryAnalysisWithCollections } from '../src/features/repositories/services/repositoryStoreCore.js'

class FakeCollection {
  constructor() {
    this.records = []
    this.nextId = 1
  }

  matches(record, filter) {
    return Object.entries(filter).every(([key, value]) => record[key] === value)
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

