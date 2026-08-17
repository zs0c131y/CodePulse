import { apiFetch } from './client'

export async function listIntegrations(accessToken) {
  const data = await apiFetch('/api/integrations', { accessToken })
  return Array.isArray(data.integrations) ? data.integrations : []
}

export async function listConnectedRepositories(accessToken) {
  const data = await apiFetch('/api/integrations/repositories', { accessToken })
  return Array.isArray(data.repositories) ? data.repositories : []
}

export async function beginIntegrationConnection(provider, accessToken) {
  const data = await apiFetch(`/api/integrations/${provider}/authorize`, {
    accessToken,
    method: 'POST',
  })
  return data.authorizationUrl
}
