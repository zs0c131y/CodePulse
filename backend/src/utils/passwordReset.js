import { hashToken } from './token.js'

function unwrapUpdatedDocument(result) {
  if (!result) return null
  return result.value === undefined ? result : result.value
}

export async function claimPasswordResetTokenWithCollection(token, resetTokens, now = new Date()) {
  const result = await resetTokens.findOneAndUpdate(
    {
      token_hash: hashToken(token),
      used_at: null,
      expires_at: { $gt: now },
    },
    { $set: { used_at: now } },
    { returnDocument: 'after' },
  )
  return unwrapUpdatedDocument(result)
}
