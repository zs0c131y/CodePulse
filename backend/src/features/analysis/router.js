import { Router } from 'express'
import { requireAccessToken } from '../../middleware/requireAccessToken.js'
import { getRepositoryDebt, getRepositoryScores } from './controller.js'

const router = Router()

router.get('/api/repositories/:repositoryId/scores', requireAccessToken, getRepositoryScores)
router.get('/api/repositories/:repositoryId/debt', requireAccessToken, getRepositoryDebt)

export default router
