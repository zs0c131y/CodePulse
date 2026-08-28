import { createHmac, timingSafeEqual } from 'node:crypto'
import { BACKEND_URL, GITHUB_WEBHOOK_SECRET } from '../../../config/index.js'
import { getOAuthAccountsCollection } from '../../../db/index.js'
import { decryptOAuthToken } from '../../../utils/oauthToken.js'

function configurationError(message) {
  const error = new Error(message)
  error.statusCode = 503
  return error
}

function webhookUrl() {
  let parsed
  try {
    parsed = new URL(BACKEND_URL)
  } catch {
    throw configurationError('BACKEND_URL must be a public HTTPS URL before GitHub push scans can be enabled.')
  }
  if (parsed.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
    throw configurationError('BACKEND_URL must be a public HTTPS URL before GitHub push scans can be enabled.')
  }
  return `${BACKEND_URL}/api/webhooks/github`
}

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'CodePulse',
  }
}

async function getGitHubToken(userId) {
  const account = await (await getOAuthAccountsCollection()).findOne({ user_id: userId, provider: 'github' })
  const token = account?.provider_access_token ? decryptOAuthToken(account.provider_access_token) : null
  if (!token) throw configurationError('Connect GitHub in Settings before enabling GitHub push scans.')
  return token
}

async function githubRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...githubHeaders(token), ...options.headers },
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    const error = new Error(detail?.message || `GitHub webhook request failed with status ${response.status}.`)
    error.statusCode = response.status === 401 || response.status === 403
      ? 403
      : response.status === 404
        ? 404
        : 502
    throw error
  }
  return response.status === 204 ? null : response.json()
}

/** Creates or refreshes the single push webhook used by a tracked GitHub repo. */
export async function enableGitHubPushScan({ userId, repository }) {
  if (!GITHUB_WEBHOOK_SECRET) {
    throw configurationError('GITHUB_WEBHOOK_SECRET must be configured before GitHub push scans can be enabled.')
  }
  if (!repository.repo_full_name) throw configurationError('This repository has no GitHub owner/name to subscribe to.')

  const token = await getGitHubToken(userId)
  const endpoint = `https://api.github.com/repos/${repository.repo_full_name.split('/').map(encodeURIComponent).join('/')}/hooks`
  const payload = {
    name: 'web',
    active: true,
    events: ['push'],
    config: { url: webhookUrl(), content_type: 'json', secret: GITHUB_WEBHOOK_SECRET },
  }

  if (repository.github_webhook_id) {
    try {
      const hook = await githubRequest(`${endpoint}/${repository.github_webhook_id}`, token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return hook.id
    } catch (error) {
      if (error.statusCode !== 404) throw error
    }
  }

  const hook = await githubRequest(endpoint, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return hook.id
}

export function isValidGitHubWebhookSignature(rawBody, signature, secret = GITHUB_WEBHOOK_SECRET) {
  if (!secret || !Buffer.isBuffer(rawBody) || typeof signature !== 'string') return false
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
  const received = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer)
}
