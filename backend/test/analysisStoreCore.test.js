import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAnalysisResults } from '../src/features/analysis/services/analysisScorer.js'
import {
  persistAnalysisResultsWithCollections,
  serializeAnalysisScores,
  serializeTechnicalDebt,
  serializeKnowledgeDrift,
} from '../src/features/analysis/services/analysisStoreCore.js'

class FakeCollection {
  constructor() {
    this.records = []
    this.nextId = 1
  }

  matches(record, filter) {
    return Object.entries(filter).every(([key, value]) => record[key] === value)
  }

  async findOne(filter) {
    return this.records.find(record => this.matches(record, filter)) || null
  }

  async updateOne(filter, update) {
    const record = await this.findOne(filter)
    if (record && update.$set) Object.assign(record, update.$set)
    return { matchedCount: record ? 1 : 0 }
  }

  async insertOne(record) {
    const inserted = { _id: `fake-${this.nextId++}`, ...record }
    this.records.push(inserted)
    return { insertedId: inserted._id }
  }

  async deleteMany(filter) {
    this.records = this.records.filter(record => !this.matches(record, filter))
  }

  async insertMany(records) {
    for (const record of records) await this.insertOne(record)
  }
}

function createCollections() {
  return {
    repositoryScores: new FakeCollection(),
    repositoryScoreHistory: new FakeCollection(),
    technicalDebtMetrics: new FakeCollection(),
    knowledgeDebtMetrics: new FakeCollection(),
    driftFindings: new FakeCollection(),
    recommendations: new FakeCollection(),
  }
}

function analysis(files) {
  return {
    files,
    documentation: [{ doc_path: 'README.md', documentation_type: 'readme', content: '# Demo\n## Setup\nRun npm install.' }],
    commits: [],
    dependencies: [],
  }
}

test('upserts repository scores and replaces module metric snapshots on a rescan', async () => {
  const collections = createCollections()
  const repositoryId = 'repo-1'
  const firstResults = buildAnalysisResults(analysis([
    { path: 'src/a.js', file_type: 'code', language: 'JavaScript', size: 1200 },
    { path: 'src/b.js', file_type: 'code', language: 'JavaScript', size: 1200 },
  ]))

  await persistAnalysisResultsWithCollections({
    repositoryId,
    results: firstResults,
    now: '2026-07-25T00:00:00.000Z',
  }, collections)

  assert.equal(collections.repositoryScores.records.length, 1)
  assert.equal(collections.repositoryScoreHistory.records.length, 1)
  assert.equal(collections.technicalDebtMetrics.records.length, 2)
  assert.equal(collections.knowledgeDebtMetrics.records.length, 1)
  assert.equal(collections.driftFindings.records.length, 1)

  const secondResults = buildAnalysisResults(analysis([
    { path: 'src/current.js', file_type: 'code', language: 'JavaScript', size: 2000 },
  ]))
  await persistAnalysisResultsWithCollections({
    repositoryId,
    results: secondResults,
    now: '2026-07-26T00:00:00.000Z',
  }, collections)

  assert.equal(collections.repositoryScores.records.length, 1)
  assert.equal(collections.repositoryScoreHistory.records.length, 2)
  assert.equal(collections.technicalDebtMetrics.records.length, 1)
  assert.equal(collections.technicalDebtMetrics.records[0].file_path, 'src/current.js')
  assert.equal(collections.knowledgeDebtMetrics.records.length, 1)
  assert.equal(collections.driftFindings.records.length, 1)

  const scorePayload = serializeAnalysisScores({
    ...collections.repositoryScores.records[0],
    score_history: collections.repositoryScoreHistory.records,
  })
  const debtPayload = serializeTechnicalDebt(collections.repositoryScores.records[0], collections.technicalDebtMetrics.records)
  const driftPayload = serializeKnowledgeDrift(collections.repositoryScores.records[0], collections.driftFindings.records)
  assert.equal(scorePayload.technicalDebt.score, secondResults.technicalDebt.score)
  assert.deepEqual(scorePayload.healthTrend, [firstResults.scores.healthScore, secondResults.scores.healthScore])
  assert.equal(scorePayload.risk.trend.length, 2)
  assert.equal(debtPayload.modules[0].path, 'src/current.js')
  assert.equal(driftPayload.findings[0].filePath, 'src')
})
