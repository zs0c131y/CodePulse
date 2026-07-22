/**
 * Account usage snapshot endpoint (planned contract, see
 * docs/backend/BACKEND.md). Returns null when the endpoint is not available.
 */
import { apiFetch } from './client'

export async function getUsageSnapshot(accessToken) {
  const data = await apiFetch('/api/auth/usage', { accessToken })
  return data.usage || null
}
