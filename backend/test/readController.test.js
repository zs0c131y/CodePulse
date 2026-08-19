import test from 'node:test'
import assert from 'node:assert/strict'
import { createReadController } from '../src/features/repositories/readController.js'

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
}

test('listRepositories responds with the reader repositories for the signed-in user', async () => {
  let requestedUserId
  const deps = {
    async listRepositoriesForUser(userId) {
      requestedUserId = userId
      return [{ id: 'repo-1' }]
    },
  }
  const { listRepositories } = createReadController(deps)
  const request = { user: { _id: 'user-1' } }
  const response = createResponse()

  await listRepositories(request, response, () => assert.fail('next should not be called'))

  assert.equal(requestedUserId, 'user-1')
  assert.deepEqual(response.body, { repositories: [{ id: 'repo-1' }] })
})

test('getRepository returns 400 for a malformed repository id', async () => {
  const { getRepository } = createReadController({})
  const request = { user: { _id: 'user-1' }, params: { repositoryId: 'not-an-object-id' } }
  const response = createResponse()

  await getRepository(request, response, () => assert.fail('next should not be called'))

  assert.equal(response.statusCode, 400)
})

test('getRepository returns 404 when the repository is missing or not owned', async () => {
  const deps = { async findRepositoryForUser() { return null } }
  const { getRepository } = createReadController(deps)
  const request = { user: { _id: 'user-1' }, params: { repositoryId: '507f1f77bcf86cd799439011' } }
  const response = createResponse()

  await getRepository(request, response, () => assert.fail('next should not be called'))

  assert.equal(response.statusCode, 404)
})

test('getRepository serializes the owned repository', async () => {
  const deps = {
    async findRepositoryForUser() { return { _id: 'repo-1' } },
    serializeRepository(repository) { return { id: repository._id, serialized: true } },
  }
  const { getRepository } = createReadController(deps)
  const request = { user: { _id: 'user-1' }, params: { repositoryId: '507f1f77bcf86cd799439011' } }
  const response = createResponse()

  await getRepository(request, response, () => assert.fail('next should not be called'))

  assert.deepEqual(response.body, { repository: { id: 'repo-1', serialized: true } })
})

test('deleteRepository returns 404 when nothing was deleted, 200 message otherwise', async () => {
  const deps = { async deleteRepositoryForUser(_userId, repositoryId) { return repositoryId === 'delete-me' } }
  const { deleteRepository } = createReadController(deps)

  const missingResponse = createResponse()
  await deleteRepository(
    { user: { _id: 'user-1' }, params: { repositoryId: '507f1f77bcf86cd799439011' } },
    missingResponse,
    () => assert.fail('next should not be called'),
  )
  assert.equal(missingResponse.statusCode, 404)

  deps.deleteRepositoryForUser = async () => true
  const okResponse = createResponse()
  await deleteRepository(
    { user: { _id: 'user-1' }, params: { repositoryId: '507f1f77bcf86cd799439011' } },
    okResponse,
    () => assert.fail('next should not be called'),
  )
  assert.deepEqual(okResponse.body, { message: 'Repository deleted.' })
})

test('deleteRepository returns 409 while a repository scan is active', async () => {
  const { deleteRepository } = createReadController({ async deleteRepositoryForUser() { return 'active' } })
  const response = createResponse()

  await deleteRepository(
    { user: { _id: 'user-1' }, params: { repositoryId: '507f1f77bcf86cd799439011' } },
    response,
    () => assert.fail('next should not be called'),
  )

  assert.equal(response.statusCode, 409)
})

test('getRepositoryFiles passes ownership check and pagination through to the reader', async () => {
  let receivedArgs
  const deps = {
    async findRepositoryForUser() { return { _id: 'repo-1' } },
    async listRepoFilesForRepository(repositoryId, options) {
      receivedArgs = { repositoryId, options }
      return { items: [], total: 0, limit: 50, skip: 0 }
    },
  }
  const { getRepositoryFiles } = createReadController(deps)
  const request = {
    user: { _id: 'user-1' },
    params: { repositoryId: '507f1f77bcf86cd799439011' },
    query: { limit: '10', skip: '5' },
  }
  const response = createResponse()

  await getRepositoryFiles(request, response, () => assert.fail('next should not be called'))

  assert.equal(receivedArgs.repositoryId, 'repo-1')
  assert.deepEqual(receivedArgs.options, { limit: '10', skip: '5' })
  assert.deepEqual(response.body, { items: [], total: 0, limit: 50, skip: 0 })
})

test('getRepositoryFiles returns 404 for a repository the user does not own', async () => {
  const deps = { async findRepositoryForUser() { return null } }
  const { getRepositoryFiles } = createReadController(deps)
  const request = { user: { _id: 'user-1' }, params: { repositoryId: '507f1f77bcf86cd799439011' }, query: {} }
  const response = createResponse()

  await getRepositoryFiles(request, response, () => assert.fail('next should not be called'))

  assert.equal(response.statusCode, 404)
})

test('getRepositoryCommits, getRepositoryDependencies, and getRepositoryDocumentation delegate to the matching reader function', async () => {
  const deps = {
    async findRepositoryForUser() { return { _id: 'repo-1' } },
    async listCommitsForRepository() { return { items: ['commit'] } },
    async listDependenciesForRepository() { return { items: ['dependency'] } },
    async listDocumentationForRepository() { return { items: ['doc'] } },
  }
  const { getRepositoryCommits, getRepositoryDependencies, getRepositoryDocumentation } = createReadController(deps)
  const request = { user: { _id: 'user-1' }, params: { repositoryId: '507f1f77bcf86cd799439011' }, query: {} }

  const commitsResponse = createResponse()
  await getRepositoryCommits(request, commitsResponse, () => assert.fail('next should not be called'))
  assert.deepEqual(commitsResponse.body, { items: ['commit'] })

  const dependenciesResponse = createResponse()
  await getRepositoryDependencies(request, dependenciesResponse, () => assert.fail('next should not be called'))
  assert.deepEqual(dependenciesResponse.body, { items: ['dependency'] })

  const documentationResponse = createResponse()
  await getRepositoryDocumentation(request, documentationResponse, () => assert.fail('next should not be called'))
  assert.deepEqual(documentationResponse.body, { items: ['doc'] })
})

test('structured analysis reads delegate only after ownership is confirmed', async () => {
  const deps = {
    async findRepositoryForUser() { return { _id: 'repo-1' } },
    async getCodeAnalysisForRepository() { return { summary: { codeFiles: 2 }, files: { items: [] }, dependencies: { items: [] } } },
    async getDocumentationAnalysisForRepository() { return { summary: { totalDocuments: 1 }, documents: { items: [] } } },
  }
  const { getRepositoryCodeAnalysis, getRepositoryDocumentationAnalysis } = createReadController(deps)
  const request = { user: { _id: 'user-1' }, params: { repositoryId: '507f1f77bcf86cd799439011' }, query: {} }

  const codeResponse = createResponse()
  await getRepositoryCodeAnalysis(request, codeResponse, () => assert.fail('next should not be called'))
  assert.equal(codeResponse.body.summary.codeFiles, 2)

  const documentationResponse = createResponse()
  await getRepositoryDocumentationAnalysis(request, documentationResponse, () => assert.fail('next should not be called'))
  assert.equal(documentationResponse.body.summary.totalDocuments, 1)
})

test('getRepositoryContributors aggregates commits fetched for the owned repository', async () => {
  const deps = {
    async findRepositoryForUser() { return { _id: 'repo-1' } },
    async listAllCommitsForRepository() {
      return [
        { author: 'Ada', author_email: 'ada@example.com', commit_date: '2026-07-01T00:00:00.000Z' },
        { author: 'Ada', author_email: 'ada@example.com', commit_date: '2026-07-02T00:00:00.000Z' },
      ]
    },
  }
  const { getRepositoryContributors } = createReadController(deps)
  const request = { user: { _id: 'user-1' }, params: { repositoryId: '507f1f77bcf86cd799439011' } }
  const response = createResponse()

  await getRepositoryContributors(request, response, () => assert.fail('next should not be called'))

  assert.equal(response.body.contributors.length, 1)
  assert.equal(response.body.contributors[0].commitCount, 2)
})

test('getRepositoryManifest fetches manifests using the owned repository full name and branch', async () => {
  let receivedArgs
  const deps = {
    async findRepositoryForUser() { return { _id: 'repo-1', repo_full_name: 'owner/demo', default_branch: 'main' } },
    async fetchRepositoryManifests(args) {
      receivedArgs = args
      return [{ path: 'package.json', type: 'npm', dependencies: [] }]
    },
  }
  const { getRepositoryManifest } = createReadController(deps)
  const request = { user: { _id: 'user-1' }, params: { repositoryId: '507f1f77bcf86cd799439011' } }
  const response = createResponse()

  await getRepositoryManifest(request, response, () => assert.fail('next should not be called'))

  assert.deepEqual(receivedArgs, { repoFullName: 'owner/demo', defaultBranch: 'main' })
  assert.deepEqual(response.body, { manifests: [{ path: 'package.json', type: 'npm', dependencies: [] }] })
})

test('getRepositoryManifest returns 404 for a repository the user does not own', async () => {
  const deps = { async findRepositoryForUser() { return null } }
  const { getRepositoryManifest } = createReadController(deps)
  const request = { user: { _id: 'user-1' }, params: { repositoryId: '507f1f77bcf86cd799439011' } }
  const response = createResponse()

  await getRepositoryManifest(request, response, () => assert.fail('next should not be called'))

  assert.equal(response.statusCode, 404)
})

test('controller handlers forward thrown errors to next()', async () => {
  const deps = {
    async listRepositoriesForUser() {
      throw new Error('boom')
    },
  }
  const { listRepositories } = createReadController(deps)
  const request = { user: { _id: 'user-1' } }
  const response = createResponse()

  let caughtError
  await listRepositories(request, response, error => {
    caughtError = error
  })

  assert.equal(caughtError.message, 'boom')
})
