import { Router } from 'express'
import { authRateLimiter } from '../../middleware/rateLimiter.js'
import { requireAccessToken } from '../../middleware/requireAccessToken.js'
import {
  signup,
  verifyEmail,
  signin,
  refresh,
  logout,
  me,
  requestPasswordReset,
  resetPassword,
} from './controler/credentials.controller.js'

const router = Router()

router.post('/api/auth/signup', authRateLimiter, signup)
router.post('/api/auth/verify-email', authRateLimiter, verifyEmail)
router.post('/api/auth/signin', authRateLimiter, signin)
router.post('/api/auth/refresh', authRateLimiter, refresh)
router.post('/api/auth/logout', logout)
router.get('/api/auth/me', requireAccessToken, me)
router.post('/api/auth/request-password-reset', authRateLimiter, requestPasswordReset)
router.post('/api/auth/reset-password', authRateLimiter, resetPassword)

export default router
