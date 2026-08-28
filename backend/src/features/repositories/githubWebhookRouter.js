import { Router } from 'express'
import { receiveGitHubWebhook } from './githubWebhookController.js'

const router = Router()
router.post('/api/webhooks/github', receiveGitHubWebhook)

export default router
