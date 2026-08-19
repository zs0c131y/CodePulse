import {
  GEMMA_API_URL,
  GEMMA_MODEL,
  GEMMA_REQUEST_TIMEOUT_MS,
  CF_ACCESS_CLIENT_ID,
  CF_ACCESS_CLIENT_SECRET,
} from '../config/index.js'

function accessHeaders() {
  if (!CF_ACCESS_CLIENT_ID || !CF_ACCESS_CLIENT_SECRET) return {}
  return {
    'CF-Access-Client-Id': CF_ACCESS_CLIENT_ID,
    'CF-Access-Client-Secret': CF_ACCESS_CLIENT_SECRET,
  }
}

// dauntless (the home server behind the tunnel) isn't always on — callers should
// catch this and surface a "AI service unavailable" response rather than hang.
export async function generateWithGemma(prompt, { model = GEMMA_MODEL, signal } = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GEMMA_REQUEST_TIMEOUT_MS)
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true })

  let response
  try {
    response = await fetch(`${GEMMA_API_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...accessHeaders() },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: controller.signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Gemma request timed out — the home server may be offline.')
    }
    throw new Error(`Gemma request failed: ${error.message}`)
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new Error(`Gemma request failed with status ${response.status}.`)
  }

  const payload = await response.json()
  return payload.response
}
