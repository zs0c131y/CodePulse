import test from 'node:test'
import assert from 'node:assert/strict'
import { createObservabilityController } from '../src/features/observability/controller.js'
import { renderMetrics, resetMetricsForTesting } from '../src/observability/metrics.js'

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
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
    send(payload) {
      this.body = payload
      return this
    },
  }
}

function createCollection(count) {
  return { async estimatedDocumentCount() { return count } }
}

function createDeps(overrides = {}) {
  return {
    getAnalysisQueueSnapshot: () => ({ activeWorkers: 1, pendingJobs: 2, scheduledJobs: 3 }),
    getRepositoriesCollection: async () => createCollection(10),
    getUsersCollection: async () => createCollection(4),
    getReportsCollection: async () => createCollection(2),
    ...overrides,
  }
}

test.beforeEach(() => {
  resetMetricsForTesting()
})

test('getMetrics renders queue and db gauges as Prometheus text (no token configured, always authorized)', async () => {
  const { getMetrics } = createObservabilityController(createDeps())
  const response = createResponse()

  await getMetrics({ headers: {} }, response, () => assert.fail('next should not be called'))

  assert.equal(response.headers['Content-Type'], 'text/plain; version=0.0.4; charset=utf-8')
  assert.match(response.body, /codepulse_analysis_queue_active_workers 1/)
  assert.match(response.body, /codepulse_analysis_queue_pending_jobs 2/)
  assert.match(response.body, /codepulse_analysis_queue_scheduled_jobs 3/)
  assert.match(response.body, /codepulse_db_collection_documents\{collection="repositories"\} 10/)
  assert.match(response.body, /codepulse_db_collection_documents\{collection="users"\} 4/)
  assert.match(response.body, /codepulse_db_collection_documents\{collection="reports"\} 2/)
  assert.equal(response.body, renderMetrics())
})

test('getMetrics forwards unexpected failures to next()', async () => {
  const { getMetrics } = createObservabilityController(createDeps({
    getRepositoriesCollection: async () => { throw new Error('db unavailable') },
  }))
  const response = createResponse()

  let caughtError
  await getMetrics({ headers: {} }, response, error => { caughtError = error })

  assert.equal(caughtError.message, 'db unavailable')
})

