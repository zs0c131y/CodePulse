import test from 'node:test'
import assert from 'node:assert/strict'
import { generateWithGemma } from '../src/utils/gemma.js'

test('returns the response text on success', async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      async json() {
        return { response: 'hello' }
      },
    })

    assert.equal(await generateWithGemma('hi'), 'hello')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('throws a clear error when the home server is unreachable', async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async () => {
      throw new Error('fetch failed')
    }

    await assert.rejects(() => generateWithGemma('hi'), /Gemma request failed/)
  } finally {
    globalThis.fetch = originalFetch
  }
})
