import { Router } from 'express'
import { requireAccessToken } from '../../middleware/requireAccessToken.js'
import { analyzeRepository } from './controller.js'

const router = Router()

router.post('/api/repositories/analyze', requireAccessToken, analyzeRepository)

export default router

