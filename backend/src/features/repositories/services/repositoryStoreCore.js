function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

async function replaceChildRecords(collection, repositoryId, records) {
  await collection.deleteMany({ repository_id: repositoryId })

  if (records.length > 0) {
    await collection.insertMany(records, { ordered: false })
  }
}

export async function persistRepositoryAnalysisWithCollections(analysis, collections) {
  const now = new Date()
  const repositoryFilter = {
    user_id: analysis.userId,
    repo_url: analysis.repository.repoUrl,
  }
  const repositoryPatch = {
    user_id: analysis.userId,
    repo_name: analysis.repository.repoName,
    repo_full_name: analysis.repository.repoFullName,
    repo_url: analysis.repository.repoUrl,
    clone_url: analysis.repository.cloneUrl,
    default_branch: analysis.repository.defaultBranch,
    status: 'completed',
    total_files: analysis.files.length,
    total_commits: analysis.commits.length,
    total_dependencies: analysis.dependencies.length,
    total_documentation: analysis.documentation.length,
    updated_at: now,
  }

  let repository = await collections.repositories.findOne(repositoryFilter)

  if (repository) {
    await collections.repositories.updateOne(
      { _id: repository._id },
      { $set: repositoryPatch },
    )
    repository = { ...repository, ...repositoryPatch }
  } else {
    const insertResult = await collections.repositories.insertOne({
      ...repositoryPatch,
      created_at: now,
    })
    repository = {
      _id: insertResult.insertedId,
      ...repositoryPatch,
      created_at: now,
    }
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

