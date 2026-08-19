import test from 'node:test'
import assert from 'node:assert/strict'
import { createReportsController } from '../src/features/reports/controller.js'

const repositoryId = '507f1f77bcf86cd799439011'
const reportId = '507f191e810c19729de860ea'
const shareToken = Buffer.alloc(32, 9).toString('base64url')

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code
      return this
    },
    set(name, value) {
      this.headers[name] = value
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
}

const ownerRequest = {
  user: { _id: 'user-1' },
  params: { repositoryId },
  query: {},
}

test('createRepositoryReport validates ids and maps report service outcomes', async () => {
  const invalidResponse = createResponse()
  const invalidController = createReportsController({})
  await invalidController.createRepositoryReport(
    { ...ownerRequest, params: { repositoryId: 'invalid' } },
    invalidResponse,
    () => assert.fail('next should not be called'),
  )
  assert.equal(invalidResponse.statusCode, 400)

  const unavailableResponse = createResponse()
  const unavailableController = createReportsController({
    async createRepositoryReport() { return { kind: 'analysis-unavailable' } },
  })
  await unavailableController.createRepositoryReport(
    ownerRequest,
    unavailableResponse,
    () => assert.fail('next should not be called'),
  )
  assert.equal(unavailableResponse.statusCode, 409)

  const createdResponse = createResponse()
  const createdController = createReportsController({
    async createRepositoryReport() { return { kind: 'created', report: { id: reportId } } },
  })
  await createdController.createRepositoryReport(
    ownerRequest,
    createdResponse,
    () => assert.fail('next should not be called'),
  )
  assert.equal(createdResponse.statusCode, 201)
  assert.deepEqual(createdResponse.body, { report: { id: reportId } })
  assert.equal(createdResponse.headers['Cache-Control'], 'no-store')
})

test('private report reads remain scoped to the signed-in owner', async () => {
  let receivedOwner
  const controller = createReportsController({
    async getReportForOwner(ownerId) {
      receivedOwner = ownerId
      return null
    },
  })
  const response = createResponse()

  await controller.getReport(
    { user: { _id: 'user-1' }, params: { reportId } },
    response,
    () => assert.fail('next should not be called'),
  )

  assert.equal(receivedOwner, 'user-1')
  assert.equal(response.statusCode, 404)
})

test('report listing preserves the bounded pagination contract', async () => {
  let received
  const controller = createReportsController({
    async listReportsForOwner(ownerId, repositoryId, options) {
      received = { ownerId, repositoryId, options }
      return { reports: [{ id: reportId }], total: 3, limit: 1, skip: 1 }
    },
  })
  const response = createResponse()

  await controller.listReports(
    {
      user: { _id: 'user-1' },
      query: { repositoryId, limit: '1', skip: '1' },
    },
    response,
    () => assert.fail('next should not be called'),
  )

  assert.equal(received.ownerId, 'user-1')
  assert.equal(received.repositoryId.toString(), repositoryId)
  assert.deepEqual(received.options, { limit: '1', skip: '1' })
  assert.deepEqual(response.body, {
    reports: [{ id: reportId }],
    total: 3,
    limit: 1,
    skip: 1,
  })
})

test('share creation returns a one-time opaque token response and supports public reads', async () => {
  const report = { id: reportId, sharing: { enabled: true } }
  const controller = createReportsController({
    async enableReportSharing() {
      return { report, share: { token: shareToken, path: `/api/reports/shared/${shareToken}` } }
    },
    async getReportByShareToken(token) {
      assert.equal(token, shareToken)
      return report
    },
  })

  const shareResponse = createResponse()
  await controller.shareReport(
    { user: { _id: 'user-1' }, params: { reportId } },
    shareResponse,
    () => assert.fail('next should not be called'),
  )
  assert.equal(shareResponse.body.share.token, shareToken)
  assert.equal(shareResponse.headers['Cache-Control'], 'no-store')

  const publicResponse = createResponse()
  await controller.getSharedReport(
    { params: { shareToken } },
    publicResponse,
    () => assert.fail('next should not be called'),
  )
  assert.deepEqual(publicResponse.body, { report })
  assert.equal(publicResponse.headers['Cache-Control'], 'no-store')
})

test('malformed public share tokens are indistinguishable from missing shares', async () => {
  let queried = false
  const controller = createReportsController({
    async getReportByShareToken() {
      queried = true
      return null
    },
  })
  const response = createResponse()

  await controller.getSharedReport(
    { params: { shareToken: 'not-a-token' } },
    response,
    () => assert.fail('next should not be called'),
  )

  assert.equal(response.statusCode, 404)
  assert.equal(queried, false)
})
