import { Router } from 'express'
import { requireAccessToken } from '../../middleware/requireAccessToken.js'
import { createIntegrationAuthorization, listConnectedRepositories, listIntegrations } from './controller.js'

const router = Router()
router.get('/api/integrations', requireAccessToken, listIntegrations)
router.get('/api/integrations/repositories', requireAccessToken, listConnectedRepositories)
router.post('/api/integrations/:provider/authorize', requireAccessToken, createIntegrationAuthorization)
export default router
