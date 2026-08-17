import test from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzeTechnicalDebt,
  LARGE_FILE_BYTES,
  MINIMUM_CHURN_SAMPLE_SIZE,
} from '../src/features/analysis/services/technicalDebtAnalyzer.js'

function codeFile(path, size = 1024, language = 'JavaScript') {
  return { path, file_type: 'code', language, size }
}

test('detects large files, cyclic dependencies, sampled churn, stale modules, and supported-language orphans', () => {
  const analysis = {
    files: [
      codeFile('src/a.js', LARGE_FILE_BYTES + 10),
      codeFile('src/b.js'),
      codeFile('src/orphan.js'),
      codeFile('src/index.js'),
      codeFile('src/stale.js'),
      codeFile('src/worker.go', 1024, 'Go'),
    ],
    commits: [
      { author: 'Ada', commit_date: '2025-01-01T00:00:00.000Z', changed_files: ['src/stale.js'] },
      { author: 'Ada', commit_date: '2026-07-01T00:00:00.000Z', changed_files: ['src/a.js', 'src/a.js'] },
      { author: 'Ada', commit_date: '2026-07-02T00:00:00.000Z', changed_files: ['src/a.js', 'src/b.js'] },
      { author: 'Grace', commit_date: '2026-07-03T00:00:00.000Z', changed_files: ['src/a.js'] },
      { author: 'Grace', commit_date: '2026-07-04T00:00:00.000Z', changed_files: ['src/b.js'] },
    ],
    dependencies: [
      { source_file: 'src/a.js', target_file: 'src/b.js', resolved: true },
      { source_file: 'src/b.js', target_file: 'src/a.js', resolved: true },
      { source_file: 'src/stale.js', target_file: 'src/a.js', resolved: true },
      { source_file: 'src/a.js', target_file: 'react', resolved: false },
    ],
  }

  const result = analyzeTechnicalDebt(analysis, { now: '2026-07-05T00:00:00.000Z' })
  const byPath = new Map(result.modules.map(module => [module.path, module]))

  assert.equal(result.metrics.totalCodeFiles, 6)
  assert.equal(result.metrics.largeFiles, 1)
  assert.equal(result.metrics.circularDependencies, 1)
  assert.equal(result.metrics.orphanModules, 1)
  assert.equal(result.metrics.staleModules, 1)
  assert.equal(result.metrics.churnAvailable, true)
  assert.equal(result.metrics.churnSampleSize, MINIMUM_CHURN_SAMPLE_SIZE)
  assert.equal(byPath.get('src/a.js').churnPercent, 60)
  assert.equal(byPath.get('src/a.js').circular, true)
  assert.equal(byPath.get('src/orphan.js').orphan, true)
  assert.equal(byPath.get('src/index.js').orphan, false)
  assert.equal(byPath.get('src/worker.go').orphan, false)
  assert.equal(byPath.get('src/stale.js').stale, true)
  assert.ok(result.score >= 0 && result.score <= 100)
})

test('does not treat a shallow commit sample as reliable churn or staleness evidence', () => {
  const result = analyzeTechnicalDebt({
    files: [codeFile('src/legacy.js')],
    commits: [{ author: 'Ada', commit_date: '2020-01-01T00:00:00.000Z', changed_files: ['src/legacy.js'] }],
    dependencies: [],
  }, { now: '2026-07-05T00:00:00.000Z' })

  assert.equal(result.metrics.churnAvailable, false)
  assert.equal(result.modules[0].observedChurnPercent, 100)
  assert.equal(result.modules[0].churnPercent, 0)
  assert.equal(result.modules[0].stale, false)
})

test('recognizes a resolved self dependency as a circular dependency', () => {
  const result = analyzeTechnicalDebt({
    files: [codeFile('src/self.js')],
    commits: [],
    dependencies: [{ source_file: 'src/self.js', target_file: 'src/self.js', resolved: true }],
  })

  assert.equal(result.metrics.circularDependencies, 1)
  assert.equal(result.metrics.circularDependencyEdges, 1)
  assert.equal(result.modules[0].circular, true)
})

test('does not classify dependency sources skipped by graph limits as orphans', () => {
  const result = analyzeTechnicalDebt({
    files: [codeFile('src/scanned.js'), codeFile('src/not-scanned.js')],
    commits: [],
    dependencies: [],
    dependencyGraph: { scannedFilePaths: ['src/scanned.js'] },
  })
  const byPath = new Map(result.modules.map(module => [module.path, module]))

  assert.equal(byPath.get('src/scanned.js').dependencyGraphAvailable, true)
  assert.equal(byPath.get('src/scanned.js').orphan, true)
  assert.equal(byPath.get('src/not-scanned.js').dependencyGraphAvailable, false)
  assert.equal(byPath.get('src/not-scanned.js').orphan, false)
})

test('uses structured source complexity and duplication when available', () => {
  const result = analyzeTechnicalDebt({
    files: [codeFile('src/measured.js', 1024)],
    commits: [],
    dependencies: [],
    codeAnalysis: {
      files: [{
        filePath: 'src/measured.js',
        metrics: {
          cyclomaticComplexity: 21,
          duplicationPercent: 35,
          longFunctionCount: 1,
        },
      }],
    },
  })

  assert.equal(result.modules[0].complexity, 21)
  assert.equal(result.modules[0].complexityMethod, 'source-heuristic')
  assert.equal(result.modules[0].duplicationPercent, 35)
  assert.equal(result.metrics.duplicationPercent, 35)
  assert.match(result.modules[0].reasons.join(' '), /Repeated source blocks/)
  assert.match(result.modules[0].reasons.join(' '), /long function/)
})

test('surfaces dependency depth, bug-fix hotspots, and contributor concentration', () => {
  const commits = [
    { author: 'Ada', message: 'fix auth regression', changed_files: ['src/a.js'] },
    { author: 'Ada', message: 'bug fix for auth', changed_files: ['src/a.js'] },
    { author: 'Ada', message: 'refactor auth', changed_files: ['src/a.js'] },
    { author: 'Grace', message: 'docs', changed_files: ['README.md'] },
    { author: 'Grace', message: 'docs', changed_files: ['README.md'] },
  ]
  const files = Array.from({ length: 8 }, (_, index) => codeFile(`src/${index}.js`))
  files[0] = codeFile('src/a.js')
  const dependencies = files.slice(0, -1).map((file, index) => ({
    source_file: file.path,
    target_file: files[index + 1].path,
    resolved: true,
  }))

  const result = analyzeTechnicalDebt({ files, commits, dependencies })
  const hotspot = result.modules.find(module => module.path === 'src/a.js')

  assert.equal(hotspot.contributorConcentrationPercent, 100)
  assert.equal(hotspot.bugFixCount, 2)
  assert.equal(result.metrics.ownershipConcentrationModules, 1)
  assert.equal(result.metrics.bugProneModules, 1)
  assert.equal(result.metrics.longestDependencyChain, 7)
  assert.ok(result.metrics.deepDependencyModules >= 1)
  assert.match(hotspot.reasons.join(' '), /Contributor concentration/)
  assert.match(hotspot.reasons.join(' '), /Bug-fix hotspot/)
  assert.match(hotspot.reasons.join(' '), /Deep dependency chain/)
})
