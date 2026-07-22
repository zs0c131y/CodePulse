import { Router } from 'express'
import { checkHealth } from './controller.js'

const router = Router()

router.get('/api/health', checkHealth)

export default router
