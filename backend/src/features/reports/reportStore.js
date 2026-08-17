import { ObjectId } from 'mongodb'
import { REPORT_SHARE_TTL_DAYS } from '../../config/index.js'
import { getReportsCollection } from '../../db/index.js'
import {
  createShareToken,
  hashShareToken,
  serializeReport,
  insertReportWithCollection,
  listReportsForOwnerWithCollection,
  findReportForOwnerWithCollection,
  enableSharingWithCollection,
  disableSharingWithCollection,
  findReportByShareTokenWithCollection,
} from './reportStoreCore.js'

function normalizeMongoId(value) {
  if (value instanceof ObjectId) return value
  if (typeof value === 'string' && ObjectId.isValid(value)) return new ObjectId(value)
  return value
}

export async function persistReport({ ownerId, repositoryId, snapshot, now }) {
  const reports = await getReportsCollection()
  const record = await insertReportWithCollection(
    {
      ownerId: normalizeMongoId(ownerId),
      repositoryId: normalizeMongoId(repositoryId),
      snapshot,
      now,
    },
    reports,
  )
  return serializeReport(record)
}

export async function listReportsForOwner(ownerId, repositoryId, options = {}) {
  const reports = await getReportsCollection()
  return listReportsForOwnerWithCollection(
    normalizeMongoId(ownerId),
    repositoryId ? normalizeMongoId(repositoryId) : null,
    reports,
    options,
  )
}

export async function getReportForOwner(ownerId, reportId) {
  const reports = await getReportsCollection()
  const record = await findReportForOwnerWithCollection(
    normalizeMongoId(ownerId),
    normalizeMongoId(reportId),
    reports,
  )
  return serializeReport(record)
}

export async function enableReportSharing(ownerId, reportId, now = new Date()) {
  const reports = await getReportsCollection()
  const token = createShareToken()
  const expiresAt = new Date(now.getTime() + REPORT_SHARE_TTL_DAYS * 24 * 60 * 60 * 1000)
  const record = await enableSharingWithCollection(
    {
      ownerId: normalizeMongoId(ownerId),
      reportId: normalizeMongoId(reportId),
      tokenHash: hashShareToken(token),
      now,
      expiresAt,
    },
    reports,
  )

  if (!record) return null
  return {
    report: serializeReport(record),
    share: {
      token,
      path: `/api/reports/shared/${token}`,
      createdAt: toIso(now),
      expiresAt: toIso(expiresAt),
    },
  }
}

export async function disableReportSharing(ownerId, reportId, now = new Date()) {
  const reports = await getReportsCollection()
  const record = await disableSharingWithCollection(
    {
      ownerId: normalizeMongoId(ownerId),
      reportId: normalizeMongoId(reportId),
      now,
    },
    reports,
  )
  return serializeReport(record)
}

export async function getReportByShareToken(token) {
  const tokenHash = hashShareToken(token)
  if (!tokenHash) return null

  const reports = await getReportsCollection()
  const record = await findReportByShareTokenWithCollection(tokenHash, reports, new Date())
  return serializeReport(record)
}

function toIso(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
