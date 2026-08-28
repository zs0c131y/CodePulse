import { getRepositoriesCollection } from '../../db/index.js'
import { parseGitHubRepositoryUrl } from './services/gitClient.js'
import { queueRepositoryAnalysis } from './services/repositoryStore.js'
import { enqueueRepositoryAnalysis } from './services/analysisQueue.js'
import { isValidGitHubWebhookSignature } from './services/githubPushWebhookService.js'

function isDefaultBranchPush(payload, repository) {
  return payload?.ref === `refs/heads/${repository.default_branch || 'main'}`
}

export function createGitHubWebhookController(deps = {}) {
  const repositories = deps.repositories || getRepositoriesCollection
  const queue = deps.queueRepositoryAnalysis || queueRepositoryAnalysis
  const enqueue = deps.enqueueRepositoryAnalysis || enqueueRepositoryAnalysis
  const parseUrl = deps.parseGitHubRepositoryUrl || parseGitHubRepositoryUrl
  const verify = deps.isValidGitHubWebhookSignature || isValidGitHubWebhookSignature

  return async function receiveGitHubWebhook(request, response, next) {
    try {
      if (!verify(request.rawBody, request.get('X-Hub-Signature-256'))) {
        response.status(401).json({ message: 'Invalid GitHub webhook signature.' })
        return
      }
      const event = request.get('X-GitHub-Event')
      if (event === 'ping') {
        response.status(200).json({ message: 'GitHub webhook verified.' })
        return
      }
      if (event !== 'push') {
        response.status(202).json({ message: 'Ignored GitHub event.' })
        return
      }

      const fullName = request.body?.repository?.full_name
      if (typeof fullName !== 'string') {
        response.status(202).json({ message: 'Ignored GitHub push without repository metadata.' })
        return
      }
      const repositoryCollection = await repositories()
      const tracked = await repositoryCollection.find({ repo_full_name: fullName, scan_trigger: 'github_push' }).toArray()
      let started = 0
      for (const record of tracked) {
        if (!isDefaultBranchPush(request.body, record)) continue
        const repository = parseUrl(record.repo_url)
        if (!repository) continue
        const queued = await queue(
          { userId: record.user_id, repository, commitLimit: record.commit_limit || 100 },
          { collections: { repositories: repositoryCollection } },
        )
        if (!queued.shouldStart) continue
        enqueue({
          userId: record.user_id,
          repositoryId: queued.repositoryId,
          scanId: queued.scanId,
          repoUrl: repository.webUrl,
          commitLimit: record.commit_limit || 100,
        })
        started += 1
      }
      response.status(202).json({ message: 'GitHub push received.', started })
    } catch (error) {
      next(error)
    }
  }
}

export const receiveGitHubWebhook = createGitHubWebhookController()
