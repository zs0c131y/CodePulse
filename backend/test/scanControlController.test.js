import test from 'node:test'
import assert from 'node:assert/strict'
import { ObjectId } from 'mongodb'
import { createScanControlController } from '../src/features/repositories/scanControlController.js'

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

function request(repositoryId) {
  return { user: { _id: 'user-1' }, params: { repositoryId: repositoryId.toString() } }
}

test('pause persists the state and signals the active worker', async () => {
  const repositoryId = new ObjectId()
  const calls = []
  const controller = createScanControlController({
    async findRepositoryForUser() {
      return { _id: repositoryId, status: 'running', scan_id: 'scan-1', analysis_progress: { phase: 'inventory' } }
    },
    async pauseRepositoryAnalysis(input) { calls.push(['pause', input]); return true },
    requestRepositoryAnalysisControl(input) { calls.push(['signal', input]); return true },
    serializeRepository(repository) { return { id: repository._id.toString(), status: repository.status } },
  })
  const output = response()

  await controller.pause(request(repositoryId), output, error => assert.fail(error))

  assert.equal(output.statusCode, 202)
  assert.equal(output.body.repository.status, 'paused')
  assert.deepEqual(calls.map(([name]) => name), ['pause', 'signal'])
  assert.equal(calls[1][1].action, 'pause')
})

test('resume creates a new scan token and queues a clean restart', async () => {
  const repositoryId = new ObjectId()
  const queued = []
  const controller = createScanControlController({
    async findRepositoryForUser() {
      return { _id: repositoryId, status: 'paused', repo_url: 'https://github.com/owner/repo', commit_limit: 50 }
    },
    randomUUID() { return 'new-scan' },
    async resumeRepositoryAnalysis(input) { return { _id: input.repositoryId, status: 'queued' } },
    enqueueRepositoryAnalysis(job) { queued.push(job); return true },
    serializeRepository(repository) { return { id: repository._id.toString(), status: repository.status } },
  })
  const output = response()

  await controller.resume(request(repositoryId), output, error => assert.fail(error))

  assert.equal(output.statusCode, 202)
  assert.equal(output.body.repository.status, 'queued')
  assert.equal(queued[0].scanId, 'new-scan')
  assert.equal(queued[0].commitLimit, 50)
})

test('cancel rejects completed scans without mutating worker state', async () => {
  const repositoryId = new ObjectId()
  let changed = false
  const controller = createScanControlController({
    async findRepositoryForUser() { return { _id: repositoryId, status: 'completed' } },
    async cancelRepositoryAnalysis() { changed = true },
  })
  const output = response()

  await controller.cancel(request(repositoryId), output, error => assert.fail(error))

  assert.equal(output.statusCode, 409)
  assert.equal(changed, false)
})
