import test from 'node:test'
import assert from 'node:assert/strict'
import { ObjectId } from 'mongodb'
import { createStructuredAnalysisController } from '../src/features/repositories/structuredAnalysisController.js'

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

test('structured analysis reads enforce ownership and return persisted facts', async () => {
  const repositoryId = new ObjectId()
  const controller = createStructuredAnalysisController({
    findRepositoryForUser: async (_userId, id) => id.equals(repositoryId) ? { _id: repositoryId } : null,
    getCodeAnalysis: async (_id, options) => ({ metrics: { functionCount: 2 }, files: { ...options, items: [] } }),
    getDocumentationAnalysis: async () => ({ coverage: { overallPercent: 75 } }),
  })
  const request = {
    user: { _id: new ObjectId() },
    params: { repositoryId: repositoryId.toString() },
    query: { limit: '25', skip: '0' },
  }

  const codeResponse = responseRecorder()
  await controller.getRepositoryCodeAnalysis(request, codeResponse, assert.fail)
  assert.equal(codeResponse.body.analysis.metrics.functionCount, 2)
  assert.equal(codeResponse.body.analysis.files.limit, '25')

  const docsResponse = responseRecorder()
  await controller.getRepositoryDocumentationAnalysis(request, docsResponse, assert.fail)
  assert.equal(docsResponse.body.analysis.coverage.overallPercent, 75)
})

test('structured analysis reads reject malformed and unavailable repositories', async () => {
  const controller = createStructuredAnalysisController({
    findRepositoryForUser: async () => null,
    getCodeAnalysis: async () => null,
    getDocumentationAnalysis: async () => null,
  })
  const malformedResponse = responseRecorder()
  await controller.getRepositoryCodeAnalysis(
    { user: { _id: 'user' }, params: { repositoryId: 'bad' }, query: {} },
    malformedResponse,
    assert.fail,
  )
  assert.equal(malformedResponse.statusCode, 400)

  const missingResponse = responseRecorder()
  await controller.getRepositoryDocumentationAnalysis(
    { user: { _id: 'user' }, params: { repositoryId: new ObjectId().toString() }, query: {} },
    missingResponse,
    assert.fail,
  )
  assert.equal(missingResponse.statusCode, 404)
})
