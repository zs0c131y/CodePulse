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

export async function getOAuthStatesCollection() {
  const db = await getDatabase()
  return db.collection('oauth_states')
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

export async function getCodeAnalysisSummariesCollection() {
  const db = await getDatabase()
  return db.collection('code_analysis_summaries')
}

export async function getCodeFactsCollection() {
  const db = await getDatabase()
  return db.collection('code_facts')
}

export async function getDocumentationAnalysisSummariesCollection() {
  const db = await getDatabase()
  return db.collection('documentation_analysis_summaries')
}

export async function getDocumentationFactsCollection() {
  const db = await getDatabase()
  return db.collection('documentation_facts')
}

export async function getRepositoryScoresCollection() {
  const db = await getDatabase()
  return db.collection('repository_scores')
}

export async function getRepositoryScoreHistoryCollection() {
  const db = await getDatabase()
  return db.collection('repository_score_history')
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

export async function getReportsCollection() {
  const db = await getDatabase()
  return db.collection('reports')
}

export async function getAiExplanationsCollection() {
  const db = await getDatabase()
  return db.collection('ai_explanations')
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

  const oauthStates = await getOAuthStatesCollection()
  await oauthStates.createIndex({ state_hash: 1 }, { unique: true })
  await oauthStates.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })

  const repositories = await getRepositoriesCollection()
  await repositories.createIndex({ user_id: 1, updated_at: -1, _id: -1 })
  await repositories.createIndex({ user_id: 1, repo_url: 1 }, { unique: true })
  // MongoDB partial indexes only allow a small operator set ($eq, $exists,
  // $gt, $gte, $lt, $lte, $type, top-level $and) — $ne desugars to $not,
  // which is explicitly rejected. scan_interval_hours is always a positive
  // integer when a recurring schedule is active, so $gt: 0 is both a valid
  // partial-index expression and semantically equivalent to "is scheduled".
  await repositories.createIndex(
    { next_scan_at: 1 },
    { partialFilterExpression: { scan_interval_hours: { $gt: 0 } } },
  )
  await repositories.createIndex(
    { repo_full_name: 1, scan_trigger: 1 },
    { partialFilterExpression: { scan_trigger: 'github_push' } },
  )

  const repoFiles = await getRepoFilesCollection()
  await repoFiles.createIndex({ repository_id: 1, file_path: 1, _id: 1 })

  const commits = await getCommitsCollection()
  if (await commits.indexExists('commit_hash_1')) {
    await commits.dropIndex('commit_hash_1')
  }
  await commits.createIndex({ repository_id: 1, commit_hash: 1 }, { unique: true })
  await commits.createIndex({ repository_id: 1, commit_date: -1, _id: -1 })

  const dependencies = await getDependenciesCollection()
  await dependencies.createIndex({ repository_id: 1, source_file: 1, target_file: 1, _id: 1 })

  const documentation = await getDocumentationCollection()
  await documentation.createIndex({ repository_id: 1, doc_path: 1, _id: 1 })

  const codeAnalysisSummaries = await getCodeAnalysisSummariesCollection()
  await codeAnalysisSummaries.createIndex({ repository_id: 1 }, { unique: true })

  const codeFacts = await getCodeFactsCollection()
  for (const legacyIndex of [
    'repository_id_1_file_path_1',
    'repository_id_1_module_path_1_file_path_1',
  ]) {
    if (await codeFacts.indexExists(legacyIndex)) await codeFacts.dropIndex(legacyIndex)
  }
  await codeFacts.createIndex({ repository_id: 1, scan_id: 1, file_path: 1 }, { unique: true })
  await codeFacts.createIndex({ repository_id: 1, scan_id: 1, module_path: 1, file_path: 1 })

  const documentationAnalysisSummaries = await getDocumentationAnalysisSummariesCollection()
  await documentationAnalysisSummaries.createIndex({ repository_id: 1 }, { unique: true })

  const documentationFacts = await getDocumentationFactsCollection()
  if (await documentationFacts.indexExists('repository_id_1_doc_path_1')) {
    await documentationFacts.dropIndex('repository_id_1_doc_path_1')
  }
  await documentationFacts.createIndex({ repository_id: 1, scan_id: 1, doc_path: 1 }, { unique: true })

  const repositoryScores = await getRepositoryScoresCollection()
  await repositoryScores.createIndex({ repository_id: 1 }, { unique: true })

  const repositoryScoreHistory = await getRepositoryScoreHistoryCollection()
  await repositoryScoreHistory.createIndex({ repository_id: 1, analyzed_at: -1 })

  const technicalDebtMetrics = await getTechnicalDebtMetricsCollection()
  await technicalDebtMetrics.createIndex({ repository_id: 1, file_path: 1 }, { unique: true })
  await technicalDebtMetrics.createIndex({ repository_id: 1, debt_score: -1, file_path: 1 })

  const knowledgeDebtMetrics = await getKnowledgeDebtMetricsCollection()
  await knowledgeDebtMetrics.createIndex({ repository_id: 1, module_path: 1 }, { unique: true })

  const driftFindings = await getDriftFindingsCollection()
  await driftFindings.createIndex({ repository_id: 1, finding_key: 1 }, { unique: true })
  await driftFindings.createIndex({ repository_id: 1, severity: 1 })
  await driftFindings.createIndex({ repository_id: 1, drift_type: 1, review_status: 1 })

  const recommendations = await getRecommendationsCollection()
  await recommendations.createIndex({ repository_id: 1, recommendation_key: 1 }, { unique: true })
  await recommendations.createIndex({ repository_id: 1, impact: 1 })

  const reports = await getReportsCollection()
  await reports.createIndex({ owner_id: 1, created_at: -1, _id: -1 })
  await reports.createIndex({ owner_id: 1, repository_id: 1, created_at: -1, _id: -1 })
  await reports.createIndex(
    { share_token_hash: 1 },
    {
      unique: true,
      partialFilterExpression: { share_token_hash: { $type: 'string' } },
    },
  )

  const aiExplanations = await getAiExplanationsCollection()
  await aiExplanations.createIndex({ repository_id: 1, kind: 1, key: 1, created_at: -1 })
}

export async function pingDatabase() {
  const db = await getDatabase()
  await db.command({ ping: 1 })
}

export async function closeDatabase() {
  await client.close()
  database = undefined
}
