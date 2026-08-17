import { pingDatabase, getUsersCollection } from '../../db/index.js'
import { getAnalysisQueueSnapshot } from '../repositories/services/analysisQueue.js'

export function checkLiveness(_request, response) {
  response.json({ status: 'ok' })
}

export async function checkHealth(_request, response) {
  try {
    await pingDatabase()
    const users = await getUsersCollection()
    response.json({
      status: 'ok',
      store: 'mongodb',
      users: await users.estimatedDocumentCount(),
      analysisQueue: getAnalysisQueueSnapshot(),
    })
  } catch (error) {
    response.status(503).json({
      status: 'degraded',
      store: 'mongodb',
      message: 'Database is unavailable.',
      error: error.message,
    })
  }
}
