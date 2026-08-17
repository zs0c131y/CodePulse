import test from 'node:test'
import assert from 'node:assert/strict'
import { createIntegrationAuthorizationController } from '../src/features/integrations/controller.js'

function responseStub() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this },
    set(name, value) { this.headers[name] = value; return this },
    setHeader(name, value) { this.headers[name] = value },
    json(body) { this.body = body; return this },
  }
}

test('integration authorization binds provider state to the authenticated user', async () => {
  const states = []
  const controller = createIntegrationAuthorizationController({
    github: {
      id: 'client-id',
      secret: 'client-secret',
      authorizeUrl: 'https://github.example/authorize',
      callbackUrl: 'https://codepulse.example/auth/github/callback',
      parameters: { scope: 'repo' },
    },
  }, {
    async createOAuthState(input) {
      states.push(input)
      return { token: 'state-token' }
    },
    setOAuthStateCookie(response, provider, token) {
      response.setHeader('Set-Cookie', `${provider}=${token}`)
    },
  })
  const response = responseStub()

  await controller(
    { params: { provider: 'github' }, user: { _id: 'user-1' } },
    response,
    error => assert.fail(error),
  )

  assert.deepEqual(states, [{ provider: 'github', intent: 'connect', userId: 'user-1' }])
  assert.equal(response.headers['Cache-Control'], 'no-store')
  assert.equal(response.headers['Set-Cookie'], 'github=state-token')
  const url = new URL(response.body.authorizationUrl)
  assert.equal(url.searchParams.get('state'), 'state-token')
  assert.equal(url.searchParams.get('client_id'), 'client-id')
})

test('integration authorization rejects unsupported and unavailable providers', async () => {
  const controller = createIntegrationAuthorizationController({
    github: { id: null, secret: null },
  }, { createOAuthState() { assert.fail('state should not be created') } })

  const missing = responseStub()
  await controller({ params: { provider: 'bitbucket' }, user: { _id: 'user-1' } }, missing, error => assert.fail(error))
  assert.equal(missing.statusCode, 404)

  const unavailable = responseStub()
  await controller({ params: { provider: 'github' }, user: { _id: 'user-1' } }, unavailable, error => assert.fail(error))
  assert.equal(unavailable.statusCode, 503)
})
