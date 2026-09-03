import test from 'node:test'
import assert from 'node:assert/strict'
import {
  listRepositoriesForUserWithCollections,
  findRepositoryForUserWithCollections,
  deleteRepositoryForUserWithCollections,
  setRepositoryScanScheduleWithCollections,
  listRepoFilesWithCollections,
  listCommitsForRepositoryWithCollections,
  listAllCommitsForRepositoryWithCollections,
  listDependenciesForRepositoryWithCollections,
  listDocumentationForRepositoryWithCollections,
  normalizeRepositoryTreePath,
  getRepositoryTreeWithCollections,
  getCodeAnalysisWithCollections,
  getDocumentationAnalysisWithCollections,
} from '../src/features/repositories/services/repositoryQueriesCore.js'

class FakeCollection {
  constructor(records = []) {
    this.records = records
    this.nextId = records.length + 1
  }

  matches(record, filter) {
    return Object.entries(filter).every(([key, value]) => {
      if (value && typeof value === 'object' && '$nin' in value) return !value.$nin.includes(record[key])
      return record[key] === value
    })
  }

  find(filter) {
    const records = this.records.filter(record => this.matches(record, filter))
    const state = { records: [...records], skip: 0, limit: null }
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
      skip(value) {
        state.skip = value
        return cursor
      },
      limit(value) {
        state.limit = value
        return cursor
      },
      async toArray() {
        const end = state.limit === null ? undefined : state.skip + state.limit
        return state.records.slice(state.skip, end)
      },
    }
    return cursor
  }

  async countDocuments(filter) {
    return this.records.filter(record => this.matches(record, filter)).length
  }

  async findOne(filter) {
    return this.records.find(record => this.matches(record, filter)) || null
  }

  async insertOne(record) {
    const inserted = { _id: `fake-${this.nextId++}`, ...record }
    this.records.push(inserted)
    return { insertedId: inserted._id }
  }

  async deleteOne(filter) {
    const before = this.records.length
    this.records = this.records.filter(record => !this.matches(record, filter))
    return { deletedCount: before - this.records.length }
  }

  async updateOne(filter, update) {
    const record = this.records.find(item => this.matches(item, filter))
    if (record && update.$set) Object.assign(record, update.$set)
    return { matchedCount: record ? 1 : 0 }
  }

  async deleteMany(filter) {
    const before = this.records.length
    this.records = this.records.filter(record => !this.matches(record, filter))
    return { deletedCount: before - this.records.length }
  }
}

function createCollections() {
  return {
    repositories: new FakeCollection([
      {
        _id: 'repo-1',
        user_id: 'user-1',
        repo_name: 'alpha',
        repo_full_name: 'owner/alpha',
        repo_url: 'https://github.com/owner/alpha',
        default_branch: 'main',
        status: 'completed',
        total_files: 10,
        total_commits: 5,
        total_dependencies: 2,
        total_documentation: 1,
        created_at: new Date('2026-07-01T00:00:00.000Z'),
        updated_at: new Date('2026-07-10T00:00:00.000Z'),
      },
      {
        _id: 'repo-2',
        user_id: 'user-1',
        repo_name: 'beta',
        repo_full_name: 'owner/beta',
        repo_url: 'https://github.com/owner/beta',
        default_branch: 'main',
        status: 'completed',
        total_files: 3,
        total_commits: 1,
        total_dependencies: 0,
        total_documentation: 0,
        created_at: new Date('2026-07-02T00:00:00.000Z'),
        updated_at: new Date('2026-07-20T00:00:00.000Z'),
      },
      {
        _id: 'repo-3',
        user_id: 'user-2',
        repo_name: 'gamma',
        repo_full_name: 'owner/gamma',
        repo_url: 'https://github.com/owner/gamma',
        default_branch: 'main',
        status: 'completed',
        total_files: 1,
        total_commits: 1,
        total_dependencies: 0,
        total_documentation: 0,
        created_at: new Date('2026-07-03T00:00:00.000Z'),
        updated_at: new Date('2026-07-03T00:00:00.000Z'),
      },
    ]),
    repoFiles: new FakeCollection(),
    commits: new FakeCollection(),
    dependencies: new FakeCollection(),
    documentation: new FakeCollection(),
    repositoryScores: new FakeCollection(),
    technicalDebtMetrics: new FakeCollection(),
    knowledgeDebtMetrics: new FakeCollection(),
    driftFindings: new FakeCollection(),
    recommendations: new FakeCollection(),
  }
}

test('listRepositoriesForUserWithCollections only returns the owner repositories, newest first', async () => {
  const collections = createCollections()
  const repositories = await listRepositoriesForUserWithCollections('user-1', collections)

  assert.deepEqual(repositories.map(repo => repo.id), ['repo-2', 'repo-1'])
  assert.equal(repositories[0].fullName, 'owner/beta')
  assert.equal(repositories[0].status, 'completed')
})

test('findRepositoryForUserWithCollections enforces ownership', async () => {
  const collections = createCollections()

  const owned = await findRepositoryForUserWithCollections('user-1', 'repo-1', collections)
  assert.equal(owned.repo_name, 'alpha')

  const notOwned = await findRepositoryForUserWithCollections('user-2', 'repo-1', collections)
  assert.equal(notOwned, null)
})

test('setRepositoryScanScheduleWithCollections sets and clears a recurring schedule, and enforces ownership', async () => {
  const collections = createCollections()
  const now = new Date('2026-08-19T12:00:00.000Z')

  const notOwned = await setRepositoryScanScheduleWithCollections('user-2', 'repo-1', 24, collections, { now })
  assert.equal(notOwned, null)

  const scheduled = await setRepositoryScanScheduleWithCollections('user-1', 'repo-1', 24, collections, { now })
  assert.equal(scheduled.scanIntervalHours, 24)
  assert.equal(scheduled.nextScanAt, '2026-08-20T12:00:00.000Z')
  const stored = collections.repositories.records.find(record => record._id === 'repo-1')
  assert.equal(stored.scan_interval_hours, 24)
  assert.equal(stored.next_scan_at.toISOString(), '2026-08-20T12:00:00.000Z')

  const cleared = await setRepositoryScanScheduleWithCollections('user-1', 'repo-1', null, collections, { now })
  assert.equal(cleared.scanIntervalHours, null)
  assert.equal(cleared.nextScanAt, null)
  assert.equal(stored.scan_interval_hours, null)
  assert.equal(stored.next_scan_at, null)
})

test('setRepositoryScanScheduleWithCollections stores GitHub push mode without a next scan time', async () => {
  const collections = createCollections()
  const now = new Date('2026-08-19T12:00:00.000Z')

  const scheduled = await setRepositoryScanScheduleWithCollections(
    'user-1',
    'repo-1',
    null,
    collections,
    { now, trigger: 'github_push', githubWebhookId: 12345 },
  )

  assert.equal(scheduled.scanTrigger, 'github_push')
  assert.equal(scheduled.scanIntervalHours, null)
  assert.equal(scheduled.nextScanAt, null)
  const stored = collections.repositories.records.find(record => record._id === 'repo-1')
  assert.equal(stored.scan_trigger, 'github_push')
  assert.equal(stored.github_webhook_id, 12345)
})

test('deleteRepositoryForUserWithCollections cascades child records and reports not-found', async () => {
  const collections = createCollections()
  collections.repoFiles.records.push({ repository_id: 'repo-1', file_path: 'a.js' })
  collections.commits.records.push({ repository_id: 'repo-1', commit_hash: 'abc' })
  collections.dependencies.records.push({ repository_id: 'repo-1', source_file: 'a.js', target_file: 'b.js' })
  collections.documentation.records.push({ repository_id: 'repo-1', doc_path: 'README.md' })
  collections.repositoryScores.records.push({ repository_id: 'repo-1', health_score: 80 })
  collections.technicalDebtMetrics.records.push({ repository_id: 'repo-1', file_path: 'a.js' })
  collections.knowledgeDebtMetrics.records.push({ repository_id: 'repo-1', module_path: 'src' })
  collections.driftFindings.records.push({ repository_id: 'repo-1', finding_key: 'missing:src' })
  collections.recommendations.records.push({ repository_id: 'repo-1', recommendation_key: 'document:src' })

  const deletedForWrongUser = await deleteRepositoryForUserWithCollections('user-2', 'repo-1', collections)
  assert.equal(deletedForWrongUser, false)
  assert.equal(collections.repositories.records.length, 3)

  const deleted = await deleteRepositoryForUserWithCollections('user-1', 'repo-1', collections)
  assert.equal(deleted, true)
  assert.equal(collections.repositories.records.some(repo => repo._id === 'repo-1'), false)
  assert.equal(collections.repoFiles.records.length, 0)
  assert.equal(collections.commits.records.length, 0)
  assert.equal(collections.dependencies.records.length, 0)
  assert.equal(collections.documentation.records.length, 0)
  assert.equal(collections.repositoryScores.records.length, 0)
  assert.equal(collections.technicalDebtMetrics.records.length, 0)
  assert.equal(collections.knowledgeDebtMetrics.records.length, 0)
  assert.equal(collections.driftFindings.records.length, 0)
  assert.equal(collections.recommendations.records.length, 0)

  const deletedAgain = await deleteRepositoryForUserWithCollections('user-1', 'repo-1', collections)
  assert.equal(deletedAgain, false)
})

test('deleteRepositoryForUserWithCollections refuses active lifecycle records', async () => {
  const collections = createCollections()
  collections.repositories.records[0].status = 'running'
  collections.repoFiles.records.push({ repository_id: 'repo-1', file_path: 'a.js' })

  const result = await deleteRepositoryForUserWithCollections('user-1', 'repo-1', collections)

  assert.equal(result, 'active')
  assert.equal(collections.repositories.records.some(record => record._id === 'repo-1'), true)
  assert.equal(collections.repoFiles.records.length, 1)
})

test('listRepoFilesWithCollections sorts by path and paginates', async () => {
  const collections = createCollections()
  collections.repoFiles.records.push(
    { repository_id: 'repo-1', file_path: 'src/b.js', file_name: 'b.js', extension: '.js', file_type: 'code', language: 'JavaScript', size: 10, depth: 2 },
    { repository_id: 'repo-1', file_path: 'src/a.js', file_name: 'a.js', extension: '.js', file_type: 'code', language: 'JavaScript', size: 5, depth: 2 },
    { repository_id: 'repo-1', file_path: 'README.md', file_name: 'README.md', extension: '.md', file_type: 'documentation', language: 'Markdown', size: 20, depth: 1 },
    { repository_id: 'repo-2', file_path: 'other.js', file_name: 'other.js', extension: '.js', file_type: 'code', language: 'JavaScript', size: 1, depth: 1 },
  )

  const page = await listRepoFilesWithCollections('repo-1', collections, { limit: 1, skip: 1 })

  assert.equal(page.total, 3)
  assert.equal(page.limit, 1)
  assert.equal(page.skip, 1)
  assert.deepEqual(page.items.map(file => file.path), ['src/a.js'])
  assert.equal(page.items[0].fileType, 'code')
})

test('normalizeRepositoryTreePath accepts stable relative paths only', () => {
  assert.equal(normalizeRepositoryTreePath(), '')
  assert.equal(normalizeRepositoryTreePath('.'), '')
  assert.equal(normalizeRepositoryTreePath('src\\components'), 'src/components')
  assert.equal(normalizeRepositoryTreePath('src//components'), null)
  assert.equal(normalizeRepositoryTreePath('../private'), null)
})

test('getRepositoryTreeWithCollections returns one normalized directory level', async () => {
  let pipeline
  const collections = {
    repoFiles: {
      aggregate(value) {
        pipeline = value
        return {
          async toArray() {
            return [
              { _id: 'components', is_directory: true },
              { _id: 'App.jsx', is_directory: false, file_name: 'App.jsx', extension: '.jsx', file_type: 'code', language: 'JavaScript', size: 1400, depth: 2 },
            ]
          },
        }
      },
    },
  }

  const tree = await getRepositoryTreeWithCollections('repo-1', collections, 'src')

  assert.deepEqual(tree.entries, [
    { path: 'src/components', name: 'components', type: 'directory' },
    { path: 'src/App.jsx', name: 'App.jsx', type: 'file', extension: '.jsx', fileType: 'code', language: 'JavaScript', size: 1400, depth: 2 },
  ])
  assert.equal(tree.truncated, false)
  assert.equal(pipeline[0].$match.file_path.$gte, 'src/')
})

test('listCommitsForRepositoryWithCollections sorts newest first and paginates', async () => {
  const collections = createCollections()
  collections.commits.records.push(
    { repository_id: 'repo-1', commit_hash: 'a', author: 'Ada', author_email: 'ada@example.com', message: 'first', commit_date: '2026-07-01T00:00:00.000Z', changed_files: ['a.js'] },
    { repository_id: 'repo-1', commit_hash: 'b', author: 'Ada', author_email: 'ada@example.com', message: 'second', commit_date: '2026-07-10T00:00:00.000Z', changed_files: ['b.js'] },
  )

  const page = await listCommitsForRepositoryWithCollections('repo-1', collections)

  assert.equal(page.total, 2)
  assert.deepEqual(page.items.map(commit => commit.hash), ['b', 'a'])
  assert.equal(page.items[0].authorEmail, 'ada@example.com')

  const allCommits = await listAllCommitsForRepositoryWithCollections('repo-1', collections)
  assert.equal(allCommits.length, 2)
})

test('listDependenciesForRepositoryWithCollections and listDocumentationForRepositoryWithCollections serialize records', async () => {
  const collections = createCollections()
  collections.dependencies.records.push(
    { repository_id: 'repo-1', source_file: 'src/index.js', target_file: 'express', dependency_type: 'package-import', import_path: 'express', resolved: false },
  )
  collections.documentation.records.push(
    { repository_id: 'repo-1', doc_path: 'README.md', file_name: 'README.md', documentation_type: 'readme', content_summary: 'Demo', content: '# Demo', size: 10, truncated: false },
  )

  const dependencyPage = await listDependenciesForRepositoryWithCollections('repo-1', collections)
  assert.equal(dependencyPage.items[0].sourceFile, 'src/index.js')
  assert.equal(dependencyPage.items[0].resolved, false)

  const documentationPage = await listDocumentationForRepositoryWithCollections('repo-1', collections)
  assert.equal(documentationPage.items[0].path, 'README.md')
  assert.equal(documentationPage.items[0].content, '# Demo')
})

test('structured code and documentation analysis aggregate persisted scan facts', async () => {
  const collections = createCollections()
  collections.repoFiles.records.push(
    { repository_id: 'repo-1', file_path: 'src/app.js', file_name: 'app.js', extension: '.js', file_type: 'code', language: 'JavaScript', size: 10, depth: 2 },
    { repository_id: 'repo-1', file_path: 'src/app.test.js', file_name: 'app.test.js', extension: '.js', file_type: 'test', language: 'JavaScript', size: 10, depth: 2 },
  )
  collections.dependencies.records.push(
    { repository_id: 'repo-1', source_file: 'src/app.js', target_file: 'src/lib.js', dependency_type: 'import', import_path: './lib.js', resolved: true },
  )
  collections.documentation.records.push(
    { repository_id: 'repo-1', doc_path: 'README.md', file_name: 'README.md', documentation_type: 'readme', content_summary: 'Demo', content: '# Demo', size: 10, truncated: false },
  )

  const code = await getCodeAnalysisWithCollections('repo-1', collections, { limit: 10 })
  const documentation = await getDocumentationAnalysisWithCollections('repo-1', collections, { limit: 10 })

  assert.equal(code.summary.codeFiles, 1)
  assert.equal(code.summary.testFiles, 1)
  assert.equal(code.summary.dependencies.resolved, 1)
  assert.deepEqual(code.files.items.map(file => file.path), ['src/app.js'])
  assert.equal(documentation.summary.totalDocuments, 1)
  assert.equal(documentation.summary.types[0].label, 'readme')
  assert.equal(documentation.documents.items[0].path, 'README.md')
})
