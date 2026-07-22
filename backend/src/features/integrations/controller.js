import { getOAuthAccountsCollection } from '../../db/index.js'
import { decryptOAuthToken } from '../../utils/oauthToken.js'

const providers = ['github', 'gitlab']

export async function listIntegrations(request, response, next) {
  try {
    const accounts = await (await getOAuthAccountsCollection()).find({ user_id: request.user._id }).toArray()
    response.json({
      integrations: providers.map(provider => {
        const account = accounts.find(item => item.provider === provider)
        return {
          provider,
          connected: Boolean(account?.provider_access_token),
          accountName: account?.provider_name || '',
          connectedAt: account?.updated_at || account?.created_at || null,
        }
      }),
    })
  } catch (error) { next(error) }
}

async function getProviderRepositories(account) {
  const token = decryptOAuthToken(account.provider_access_token)
  if (!token) return []
  const request = account.provider === 'github'
    ? ['https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member', { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }]
    : ['https://gitlab.com/api/v4/projects?membership=true&simple=true&per_page=100&order_by=last_activity_at&sort=desc', { Authorization: `Bearer ${token}` }]
  const result = await fetch(request[0], { headers: request[1], signal: AbortSignal.timeout(10000) })
  if (!result.ok) return []
  const rows = await result.json()
  return rows.map(row => account.provider === 'github'
    ? { id: `github:${row.id}`, provider: 'github', name: row.name, fullName: row.full_name, url: row.html_url, private: Boolean(row.private), updatedAt: row.updated_at }
    : { id: `gitlab:${row.id}`, provider: 'gitlab', name: row.name, fullName: row.path_with_namespace, url: row.web_url, private: Boolean(row.visibility !== 'public'), updatedAt: row.last_activity_at })
}

export async function listConnectedRepositories(request, response, next) {
  try {
    const accounts = await (await getOAuthAccountsCollection()).find({ user_id: request.user._id, provider_access_token: { $exists: true } }).toArray()
    const groups = await Promise.all(accounts.map(getProviderRepositories))
    response.json({ repositories: groups.flat().sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)) })
  } catch (error) { next(error) }
}
