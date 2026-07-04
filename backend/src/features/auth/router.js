import { Router } from 'express'
import { authRateLimiter } from '../../middleware/rateLimiter.js'
import { requireAccessToken } from '../../middleware/requireAccessToken.js'
import {
  signup,
  resendVerification,
  verifyEmail,
  signin,
  refresh,
  logout,
  me,
  updateProfile,
  updateSettings,
  requestPasswordReset,
  resetPassword,
} from './controler/credentials.controller.js'
import { redirectToGithub, githubCallback } from './controler/github.controller.js'
import { redirectToGitlab, gitlabCallback } from './controler/gitlab.controller.js'

const router = Router()

router.post('/api/auth/signup', authRateLimiter, signup)
router.post('/api/auth/resend-verification', authRateLimiter, resendVerification)
router.post('/api/auth/verify-email', authRateLimiter, verifyEmail)
router.post('/api/auth/signin', authRateLimiter, signin)
router.post('/api/auth/refresh', authRateLimiter, refresh)
router.post('/api/auth/logout', logout)
router.get('/api/auth/me', requireAccessToken, me)
router.patch('/api/auth/profile', requireAccessToken, updateProfile)
router.patch('/api/auth/settings', requireAccessToken, updateSettings)
router.post('/api/auth/request-password-reset', authRateLimiter, requestPasswordReset)
router.post('/api/auth/reset-password', authRateLimiter, resetPassword)

router.get('/auth/github', authRateLimiter, redirectToGithub)
router.get('/auth/github/callback', authRateLimiter, githubCallback)
router.get('/auth/gitlab', authRateLimiter, redirectToGitlab)
router.get('/auth/gitlab/callback', authRateLimiter, gitlabCallback)

export default router
