import test from 'node:test'
import assert from 'node:assert/strict'
import {
  listRepositoriesForUserWithCollections,
  findRepositoryForUserWithCollections,
  deleteRepositoryForUserWithCollections,
} from '../src/features/repositories/services/repositoryQueriesCore.js'

class FakeCollection {
  constructor(records = []) {
    this.records = records
    this.nextId = records.length + 1
  }

  matches(record, filter) {
    return Object.entries(filter).every(([key, value]) => record[key] === value)
  }

  find(filter) {
    const records = this.records.filter(record => this.matches(record, filter))
    return { toArray: async () => records }
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

test('deleteRepositoryForUserWithCollections cascades child records and reports not-found', async () => {
  const collections = createCollections()
  collections.repoFiles.records.push({ repository_id: 'repo-1', file_path: 'a.js' })
  collections.commits.records.push({ repository_id: 'repo-1', commit_hash: 'abc' })
  collections.dependencies.records.push({ repository_id: 'repo-1', source_file: 'a.js', target_file: 'b.js' })
  collections.documentation.records.push({ repository_id: 'repo-1', doc_path: 'README.md' })

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

  const deletedAgain = await deleteRepositoryForUserWithCollections('user-1', 'repo-1', collections)
  assert.equal(deletedAgain, false)
})
