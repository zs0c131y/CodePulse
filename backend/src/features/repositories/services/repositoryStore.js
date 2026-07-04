import { ObjectId } from 'mongodb'
import {
  getRepositoriesCollection,
  getRepoFilesCollection,
  getCommitsCollection,
  getDependenciesCollection,
  getDocumentationCollection,
} from '../../../db/index.js'
import { persistRepositoryAnalysisWithCollections } from './repositoryStoreCore.js'

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
  )
}

