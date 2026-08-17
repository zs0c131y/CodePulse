function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const ACTIVE_ANALYSIS_STATUSES = ['queued', 'running']

function unwrapUpdatedDocument(result) {
  if (!result) return null
  return result.value === undefined ? result : result.value
}

function isDuplicateKeyError(error) {
  return error?.code === 11000 || error?.code === 11001
}

export async function queueRepositoryAnalysisWithCollection(input, repositories, options = {}) {
  const now = options.now || new Date()
  const repository = input.repository
  const queuePatch = {
    user_id: input.userId,
    repo_name: repository.name,
    repo_full_name: repository.fullName,
    repo_url: repository.webUrl,
    clone_url: repository.cloneUrl,
    status: 'queued',
    scan_id: input.scanId,
    commit_limit: input.commitLimit,
    error: null,
    queued_at: now,
    started_at: null,
    completed_at: null,
    failed_at: null,
    worker_id: null,
    lease_expires_at: null,
    updated_at: now,
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await repositories.findOneAndUpdate(
        {
          user_id: input.userId,
          repo_url: repository.webUrl,
          status: { $nin: ACTIVE_ANALYSIS_STATUSES },
        },
        {
          $set: queuePatch,
          $setOnInsert: {
            total_files: 0,
            total_commits: 0,
            total_dependencies: 0,
            total_documentation: 0,
            created_at: now,
          },
        },
        { upsert: true, returnDocument: 'after' },
      )
      const queuedRepository = unwrapUpdatedDocument(result)

      if (!queuedRepository) {
        throw new Error('Repository analysis could not be queued.')
      }

      return {
        repositoryId: queuedRepository._id,
        scanId: input.scanId,
        status: 'queued',
        shouldStart: true,
      }
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error

      const activeRepository = await repositories.findOne({
        user_id: input.userId,
        repo_url: repository.webUrl,
      })

      if (activeRepository && ACTIVE_ANALYSIS_STATUSES.includes(activeRepository.status)) {
        return {
          repositoryId: activeRepository._id,
          scanId: activeRepository.scan_id || null,
          status: activeRepository.status,
          shouldStart: false,
        }
      }

      if (attempt === 1) throw error
    }
  }

  throw new Error('Repository analysis could not be queued.')
}

async function updateRepositoryLifecycleWithCollection(input, repositories, filter, patch) {
  const result = await repositories.updateOne(
    {
      _id: input.repositoryId,
      user_id: input.userId,
      scan_id: input.scanId,
      ...filter,
    },
    { $set: patch },
  )

  return (result?.matchedCount ?? result?.modifiedCount ?? 0) > 0
}

export async function markRepositoryAnalysisRunningWithCollection(input, repositories, options = {}) {
  const now = options.now || new Date()
  const leaseTtlMs = options.leaseTtlMs || 10 * 60 * 1000
  return updateRepositoryLifecycleWithCollection(
    input,
    repositories,
    { status: 'queued' },
    {
      status: 'running',
      error: null,
      started_at: now,
      completed_at: null,
      failed_at: null,
      ...(input.workerId
        ? {
            worker_id: input.workerId,
            lease_expires_at: new Date(now.getTime() + leaseTtlMs),
          }
        : {}),
      updated_at: now,
    },
  )
}

export async function markRepositoryAnalysisCompletedWithCollection(input, repositories, options = {}) {
  const now = options.now || new Date()
  return updateRepositoryLifecycleWithCollection(
    input,
    repositories,
    { status: 'running', ...(input.workerId ? { worker_id: input.workerId } : {}) },
    {
      status: 'completed',
      error: null,
      completed_at: now,
      failed_at: null,
      worker_id: null,
      lease_expires_at: null,
      updated_at: now,
    },
  )
}

export async function markRepositoryAnalysisFailedWithCollection(input, repositories, options = {}) {
  const now = options.now || new Date()
  return updateRepositoryLifecycleWithCollection(
    input,
    repositories,
    {
      status: { $in: ACTIVE_ANALYSIS_STATUSES },
      ...(input.workerId ? { worker_id: input.workerId } : {}),
    },
    {
      status: 'failed',
      error: String(input.error || 'Repository analysis failed.').slice(0, 500),
      completed_at: null,
      failed_at: now,
      worker_id: null,
      lease_expires_at: null,
      updated_at: now,
    },
  )
}

export async function renewRepositoryAnalysisLeaseWithCollection(input, repositories, options = {}) {
  const now = options.now || new Date()
  const leaseTtlMs = options.leaseTtlMs || 10 * 60 * 1000
  return updateRepositoryLifecycleWithCollection(
    input,
    repositories,
    { status: 'running', worker_id: input.workerId },
    {
      lease_expires_at: new Date(now.getTime() + leaseTtlMs),
      updated_at: now,
    },
  )
}

async function replaceChildRecords(collection, repositoryId, records) {
  await collection.deleteMany({ repository_id: repositoryId })

  if (records.length > 0) {
    await collection.insertMany(records, { ordered: false })
  }
}

export async function persistRepositoryAnalysisWithCollections(analysis, collections, options = {}) {
  const now = new Date()
  const repositoryFilter = options.repositoryId
    ? {
        _id: options.repositoryId,
        user_id: analysis.userId,
        ...(options.scanId ? { scan_id: options.scanId } : {}),
        ...(options.workerId ? { worker_id: options.workerId, status: 'running' } : {}),
      }
    : {
        user_id: analysis.userId,
        repo_url: analysis.repository.repoUrl,
      }
  const status = options.status || 'completed'
  const repositoryPatch = {
    user_id: analysis.userId,
    repo_name: analysis.repository.repoName,
    repo_full_name: analysis.repository.repoFullName,
    repo_url: analysis.repository.repoUrl,
    clone_url: analysis.repository.cloneUrl,
    default_branch: analysis.repository.defaultBranch,
    status,
    error: null,
    total_files: analysis.files.length,
    total_commits: analysis.commits.length,
    total_dependencies: analysis.dependencies.length,
    total_documentation: analysis.documentation.length,
    updated_at: now,
  }

  if (status === 'completed') {
    repositoryPatch.completed_at = now
    repositoryPatch.failed_at = null
  }

  let repository = await collections.repositories.findOne(repositoryFilter)

  if (repository) {
    const updateResult = await collections.repositories.updateOne(
      repositoryFilter,
      { $set: repositoryPatch },
    )
    if ((updateResult?.matchedCount ?? updateResult?.modifiedCount ?? 0) === 0) {
      const error = new Error('Repository analysis lease is no longer active.')
      error.code = 'REPOSITORY_ANALYSIS_STALE'
      throw error
    }
    repository = { ...repository, ...repositoryPatch }
  } else if (!options.repositoryId) {
    const insertResult = await collections.repositories.insertOne({
      ...repositoryPatch,
      created_at: now,
    })
    repository = {
      _id: insertResult.insertedId,
      ...repositoryPatch,
      created_at: now,
    }
  } else {
    const error = new Error('Repository analysis is no longer active for this owner.')
    error.code = 'REPOSITORY_ANALYSIS_STALE'
    throw error
  }

  const repositoryId = repository._id

  await replaceChildRecords(
    collections.repoFiles,
    repositoryId,
    analysis.files.map(file => ({
      repository_id: repositoryId,
      file_path: file.path,
      file_name: file.name,
      extension: file.extension,
      file_type: file.file_type,
      language: file.language,
      size: file.size,
      depth: file.depth,
    })),
  )

  await replaceChildRecords(
    collections.documentation,
    repositoryId,
    analysis.documentation.map(doc => ({
      repository_id: repositoryId,
      doc_path: doc.doc_path,
      file_name: doc.file_name,
      documentation_type: doc.documentation_type,
      content_summary: doc.content_summary,
      content: doc.content,
      size: doc.size,
      truncated: doc.truncated,
    })),
  )

  await replaceChildRecords(
    collections.commits,
    repositoryId,
    analysis.commits.map(commit => ({
      repository_id: repositoryId,
      commit_hash: commit.commit_hash,
      author: commit.author,
      author_email: commit.author_email,
      message: commit.message,
      commit_date: toDate(commit.commit_date),
      changed_files: commit.changed_files,
    })),
  )

  await replaceChildRecords(
    collections.dependencies,
    repositoryId,
    analysis.dependencies.map(dependency => ({
      repository_id: repositoryId,
      source_file: dependency.source_file,
      target_file: dependency.target_file,
      dependency_type: dependency.dependency_type,
      import_path: dependency.import_path,
      resolved: dependency.resolved,
    })),
  )

  return {
    repositoryId,
    summary: {
      repository: {
        id: repositoryId.toString(),
        name: repository.repo_name,
        fullName: repository.repo_full_name,
        url: repository.repo_url,
        defaultBranch: repository.default_branch,
      },
      totalFiles: analysis.files.length,
      totalDocumentation: analysis.documentation.length,
      totalCommits: analysis.commits.length,
      totalDependencies: analysis.dependencies.length,
    },
  }
}

