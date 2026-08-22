import { getOAuthAccountsCollection } from '../../../db/index.js'
import { decryptOAuthToken } from '../../../utils/oauthToken.js'

// Looked up fresh at clone time rather than persisted with the scan job, so a
// revoked or rotated connection is honored immediately and no provider token
// ever lands in a job document or the analysis queue's stored state.
export async function getStoredAccessToken(userId, provider, options = {}) {
  const accounts = options.collections?.oauthAccounts || await getOAuthAccountsCollection()
  const account = await accounts.findOne({ user_id: userId, provider, provider_access_token: { $exists: true } })
  if (!account) return null
  return decryptOAuthToken(account.provider_access_token)
}

export async function getGitHubAccessToken(userId, options = {}) {
  return getStoredAccessToken(userId, 'github', options)
}
