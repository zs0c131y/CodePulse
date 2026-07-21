/**
 * Repository and analytics endpoints.
 *
 * `analyzeRepository` is implemented by the backend today. The read/analytics
 * endpoints follow the planned contract documented in docs/backend/BACKEND.md
 * ("Repository Read & Analytics API") and may return 404 until the backend
 * milestones land; callers should treat 404 as "data not available yet".
 */
import { apiFetch } from './client'

export function analyzeRepository(accessToken, repoUrl, commitLimit = 100) {
  return apiFetch('/api/repositories/analyze', {
    accessToken,
    method: 'POST',
    body: { repoUrl, commitLimit },
  })
}

export async function listRepositories(accessToken) {
  const data = await apiFetch('/api/repositories', { accessToken })
  return Array.isArray(data.repositories) ? data.repositories : []
}

export async function getRepository(accessToken, repositoryId) {
  const data = await apiFetch(`/api/repositories/${repositoryId}`, { accessToken })
  return data.repository || null
}

export async function getRepositoryStatus(accessToken, repositoryId) {
  return apiFetch(`/api/repositories/${repositoryId}/status`, { accessToken })
}

export async function getRepositoryScores(accessToken, repositoryId) {
  const data = await apiFetch(`/api/repositories/${repositoryId}/scores`, { accessToken })
  return data.scores || null
}

export async function getRepositoryDebt(accessToken, repositoryId) {
  return apiFetch(`/api/repositories/${repositoryId}/debt`, { accessToken })
}

export async function getRepositoryDrift(accessToken, repositoryId) {
  return apiFetch(`/api/repositories/${repositoryId}/drift`, { accessToken })
}

export async function getRepositoryRecommendations(accessToken, repositoryId) {
  const data = await apiFetch(`/api/repositories/${repositoryId}/recommendations`, { accessToken })
  return Array.isArray(data.recommendations) ? data.recommendations : []
}
