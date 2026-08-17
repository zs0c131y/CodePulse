import { ObjectId } from 'mongodb'
import {
  getCodeAnalysisSummariesCollection,
  getCodeFactsCollection,
  getDocumentationAnalysisSummariesCollection,
  getDocumentationFactsCollection,
} from '../../../db/index.js'
import {
  persistStructuredAnalysisWithCollections,
  normalizeFactPagination,
  serializeCodeAnalysis,
  serializeDocumentationAnalysis,
} from './structuredAnalysisStoreCore.js'

function normalizeMongoId(value) {
  if (value instanceof ObjectId) return value
  if (typeof value === 'string' && ObjectId.isValid(value)) return new ObjectId(value)
  return value
}

export async function getStructuredAnalysisCollections(overrides = {}) {
  return {
    codeAnalysisSummaries: overrides.codeAnalysisSummaries || (await getCodeAnalysisSummariesCollection()),
    codeFacts: overrides.codeFacts || (await getCodeFactsCollection()),
    documentationAnalysisSummaries: overrides.documentationAnalysisSummaries || (await getDocumentationAnalysisSummariesCollection()),
    documentationFacts: overrides.documentationFacts || (await getDocumentationFactsCollection()),
  }
}

export async function persistStructuredAnalysis(input, options = {}) {
  const collections = await getStructuredAnalysisCollections(options.collections || {})
  return persistStructuredAnalysisWithCollections(
    { ...input, repositoryId: normalizeMongoId(input.repositoryId) },
    collections,
  )
}

export async function getCodeAnalysis(repositoryId, options = {}) {
  const normalizedRepositoryId = normalizeMongoId(repositoryId)
  const collections = await getStructuredAnalysisCollections()
  const summary = await collections.codeAnalysisSummaries.findOne({ repository_id: normalizedRepositoryId })
  if (!summary) return null
  const { limit, skip } = normalizeFactPagination(options)
  const filter = {
    repository_id: normalizedRepositoryId,
    ...(summary.scan_id ? { scan_id: summary.scan_id } : {}),
  }
  const [facts, total] = await Promise.all([
    collections.codeFacts.find(filter).sort({ file_path: 1 }).skip(skip).limit(limit).toArray(),
    collections.codeFacts.countDocuments(filter),
  ])
  return serializeCodeAnalysis(summary, facts, { prePaginated: true, total, limit, skip })
}

export async function getDocumentationAnalysis(repositoryId, options = {}) {
  const normalizedRepositoryId = normalizeMongoId(repositoryId)
  const collections = await getStructuredAnalysisCollections()
  const summary = await collections.documentationAnalysisSummaries.findOne({ repository_id: normalizedRepositoryId })
  if (!summary) return null
  const { limit, skip } = normalizeFactPagination(options)
  const filter = {
    repository_id: normalizedRepositoryId,
    ...(summary.scan_id ? { scan_id: summary.scan_id } : {}),
  }
  const [facts, total] = await Promise.all([
    collections.documentationFacts.find(filter).sort({ doc_path: 1 }).skip(skip).limit(limit).toArray(),
    collections.documentationFacts.countDocuments(filter),
  ])
  return serializeDocumentationAnalysis(summary, facts, { prePaginated: true, total, limit, skip })
}
