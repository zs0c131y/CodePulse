import { analyzeRepositorySource } from './services/repositoryAnalyzer.js'
import { persistRepositoryAnalysis } from './services/repositoryStore.js'

export async function analyzeRepository(request, response, next) {
  try {
    const repoUrl = String(request.body.repoUrl || request.body.repositoryUrl || '').trim()
    const commitLimit = Number.isInteger(request.body.commitLimit) ? request.body.commitLimit : 100

    if (!repoUrl) {
      response.status(400).json({ message: 'Repository URL is required.' })
      return
    }

    const result = await analyzeRepositorySource({
      sourceUrl: repoUrl,
      userId: request.user._id,
      commitLimit,
      persistAnalysis: persistRepositoryAnalysis,
    })

    response.status(201).json({
      message: 'Repository analyzed.',
      repositoryId: result.persisted.repositoryId.toString(),
      summary: result.summary,
    })
  } catch (error) {
    if (error.statusCode) {
      response.status(error.statusCode).json({ message: error.message })
      return
    }

    next(error)
  }
}

