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
