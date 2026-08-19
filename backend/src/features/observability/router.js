import { Router } from 'express'
import { getMetrics } from './controller.js'

const router = Router()

router.get('/api/metrics', getMetrics)

export default router
