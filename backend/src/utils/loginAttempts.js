import { maxLoginFailures, loginLockTtlMs } from '../config/index.js'
import { getAuthAttemptsCollection } from '../db/index.js'

export async function assertLoginAllowed(email, ip) {
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
