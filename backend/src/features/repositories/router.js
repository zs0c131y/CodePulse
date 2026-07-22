import { Router } from 'express'
import { requireAccessToken } from '../../middleware/requireAccessToken.js'
import { analyzeRepository } from './controller.js'
import { listRepositories, getRepository, deleteRepository } from './readController.js'

const router = Router()

router.post('/api/repositories/analyze', requireAccessToken, analyzeRepository)
router.get('/api/repositories', requireAccessToken, listRepositories)
router.get('/api/repositories/:repositoryId', requireAccessToken, getRepository)
router.delete('/api/repositories/:repositoryId', requireAccessToken, deleteRepository)

export default router

