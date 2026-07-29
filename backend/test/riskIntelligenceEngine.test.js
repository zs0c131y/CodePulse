import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeRiskIntelligence } from '../src/features/analysis/services/riskIntelligenceEngine.js'
import { buildRecommendations } from '../src/features/analysis/services/recommendationEngine.js'

test('combines technical debt, missing documentation, drift, and churn into ranked risk', () => {
  const risk = analyzeRiskIntelligence({
    technicalDebt: {
      modules: [{
        path: 'src/auth/session.js',
        debtScore: 80,
        churnPercent: 90,
        reasons: ['Circular internal dependency', 'High churn (90%)'],
      }],
    },
    knowledgeDebt: {
      moduleMetrics: [{ path: 'src/auth', documented: false }],
    },
    drift: {
      findings: [{ modulePath: 'src/auth', filePath: 'docs/auth.md', severity: 'High', title: 'Documentation may lag src/auth' }],
    },
  })

  assert.equal(risk.modules[0].level, 'Critical')
  assert.equal(risk.metrics.criticalModules, 1)
  assert.ok(risk.modules[0].reasons.some(reason => /documentation is missing/i.test(reason)))

  const recommendations = buildRecommendations({ risk, drift: { findings: [] } })
  assert.equal(recommendations.length, 1)
  assert.match(recommendations[0].title, /dependency cycle/i)
})
