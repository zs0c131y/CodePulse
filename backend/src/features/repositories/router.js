import { Router } from 'express'
import { requireAccessToken } from '../../middleware/requireAccessToken.js'
import { analyzeRepository } from './controller.js'
import { pause, cancel, resume } from './scanControlController.js'
import {
  listRepositories,
  getRepository,
  deleteRepository,
  updateRepositorySchedule,
  getRepositoryFiles,
  getRepositoryCommits,
  getRepositoryDependencies,
  getRepositoryDocumentation,
  getRepositoryCodeAnalysis,
  getRepositoryDocumentationAnalysis,
  getRepositoryContributors,
  getRepositoryManifest,
} from './readController.js'

const router = Router()

router.post('/api/repositories/analyze', requireAccessToken, analyzeRepository)
router.post('/api/repositories/:repositoryId/pause', requireAccessToken, pause)
router.post('/api/repositories/:repositoryId/resume', requireAccessToken, resume)
router.post('/api/repositories/:repositoryId/cancel', requireAccessToken, cancel)
router.get('/api/repositories', requireAccessToken, listRepositories)
router.get('/api/repositories/:repositoryId', requireAccessToken, getRepository)
router.delete('/api/repositories/:repositoryId', requireAccessToken, deleteRepository)
router.patch('/api/repositories/:repositoryId/schedule', requireAccessToken, updateRepositorySchedule)
router.get('/api/repositories/:repositoryId/files', requireAccessToken, getRepositoryFiles)
router.get('/api/repositories/:repositoryId/commits', requireAccessToken, getRepositoryCommits)
router.get('/api/repositories/:repositoryId/dependencies', requireAccessToken, getRepositoryDependencies)
router.get('/api/repositories/:repositoryId/documentation', requireAccessToken, getRepositoryDocumentation)
router.get('/api/repositories/:repositoryId/code-analysis', requireAccessToken, getRepositoryCodeAnalysis)
router.get('/api/repositories/:repositoryId/documentation-analysis', requireAccessToken, getRepositoryDocumentationAnalysis)
router.get('/api/repositories/:repositoryId/contributors', requireAccessToken, getRepositoryContributors)
router.get('/api/repositories/:repositoryId/manifest', requireAccessToken, getRepositoryManifest)

export default router

