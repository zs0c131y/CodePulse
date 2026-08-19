import test from 'node:test'
import assert from 'node:assert/strict'
import { createRepositoryController } from '../src/features/repositories/controller.js'

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

function createDependencies(overrides = {}) {
  return {
    parseGitHubRepositoryUrl() {
      return {
        name: 'demo',
        fullName: 'owner/demo',
        webUrl: 'https://github.com/owner/demo',
        cloneUrl: 'https://github.com/owner/demo.git',
      }
    },
    async queueRepositoryAnalysis() {
      return { repositoryId: 'repository-1', scanId: 'scan-1', status: 'queued', shouldStart: true }
    },
    scheduleBackgroundTask() {},
    async markRepositoryAnalysisRunning() { return true },
    async analyzeRepositorySource() {},
    async persistRepositoryAnalysis() {},
    async markRepositoryAnalysisCompleted() { return true },
    async markRepositoryAnalysisFailed() { return true },
    logError() {},
    ...overrides,
  }
}

const request = {
  user: { _id: 'user-1' },
  body: { repoUrl: 'https://github.com/owner/demo', commitLimit: 50 },
}

test('returns 202 with a durable repository id before running the background scan', async () => {
  const calls = []
  let scheduledTask
  const deps = createDependencies({
    async queueRepositoryAnalysis(input) {
      calls.push(['queued', input])
      return { repositoryId: 'repository-1', scanId: 'scan-1', status: 'queued', shouldStart: true }
    },
    scheduleBackgroundTask(task) {
      scheduledTask = task
    },
    async markRepositoryAnalysisRunning(job) {
      calls.push(['running', job])
      return true
    },
    async analyzeRepositorySource(input) {
      calls.push(['analyzing', input])
      await input.persistAnalysis({ userId: input.userId })
    },
    async persistRepositoryAnalysis(_analysis, options) {
      calls.push(['persisted', options])
    },
    async markRepositoryAnalysisCompleted(job) {
      calls.push(['completed', job])
      return true
    },
  })
  const controller = createRepositoryController(deps)
  const response = createResponse()

  await controller(request, response, error => assert.fail(error))

  assert.equal(response.statusCode, 202)
  assert.equal(response.body.repositoryId, 'repository-1')
  assert.equal(response.body.status, 'queued')
  assert.match(response.body.message, /Poll the status endpoint/)
  assert.deepEqual(calls.map(([name]) => name), ['queued'])

  await scheduledTask()

  assert.deepEqual(calls.map(([name]) => name), ['queued', 'running', 'analyzing', 'persisted', 'completed'])
  assert.deepEqual(calls[3][1], {
    repositoryId: 'repository-1',
    scanId: 'scan-1',
    status: 'running',
  })
})

test('records background failures without calling the request error handler after 202', async () => {
  let scheduledTask
  let failedInput
  const logged = []
  const notFoundError = Object.assign(new Error('Repository was not found or is not public.'), { statusCode: 404 })
  const controller = createRepositoryController(createDependencies({
    scheduleBackgroundTask(task) { scheduledTask = task },
    async analyzeRepositorySource() { throw notFoundError },
    async markRepositoryAnalysisFailed(input) {
      failedInput = input
      return true
    },
    logError(message, error) { logged.push({ message, error }) },
  }))
  const response = createResponse()
  let nextCalled = false

  await controller(request, response, () => { nextCalled = true })
  await scheduledTask()

  assert.equal(response.statusCode, 202)
  assert.equal(nextCalled, false)
  assert.equal(failedInput.error, 'Repository was not found or is not public.')
  assert.equal(logged.length, 1)
  assert.equal(logged[0].error, notFoundError)
})

test('sanitizes unexpected failures and absorbs a secondary status-write failure', async () => {
  let scheduledTask
  let failedInput
  const logged = []
  const internalError = new Error('Clone workspace C:\\private\\repository could not be read.')
  const statusError = new Error('database unavailable')
  const controller = createRepositoryController(createDependencies({
    scheduleBackgroundTask(task) { scheduledTask = task },
    async analyzeRepositorySource() { throw internalError },
    async markRepositoryAnalysisFailed(input) {
      failedInput = input
      throw statusError
    },
    logError(message, error) { logged.push({ message, error }) },
  }))
  const response = createResponse()

  await controller(request, response, error => assert.fail(error))
  const completed = await scheduledTask()

  assert.equal(completed, false)
  assert.equal(failedInput.error, 'Repository analysis failed.')
  assert.equal(logged.length, 2)
  assert.equal(logged[0].error, statusError)
  assert.equal(logged[1].error, internalError)
})

test('does not start another worker when the owner repository is already active', async () => {
  let scheduled = false
  const controller = createRepositoryController(createDependencies({
    async queueRepositoryAnalysis() {
      return { repositoryId: 'repository-1', scanId: 'scan-1', status: 'running', shouldStart: false }
    },
    scheduleBackgroundTask() { scheduled = true },
  }))
  const response = createResponse()

  await controller(request, response, error => assert.fail(error))

  assert.equal(response.statusCode, 202)
  assert.equal(response.body.status, 'running')
  assert.equal(scheduled, false)
})

test('rejects invalid public repository URLs before creating a durable record', async () => {
  let queued = false
  const controller = createRepositoryController(createDependencies({
    parseGitHubRepositoryUrl() { return null },
    async queueRepositoryAnalysis() { queued = true },
  }))
  const response = createResponse()

  await controller(
    { ...request, body: { repoUrl: 'https://example.com/owner/demo' } },
    response,
    error => assert.fail(error),
  )

  assert.equal(response.statusCode, 400)
  assert.equal(queued, false)
})

test('rejects commit history limits outside the supported integer range', async () => {
  for (const commitLimit of [0, 501, -1, 1.5, '50', null]) {
    let queued = false
    const controller = createRepositoryController(createDependencies({
      async queueRepositoryAnalysis() { queued = true },
    }))
    const response = createResponse()

    await controller(
      { ...request, body: { repoUrl: request.body.repoUrl, commitLimit } },
      response,
      error => assert.fail(error),
    )

    assert.equal(response.statusCode, 400)
    assert.deepEqual(response.body, { message: 'Commit limit must be an integer between 1 and 500.' })
    assert.equal(queued, false)
  }
})

test('defaults the commit history limit to 100 and accepts the upper boundary', async () => {
  const queuedLimits = []
  const controller = createRepositoryController(createDependencies({
    async queueRepositoryAnalysis(input) {
      queuedLimits.push(input.commitLimit)
      return { repositoryId: 'repository-1', scanId: 'scan-1', status: 'queued', shouldStart: false }
    },
  }))

  for (const body of [
    { repoUrl: request.body.repoUrl },
    { repoUrl: request.body.repoUrl, commitLimit: 500 },
  ]) {
    const response = createResponse()
    await controller({ ...request, body }, response, error => assert.fail(error))
    assert.equal(response.statusCode, 202)
  }

  assert.deepEqual(queuedLimits, [100, 500])
})
