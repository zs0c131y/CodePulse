import test from 'node:test'
import assert from 'node:assert/strict'
import { createReportService } from '../src/features/reports/reportService.js'

function createDeps(overrides = {}) {
  return {
    async findRepositoryForUser() {
      return { _id: 'repo-1', repo_name: 'demo' }
    },
    serializeRepository() {
      return { id: 'repo-1', name: 'demo', url: 'https://github.com/example/demo' }
    },
    async getRepositoryScore() {
      return { analysis_version: 1 }
    },
    async getRepositoryTechnicalDebt() {
      return { score: { id: 'score-1' }, metrics: [{ file_path: 'src/app.js' }] }
    },
    async getRepositoryKnowledgeDrift() {
      return { score: { id: 'score-1' }, findings: [{ finding_key: 'drift-1' }] }
    },
    async getRepositoryRecommendations() {
      return [{ recommendation_key: 'recommendation-1' }]
    },
    async listAllCommitsForRepository() {
      return [{ author: 'Ada' }]
    },
    serializeAnalysisScores() {
      return { healthScore: 80, generatedAt: '2026-08-11T00:00:00.000Z' }
    },
    serializeTechnicalDebt() {
      return { metrics: { technicalDebtScore: 20 }, modules: [] }
    },
    serializeKnowledgeDrift() {
      return { findings: [], coverage: [] }
    },
    serializeRecommendations() {
      return [{ id: 'recommendation-1' }]
    },
    aggregateContributors() {
      return [{ name: 'Ada', commitCount: 1 }]
    },
    buildReportSnapshot(input) {
      return { schema: 'test', version: 1, input }
    },
    async persistReport(input) {
      return { id: 'report-1', persisted: input }
    },
    async listReportsForOwner() { return [] },
    async getReportForOwner() { return null },
    async enableReportSharing() { return null },
    async disableReportSharing() { return null },
    async getReportByShareToken() { return null },
    now() { return new Date('2026-08-12T08:00:00.000Z') },
    ...overrides,
  }
}

test('createRepositoryReport snapshots the same persisted evidence used by analysis APIs', async () => {
  const service = createReportService(createDeps())
  const result = await service.createRepositoryReport('user-1', 'repo-1')

  assert.equal(result.kind, 'created')
  assert.equal(result.report.id, 'report-1')
  assert.equal(result.report.persisted.ownerId, 'user-1')
  assert.equal(result.report.persisted.repositoryId, 'repo-1')
  assert.equal(result.report.persisted.snapshot.input.analysisVersion, 1)
  assert.deepEqual(result.report.persisted.snapshot.input.recommendations, [{ id: 'recommendation-1' }])
  assert.deepEqual(result.report.persisted.snapshot.input.contributors, [{ name: 'Ada', commitCount: 1 }])
})

test('createRepositoryReport preserves ownership and completed-analysis boundaries', async () => {
  let analysisRead = false
  const missingService = createReportService(createDeps({
    async findRepositoryForUser() { return null },
    async getRepositoryScore() { analysisRead = true },
  }))
  assert.deepEqual(await missingService.createRepositoryReport('user-1', 'repo-1'), {
    kind: 'repository-not-found',
  })
  assert.equal(analysisRead, false)

  const runningService = createReportService(createDeps({
    async findRepositoryForUser() { return { _id: 'repo-1', status: 'running' } },
    async getRepositoryScore() { analysisRead = true },
  }))
  assert.deepEqual(await runningService.createRepositoryReport('user-1', 'repo-1'), {
    kind: 'analysis-unavailable',
  })
  assert.equal(analysisRead, false)

  const unscoredService = createReportService(createDeps({
    async getRepositoryScore() { return null },
  }))
  assert.deepEqual(await unscoredService.createRepositoryReport('user-1', 'repo-1'), {
    kind: 'analysis-unavailable',
  })
})
