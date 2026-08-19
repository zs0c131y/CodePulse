import { maxLoginFailures, loginLockTtlMs, SECURITY_DISABLED } from '../config/index.js'
import { getAuthAttemptsCollection } from '../db/index.js'

/**
 * The failed-sign-in lockout gate (docs/backend/BACKEND.md "Controlled Load
 * Testing") — an anti-brute-force cooldown keyed by email+IP, not credential
 * verification itself. Bypassed under SECURITY_DISABLED the same way the
 * rate limiters are; recordLoginFailure/clearLoginFailures keep running so
 * the audit trail in auth_attempts stays intact either way.
 */
export async function assertLoginAllowed(email, ip) {
  if (SECURITY_DISABLED) return true

  const attempts = await getAuthAttemptsCollection()
  const key = `${email}:${ip}`
  const record = await attempts.findOne({ key })

  if (record?.locked_until && record.locked_until > new Date()) {
    return false
  }

  return true
}

export async function recordLoginFailure(email, ip) {
  const attempts = await getAuthAttemptsCollection()
  const key = `${email}:${ip}`
  const now = new Date()
  const record = await attempts.findOneAndUpdate(
    { key },
    {
      $inc: { failures: 1 },
      $set: { email, ip, updated_at: now },
      $setOnInsert: { created_at: now },
    },
    { upsert: true, returnDocument: 'after' },
  )

  if (record.failures >= maxLoginFailures) {
    await attempts.updateOne(
      { key },
      { $set: { locked_until: new Date(Date.now() + loginLockTtlMs), updated_at: now } },
    )
  }
}

export async function clearLoginFailures(email, ip) {
  const attempts = await getAuthAttemptsCollection()
  await attempts.deleteOne({ key: `${email}:${ip}` })
}
