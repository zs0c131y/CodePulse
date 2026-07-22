import { Router } from 'express'
import { requireAccessToken } from '../../middleware/requireAccessToken.js'
import { listConnectedRepositories, listIntegrations } from './controller.js'

const router = Router()
router.get('/api/integrations', requireAccessToken, listIntegrations)
router.get('/api/integrations/repositories', requireAccessToken, listConnectedRepositories)
export default router
