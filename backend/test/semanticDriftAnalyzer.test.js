import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSemanticDrift } from '../src/features/analysis/services/semanticDriftAnalyzer.js'

test('flags low-similarity module documentation as a review lead with traceable evidence', async () => {
  const result = await analyzeSemanticDrift({
    files: [{ path: 'src/auth/oauth.js', file_type: 'code', language: 'JavaScript' }],
    documentation: [{
      doc_path: 'docs/auth.md',
      content: '# Authentication\nThis guide explains JWT token signing, verification, refresh tokens, and bearer token middleware for every request.',
    }],
  }, {
    enabled: true,
    codeOutlines: [{
      path: 'src/auth/oauth.js',
      modulePath: 'src/auth',
      summary: 'src/auth/oauth.js is a JavaScript module. Defines OAuth callback handlers and provider authorization routes.',
    }],
    embeddingClient: {
      model: 'sentence-transformers/test',
      async embed() { return [[1, 0], [0, 1]] },
      async persistVectors() { return false },
    },
    threshold: 0.55,
  })

  assert.equal(result.findings.length, 1)
  assert.equal(result.findings[0].type, 'semantic_mismatch')
  assert.equal(result.findings[0].semantic.similarity, 0)
  assert.match(result.findings[0].evidence, /review lead/i)
})
