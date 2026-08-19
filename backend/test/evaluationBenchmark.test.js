import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildEvaluationCorpus, EVALUATION_NOW, EXPECTED } from './fixtures/evaluationCorpus.js'
import { parseRepositoryStructure } from '../src/features/repositories/services/fileParser.js'
import { extractDocumentation } from '../src/features/repositories/services/documentationExtractor.js'
import { extractCommitHistory } from '../src/features/repositories/services/commitExtractor.js'
import { generateDependencyGraph, getDependencyGraphCoverage } from '../src/features/repositories/services/dependencyGraph.js'
import { analyzeCodeStructure, CODE_ANALYSIS_VERSION } from '../src/features/repositories/services/codeAnalyzer.js'
import { analyzeDocumentation } from '../src/features/repositories/services/documentationAnalyzer.js'
import { extractCoverageReport } from '../src/features/repositories/services/coverageParser.js'
import { analyzeTechnicalDebt } from '../src/features/analysis/services/technicalDebtAnalyzer.js'
import { analyzeKnowledgeDebt } from '../src/features/analysis/services/knowledgeDebtAnalyzer.js'
import { analyzeKnowledgeDrift } from '../src/features/analysis/services/knowledgeDriftAnalyzer.js'

/**
 * Evaluation / quality benchmarking harness (docs/pending.md item 4). Runs
 * the real deterministic analysis pipeline — the same functions the backend
 * calls on every scan, no mocks — against a small, purpose-built fixture
 * repository with a closed, hand-labelled set of expected findings, and
 * reports precision/recall/F1 the way an accuracy regression test would.
 *
 * This is intentionally a regression benchmark, not an accuracy claim
 * against an external tool: no SonarQube-equivalent integration exists, so
 * "ground truth" here is the deliberately constructed fixture, documented in
 * fixtures/evaluationCorpus.js. A failing threshold means a change to a
 * scoring rule silently broke a previously-detected issue class or started
 * over-reporting one — exactly what docs/pending.md item 4 asks this harness
 * to catch.
 */

function evaluate(actual, expected) {
  const actualSet = new Set(actual)
  const expectedSet = new Set(expected)
  const truePositives = [...actualSet].filter(item => expectedSet.has(item))
  const falsePositives = [...actualSet].filter(item => !expectedSet.has(item))
  const falseNegatives = [...expectedSet].filter(item => !actualSet.has(item))
  const precision = actualSet.size === 0 ? 1 : truePositives.length / actualSet.size
  const recall = expectedSet.size === 0 ? 1 : truePositives.length / expectedSet.size
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)
  return { precision, recall, f1, falsePositives, falseNegatives }
}

function reportSignal(label, result) {
  console.log(
    `  ${label}: precision=${result.precision.toFixed(2)} recall=${result.recall.toFixed(2)} f1=${result.f1.toFixed(2)}`
    + (result.falsePositives.length ? ` FP=[${result.falsePositives.join(', ')}]` : '')
    + (result.falseNegatives.length ? ` FN=[${result.falseNegatives.join(', ')}]` : ''),
  )
}

function assertSignal(label, result, { minPrecision = 1, minRecall = 1 } = {}) {
  reportSignal(label, result)
  assert.ok(result.precision >= minPrecision, `${label} precision ${result.precision} below ${minPrecision}. False positives: ${result.falsePositives.join(', ')}`)
  assert.ok(result.recall >= minRecall, `${label} recall ${result.recall} below ${minRecall}. Missed: ${result.falseNegatives.join(', ')}`)
}

async function runPipeline(rootDir) {
  const structure = await parseRepositoryStructure(rootDir, {})
  const documentation = await extractDocumentation(rootDir, structure.files, {})
  const commits = await extractCommitHistory(rootDir, { limit: 100 })
  const dependencies = await generateDependencyGraph(rootDir, structure.files, {})
  const dependencyGraph = getDependencyGraphCoverage(structure.files, {})
  const codeAnalysis = await analyzeCodeStructure(rootDir, structure.files, { dependencies })
  const documentationAnalysis = analyzeDocumentation(documentation, { files: structure.files, codeAnalysis })
  const coverage = await extractCoverageReport(rootDir)

  const analysis = {
    files: structure.files,
    documentation,
    commits,
    dependencies,
    dependencyGraph,
    codeAnalysis,
    documentationAnalysis,
    coverage,
  }

  const technicalDebt = analyzeTechnicalDebt(analysis, { now: EVALUATION_NOW })
  const knowledgeDebt = analyzeKnowledgeDebt(analysis, { now: EVALUATION_NOW, technicalDebt })
  const drift = analyzeKnowledgeDrift(analysis, knowledgeDebt, { now: EVALUATION_NOW })

  return { technicalDebt, knowledgeDebt, drift }
}

test('deterministic analysis pipeline matches the labelled evaluation corpus (precision/recall benchmark)', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'codepulse-evaluation-'))

  try {
    await buildEvaluationCorpus(rootDir)
    const { technicalDebt, knowledgeDebt, drift } = await runPipeline(rootDir)

    console.log(`\nEvaluation benchmark (code analysis v${CODE_ANALYSIS_VERSION}):`)

    const byPath = new Map(technicalDebt.modules.map(module => [module.path, module]))
    const withReason = pattern => technicalDebt.modules.filter(module => module.reasons.some(reason => pattern.test(reason))).map(module => module.path)

    assertSignal('circular dependency', evaluate(
      technicalDebt.modules.filter(module => module.circular).map(module => module.path),
      EXPECTED.circular,
    ))
    assertSignal('large file', evaluate(
      technicalDebt.modules.filter(module => module.large).map(module => module.path),
      EXPECTED.large,
    ))
    assertSignal('high complexity', evaluate(
      technicalDebt.modules.filter(module => module.highComplexity).map(module => module.path),
      EXPECTED.highComplexity,
    ))
    assertSignal('duplicate code', evaluate(
      withReason(/Repeated source blocks/),
      EXPECTED.duplication,
    ))
    assertSignal('stale module', evaluate(
      technicalDebt.modules.filter(module => module.stale).map(module => module.path),
      EXPECTED.stale,
    ))
    assertSignal('orphan module', evaluate(
      technicalDebt.modules.filter(module => module.orphan).map(module => module.path),
      EXPECTED.orphan,
    ))
    assertSignal('bug-fix hotspot', evaluate(
      withReason(/Bug-fix hotspot/),
      EXPECTED.bugFixHotspot,
    ))
    assertSignal('low test coverage', evaluate(
      withReason(/Low test coverage/),
      EXPECTED.lowCoverage,
    ))

    const driftKey = finding => `${finding.type}:${finding.filePath}`
    assertSignal('knowledge drift findings', evaluate(
      drift.findings.map(driftKey),
      EXPECTED.drift.map(driftKey),
    ))

    // Debt/risk ranking regression: the deliberately worst modules (high
    // complexity + low coverage, then the oversized file, then the
    // duplicated pair) must outrank a plain undocumented module with no
    // other evidence against it. This is the "compare expected rankings"
    // half of the benchmark (docs/pending.md item 4) — a scoring-formula
    // change that silently reorders these would fail here even if every
    // individual flag above still matched.
    const complexScore = byPath.get('src/complex.js').debtScore
    const bigScore = byPath.get('src/big.js').debtScore
    const dupScore = byPath.get('src/dup1.js').debtScore
    const baselineScore = byPath.get('src/orphan/service.js').debtScore

    console.log(`  debt score ranking: complex.js=${complexScore} big.js=${bigScore} dup1.js=${dupScore} orphan/service.js(baseline)=${baselineScore}`)
    assert.ok(complexScore > bigScore, `expected src/complex.js (${complexScore}) to outrank src/big.js (${bigScore})`)
    assert.ok(bigScore > dupScore, `expected src/big.js (${bigScore}) to outrank src/dup1.js (${dupScore})`)
    assert.ok(dupScore > baselineScore, `expected src/dup1.js (${dupScore}) to outrank the baseline src/orphan/service.js (${baselineScore})`)

    // Knowledge debt: both undocumented directories must be reported.
    const undocumented = knowledgeDebt.moduleMetrics.filter(module => !module.documented).map(module => module.path)
    assertSignal('undocumented modules (knowledge debt)', evaluate(undocumented, ['src', 'src/orphan']))
  } finally {
    await rm(rootDir, { recursive: true, force: true })
  }
})
