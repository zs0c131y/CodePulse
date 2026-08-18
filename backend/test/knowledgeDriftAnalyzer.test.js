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
