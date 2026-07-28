import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeKnowledgeDebt } from '../src/features/analysis/services/knowledgeDebtAnalyzer.js'

function codeFile(path) {
  return { path, file_type: 'code', language: 'JavaScript', size: 100 }
}

test('measures module documentation coverage without letting a root README cover every module', () => {
  const result = analyzeKnowledgeDebt({
    files: [
      codeFile('index.js'),
      codeFile('src/auth/session.js'),
      codeFile('src/billing/invoice.js'),
    ],
    documentation: [
      {
        doc_path: 'README.md',
        documentation_type: 'readme',
        content: '# Demo\n## Installation\nnpm install\n',
      },
      {
        doc_path: 'docs/auth.md',
        documentation_type: 'guide',
        content: '# Auth\n',
      },
      {
        doc_path: 'docs/architecture.md',
        documentation_type: 'guide',
        content: '# Architecture\n```mermaid\ngraph TD\n```',
      },
    ],
  })

  assert.equal(result.metrics.totalModules, 3)
  assert.equal(result.metrics.documentedModules, 2)
  assert.equal(result.metrics.undocumentedModules, 1)
  assert.equal(result.metrics.documentationCoverage, 67)
  assert.equal(result.metrics.hasArchitectureDocumentation, true)
  assert.equal(result.metrics.hasSetupDocumentation, true)
  assert.deepEqual(result.undocumentedModules, ['src/billing'])
  assert.equal(result.moduleMetrics.find(module => module.path === 'src/billing').documented, false)
  assert.ok(result.score > 0)
})

test('reports complete module coverage when no production modules exist', () => {
  const result = analyzeKnowledgeDebt({
    files: [{ path: 'README.md', file_type: 'documentation' }],
    documentation: [{ doc_path: 'README.md', documentation_type: 'readme', content: '# Notes' }],
  })

  assert.equal(result.metrics.totalModules, 0)
  assert.equal(result.metrics.documentationCoverage, 100)
  assert.equal(result.metrics.onboardingDifficultyScore, 0)
  assert.equal(result.score, 0)
  assert.deepEqual(result.moduleMetrics, [])
})
