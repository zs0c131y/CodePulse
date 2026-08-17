import { Router } from 'express'
import { requireAccessToken } from '../../middleware/requireAccessToken.js'
import {
  createRepositoryReport,
  listReports,
  getReport,
  shareReport,
  revokeReportShare,
  getSharedReport,
} from './controller.js'

const router = Router()

router.get('/api/reports/shared/:shareToken', getSharedReport)
router.post('/api/repositories/:repositoryId/reports', requireAccessToken, createRepositoryReport)
router.get('/api/reports', requireAccessToken, listReports)
router.get('/api/reports/:reportId', requireAccessToken, getReport)
router.post('/api/reports/:reportId/share', requireAccessToken, shareReport)
router.delete('/api/reports/:reportId/share', requireAccessToken, revokeReportShare)

export default router
