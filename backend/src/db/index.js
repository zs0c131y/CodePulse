import { MongoClient } from 'mongodb'
import { MONGO_URI, MONGO_DB_NAME } from '../config/index.js'

const client = new MongoClient(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
})

let database

export async function getDatabase() {
  if (!database) {
    await client.connect()
    database = client.db(MONGO_DB_NAME)
  }

  return database
}

export async function getUsersCollection() {
  const db = await getDatabase()
  return db.collection('users')
}

export async function getSessionsCollection() {
  const db = await getDatabase()
  return db.collection('auth_sessions')
}

export async function getAuthAttemptsCollection() {
  const db = await getDatabase()
  return db.collection('auth_attempts')
}

export async function getVerificationTokensCollection() {
  const db = await getDatabase()
  return db.collection('email_verification_tokens')
}

export async function getPasswordResetTokensCollection() {
  const db = await getDatabase()
  return db.collection('password_reset_tokens')
}

export async function getOAuthAccountsCollection() {
  const db = await getDatabase()
  return db.collection('oauth_accounts')
}

export async function ensureIndexes() {
  const users = await getUsersCollection()
  await users.createIndex({ email: 1 }, { unique: true })

  const sessions = await getSessionsCollection()
  await sessions.createIndex({ token_hash: 1 }, { unique: true })
  await sessions.createIndex({ user_id: 1 })
  await sessions.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })

  const attempts = await getAuthAttemptsCollection()
  await attempts.createIndex({ key: 1 }, { unique: true })
  await attempts.createIndex({ updated_at: 1 }, { expireAfterSeconds: 60 * 60 })

  const verificationTokens = await getVerificationTokensCollection()
  await verificationTokens.createIndex({ token_hash: 1 }, { unique: true })
  await verificationTokens.createIndex({ user_id: 1 })
  await verificationTokens.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })

  const passwordResetTokens = await getPasswordResetTokensCollection()
  await passwordResetTokens.createIndex({ token_hash: 1 }, { unique: true })
  await passwordResetTokens.createIndex({ user_id: 1 })
  await passwordResetTokens.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })

  const oauthAccounts = await getOAuthAccountsCollection()
  await oauthAccounts.createIndex({ provider: 1, provider_user_id: 1 }, { unique: true })
  await oauthAccounts.createIndex({ user_id: 1 })
}

export async function pingDatabase() {
  const db = await getDatabase()
  await db.command({ ping: 1 })
}
