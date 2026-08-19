import test from 'node:test'
import assert from 'node:assert/strict'

process.env.GEMMA_API_URL = 'https://gemma.example.test'
process.env.GEMMA_MODEL = 'gemma4:e2b'
process.env.CF_ACCESS_CLIENT_ID = 'client-id'
process.env.CF_ACCESS_CLIENT_SECRET = 'client-secret'

const { callGemma, isAiExplainabilityConfigured, AiProviderError } = await import(
  '../src/features/analysis/services/aiExplainabilityService.js'
)

function withMockedFetch(implementation, run) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = implementation
  return run().finally(() => {
    globalThis.fetch = originalFetch
  })
}

test('isAiExplainabilityConfigured reflects GEMMA_API_URL and GEMMA_MODEL', () => {
  assert.equal(isAiExplainabilityConfigured(), true)
})

test('callGemma sends Cloudflare Access headers and returns the assistant message content', async () => {
  let capturedUrl
  let capturedInit

  await withMockedFetch(async (url, init) => {
    capturedUrl = url
    capturedInit = init
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({ message: { role: 'assistant', content: '  Hello from Gemma  ' } })
      },
    }
  }, async () => {
    const content = await callGemma({ system: 'sys', user: 'usr' })
    assert.equal(content, 'Hello from Gemma')
  })

  assert.equal(capturedUrl, 'https://gemma.example.test/api/chat')
  assert.equal(capturedInit.headers['CF-Access-Client-Id'], 'client-id')
  assert.equal(capturedInit.headers['CF-Access-Client-Secret'], 'client-secret')
  const body = JSON.parse(capturedInit.body)
  assert.equal(body.model, 'gemma4:e2b')
  assert.equal(body.stream, false)
  assert.deepEqual(body.messages, [
    { role: 'system', content: 'sys' },
    { role: 'user', content: 'usr' },
  ])
})

test('callGemma raises AiProviderError for non-2xx responses', async () => {
  await withMockedFetch(async () => ({
    ok: false,
    status: 500,
    async text() { return JSON.stringify({ error: 'model unavailable' }) },
  }), async () => {
    await assert.rejects(
      () => callGemma({ system: 'sys', user: 'usr' }),
      error => error instanceof AiProviderError && /model unavailable/.test(error.message),
    )
  })
})

test('callGemma raises AiProviderError for unreadable and empty responses', async () => {
  await withMockedFetch(async () => ({
    ok: true,
    status: 200,
    async text() { return 'not json' },
  }), async () => {
    await assert.rejects(() => callGemma({ system: 'sys', user: 'usr' }), AiProviderError)
  })

  await withMockedFetch(async () => ({
    ok: true,
    status: 200,
    async text() { return JSON.stringify({ message: { content: '   ' } }) },
  }), async () => {
    await assert.rejects(() => callGemma({ system: 'sys', user: 'usr' }), AiProviderError)
  })
})

test('callGemma maps network failures and aborts to AiProviderError', async () => {
  await withMockedFetch(async () => {
    throw new Error('network down')
  }, async () => {
    await assert.rejects(
      () => callGemma({ system: 'sys', user: 'usr' }),
      error => error instanceof AiProviderError && /network down/.test(error.message),
    )
  })

  await withMockedFetch(async () => {
    const error = new Error('aborted')
    error.name = 'AbortError'
    throw error
  }, async () => {
    await assert.rejects(
      () => callGemma({ system: 'sys', user: 'usr' }),
      error => error instanceof AiProviderError && /timed out/.test(error.message),
    )
  })
})
