import { Router } from 'express'
import { checkHealth, checkLiveness } from './controller.js'

const router = Router()

router.get('/api/health', checkHealth)
router.get('/api/health/live', checkLiveness)

export default router
