import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createAiExplainabilityService,
  buildRiskExplanationPrompt,
  buildDriftExplanationPrompt,
  buildExecutiveSummaryPrompt,
  parseRiskExplanationResponse,
  parseDriftExplanationResponse,
  AiProviderError,
} from '../src/features/analysis/services/aiExplainabilityService.js'

function createModuleCollection(records) {
  return {
    async findOne(query) {
      return records.find(record => record.repository_id === query.repository_id && record.file_path === query.file_path) || null
    },
    find(query) {
      const matched = records
        .filter(record => record.repository_id === query.repository_id)
        .sort((left, right) => (right.debt_score ?? 0) - (left.debt_score ?? 0))
      return {
        sort() { return this },
        limit(count) {
          this._limit = count
          return this
        },
        async toArray() { return matched.slice(0, this._limit ?? matched.length) },
      }
    },
  }
}

function createDriftFindingsCollection(records) {
  return {
    async findOne(query) {
      return records.find(record => (
        record._id === query._id && record.repository_id === query.repository_id
      )) || null
    },
  }
}

function createExplanationsCollection() {
  const store = []
  return {
    store,
    async insertOne(record) {
      const id = `explanation-${store.length + 1}`
      store.push({ ...record, _id: id })
      return { insertedId: id }
    },
    find(query) {
      const matched = store.filter(record => (
        record.repository_id === query.repository_id
        && record.kind === query.kind
        && record.key === query.key
      )).sort((left, right) => right.created_at.getTime() - left.created_at.getTime())
      return {
        sort() { return this },
        limit(count) {
          this._limit = count
          return this
        },
        async next() { return matched.slice(0, this._limit ?? matched.length)[0] || null },
      }
    },
  }
}

function createDeps(overrides = {}) {
  const moduleRecords = overrides.moduleRecords || [
    {
      repository_id: 'repo-1',
      file_path: 'src/billing.js',
      risk: 'Critical',
      debt_score: 84,
      complexity: 22,
      complexity_method: 'metadata-heuristic',
      duplication_percent: null,
      churn_percent: 40,
      is_circular: true,
      contributor_concentration_percent: 70,
      dependency_depth: 5,
      reasons: ['File exceeds recommended size', 'Participates in a circular dependency'],
    },
  ]
  const explanations = overrides.explanationsCollection || createExplanationsCollection()
  const driftFindingRecords = overrides.driftFindingRecords || [
    {
      _id: 'finding-1',
      repository_id: 'repo-1',
      finding_key: 'semantic_mismatch:src/auth.js:docs/auth.md:0',
      drift_type: 'semantic_mismatch',
      title: 'Review documentation alignment for src/auth.js',
      file_path: 'docs/auth.md',
      module_path: 'src',
      evidence: 'Code and documentation summaries have 24% semantic similarity.',
      semantic: {
        similarity: 0.24,
        threshold: 0.42,
        model: 'all-MiniLM-L6-v2',
        codeSection: 'function authenticate(request) { return verifyOAuthToken(request.headers.authorization) }',
        documentationSection: '## Auth\nAuthentication uses a signed JWT passed in the Authorization header.',
      },
    },
  ]

  return {
    isAiExplainabilityConfigured: () => true,
    async callGemma() {
      return JSON.stringify({
        explanation: 'The module carries high risk due to size and coupling.',
        implications: ['Onboarding is harder', 'Regressions are likely'],
        action_plan: [{ step: 1, title: 'Break the cycle', description: 'Invert the dependency.', priority: 'High' }],
      })
    },
    async getRepositoryScore() { return { _id: 'score-1' } },
    async getRepositoryKnowledgeDrift() { return { score: { _id: 'score-1' }, findings: [] } },
    serializeAnalysisScores() {
      return { healthScore: 62, technicalDebt: { grade: 'C' }, knowledgeDebt: { score: 40 } }
    },
    serializeKnowledgeDrift() {
      return { findings: [{ filePath: 'docs/auth.md', title: 'Outdated auth flow', severity: 'High' }] }
    },
    async getTechnicalDebtMetricsCollection() { return createModuleCollection(moduleRecords) },
    async getDriftFindingsCollection() { return createDriftFindingsCollection(driftFindingRecords) },
    async getAiExplanationsCollection() { return explanations },
    now: () => new Date('2026-08-19T00:00:00.000Z'),
    ...overrides,
  }
}

test('buildRiskExplanationPrompt embeds module evidence and asks for structured JSON', () => {
  const { system, user } = buildRiskExplanationPrompt({
    path: 'src/billing.js',
    risk: 'critical',
    debtScore: 84,
    complexity: 22,
    churnPercent: 40,
    inCircularDependency: true,
    reasons: ['File exceeds recommended size'],
  })

  assert.match(system, /CodePulse-Refactor-Copilot/)
  assert.match(user, /src\/billing\.js/)
  assert.match(user, /CRITICAL RISK/)
  assert.match(user, /File exceeds recommended size/)
  assert.match(user, /"action_plan"/)
})

test('buildExecutiveSummaryPrompt falls back to placeholder text when there is no risk or drift evidence', () => {
  const { user } = buildExecutiveSummaryPrompt({
    repositoryName: 'demo',
    scores: { healthScore: 90, technicalDebt: { grade: 'A' }, knowledgeDebt: { score: 5 } },
    topRisks: [],
    topDrift: [],
  })

  assert.match(user, /No high-risk modules identified/)
  assert.match(user, /No documentation drift findings recorded/)
})

test('parseRiskExplanationResponse accepts fenced JSON and rejects malformed shapes', () => {
  const fenced = '```json\n{"explanation":"x","implications":[],"action_plan":[]}\n```'
  const parsed = parseRiskExplanationResponse(fenced)
  assert.equal(parsed.explanation, 'x')

  assert.throws(() => parseRiskExplanationResponse('not json'), AiProviderError)
  assert.throws(() => parseRiskExplanationResponse('{"explanation":"x"}'), AiProviderError)
})

test('generateRiskExplanation returns not-configured without calling the model when AI is disabled', async () => {
  let called = false
  const service = createAiExplainabilityService(createDeps({
    isAiExplainabilityConfigured: () => false,
    async callGemma() { called = true },
  }))

  const result = await service.generateRiskExplanation('repo-1', 'src/billing.js')
  assert.deepEqual(result, { kind: 'not-configured' })
  assert.equal(called, false)
})

test('generateRiskExplanation returns module-not-found for modules without persisted debt metrics', async () => {
  const service = createAiExplainabilityService(createDeps({ moduleRecords: [] }))
  const result = await service.generateRiskExplanation('repo-1', 'src/missing.js')
  assert.deepEqual(result, { kind: 'module-not-found' })
})

test('generateRiskExplanation persists a structured, traceable explanation and getRiskExplanation reads it back', async () => {
  const service = createAiExplainabilityService(createDeps())

  const generated = await service.generateRiskExplanation('repo-1', 'src/billing.js')
  assert.equal(generated.kind, 'generated')
  assert.equal(generated.explanation.kind, 'risk')
  assert.equal(generated.explanation.key, 'src/billing.js')
  assert.equal(generated.explanation.output.explanation, 'The module carries high risk due to size and coupling.')
  assert.equal(generated.explanation.promptVersion, 1)
  assert.ok(generated.explanation.generatedAt)

  const cached = await service.getRiskExplanation('repo-1', 'src/billing.js')
  assert.equal(cached.output.actionPlan[0].title, 'Break the cycle')
})

test('generateRiskExplanation surfaces provider failures instead of persisting a partial record', async () => {
  const explanations = createExplanationsCollection()
  const service = createAiExplainabilityService(createDeps({
    explanationsCollection: explanations,
    async callGemma() { throw new AiProviderError('boom') },
  }))

  await assert.rejects(() => service.generateRiskExplanation('repo-1', 'src/billing.js'), AiProviderError)
  assert.equal(explanations.store.length, 0)
})

test('buildDriftExplanationPrompt embeds the semantic finding evidence and asks for structured JSON', () => {
  const { system, user } = buildDriftExplanationPrompt({
    filePath: 'docs/auth.md',
    driftType: 'semantic_mismatch',
    description: 'Review documentation alignment for src/auth.js',
    codeInterface: 'function authenticate(request) { return verifyOAuthToken(...) }',
    documentationContent: 'Authentication uses a signed JWT.',
  })

  assert.match(system, /CodePulse-Drift-Analyzer/)
  assert.match(user, /docs\/auth\.md/)
  assert.match(user, /semantic_mismatch/)
  assert.match(user, /verifyOAuthToken/)
  assert.match(user, /signed JWT/)
  assert.match(user, /"remediation"/)
})

test('buildDriftExplanationPrompt degrades gracefully when code/doc sections were not captured', () => {
  const { user } = buildDriftExplanationPrompt({
    filePath: 'src/module',
    driftType: 'missing_documentation',
    description: 'No documentation found for src/module',
    codeInterface: null,
    documentationContent: null,
  })

  assert.match(user, /Not captured for this finding type\./)
})

test('parseDriftExplanationResponse accepts fenced JSON and rejects malformed shapes', () => {
  const fenced = '```json\n{"explanation":"x","evidence":"y","remediation":"z"}\n```'
  const parsed = parseDriftExplanationResponse(fenced)
  assert.deepEqual(parsed, { explanation: 'x', evidence: 'y', remediation: 'z' })

  assert.throws(() => parseDriftExplanationResponse('not json'), AiProviderError)
  assert.throws(() => parseDriftExplanationResponse('{"explanation":"x"}'), AiProviderError)
})

test('generateDriftExplanation returns finding-not-found for ids outside the repository', async () => {
  const service = createAiExplainabilityService(createDeps())
  const result = await service.generateDriftExplanation('repo-1', 'missing-finding')
  assert.deepEqual(result, { kind: 'finding-not-found' })
})

test('generateDriftExplanation persists a structured explanation built from the semantic finding and getDriftExplanation reads it back', async () => {
  let capturedPrompt
  const service = createAiExplainabilityService(createDeps({
    async callGemma(prompt) {
      capturedPrompt = prompt
      return JSON.stringify({
        explanation: 'The documentation still describes JWT auth, but the code now verifies OAuth tokens.',
        evidence: 'verifyOAuthToken(...) vs. "Authentication uses a signed JWT."',
        remediation: '- Authentication uses a signed JWT.\n+ Authentication uses OAuth2 access tokens.',
      })
    },
  }))

  const generated = await service.generateDriftExplanation('repo-1', 'finding-1')
  assert.equal(generated.kind, 'generated')
  assert.equal(generated.explanation.kind, 'drift')
  assert.equal(generated.explanation.key, 'finding-1')
  assert.match(generated.explanation.output.explanation, /OAuth tokens/)
  assert.match(capturedPrompt.user, /verifyOAuthToken/)

  const cached = await service.getDriftExplanation('repo-1', 'finding-1')
  assert.match(cached.output.remediation, /OAuth2 access tokens/)
})

test('generateDriftExplanation surfaces provider failures instead of persisting a partial record', async () => {
  const explanations = createExplanationsCollection()
  const service = createAiExplainabilityService(createDeps({
    explanationsCollection: explanations,
    async callGemma() { throw new AiProviderError('boom') },
  }))

  await assert.rejects(() => service.generateDriftExplanation('repo-1', 'finding-1'), AiProviderError)
  assert.equal(explanations.store.length, 0)
})

test('generateExecutiveSummary requires a completed analysis before calling the model', async () => {
  const service = createAiExplainabilityService(createDeps({
    async getRepositoryScore() { return null },
  }))

  const result = await service.generateExecutiveSummary('repo-1', 'demo')
  assert.deepEqual(result, { kind: 'analysis-unavailable' })
})

test('generateExecutiveSummary persists the generated summary and getExecutiveSummary reads the latest one', async () => {
  const service = createAiExplainabilityService(createDeps({
    async callGemma({ user }) {
      assert.match(user, /Top 3 Risk Modules/)
      return 'Paragraph one.\n\nParagraph two.\n\nParagraph three.'
    },
  }))

  const generated = await service.generateExecutiveSummary('repo-1', 'demo')
  assert.equal(generated.kind, 'generated')
  assert.equal(generated.explanation.kind, 'summary')
  assert.match(generated.explanation.output.summary, /Paragraph one/)

  const cached = await service.getExecutiveSummary('repo-1')
  assert.match(cached.output.summary, /Paragraph three/)
})

test('getRiskExplanation, getDriftExplanation, and getExecutiveSummary return null when nothing was generated yet', async () => {
  const service = createAiExplainabilityService(createDeps())
  assert.equal(await service.getRiskExplanation('repo-1', 'src/unknown.js'), null)
  assert.equal(await service.getDriftExplanation('repo-1', 'finding-1'), null)
  assert.equal(await service.getExecutiveSummary('repo-1'), null)
})
