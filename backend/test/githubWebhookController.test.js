import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { createGitHubWebhookController } from '../src/features/repositories/githubWebhookController.js'
import { isValidGitHubWebhookSignature } from '../src/features/repositories/services/githubPushWebhookService.js'

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload },
  }
}

function request({ event = 'push', payload, valid = true } = {}) {
  return {
    rawBody: Buffer.from(JSON.stringify(payload || {})),
    body: payload || {},
    get(name) {
      if (name === 'X-GitHub-Event') return event
      if (name === 'X-Hub-Signature-256') return valid ? 'valid' : 'invalid'
      return undefined
    },
  }
}

test('isValidGitHubWebhookSignature checks GitHub SHA-256 signatures in constant time', () => {
  const rawBody = Buffer.from('{"ok":true}')
  const signature = `sha256=${createHmac('sha256', 'test-secret').update(rawBody).digest('hex')}`

  assert.equal(isValidGitHubWebhookSignature(rawBody, signature, 'test-secret'), true)
  assert.equal(isValidGitHubWebhookSignature(rawBody, 'sha256=wrong', 'test-secret'), false)
})

test('GitHub push webhooks enqueue only tracked default-branch repositories', async () => {
  const queued = []
  const enqueued = []
  const collection = {
    find(filter) {
      assert.deepEqual(filter, { repo_full_name: 'owner/demo', scan_trigger: 'github_push' })
      return {
        async toArray() {
          return [
            { _id: 'main', user_id: 'user-1', repo_url: 'https://github.com/owner/demo', default_branch: 'main', commit_limit: 25 },
            { _id: 'other', user_id: 'user-2', repo_url: 'https://github.com/owner/demo', default_branch: 'develop' },
          ]
        },
      }
    },
  }
  const controller = createGitHubWebhookController({
    repositories: async () => collection,
    isValidGitHubWebhookSignature: () => true,
    parseGitHubRepositoryUrl: url => ({ webUrl: url, name: 'demo', fullName: 'owner/demo', cloneUrl: `${url}.git` }),
    async queueRepositoryAnalysis(input) {
      queued.push(input)
      return { shouldStart: true, repositoryId: 'main', scanId: 'scan-1' }
    },
    enqueueRepositoryAnalysis(input) { enqueued.push(input) },
  })
  const res = response()

  await controller(request({ payload: { ref: 'refs/heads/main', repository: { full_name: 'owner/demo' } } }), res, error => assert.fail(error))

  assert.equal(res.statusCode, 202)
  assert.equal(res.body.started, 1)
  assert.equal(queued.length, 1)
  assert.equal(queued[0].commitLimit, 25)
  assert.equal(enqueued[0].scanId, 'scan-1')
})

test('GitHub webhook rejects an invalid signature before reading repositories', async () => {
  const controller = createGitHubWebhookController({
    repositories: async () => assert.fail('must not load repositories'),
    isValidGitHubWebhookSignature: () => false,
  })
  const res = response()

  await controller(request({ valid: false }), res, error => assert.fail(error))

  assert.equal(res.statusCode, 401)
})
