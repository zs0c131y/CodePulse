import { METRICS_TOKEN } from '../../config/index.js'
import { getAnalysisQueueSnapshot } from '../repositories/services/analysisQueue.js'
import { getRepositoriesCollection, getUsersCollection, getReportsCollection } from '../../db/index.js'
import {
  renderMetrics,
  analysisQueueActiveWorkers,
  analysisQueuePendingJobs,
  analysisQueueScheduledJobs,
  dbCollectionDocuments,
} from '../../observability/metrics.js'

const defaultDeps = {
  getAnalysisQueueSnapshot,
  getRepositoriesCollection,
  getUsersCollection,
  getReportsCollection,
}

function isAuthorized(request) {
  if (!METRICS_TOKEN) return true
  const header = request.headers.authorization || ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null
  return bearer === METRICS_TOKEN || request.headers['x-metrics-token'] === METRICS_TOKEN
}

export function createObservabilityController(deps = defaultDeps) {
  async function getMetrics(request, response, next) {
    try {
      if (!isAuthorized(request)) {
        response.status(401).json({ message: 'A valid metrics token is required.' })
        return
      }

      const queueSnapshot = deps.getAnalysisQueueSnapshot()
      analysisQueueActiveWorkers.set({}, queueSnapshot.activeWorkers)
      analysisQueuePendingJobs.set({}, queueSnapshot.pendingJobs)
      analysisQueueScheduledJobs.set({}, queueSnapshot.scheduledJobs)

      const [repositories, users, reports] = await Promise.all([
        deps.getRepositoriesCollection(),
        deps.getUsersCollection(),
        deps.getReportsCollection(),
      ])
      const [repositoryCount, userCount, reportCount] = await Promise.all([
        repositories.estimatedDocumentCount(),
        users.estimatedDocumentCount(),
        reports.estimatedDocumentCount(),
      ])
      dbCollectionDocuments.set({ collection: 'repositories' }, repositoryCount)
      dbCollectionDocuments.set({ collection: 'users' }, userCount)
      dbCollectionDocuments.set({ collection: 'reports' }, reportCount)

      response.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
      response.send(renderMetrics())
    } catch (error) {
      next(error)
    }
  }

  return { getMetrics }
}

export const { getMetrics } = createObservabilityController()
