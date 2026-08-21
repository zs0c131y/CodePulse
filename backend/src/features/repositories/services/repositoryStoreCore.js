function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const ACTIVE_ANALYSIS_STATUSES = ['queued', 'running']

function queuedProgress(now) {
  return {
    phase: 'queued',
    label: 'Queued',
    phase_progress: 0,
    overall_progress: 0,
    processed: null,
    total: null,
    message: 'Waiting for an analysis worker.',
    updated_at: now,
  }
}

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
    paused_at: null,
    cancelled_at: null,
    analysis_progress: queuedProgress(now),
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
      paused_at: null,
      cancelled_at: null,
      analysis_progress: {
        phase: 'cloning',
        label: 'Repository clone',
        phase_progress: 0,
        overall_progress: 1,
        processed: null,
        total: null,
        message: 'Starting filtered Git clone.',
        updated_at: now,
      },
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
      analysis_progress: {
        phase: 'completed',
        label: 'Analysis complete',
        phase_progress: 100,
        overall_progress: 100,
        processed: null,
        total: null,
        message: 'Repository analysis completed.',
        updated_at: now,
      },
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
      analysis_progress: {
        phase: 'failed',
        label: 'Analysis failed',
        phase_progress: 100,
        overall_progress: 100,
        processed: null,
        total: null,
        message: String(input.error || 'Repository analysis failed.').slice(0, 500),
        updated_at: now,
      },
      updated_at: now,
    },
  )
}

export async function updateRepositoryAnalysisProgressWithCollection(input, repositories, options = {}) {
  const now = options.now || new Date()
  const progress = input.progress || {}
  return updateRepositoryLifecycleWithCollection(
    input,
    repositories,
    { status: 'running', ...(input.workerId ? { worker_id: input.workerId } : {}) },
    {
      analysis_progress: {
        phase: String(progress.phase || 'running').slice(0, 80),
        label: String(progress.label || 'Repository analysis').slice(0, 120),
        phase_progress: Math.max(0, Math.min(100, Number(progress.phaseProgress) || 0)),
        overall_progress: Math.max(0, Math.min(100, Number(progress.overallProgress) || 0)),
        processed: Number.isFinite(progress.processed) ? Math.max(0, progress.processed) : null,
        total: Number.isFinite(progress.total) ? Math.max(0, progress.total) : null,
        message: progress.message ? String(progress.message).slice(0, 300) : null,
        updated_at: now,
      },
      updated_at: now,
    },
  )
}

export async function pauseRepositoryAnalysisWithCollection(input, repositories, options = {}) {
  const now = options.now || new Date()
  return updateRepositoryLifecycleWithCollection(
    input,
    repositories,
    { status: { $in: ACTIVE_ANALYSIS_STATUSES } },
    {
      status: 'paused',
      paused_at: now,
      worker_id: null,
      lease_expires_at: null,
      analysis_progress: {
        ...(input.progress || {}),
        message: 'Analysis paused. Resume restarts this scan from the beginning.',
        updated_at: now,
      },
      updated_at: now,
    },
  )
}

export async function cancelRepositoryAnalysisWithCollection(input, repositories, options = {}) {
  const now = options.now || new Date()
  return updateRepositoryLifecycleWithCollection(
    input,
    repositories,
    { status: { $in: [...ACTIVE_ANALYSIS_STATUSES, 'paused'] } },
    {
      status: 'cancelled',
      cancelled_at: now,
      worker_id: null,
      lease_expires_at: null,
      analysis_progress: {
        ...(input.progress || {}),
        message: 'Analysis cancelled.',
        updated_at: now,
      },
      updated_at: now,
    },
  )
}

export async function resumeRepositoryAnalysisWithCollection(input, repositories, options = {}) {
  const now = options.now || new Date()
  const result = await repositories.findOneAndUpdate(
    {
      _id: input.repositoryId,
      user_id: input.userId,
      status: 'paused',
    },
    {
      $set: {
        status: 'queued',
        scan_id: input.scanId,
        error: null,
        queued_at: now,
        started_at: null,
        completed_at: null,
        failed_at: null,
        paused_at: null,
        cancelled_at: null,
        worker_id: null,
        lease_expires_at: null,
        analysis_progress: queuedProgress(now),
        updated_at: now,
      },
    },
    { returnDocument: 'after' },
  )
  return unwrapUpdatedDocument(result)
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

async function replaceChildRecords(collection, repositoryId, records, serialize, options = {}) {
  await collection.deleteMany({ repository_id: repositoryId })

  const batchSize = options.batchSize || 1000
  for (let index = 0; index < records.length; index += batchSize) {
    const batch = records.slice(index, index + batchSize).map(record => serialize(record, repositoryId))
    if (batch.length > 0) await collection.insertMany(batch, { ordered: false })
    await options.onProgress?.({ processed: Math.min(index + batchSize, records.length), total: records.length })
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
    analysis.files,
    file => ({
      repository_id: repositoryId,
      file_path: file.path,
      file_name: file.name,
      extension: file.extension,
      file_type: file.file_type,
      language: file.language,
      ...(Number.isFinite(file.size) ? { size: file.size } : {}),
      depth: file.depth,
    }),
  )

  await replaceChildRecords(
    collections.documentation,
    repositoryId,
    analysis.documentation,
    doc => ({
      repository_id: repositoryId,
      doc_path: doc.doc_path,
      file_name: doc.file_name,
      documentation_type: doc.documentation_type,
      content_summary: doc.content_summary,
      content: doc.content,
      size: doc.size,
      truncated: doc.truncated,
    }),
  )

  await replaceChildRecords(
    collections.commits,
    repositoryId,
    analysis.commits,
    commit => ({
      repository_id: repositoryId,
      commit_hash: commit.commit_hash,
      author: commit.author,
      author_email: commit.author_email,
      message: commit.message,
      commit_date: toDate(commit.commit_date),
      changed_files: commit.changed_files,
    }),
  )

  await replaceChildRecords(
    collections.dependencies,
    repositoryId,
    analysis.dependencies,
    dependency => ({
      repository_id: repositoryId,
      source_file: dependency.source_file,
      target_file: dependency.target_file,
      dependency_type: dependency.dependency_type,
      import_path: dependency.import_path,
      resolved: dependency.resolved,
    }),
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

