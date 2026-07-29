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

export async function getRepositoriesCollection() {
  const db = await getDatabase()
  return db.collection('repositories')
}

export async function getRepoFilesCollection() {
  const db = await getDatabase()
  return db.collection('repo_files')
}

export async function getCommitsCollection() {
  const db = await getDatabase()
  return db.collection('commits')
}

export async function getDependenciesCollection() {
  const db = await getDatabase()
  return db.collection('dependencies')
}

export async function getDocumentationCollection() {
  const db = await getDatabase()
  return db.collection('documentation')
}

export async function getRepositoryScoresCollection() {
  const db = await getDatabase()
  return db.collection('repository_scores')
}

export async function getTechnicalDebtMetricsCollection() {
  const db = await getDatabase()
  return db.collection('technical_debt_metrics')
}

export async function getKnowledgeDebtMetricsCollection() {
  const db = await getDatabase()
  return db.collection('knowledge_debt_metrics')
}

export async function getDriftFindingsCollection() {
  const db = await getDatabase()
  return db.collection('drift_findings')
}

export async function getRecommendationsCollection() {
  const db = await getDatabase()
  return db.collection('recommendations')
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

  const repositories = await getRepositoriesCollection()
  await repositories.createIndex({ user_id: 1 })
  await repositories.createIndex({ user_id: 1, repo_url: 1 }, { unique: true })

  const repoFiles = await getRepoFilesCollection()
  await repoFiles.createIndex({ repository_id: 1 })

  const commits = await getCommitsCollection()
  await commits.createIndex({ repository_id: 1 })
  await commits.createIndex({ commit_hash: 1 }, { unique: true })
  await commits.createIndex({ commit_date: -1 })

  const dependencies = await getDependenciesCollection()
  await dependencies.createIndex({ repository_id: 1 })

  const documentation = await getDocumentationCollection()
  await documentation.createIndex({ repository_id: 1 })

  const repositoryScores = await getRepositoryScoresCollection()
  await repositoryScores.createIndex({ repository_id: 1 }, { unique: true })

  const technicalDebtMetrics = await getTechnicalDebtMetricsCollection()
  await technicalDebtMetrics.createIndex({ repository_id: 1, file_path: 1 }, { unique: true })
  await technicalDebtMetrics.createIndex({ repository_id: 1, debt_score: -1, file_path: 1 })

  const knowledgeDebtMetrics = await getKnowledgeDebtMetricsCollection()
  await knowledgeDebtMetrics.createIndex({ repository_id: 1, module_path: 1 }, { unique: true })

  const driftFindings = await getDriftFindingsCollection()
  await driftFindings.createIndex({ repository_id: 1, finding_key: 1 }, { unique: true })
  await driftFindings.createIndex({ repository_id: 1, severity: 1 })

  const recommendations = await getRecommendationsCollection()
  await recommendations.createIndex({ repository_id: 1, recommendation_key: 1 }, { unique: true })
  await recommendations.createIndex({ repository_id: 1, impact: 1 })
}

export async function pingDatabase() {
  const db = await getDatabase()
  await db.command({ ping: 1 })
}
