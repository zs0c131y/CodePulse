import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeKnowledgeDebt } from '../src/features/analysis/services/knowledgeDebtAnalyzer.js'
import { analyzeKnowledgeDrift } from '../src/features/analysis/services/knowledgeDriftAnalyzer.js'

function codeFile(path) {
  return { path, file_type: 'code', language: 'JavaScript', size: 400 }
}

test('finds missing module documentation, stale documentation, and dead source references', () => {
  const analysis = {
    files: [codeFile('src/auth/session.js'), codeFile('src/payments/charge.js')],
    documentation: [
      { doc_path: 'docs/auth.md', documentation_type: 'guide', content: '# Auth\nUses `src/deleted.js`.' },
    ],
    commits: [
      { commit_date: '2026-05-01T00:00:00.000Z', changed_files: ['docs/auth.md'] },
      { commit_date: '2026-07-15T00:00:00.000Z', changed_files: ['src/auth/session.js'] },
    ],
  }
  const knowledgeDebt = analyzeKnowledgeDebt(analysis)
  const result = analyzeKnowledgeDrift(analysis, knowledgeDebt, { now: '2026-07-20T00:00:00.000Z' })
  const types = result.findings.map(finding => finding.type)

  assert.ok(types.includes('missing_documentation'))
  assert.ok(types.includes('outdated_documentation'))
  assert.ok(types.includes('dead_reference'))
  assert.equal(result.metrics.total, 3)
  assert.ok(result.score > 0)
})

test('finds deterministic API contract drift in both directions', () => {
  const analysis = {
    files: [codeFile('src/api.js')],
    documentation: [],
    commits: [],
    codeAnalysis: {
      routes: [
        { method: 'GET', path: '/api/live', filePath: 'src/api.js' },
        { method: 'POST', path: '/api/matched', filePath: 'src/api.js' },
      ],
    },
    documentationAnalysis: {
      facts: {
        api: {
          endpoints: [
            { method: 'POST', path: '/api/matched', docPath: 'docs/api.md' },
            { method: 'DELETE', path: '/api/removed', docPath: 'docs/api.md' },
          ],
        },
      },
    },
  }
  const result = analyzeKnowledgeDrift(analysis, analyzeKnowledgeDebt(analysis))

  assert.ok(result.findings.some(item => item.type === 'undocumented_api'))
  assert.ok(result.findings.some(item => item.type === 'stale_api_documentation'))
  assert.equal(result.findings.filter(item => /matched/.test(item.title)).length, 0)
})

test('gives each missing source reference a stable unique key, including root files', () => {
  const analysis = {
    files: [],
    commits: [],
    documentation: [{
      doc_path: 'README.md',
      content: 'See `app.js`, `src/removed.js`, and `src/also-removed.ts`.',
    }],
  }
  const result = analyzeKnowledgeDrift(analysis, analyzeKnowledgeDebt(analysis))
  const deadReferences = result.findings.filter(item => item.type === 'dead_reference')

  assert.equal(deadReferences.length, 3)
  assert.equal(new Set(deadReferences.map(item => item.key)).size, 3)
})

test('finds source API routes that are absent from documentation', () => {
  const analysis = { files: [codeFile('src/auth/routes.js')], documentation: [] }
  const knowledgeDebt = analyzeKnowledgeDebt(analysis, {
    codeOutlines: [{
      path: 'src/auth/routes.js',
      modulePath: 'src/auth',
      summary: 'Auth routes.',
      routes: [{ method: 'POST', path: '/oauth/callback' }],
    }],
  })
  const result = analyzeKnowledgeDrift(analysis, knowledgeDebt)
  const finding = result.findings.find(item => item.type === 'undocumented_api')

  assert.equal(finding.modulePath, 'src/auth')
  assert.match(finding.evidence, /POST \/oauth\/callback/)
})

test('gives two undocumented routes in the same file distinct keys', () => {
  const analysis = { files: [codeFile('src/auth/routes.js')], documentation: [] }
  const knowledgeDebt = analyzeKnowledgeDebt(analysis, {
    codeOutlines: [{
      path: 'src/auth/routes.js',
      modulePath: 'src/auth',
      summary: 'Auth routes.',
      routes: [
        { method: 'POST', path: '/oauth/callback' },
        { method: 'GET', path: '/oauth/status' },
      ],
    }],
  })
  const result = analyzeKnowledgeDrift(analysis, knowledgeDebt)
  const keys = result.findings.filter(item => item.type === 'undocumented_api').map(item => item.key)

  assert.equal(keys.length, 2)
  assert.equal(new Set(keys).size, 2)
})
