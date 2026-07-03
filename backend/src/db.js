import dotenv from 'dotenv'
import dns from 'node:dns'
import { MongoClient } from 'mongodb'

dotenv.config({ quiet: true })

const defaultMongoUri = 'mongodb://127.0.0.1:27017/codepulse'
const mongoUri = getRuntimeMongoUri(process.env.MONGO_URI || defaultMongoUri)
const databaseName = process.env.MONGO_DB_NAME || getDatabaseNameFromUri(mongoUri) || 'codepulse'

configureLocalDns(mongoUri)

function configureLocalDns(uri) {
  if (process.env.NODE_ENV === 'production' || !uri.startsWith('mongodb+srv://')) {
    return
  }

  const dnsServers = (process.env.MONGO_DNS_SERVERS || '1.1.1.1,8.8.8.8')
    .split(',')
    .map(server => server.trim())
    .filter(Boolean)

  if (dnsServers.length > 0) {
    dns.setServers(dnsServers)
  }
}

function getRuntimeMongoUri(uri) {
  if (process.env.NODE_ENV === 'production') {
    return uri
  }

  const localMongoHost = process.env.MONGO_LOCAL_HOST || (process.platform === 'win32' ? '127.0.0.1' : '')

  if (!localMongoHost) {
    return uri
  }

  try {
    const parsed = new URL(uri)

    if (parsed.hostname === 'mongo') {
      parsed.hostname = localMongoHost
      return parsed.toString()
    }
  } catch {
    return uri
  }

  return uri
}

function getDatabaseNameFromUri(uri) {
  try {
    const parsed = new URL(uri)
    const pathDatabaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
    return pathDatabaseName || ''
  } catch {
    return ''
  }
}

const client = new MongoClient(mongoUri, {
  serverSelectionTimeoutMS: 5000,
})

let database

export async function getDatabase() {
  if (!database) {
    await client.connect()
    database = client.db(databaseName)
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
}

export async function pingDatabase() {
  const db = await getDatabase()
  await db.command({ ping: 1 })
}
