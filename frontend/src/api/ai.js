/**
 * AI Explainability endpoints (docs/ai/AI_ENGINE.md). Generation is opt-in —
 * callers must explicitly POST to request a new explanation; GET only reads
 * back whatever was most recently generated and persisted.
 */
import { apiFetch, ApiError } from './client'

export async function getAiStatus(accessToken, repositoryId) {
  const data = await apiFetch(`/api/repositories/${repositoryId}/ai/status`, { accessToken })
  return Boolean(data.configured)
}

export async function generateRiskExplanation(accessToken, repositoryId, modulePath) {
  const data = await apiFetch(`/api/repositories/${repositoryId}/ai/risk-explanation`, {
    accessToken,
    method: 'POST',
    body: { modulePath },
  })
  return data.explanation || null
}

export async function getRiskExplanation(accessToken, repositoryId, modulePath) {
  try {
    const query = new URLSearchParams({ modulePath })
    const data = await apiFetch(`/api/repositories/${repositoryId}/ai/risk-explanation?${query.toString()}`, { accessToken })
    return data.explanation || null
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function generateDriftExplanation(accessToken, repositoryId, findingId) {
  const data = await apiFetch(`/api/repositories/${repositoryId}/ai/drift-explanation`, {
    accessToken,
    method: 'POST',
    body: { findingId },
  })
  return data.explanation || null
}

export async function getDriftExplanation(accessToken, repositoryId, findingId) {
  try {
    const query = new URLSearchParams({ findingId })
    const data = await apiFetch(`/api/repositories/${repositoryId}/ai/drift-explanation?${query.toString()}`, { accessToken })
    return data.explanation || null
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function generateExecutiveSummary(accessToken, repositoryId) {
  const data = await apiFetch(`/api/repositories/${repositoryId}/ai/executive-summary`, {
    accessToken,
    method: 'POST',
  })
  return data.explanation || null
}

export async function getExecutiveSummary(accessToken, repositoryId) {
  try {
    const data = await apiFetch(`/api/repositories/${repositoryId}/ai/executive-summary`, { accessToken })
    return data.explanation || null
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}
