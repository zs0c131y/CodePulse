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

async function getRepositoryPage(accessToken, repositoryId, resource, limit = 100) {
  const data = await apiFetch(
    `/api/repositories/${repositoryId}/${resource}?limit=${limit}`,
    { accessToken },
  )
  return {
    items: Array.isArray(data.items) ? data.items : [],
    total: Number(data.total) || 0,
  }
}

export function getRepositoryFiles(accessToken, repositoryId, limit = 200) {
  return getRepositoryPage(accessToken, repositoryId, 'files', limit)
}

export function getRepositoryCommits(accessToken, repositoryId, limit = 100) {
  return getRepositoryPage(accessToken, repositoryId, 'commits', limit)
}

export function getRepositoryDependencies(accessToken, repositoryId, limit = 200) {
  return getRepositoryPage(accessToken, repositoryId, 'dependencies', limit)
}

export function getRepositoryDocumentation(accessToken, repositoryId, limit = 100) {
  return getRepositoryPage(accessToken, repositoryId, 'documentation', limit)
}

export async function getRepositoryContributors(accessToken, repositoryId) {
  const data = await apiFetch(`/api/repositories/${repositoryId}/contributors`, { accessToken })
  return Array.isArray(data.contributors) ? data.contributors : []
}

export async function getRepositoryManifest(accessToken, repositoryId) {
  const data = await apiFetch(`/api/repositories/${repositoryId}/manifest`, { accessToken })
  return Array.isArray(data.manifests) ? data.manifests : []
}
