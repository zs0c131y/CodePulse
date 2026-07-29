import {
  getRepositoriesCollection,
  getRepositoryScoresCollection,
  getDriftFindingsCollection,
  getRecommendationsCollection,
} from '../../../db/index.js'

const defaultReader = {
  getRepositoriesCollection,
  getRepositoryScoresCollection,
  getDriftFindingsCollection,
  getRecommendationsCollection,
}

export function createUsageController(deps = defaultReader) {
  async function getUsageSnapshot(request, response, next) {
    try {
      const [repositories, repositoryScores, driftFindings, recommendations] = await Promise.all([
        deps.getRepositoriesCollection(),
        deps.getRepositoryScoresCollection(),
        deps.getDriftFindingsCollection(),
        deps.getRecommendationsCollection(),
      ])
      const ownedRepositories = await repositories.find({ user_id: request.user._id }).toArray()
      const repositoryIds = ownedRepositories.map(repository => repository._id)

      if (repositoryIds.length === 0) {
        response.json({ usage: { repositories: 0, aiActions: 0, driftFindings: 0, averageHealthScore: 0 } })
        return
      }

      const filter = { repository_id: { $in: repositoryIds } }
      const [scores, drift, actions] = await Promise.all([
        repositoryScores.find(filter).toArray(),
        driftFindings.find(filter).toArray(),
        recommendations.find(filter).toArray(),
      ])
      const averageHealthScore = scores.length === 0
        ? 0
        : Math.round(scores.reduce((sum, score) => sum + Number(score.health_score || 0), 0) / scores.length)

      response.json({
        usage: {
          repositories: ownedRepositories.length,
          aiActions: actions.length,
          driftFindings: drift.length,
          averageHealthScore,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  return { getUsageSnapshot }
}

export const { getUsageSnapshot } = createUsageController()
