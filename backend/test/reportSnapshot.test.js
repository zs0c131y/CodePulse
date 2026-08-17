import test from 'node:test'
import assert from 'node:assert/strict'
import {
  REPORT_SCHEMA,
  REPORT_SCHEMA_VERSION,
  REPORT_SECTION_BYTE_LIMIT,
  REPORT_SECTION_LIMITS,
  buildReportSnapshot,
} from '../src/features/reports/reportSnapshot.js'

function baseInput(overrides = {}) {
  return {
    repository: {
      id: 'repo-1',
      name: 'codepulse',
      fullName: 'openai/codepulse',
      url: 'https://github.com/openai/codepulse',
      defaultBranch: 'main',
      totalFiles: 120,
      totalCommits: 45,
      totalDependencies: 88,
      totalDocumentation: 6,
      updatedAt: '2026-08-11T12:00:00.000Z',
    },
    scores: {
      healthScore: 81,
      technicalDebt: { score: 24, grade: 'B' },
      knowledgeDebt: { score: 18, documentationCoverage: 82 },
      drift: { total: 2, high: 1, low: 1 },
      risk: { score: 28, criticalModules: 0 },
      recommendationsReady: 1,
      generatedAt: '2026-08-11T12:00:00.000Z',
    },
    technicalDebt: {
      metrics: { technicalDebtScore: 24, grade: 'B' },
      modules: [{ path: 'src/app.js', reasons: ['Large file'] }],
      generatedAt: '2026-08-11T12:00:00.000Z',
    },
    knowledgeDrift: {
      findings: [{ id: 'finding-1', evidence: 'No adjacent documentation.' }],
      coverage: [{ label: 'Module documentation', percent: 82 }],
      generatedAt: '2026-08-11T12:00:00.000Z',
    },
    recommendations: [{ id: 'recommendation-1', title: 'Split the module' }],
    contributors: [{ name: 'Ada', commitCount: 4 }],
    analysisVersion: 1,
    generatedAt: new Date('2026-08-12T08:00:00.000Z'),
    ...overrides,
  }
}

test('buildReportSnapshot creates a versioned persistence-safe report contract', () => {
  const input = baseInput()
  const snapshot = buildReportSnapshot(input)

  assert.equal(snapshot.schema, REPORT_SCHEMA)
  assert.equal(snapshot.version, REPORT_SCHEMA_VERSION)
  assert.equal(snapshot.generatedAt, '2026-08-12T08:00:00.000Z')
  assert.deepEqual(snapshot.sourceAnalysis, {
    version: 1,
    analyzedAt: '2026-08-11T12:00:00.000Z',
  })
  assert.equal(snapshot.repository.fullName, 'openai/codepulse')
  assert.deepEqual(snapshot.repository.totals, {
    files: 120,
    commits: 45,
    dependencies: 88,
    documentation: 6,
  })
  assert.equal(snapshot.summary.healthScore, 81)
  assert.equal(snapshot.sections.technicalDebt.status, 'included')
  assert.equal(snapshot.sections.technicalDebt.items[0].path, 'src/app.js')
  assert.equal(snapshot.sections.knowledgeDrift.items[0].id, 'finding-1')
  assert.equal(snapshot.sections.recommendations.totalItems, 1)
  assert.equal(snapshot.sections.contributors.totalItems, 1)

  input.technicalDebt.modules[0].path = 'mutated.js'
  assert.equal(snapshot.sections.technicalDebt.items[0].path, 'src/app.js')
})

test('buildReportSnapshot bounds evidence and reports truncation explicitly', () => {
  const recommendations = Array.from(
    { length: REPORT_SECTION_LIMITS.recommendations + 5 },
    (_, index) => ({ id: `recommendation-${index}` }),
  )

  const snapshot = buildReportSnapshot(baseInput({ recommendations }))
  const section = snapshot.sections.recommendations

  assert.equal(section.totalItems, REPORT_SECTION_LIMITS.recommendations + 5)
  assert.equal(section.includedItems, REPORT_SECTION_LIMITS.recommendations)
  assert.equal(section.items.length, REPORT_SECTION_LIMITS.recommendations)
  assert.equal(section.truncated, true)
})

test('buildReportSnapshot marks unavailable evidence sources without inventing data', () => {
  const snapshot = buildReportSnapshot(baseInput({ technicalDebt: null, knowledgeDrift: null }))

  assert.equal(snapshot.sections.technicalDebt.status, 'unavailable')
  assert.equal(snapshot.sections.technicalDebt.metrics, null)
  assert.equal(snapshot.sections.knowledgeDrift.status, 'unavailable')
  assert.deepEqual(snapshot.sections.knowledgeDrift.coverage, [])
})

test('buildReportSnapshot redacts contributor emails and enforces UTF-8 byte budgets', () => {
  const recommendations = Array.from({ length: 20 }, (_, index) => ({
    id: `recommendation-${index}`,
    title: 'x'.repeat(200_000),
  }))
  const snapshot = buildReportSnapshot(baseInput({
    recommendations,
    contributors: [{ name: 'Ada', email: 'ada@example.com', commitCount: 4 }],
  }))

  assert.equal(snapshot.sections.contributors.items[0].email, undefined)
  assert.equal(JSON.stringify(snapshot).includes('ada@example.com'), false)
  assert.ok(snapshot.sections.recommendations.includedBytes <= REPORT_SECTION_BYTE_LIMIT)
  assert.equal(snapshot.sections.recommendations.truncated, true)
})
