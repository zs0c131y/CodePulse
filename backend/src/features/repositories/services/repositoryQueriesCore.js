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

function paginate(records, options = {}) {
  const limit = normalizeLimit(options.limit)
  const skip = normalizeSkip(options.skip)

  return {
    items: records.slice(skip, skip + limit),
    total: records.length,
    limit,
    skip,
  }
}

function toIso(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function sortByStringField(records, field) {
  return [...records].sort((left, right) => {
    const a = String(left[field] || '').toLowerCase()
    const b = String(right[field] || '').toLowerCase()
    if (a < b) return -1
    if (a > b) return 1
    return 0
  })
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
  const records = await collections.repositories.find({ user_id: userId }).toArray()

  return records
    .map(serializeRepository)
    .sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0))
}

export async function findRepositoryForUserWithCollections(userId, repositoryId, collections) {
  return collections.repositories.findOne({ _id: repositoryId, user_id: userId })
}

export async function deleteRepositoryForUserWithCollections(userId, repositoryId, collections) {
  const repository = await findRepositoryForUserWithCollections(userId, repositoryId, collections)
  if (!repository) return false

  await Promise.all([
    collections.repoFiles.deleteMany({ repository_id: repository._id }),
    collections.commits.deleteMany({ repository_id: repository._id }),
    collections.dependencies.deleteMany({ repository_id: repository._id }),
    collections.documentation.deleteMany({ repository_id: repository._id }),
  ])
  await collections.repositories.deleteOne({ _id: repository._id })

  return true
}

export async function listRepoFilesWithCollections(repositoryId, collections, options = {}) {
  const records = await collections.repoFiles.find({ repository_id: repositoryId }).toArray()
  const page = paginate(sortByStringField(records, 'file_path'), options)

  return { ...page, items: page.items.map(serializeFile) }
}

export async function listCommitsForRepositoryWithCollections(repositoryId, collections, options = {}) {
  const records = await collections.commits.find({ repository_id: repositoryId }).toArray()
  const sorted = [...records].sort((left, right) => new Date(right.commit_date || 0) - new Date(left.commit_date || 0))
  const page = paginate(sorted, options)

  return { ...page, items: page.items.map(serializeCommit) }
}

export async function listAllCommitsForRepositoryWithCollections(repositoryId, collections) {
  return collections.commits.find({ repository_id: repositoryId }).toArray()
}

export async function listDependenciesForRepositoryWithCollections(repositoryId, collections, options = {}) {
  const records = await collections.dependencies.find({ repository_id: repositoryId }).toArray()
  const page = paginate(sortByStringField(records, 'source_file'), options)

  return { ...page, items: page.items.map(serializeDependency) }
}

export async function listDocumentationForRepositoryWithCollections(repositoryId, collections, options = {}) {
  const records = await collections.documentation.find({ repository_id: repositoryId }).toArray()
  const page = paginate(sortByStringField(records, 'doc_path'), options)

  return { ...page, items: page.items.map(serializeDocumentation) }
}
