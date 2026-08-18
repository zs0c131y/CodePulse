import test from 'node:test'
import assert from 'node:assert/strict'
import { createAnalysisController } from '../src/features/analysis/controller.js'

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

test('score reads reject malformed and unowned repository ids before accessing score data', async () => {
  const { getRepositoryScores } = createAnalysisController({
    async findRepositoryForUser() { return null },
  })

  const malformedResponse = createResponse()
  await getRepositoryScores(
    { ...ownedRequest, params: { repositoryId: 'invalid' } },
    malformedResponse,
    () => assert.fail('next should not be called'),
  )
  assert.equal(malformedResponse.statusCode, 400)

  const unownedResponse = createResponse()
  await getRepositoryScores(ownedRequest, unownedResponse, () => assert.fail('next should not be called'))
  assert.equal(unownedResponse.statusCode, 404)
})

test('score and debt reads return the frontend contracts for an owned repository', async () => {
  const deps = {
    async findRepositoryForUser() { return { _id: 'repo-1' } },
    async getRepositoryScore() { return { _id: 'score-1' } },
    async getRepositoryTechnicalDebt() { return { score: { _id: 'score-1' }, metrics: [{ file_path: 'src/app.js' }] } },
    serializeAnalysisScores(score) { return { healthScore: 70, source: score._id } },
    serializeTechnicalDebt(score, metrics) { return { metrics: { technicalDebtScore: 30 }, modules: metrics.map(metric => ({ path: metric.file_path })), source: score._id } },
  }
  const { getRepositoryScores, getRepositoryDebt } = createAnalysisController(deps)

  const scoresResponse = createResponse()
  await getRepositoryScores(ownedRequest, scoresResponse, () => assert.fail('next should not be called'))
  assert.deepEqual(scoresResponse.body, { scores: { healthScore: 70, source: 'score-1' } })

  const debtResponse = createResponse()
  await getRepositoryDebt(ownedRequest, debtResponse, () => assert.fail('next should not be called'))
  assert.deepEqual(debtResponse.body, {
    metrics: { technicalDebtScore: 30 },
    modules: [{ path: 'src/app.js' }],
    source: 'score-1',
  })
})

test('debt reads return 404 when an owned repository has not been scored', async () => {
  const { getRepositoryDebt } = createAnalysisController({
    async findRepositoryForUser() { return { _id: 'repo-1' } },
    async getRepositoryTechnicalDebt() { return { score: null, metrics: [] } },
  })
  const response = createResponse()

  await getRepositoryDebt(ownedRequest, response, () => assert.fail('next should not be called'))

  assert.equal(response.statusCode, 404)
})

test('status, drift, and recommendation reads return stored analysis for an owned repository', async () => {
  const deps = {
    async findRepositoryForUser() {
      return { _id: 'repo-1', status: 'completed', updated_at: '2026-07-28T00:00:00.000Z' }
    },
    async getRepositoryKnowledgeDrift() {
      return { score: { _id: 'score-1' }, findings: [{ finding_key: 'drift-1' }] }
    },
    async getRepositoryScore() { return { _id: 'score-1' } },
    async getRepositoryRecommendations() { return [{ recommendation_key: 'recommendation-1' }] },
    serializeKnowledgeDrift() { return { findings: [{ id: 'drift-1' }], coverage: [] } },
    serializeRecommendations() { return [{ id: 'recommendation-1' }] },
  }
  const controller = createAnalysisController(deps)

  const statusResponse = createResponse()
  await controller.getRepositoryStatus(ownedRequest, statusResponse, () => assert.fail('next should not be called'))
  assert.equal(statusResponse.body.status, 'completed')

  const driftResponse = createResponse()
  await controller.getRepositoryDrift(ownedRequest, driftResponse, () => assert.fail('next should not be called'))
  assert.deepEqual(driftResponse.body, { findings: [{ id: 'drift-1' }], coverage: [] })

  const recommendationResponse = createResponse()
  await controller.getRepositoryRecommendationList(ownedRequest, recommendationResponse, () => assert.fail('next should not be called'))
  assert.deepEqual(recommendationResponse.body, { recommendations: [{ id: 'recommendation-1' }] })
})

test('knowledge debt and semantic review endpoints return only owned persisted findings', async () => {
  const deps = {
    async findRepositoryForUser() { return { _id: 'repo-1' } },
    async getRepositoryKnowledgeDebt() { return { score: { _id: 'score-1' }, metrics: [{ module_path: 'src/auth' }] } },
    serializeKnowledgeDebt() { return { metrics: { knowledgeDebtScore: 42 }, modules: [] } },
    async updateRepositoryDriftReview() { return { _id: 'semantic-1', review_status: 'confirmed', reviewed_at: '2026-08-01T00:00:00.000Z' } },
  }
  const controller = createAnalysisController(deps)

  const debtResponse = createResponse()
  await controller.getRepositoryKnowledgeDebtReport(ownedRequest, debtResponse, () => assert.fail('next should not be called'))
  assert.equal(debtResponse.body.metrics.knowledgeDebtScore, 42)

  const reviewResponse = createResponse()
  await controller.reviewRepositoryDriftFinding({
    ...ownedRequest,
    params: { ...ownedRequest.params, findingId: '507f1f77bcf86cd799439012' },
    body: { reviewStatus: 'confirmed' },
  }, reviewResponse, () => assert.fail('next should not be called'))
  assert.equal(reviewResponse.body.finding.reviewStatus, 'confirmed')
})
