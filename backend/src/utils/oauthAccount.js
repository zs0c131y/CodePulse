function sameId(left, right) {
  return String(left ?? '') === String(right ?? '')
}

function isDuplicateKeyError(error) {
  return error?.code === 11000 || error?.code === 11001
}

function accountRecord(input, now) {
  return {
    provider: input.provider,
    provider_user_id: input.providerUserId,
    user_id: input.userId,
    provider_email: input.email,
    provider_name: input.name,
    provider_access_token: input.encryptedAccessToken,
    created_at: now,
    updated_at: now,
  }
}

async function refreshOwnedAccount(accounts, existing, input, now) {
  const result = await accounts.updateOne(
    { _id: existing._id, user_id: input.userId },
    {
      $set: {
        provider_email: input.email,
        provider_name: input.name,
        provider_access_token: input.encryptedAccessToken,
        updated_at: now,
      },
    },
  )
  return (result?.matchedCount ?? result?.modifiedCount ?? 0) > 0
}

/**
 * Links a provider identity without ever reassigning it from another user.
 * The provider/provider_user_id unique index resolves concurrent first-link
 * attempts; the loser re-reads ownership instead of overwriting it.
 */
export async function linkOAuthAccountWithCollection(input, accounts, now = new Date()) {
  const filter = { provider: input.provider, provider_user_id: input.providerUserId }
  let existing = await accounts.findOne(filter)

  if (existing) {
    if (!sameId(existing.user_id, input.userId)) return false
    return refreshOwnedAccount(accounts, existing, input, now)
  }

  try {
    await accounts.insertOne(accountRecord(input, now))
    return true
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error

    existing = await accounts.findOne(filter)
    if (!existing || !sameId(existing.user_id, input.userId)) return false
    return refreshOwnedAccount(accounts, existing, input, now)
  }
}
