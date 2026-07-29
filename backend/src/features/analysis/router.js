import { Router } from 'express'
import { requireAccessToken } from '../../middleware/requireAccessToken.js'
import {
  getRepositoryDebt,
  getRepositoryScores,
  getRepositoryStatus,
  getRepositoryDrift,
  getRepositoryRecommendationList,
} from './controller.js'

const router = Router()

router.get('/api/repositories/:repositoryId/scores', requireAccessToken, getRepositoryScores)
router.get('/api/repositories/:repositoryId/debt', requireAccessToken, getRepositoryDebt)
router.get('/api/repositories/:repositoryId/status', requireAccessToken, getRepositoryStatus)
router.get('/api/repositories/:repositoryId/drift', requireAccessToken, getRepositoryDrift)
router.get('/api/repositories/:repositoryId/recommendations', requireAccessToken, getRepositoryRecommendationList)

export default router
