import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseLcov, extractCoverageReport } from '../src/features/repositories/services/coverageParser.js'

const SAMPLE_LCOV = `TN:
SF:src/app.js
DA:1,1
DA:2,1
DA:3,0
DA:4,0
end_of_record
SF:src/util.js
DA:1,3
DA:2,0
end_of_record
`

test('parseLcov computes per-file line coverage from SF/DA/end_of_record records', () => {
  const files = parseLcov(SAMPLE_LCOV)

  assert.equal(files.length, 2)
  assert.deepEqual(files[0], { filePath: 'src/app.js', linesFound: 4, linesHit: 2, coveredPercent: 50 })
  assert.deepEqual(files[1], { filePath: 'src/util.js', linesFound: 2, linesHit: 1, coveredPercent: 50 })
})

test('parseLcov ignores unrecognized record types (branch/function coverage) without failing', () => {
  const withExtraRecords = `SF:src/a.js
FN:1,myFunction
FNDA:2,myFunction
BRDA:3,0,0,1
DA:1,2
end_of_record
`
  const files = parseLcov(withExtraRecords)
  assert.equal(files.length, 1)
  assert.equal(files[0].linesFound, 1)
})

test('parseLcov returns an empty array for empty or malformed content', () => {
  assert.deepEqual(parseLcov(''), [])
  assert.deepEqual(parseLcov('not lcov at all'), [])
})

test('extractCoverageReport returns unavailable, not zero coverage, when no report exists', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'codepulse-coverage-'))
  try {
    const result = await extractCoverageReport(directory)
    assert.deepEqual(result, { available: false, reason: 'no-report-found', modules: [] })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('extractCoverageReport returns unavailable without a repository path', async () => {
  assert.deepEqual(await extractCoverageReport(''), { available: false, reason: 'no-repository-path', modules: [] })
  assert.deepEqual(await extractCoverageReport(null), { available: false, reason: 'no-repository-path', modules: [] })
})

test('extractCoverageReport reads coverage/lcov.info when present', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'codepulse-coverage-'))
  try {
    await mkdir(join(directory, 'coverage'), { recursive: true })
    await writeFile(join(directory, 'coverage', 'lcov.info'), SAMPLE_LCOV, 'utf8')

    const result = await extractCoverageReport(directory)
    assert.equal(result.available, true)
    assert.equal(result.format, 'lcov')
    assert.equal(result.reportPath, 'coverage/lcov.info')
    assert.equal(result.modules.length, 2)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('extractCoverageReport prefers coverage/lcov.info over lower-priority locations', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'codepulse-coverage-'))
  try {
    await mkdir(join(directory, 'coverage'), { recursive: true })
    await writeFile(join(directory, 'coverage', 'lcov.info'), SAMPLE_LCOV, 'utf8')
    await writeFile(join(directory, 'lcov.info'), 'SF:should-not-be-used.js\nDA:1,0\nend_of_record\n', 'utf8')

    const result = await extractCoverageReport(directory)
    assert.equal(result.reportPath, 'coverage/lcov.info')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('extractCoverageReport reports an empty report as unavailable rather than zero coverage', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'codepulse-coverage-'))
  try {
    await writeFile(join(directory, 'lcov.info'), 'TN:\n', 'utf8')

    const result = await extractCoverageReport(directory)
    assert.equal(result.available, false)
    assert.equal(result.reason, 'empty-report')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
