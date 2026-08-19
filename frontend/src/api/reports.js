import { apiFetch } from './client'

export async function createRepositoryReport(accessToken, repositoryId) {
  const data = await apiFetch(`/api/repositories/${repositoryId}/reports`, {
    accessToken,
    method: 'POST',
  })
  return data.report || null
}

export async function listReports(accessToken, repositoryId = '') {
  const query = new URLSearchParams({ limit: '200' })
  if (repositoryId) query.set('repositoryId', repositoryId)
  const data = await apiFetch(`/api/reports?${query.toString()}`, { accessToken })
  return Array.isArray(data.reports) ? data.reports : []
}

export async function getReport(accessToken, reportId) {
  const data = await apiFetch(`/api/reports/${reportId}`, { accessToken })
  return data.report || null
}

export async function shareReport(accessToken, reportId) {
  return apiFetch(`/api/reports/${reportId}/share`, {
    accessToken,
    method: 'POST',
  })
}

export async function revokeReportShare(accessToken, reportId) {
  const data = await apiFetch(`/api/reports/${reportId}/share`, {
    accessToken,
    method: 'DELETE',
  })
  return data.report || null
}

export async function getSharedReport(shareToken) {
  const data = await apiFetch(`/api/reports/shared/${encodeURIComponent(shareToken)}`)
  return data.report || null
}
