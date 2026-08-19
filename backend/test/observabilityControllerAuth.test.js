import test from 'node:test'
import assert from 'node:assert/strict'

// METRICS_TOKEN is a module-level constant in config/index.js, read once at
// import time. It must be set before that module (or anything importing it)
// is first evaluated, so this file avoids any static import of the
// controller and imports it dynamically after setting the env var — the
// same pattern used in aiExplainabilityGemmaClient.test.js.
process.env.METRICS_TOKEN = 'secret-token'

const { createObservabilityController } = await import('../src/features/observability/controller.js')

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this },
    set() { return this },
    json(payload) { this.body = payload; return this },
    send(payload) { this.body = payload; return this },
  }
}

function createDeps() {
  return {
    getAnalysisQueueSnapshot: () => ({ activeWorkers: 0, pendingJobs: 0, scheduledJobs: 0 }),
    getRepositoriesCollection: async () => ({ async estimatedDocumentCount() { return 0 } }),
    getUsersCollection: async () => ({ async estimatedDocumentCount() { return 0 } }),
    getReportsCollection: async () => ({ async estimatedDocumentCount() { return 0 } }),
  }
}

test('getMetrics rejects requests without a matching METRICS_TOKEN', async () => {
  const { getMetrics } = createObservabilityController(createDeps())

  const missing = createResponse()
  await getMetrics({ headers: {} }, missing, () => assert.fail('next should not be called'))
  assert.equal(missing.statusCode, 401)

  const wrong = createResponse()
  await getMetrics({ headers: { authorization: 'Bearer nope' } }, wrong, () => assert.fail('next should not be called'))
  assert.equal(wrong.statusCode, 401)
})

test('getMetrics accepts a matching bearer token or x-metrics-token header', async () => {
  const { getMetrics } = createObservabilityController(createDeps())

  const bearer = createResponse()
  await getMetrics({ headers: { authorization: 'Bearer secret-token' } }, bearer, () => assert.fail('next should not be called'))
  assert.equal(bearer.statusCode, 200)

  const headerToken = createResponse()
  await getMetrics({ headers: { 'x-metrics-token': 'secret-token' } }, headerToken, () => assert.fail('next should not be called'))
  assert.equal(headerToken.statusCode, 200)
})
