export const DEFAULT_PAGE_LIMIT = 50
export const MAX_PAGE_LIMIT = 200

function normalizeLimit(value) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_PAGE_LIMIT
  return Math.min(parsed, MAX_PAGE_LIMIT)
}

function normalizeSkip(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0
}

export function normalizeRepositoryPagination(options = {}) {
  const limit = normalizeLimit(options.limit)
  const skip = normalizeSkip(options.skip)

  return { limit, skip }
}

async function paginateCollection(collection, filter, sort, options, serialize) {
  const { limit, skip } = normalizeRepositoryPagination(options)
  const [records, total] = await Promise.all([
    collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
    collection.countDocuments(filter),
  ])

  return {
    items: records.map(serialize),
    total,
    limit,
    skip,
  }
}

function toIso(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function serializeRepository(repository) {
  return {
    id: repository._id.toString(),
    name: repository.repo_name,
    fullName: repository.repo_full_name,
    url: repository.repo_url,
    defaultBranch: repository.default_branch,
    status: repository.status || null,
    totalFiles: repository.total_files ?? 0,
    totalCommits: repository.total_commits ?? 0,
    totalDependencies: repository.total_dependencies ?? 0,
    totalDocumentation: repository.total_documentation ?? 0,
    createdAt: toIso(repository.created_at),
    updatedAt: toIso(repository.updated_at),
  }
}

function serializeFile(file) {
  return {
    path: file.file_path,
    name: file.file_name,
    extension: file.extension,
    fileType: file.file_type,
    language: file.language,
    size: file.size,
    depth: file.depth,
  }
}

function serializeCommit(commit) {
  return {
    hash: commit.commit_hash,
    author: commit.author,
    authorEmail: commit.author_email,
    message: commit.message,
    date: toIso(commit.commit_date),
    changedFiles: commit.changed_files || [],
  }
}

function serializeDependency(dependency) {
  return {
    sourceFile: dependency.source_file,
    targetFile: dependency.target_file,
    type: dependency.dependency_type,
    importPath: dependency.import_path,
    resolved: Boolean(dependency.resolved),
  }
}

function serializeDocumentation(doc) {
  return {
    path: doc.doc_path,
    fileName: doc.file_name,
    type: doc.documentation_type,
    summary: doc.content_summary,
    content: doc.content,
    size: doc.size,
    truncated: Boolean(doc.truncated),
  }
}

export async function listRepositoriesForUserWithCollections(userId, collections) {
  const records = await collections.repositories
    .find({ user_id: userId })
    .sort({ updated_at: -1, _id: -1 })
    .toArray()

  return records.map(serializeRepository)
}

export async function findRepositoryForUserWithCollections(userId, repositoryId, collections) {
  return collections.repositories.findOne({ _id: repositoryId, user_id: userId })
}

export async function deleteRepositoryForUserWithCollections(userId, repositoryId, collections) {
  const repository = await findRepositoryForUserWithCollections(userId, repositoryId, collections)
  if (!repository) return false
  if (repository.status === 'queued' || repository.status === 'running') return 'active'

  const deleteResult = await collections.repositories.deleteOne({
    _id: repository._id,
    user_id: userId,
    status: { $nin: ['queued', 'running'] },
  })
  if ((deleteResult?.deletedCount ?? 0) === 0) return 'active'

  await Promise.all([
    collections.repoFiles.deleteMany({ repository_id: repository._id }),
    collections.commits.deleteMany({ repository_id: repository._id }),
    collections.dependencies.deleteMany({ repository_id: repository._id }),
    collections.documentation.deleteMany({ repository_id: repository._id }),
    collections.repositoryScores?.deleteMany({ repository_id: repository._id }),
    collections.repositoryScoreHistory?.deleteMany({ repository_id: repository._id }),
    collections.technicalDebtMetrics?.deleteMany({ repository_id: repository._id }),
    collections.knowledgeDebtMetrics?.deleteMany({ repository_id: repository._id }),
    collections.driftFindings?.deleteMany({ repository_id: repository._id }),
    collections.recommendations?.deleteMany({ repository_id: repository._id }),
    collections.codeAnalysisSummaries?.deleteMany({ repository_id: repository._id }),
    collections.codeFacts?.deleteMany({ repository_id: repository._id }),
    collections.documentationAnalysisSummaries?.deleteMany({ repository_id: repository._id }),
    collections.documentationFacts?.deleteMany({ repository_id: repository._id }),
  ])

  return true
}

export async function listRepoFilesWithCollections(repositoryId, collections, options = {}) {
  return paginateCollection(
    collections.repoFiles,
    { repository_id: repositoryId },
    { file_path: 1, _id: 1 },
    options,
    serializeFile,
  )
}

export async function listCommitsForRepositoryWithCollections(repositoryId, collections, options = {}) {
  return paginateCollection(
    collections.commits,
    { repository_id: repositoryId },
    { commit_date: -1, _id: -1 },
    options,
    serializeCommit,
  )
}

export async function listAllCommitsForRepositoryWithCollections(repositoryId, collections) {
  return collections.commits.find({ repository_id: repositoryId }).toArray()
}

export async function listDependenciesForRepositoryWithCollections(repositoryId, collections, options = {}) {
  return paginateCollection(
    collections.dependencies,
    { repository_id: repositoryId },
    { source_file: 1, target_file: 1, _id: 1 },
    options,
    serializeDependency,
  )
}

export async function listDocumentationForRepositoryWithCollections(repositoryId, collections, options = {}) {
  return paginateCollection(
    collections.documentation,
    { repository_id: repositoryId },
    { doc_path: 1, _id: 1 },
    options,
    serializeDocumentation,
  )
}
