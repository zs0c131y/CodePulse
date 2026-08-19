import { createHash, randomBytes } from 'node:crypto'

const SHARE_TOKEN_BYTES = 32
const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
export const DEFAULT_REPORT_PAGE_LIMIT = 50
export const MAX_REPORT_PAGE_LIMIT = 200

function toIso(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function idString(value) {
  return value?.toString?.() || String(value)
}

function unwrapUpdatedDocument(result) {
  if (!result) return null
  return result.value === undefined ? result : result.value
}

export function isValidShareToken(token) {
  return typeof token === 'string' && SHARE_TOKEN_PATTERN.test(token)
}

export function createShareToken(randomBytesImpl = randomBytes) {
  return randomBytesImpl(SHARE_TOKEN_BYTES).toString('base64url')
}

export function hashShareToken(token) {
  if (!isValidShareToken(token)) return null
  return createHash('sha256').update(token).digest('hex')
}

export function normalizeReportPagination(options = {}) {
  const requestedLimit = Number(options.limit)
  const requestedSkip = Number(options.skip)
  return {
    limit: Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_REPORT_PAGE_LIMIT)
      : DEFAULT_REPORT_PAGE_LIMIT,
    skip: Number.isInteger(requestedSkip) && requestedSkip >= 0 ? requestedSkip : 0,
  }
}

export function serializeReport(record, { includeSections = true } = {}) {
  if (!record) return null

  const snapshot = record.snapshot || {}
  const report = {
    id: idString(record._id),
    schema: snapshot.schema || record.schema,
    version: snapshot.version ?? record.schema_version ?? null,
    generatedAt: snapshot.generatedAt || toIso(record.generated_at),
    sourceAnalysis: snapshot.sourceAnalysis || null,
    repository: snapshot.repository || null,
    summary: snapshot.summary || null,
    sharing: {
      enabled: typeof record.share_token_hash === 'string'
        && (!record.share_expires_at || new Date(record.share_expires_at) > new Date()),
      sharedAt: toIso(record.shared_at),
      expiresAt: toIso(record.share_expires_at),
    },
  }

  if (includeSections) report.sections = snapshot.sections || {}
  return report
}

export async function insertReportWithCollection({ ownerId, repositoryId, snapshot, now }, reports) {
  const createdAt = now instanceof Date ? now : new Date(now)
  const record = {
    owner_id: ownerId,
    repository_id: repositoryId,
    schema: snapshot.schema,
    schema_version: snapshot.version,
    snapshot,
    generated_at: new Date(snapshot.generatedAt),
    source_analyzed_at: snapshot.sourceAnalysis?.analyzedAt
      ? new Date(snapshot.sourceAnalysis.analyzedAt)
      : null,
    created_at: createdAt,
    updated_at: createdAt,
  }
  const result = await reports.insertOne(record)
  return { _id: result.insertedId, ...record }
}

export async function listReportsForOwnerWithCollection(ownerId, repositoryId, reports, options = {}) {
  const filter = { owner_id: ownerId }
  if (repositoryId) filter.repository_id = repositoryId

  const { limit, skip } = normalizeReportPagination(options)
  const [records, total] = await Promise.all([
    reports.find(filter).sort({ created_at: -1, _id: -1 }).skip(skip).limit(limit).toArray(),
    reports.countDocuments(filter),
  ])
  return {
    reports: records.map(record => serializeReport(record, { includeSections: false })),
    total,
    limit,
    skip,
  }
}

export async function findReportForOwnerWithCollection(ownerId, reportId, reports) {
  return reports.findOne({ _id: reportId, owner_id: ownerId })
}

export async function enableSharingWithCollection({ ownerId, reportId, tokenHash, now, expiresAt }, reports) {
  const result = await reports.findOneAndUpdate(
    { _id: reportId, owner_id: ownerId },
    {
      $set: {
        share_token_hash: tokenHash,
        shared_at: now,
        share_expires_at: expiresAt,
        updated_at: now,
      },
    },
    { returnDocument: 'after' },
  )
  return unwrapUpdatedDocument(result)
}

export async function disableSharingWithCollection({ ownerId, reportId, now }, reports) {
  const result = await reports.findOneAndUpdate(
    { _id: reportId, owner_id: ownerId },
    {
      $unset: { share_token_hash: '', shared_at: '', share_expires_at: '' },
      $set: { updated_at: now },
    },
    { returnDocument: 'after' },
  )
  return unwrapUpdatedDocument(result)
}

export async function findReportByShareTokenWithCollection(tokenHash, reports, now = new Date()) {
  if (!tokenHash) return null
  return reports.findOne({ share_token_hash: tokenHash, share_expires_at: { $gt: now } })
}
