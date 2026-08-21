import { randomUUID } from 'node:crypto'
import { ObjectId } from 'mongodb'
import {
  getRepositoriesCollection,
  getRepoFilesCollection,
  getCommitsCollection,
  getDependenciesCollection,
  getDocumentationCollection,
} from '../../../db/index.js'
import {
  markRepositoryAnalysisCompletedWithCollection,
  markRepositoryAnalysisFailedWithCollection,
  markRepositoryAnalysisRunningWithCollection,
  updateRepositoryAnalysisProgressWithCollection,
  pauseRepositoryAnalysisWithCollection,
  cancelRepositoryAnalysisWithCollection,
  resumeRepositoryAnalysisWithCollection,
  renewRepositoryAnalysisLeaseWithCollection,
  persistRepositoryAnalysisWithCollections,
  queueRepositoryAnalysisWithCollection,
} from './repositoryStoreCore.js'

function normalizeMongoId(value) {
  if (value instanceof ObjectId) return value
  if (typeof value === 'string' && ObjectId.isValid(value)) return new ObjectId(value)
  return value
}

export async function getRepositoryCollections(overrides = {}) {
  return {
    repositories: overrides.repositories || (await getRepositoriesCollection()),
    repoFiles: overrides.repoFiles || (await getRepoFilesCollection()),
    commits: overrides.commits || (await getCommitsCollection()),
    dependencies: overrides.dependencies || (await getDependenciesCollection()),
    documentation: overrides.documentation || (await getDocumentationCollection()),
  }
}

export async function persistRepositoryAnalysis(analysis, options = {}) {
  const collections = await getRepositoryCollections(options.collections || {})

  return persistRepositoryAnalysisWithCollections(
    {
      ...analysis,
      userId: normalizeMongoId(analysis.userId),
    },
    collections,
    {
      repositoryId: normalizeMongoId(options.repositoryId),
      scanId: options.scanId,
      status: options.status,
      workerId: options.workerId,
    },
  )
}

export async function queueRepositoryAnalysis(input, options = {}) {
  const repositories = options.collections?.repositories || await getRepositoriesCollection()

  return queueRepositoryAnalysisWithCollection(
    {
      ...input,
      userId: normalizeMongoId(input.userId),
      scanId: input.scanId || randomUUID(),
    },
    repositories,
    options,
  )
}

export async function markRepositoryAnalysisRunning(input, options = {}) {
  const repositories = options.collections?.repositories || await getRepositoriesCollection()
  return markRepositoryAnalysisRunningWithCollection(
    {
      ...input,
      repositoryId: normalizeMongoId(input.repositoryId),
      userId: normalizeMongoId(input.userId),
    },
    repositories,
    options,
  )
}

export async function renewRepositoryAnalysisLease(input, options = {}) {
  const repositories = options.collections?.repositories || await getRepositoriesCollection()
  return renewRepositoryAnalysisLeaseWithCollection(
    {
      ...input,
      repositoryId: normalizeMongoId(input.repositoryId),
      userId: normalizeMongoId(input.userId),
    },
    repositories,
    options,
  )
}

export async function markRepositoryAnalysisCompleted(input, options = {}) {
  const repositories = options.collections?.repositories || await getRepositoriesCollection()
  return markRepositoryAnalysisCompletedWithCollection(
    {
      ...input,
      repositoryId: normalizeMongoId(input.repositoryId),
      userId: normalizeMongoId(input.userId),
    },
    repositories,
    options,
  )
}

export async function markRepositoryAnalysisFailed(input, options = {}) {
  const repositories = options.collections?.repositories || await getRepositoriesCollection()
  return markRepositoryAnalysisFailedWithCollection(
    {
      ...input,
      repositoryId: normalizeMongoId(input.repositoryId),
      userId: normalizeMongoId(input.userId),
    },
    repositories,
    options,
  )
}

export async function updateRepositoryAnalysisProgress(input, options = {}) {
  const repositories = options.collections?.repositories || await getRepositoriesCollection()
  return updateRepositoryAnalysisProgressWithCollection(
    {
      ...input,
      repositoryId: normalizeMongoId(input.repositoryId),
      userId: normalizeMongoId(input.userId),
    },
    repositories,
    options,
  )
}

export async function pauseRepositoryAnalysis(input, options = {}) {
  const repositories = options.collections?.repositories || await getRepositoriesCollection()
  return pauseRepositoryAnalysisWithCollection(
    { ...input, repositoryId: normalizeMongoId(input.repositoryId), userId: normalizeMongoId(input.userId) },
    repositories,
    options,
  )
}

export async function cancelRepositoryAnalysis(input, options = {}) {
  const repositories = options.collections?.repositories || await getRepositoriesCollection()
  return cancelRepositoryAnalysisWithCollection(
    { ...input, repositoryId: normalizeMongoId(input.repositoryId), userId: normalizeMongoId(input.userId) },
    repositories,
    options,
  )
}

export async function resumeRepositoryAnalysis(input, options = {}) {
  const repositories = options.collections?.repositories || await getRepositoriesCollection()
  return resumeRepositoryAnalysisWithCollection(
    { ...input, repositoryId: normalizeMongoId(input.repositoryId), userId: normalizeMongoId(input.userId) },
    repositories,
    options,
  )
}

