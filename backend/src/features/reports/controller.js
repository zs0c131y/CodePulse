import { ObjectId } from 'mongodb'
import { isValidShareToken } from './reportStoreCore.js'
import { reportService } from './reportService.js'

function parseObjectId(value) {
  return typeof value === 'string' && ObjectId.isValid(value) ? new ObjectId(value) : null
}

function noStore(response) {
  if (typeof response.set === 'function') response.set('Cache-Control', 'no-store')
}

export function createReportsController(service = reportService) {
  async function createRepositoryReport(request, response, next) {
    try {
      const repositoryId = parseObjectId(request.params.repositoryId)
      if (!repositoryId) {
        response.status(400).json({ message: 'Invalid repository id.' })
        return
      }

      const result = await service.createRepositoryReport(request.user._id, repositoryId)
      if (result.kind === 'repository-not-found') {
        response.status(404).json({ message: 'Repository not found.' })
        return
      }
      if (result.kind === 'analysis-unavailable') {
        response.status(409).json({ message: 'A completed analysis is required before generating a report.' })
        return
      }

      noStore(response)
      response.status(201).json({ report: result.report })
    } catch (error) {
      next(error)
    }
  }

  async function listReports(request, response, next) {
    try {
      let repositoryId = null
      if (request.query?.repositoryId !== undefined) {
        repositoryId = parseObjectId(request.query.repositoryId)
        if (!repositoryId) {
          response.status(400).json({ message: 'Invalid repository id.' })
          return
        }
      }

      const page = await service.listReportsForOwner(
        request.user._id,
        repositoryId,
        { limit: request.query?.limit, skip: request.query?.skip },
      )
      response.json(page)
    } catch (error) {
      next(error)
    }
  }

  async function getReport(request, response, next) {
    try {
      const reportId = parseObjectId(request.params.reportId)
      if (!reportId) {
        response.status(400).json({ message: 'Invalid report id.' })
        return
      }

      const report = await service.getReportForOwner(request.user._id, reportId)
      if (!report) {
        response.status(404).json({ message: 'Report not found.' })
        return
      }

      response.json({ report })
    } catch (error) {
      next(error)
    }
  }

  async function shareReport(request, response, next) {
    try {
      const reportId = parseObjectId(request.params.reportId)
      if (!reportId) {
        response.status(400).json({ message: 'Invalid report id.' })
        return
      }

      const shared = await service.enableReportSharing(request.user._id, reportId)
      if (!shared) {
        response.status(404).json({ message: 'Report not found.' })
        return
      }

      noStore(response)
      response.json(shared)
    } catch (error) {
      next(error)
    }
  }

  async function revokeReportShare(request, response, next) {
    try {
      const reportId = parseObjectId(request.params.reportId)
      if (!reportId) {
        response.status(400).json({ message: 'Invalid report id.' })
        return
      }

      const report = await service.disableReportSharing(request.user._id, reportId)
      if (!report) {
        response.status(404).json({ message: 'Report not found.' })
        return
      }

      noStore(response)
      response.json({ message: 'Report share link revoked.', report })
    } catch (error) {
      next(error)
    }
  }

  async function getSharedReport(request, response, next) {
    try {
      const token = request.params.shareToken
      if (!isValidShareToken(token)) {
        response.status(404).json({ message: 'Shared report not found.' })
        return
      }

      const report = await service.getReportByShareToken(token)
      if (!report) {
        response.status(404).json({ message: 'Shared report not found.' })
        return
      }

      noStore(response)
      response.json({ report })
    } catch (error) {
      next(error)
    }
  }

  return {
    createRepositoryReport,
    listReports,
    getReport,
    shareReport,
    revokeReportShare,
    getSharedReport,
  }
}

export const {
  createRepositoryReport,
  listReports,
  getReport,
  shareReport,
  revokeReportShare,
  getSharedReport,
} = createReportsController()
