import test from 'node:test'
import assert from 'node:assert/strict'
import { createUsageController } from '../src/features/auth/controler/usage.controller.js'

function collection(records) {
  return { find: () => ({ toArray: async () => records }) }
}

function createResponse() {
  return {
    body: undefined,
    json(payload) { this.body = payload },
  }
}

test('returns an account usage snapshot across the signed-in user repositories', async () => {
  const controller = createUsageController({
    async getRepositoriesCollection() { return collection([{ _id: 'repo-1' }, { _id: 'repo-2' }]) },
    async getRepositoryScoresCollection() { return collection([{ health_score: 80 }, { health_score: 60 }]) },
    async getDriftFindingsCollection() { return collection([{ _id: 'drift-1' }, { _id: 'drift-2' }]) },
    async getRecommendationsCollection() { return collection([{ _id: 'recommendation-1' }]) },
  })
  const response = createResponse()

  await controller.getUsageSnapshot({ user: { _id: 'user-1' } }, response, () => assert.fail('next should not be called'))

  assert.deepEqual(response.body, {
    usage: { repositories: 2, aiActions: 1, driftFindings: 2, averageHealthScore: 70 },
  })
})
