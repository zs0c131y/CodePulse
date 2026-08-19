import test from 'node:test'
import assert from 'node:assert/strict'
import { createAiController } from '../src/features/analysis/aiController.js'
import { AiProviderError } from '../src/features/analysis/services/aiExplainabilityService.js'

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

const ownedRequest = {
  user: { _id: 'user-1' },
  params: { repositoryId: '507f1f77bcf86cd799439011' },
}

function createService(overrides = {}) {
  return {
    isAiExplainabilityConfigured: () => true,
    async generateRiskExplanation() { return { kind: 'generated', explanation: { id: 'exp-1' } } },
    async generateExecutiveSummary() { return { kind: 'generated', explanation: { id: 'exp-2' } } },
    async getRiskExplanation() { return { id: 'exp-1' } },
    async getExecutiveSummary() { return { id: 'exp-2' } },
    ...overrides,
  }
}

function createDeps(overrides = {}) {
  return {
    async findRepositoryForUser() { return { _id: 'repo-1', repo_name: 'demo' } },
    ...overrides,
  }
}

test('AI routes reject malformed and unowned repository ids', async () => {
  const { getAiStatus, postRiskExplanation } = createAiController(createService(), createDeps({
    async findRepositoryForUser() { return null },
  }))

  const malformed = createResponse()
  await postRiskExplanation(
    { ...ownedRequest, params: { repositoryId: 'invalid' }, body: { modulePath: 'src/app.js' } },
    malformed,
    () => assert.fail('next should not be called'),
  )
  assert.equal(malformed.statusCode, 400)

  const unowned = createResponse()
  await postRiskExplanation(
    { ...ownedRequest, body: { modulePath: 'src/app.js' } },
    unowned,
    () => assert.fail('next should not be called'),
  )
  assert.equal(unowned.statusCode, 404)

  const statusResponse = createResponse()
  await getAiStatus(ownedRequest, statusResponse, () => assert.fail('next should not be called'))
  assert.deepEqual(statusResponse.body, { configured: true })
})

test('postRiskExplanation validates modulePath and maps service outcomes to status codes', async () => {
  const { postRiskExplanation } = createAiController(createService(), createDeps())

  const missingModule = createResponse()
  await postRiskExplanation({ ...ownedRequest, body: {} }, missingModule, () => assert.fail())
  assert.equal(missingModule.statusCode, 400)

  const notConfigured = createResponse()
  const disabledController = createAiController(
    createService({ async generateRiskExplanation() { return { kind: 'not-configured' } } }),
    createDeps(),
  )
  await disabledController.postRiskExplanation({ ...ownedRequest, body: { modulePath: 'src/app.js' } }, notConfigured, () => assert.fail())
  assert.equal(notConfigured.statusCode, 503)

  const moduleNotFound = createResponse()
  const missingModuleController = createAiController(
    createService({ async generateRiskExplanation() { return { kind: 'module-not-found' } } }),
    createDeps(),
  )
  await missingModuleController.postRiskExplanation({ ...ownedRequest, body: { modulePath: 'src/ghost.js' } }, moduleNotFound, () => assert.fail())
  assert.equal(moduleNotFound.statusCode, 404)

  const success = createResponse()
  await postRiskExplanation({ ...ownedRequest, body: { modulePath: 'src/app.js' } }, success, () => assert.fail())
  assert.equal(success.statusCode, 201)
  assert.deepEqual(success.body, { explanation: { id: 'exp-1' } })
})

test('postRiskExplanation returns 502 when the provider fails instead of a generic 500', async () => {
  const controller = createAiController(
    createService({ async generateRiskExplanation() { throw new AiProviderError('provider down') } }),
    createDeps(),
  )
  const response = createResponse()
  await controller.postRiskExplanation(
    { ...ownedRequest, body: { modulePath: 'src/app.js' } },
    response,
    () => assert.fail('next should not be called for provider errors'),
  )
  assert.equal(response.statusCode, 502)
  assert.equal(response.body.message, 'provider down')
})

test('getRiskExplanation requires modulePath and returns 404 when nothing was generated', async () => {
  const controller = createAiController(
    createService({ async getRiskExplanation() { return null } }),
    createDeps(),
  )

  const missingQuery = createResponse()
  await controller.getRiskExplanation({ ...ownedRequest, query: {} }, missingQuery, () => assert.fail())
  assert.equal(missingQuery.statusCode, 400)

  const notFound = createResponse()
  await controller.getRiskExplanation({ ...ownedRequest, query: { modulePath: 'src/app.js' } }, notFound, () => assert.fail())
  assert.equal(notFound.statusCode, 404)
})

test('executive summary routes map service outcomes to status codes', async () => {
  const { postExecutiveSummary, getExecutiveSummary } = createAiController(createService(), createDeps())

  const created = createResponse()
  await postExecutiveSummary({ ...ownedRequest, body: {} }, created, () => assert.fail())
  assert.equal(created.statusCode, 201)
  assert.deepEqual(created.body, { explanation: { id: 'exp-2' } })

  const unavailableController = createAiController(
    createService({ async generateExecutiveSummary() { return { kind: 'analysis-unavailable' } } }),
    createDeps(),
  )
  const unavailable = createResponse()
  await unavailableController.postExecutiveSummary({ ...ownedRequest, body: {} }, unavailable, () => assert.fail())
  assert.equal(unavailable.statusCode, 409)

  const fetched = createResponse()
  await getExecutiveSummary({ ...ownedRequest, query: {} }, fetched, () => assert.fail())
  assert.deepEqual(fetched.body, { explanation: { id: 'exp-2' } })
})
