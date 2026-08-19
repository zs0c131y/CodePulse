import { Router } from 'express'
import { requireAccessToken } from '../../middleware/requireAccessToken.js'
import {
  getRepositoryDebt,
  getRepositoryScores,
  getRepositoryStatus,
  getRepositoryKnowledgeDebtReport,
  getRepositoryDrift,
  getRepositoryRecommendationList,
  reviewRepositoryDriftFinding,
} from './controller.js'
import {
  getAiStatus,
  postRiskExplanation,
  getRiskExplanation,
  postDriftExplanation,
  getDriftExplanation,
  postExecutiveSummary,
  getExecutiveSummary,
} from './aiController.js'

const router = Router()

router.get('/api/repositories/:repositoryId/scores', requireAccessToken, getRepositoryScores)
router.get('/api/repositories/:repositoryId/debt', requireAccessToken, getRepositoryDebt)
router.get('/api/repositories/:repositoryId/status', requireAccessToken, getRepositoryStatus)
router.get('/api/repositories/:repositoryId/knowledge-debt', requireAccessToken, getRepositoryKnowledgeDebtReport)
router.get('/api/repositories/:repositoryId/drift', requireAccessToken, getRepositoryDrift)
router.patch('/api/repositories/:repositoryId/drift/:findingId/review', requireAccessToken, reviewRepositoryDriftFinding)
router.get('/api/repositories/:repositoryId/recommendations', requireAccessToken, getRepositoryRecommendationList)

router.get('/api/repositories/:repositoryId/ai/status', requireAccessToken, getAiStatus)
router.post('/api/repositories/:repositoryId/ai/risk-explanation', requireAccessToken, postRiskExplanation)
router.get('/api/repositories/:repositoryId/ai/risk-explanation', requireAccessToken, getRiskExplanation)
router.post('/api/repositories/:repositoryId/ai/drift-explanation', requireAccessToken, postDriftExplanation)
router.get('/api/repositories/:repositoryId/ai/drift-explanation', requireAccessToken, getDriftExplanation)
router.post('/api/repositories/:repositoryId/ai/executive-summary', requireAccessToken, postExecutiveSummary)
router.get('/api/repositories/:repositoryId/ai/executive-summary', requireAccessToken, getExecutiveSummary)

export default router
