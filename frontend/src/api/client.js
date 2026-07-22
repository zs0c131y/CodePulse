/**
 * Shared API helpers for CodePulse frontend data modules.
 *
 * The shapes consumed here are documented in docs/backend/BACKEND.md under
 * "Repository Read & Analytics API (Planned Contract)".
 */

export function apiUrl(path) {
  return `${import.meta.env.VITE_API_BASE_URL || ''}${path}`
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Performs a JSON fetch against the backend API with the user's bearer token.
 * Throws an ApiError carrying the HTTP status for non-2xx responses so callers
 * can distinguish "endpoint not implemented yet" (404) from real failures.
 */
export async function apiFetch(path, { accessToken, method = 'GET', body } = {}) {
  const headers = {}

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch(apiUrl(path), {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new ApiError(data.message || `Request failed with status ${response.status}.`, response.status)
  }

  return data
}
