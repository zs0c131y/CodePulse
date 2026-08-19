import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * A small, purpose-built fixture repository with known, labelled issues
 * (docs/pending.md item 4). Every issue below is deliberate and traced to a
 * specific detector so the evaluation harness can compute precision/recall
 * against a closed, hand-labelled ground truth rather than an open-ended
 * repository where "everything the engine finds" cannot be distinguished
 * from "everything that should be found".
 */
// Verified against a real run of the pipeline (backend/runEval.mjs, not
// committed) rather than hand-derived from the scoring formulas, since
// several thresholds interact (churn sample size gates staleness,
// contributor concentration needs >=3 touches, etc.).
export const EXPECTED = {
  // Technical debt module flags (backend/src/features/analysis/services/technicalDebtAnalyzer.js)
  circular: ['src/a.js', 'src/b.js'],
  large: ['src/big.js'],
  highComplexity: ['src/complex.js'],
  duplication: ['src/dup1.js', 'src/dup2.js'],
  // Only src/buggy.js is touched after the 2026-01-15 housekeeping commit;
  // every other file's last change predates the 180-day staleness cutoff.
  stale: ['src/a.js', 'src/b.js', 'src/big.js', 'src/complex.js', 'src/dup1.js', 'src/dup2.js', 'src/orphan/service.js', 'src/stale.js'],
  // No file other than a.js/b.js has a resolved internal dependency edge.
  orphan: ['src/big.js', 'src/complex.js', 'src/dup1.js', 'src/dup2.js', 'src/buggy.js', 'src/orphan/service.js', 'src/stale.js'],
  bugFixHotspot: ['src/buggy.js'],
  lowCoverage: ['src/complex.js'],
  // Structural knowledge drift (knowledgeDriftAnalyzer.js): (type, filePath) pairs.
  drift: [
    { type: 'missing_documentation', filePath: 'src' },
    { type: 'missing_documentation', filePath: 'src/orphan' },
    { type: 'dead_reference', filePath: 'README.md' },
  ],
}

async function git(args, cwd, env) {
  await execFileAsync('git', args, { cwd, windowsHide: true, env: { ...process.env, ...env } })
}

async function commit(cwd, message, isoDate) {
  await git(['add', '-A'], cwd)
  await git(['commit', '-m', message, '--allow-empty'], cwd, {
    GIT_AUTHOR_DATE: isoDate,
    GIT_COMMITTER_DATE: isoDate,
  })
}

const DUPLICATE_BLOCK = `export function calculateDiscount(price, tier, orders) {
  if (tier === 'gold') {
    return price * 0.8
  }
  if (tier === 'silver') {
    return price * 0.9
  }
  if (orders > 10) {
    return price * 0.85
  }
  return price
}
`

/**
 * Builds the fixture repository at `rootDir` (must already exist and be
 * empty). Commit dates are fixed and independent of the real clock; callers
 * pass a matching `now` to the analyzers so results never depend on when the
 * suite happens to run.
 */
export async function buildEvaluationCorpus(rootDir) {
  await git(['init', '-b', 'main'], rootDir)
  await git(['config', 'user.email', 'evaluator@codepulse.test'], rootDir)
  await git(['config', 'user.name', 'CodePulse Evaluator'], rootDir)

  await mkdir(join(rootDir, 'src', 'orphan'), { recursive: true })
  await mkdir(join(rootDir, 'coverage'), { recursive: true })

  await writeFile(
    join(rootDir, 'README.md'),
    '# Demo Project\n\nA small demo project used to test scanning.\n\n'
    + 'See `src/removed.js` for the removed legacy loader (kept here for history).\n',
    'utf8',
  )

  await writeFile(
    join(rootDir, 'src', 'a.js'),
    "import { helperB } from './b.js'\n\nexport function helperA(value) {\n  return helperB(value) + 1\n}\n",
    'utf8',
  )
  await writeFile(
    join(rootDir, 'src', 'b.js'),
    "import { helperA } from './a.js'\n\nexport function helperB(value) {\n  if (value > 0) return helperA(value - 1)\n  return 0\n}\n",
    'utf8',
  )

  // A large file: one padding export pushes the file past LARGE_FILE_BYTES
  // (50 KiB) without adding decision points or duplicate-eligible blocks.
  await writeFile(
    join(rootDir, 'src', 'big.js'),
    `export const PADDING = "${'x'.repeat(60_000)}"\n\nexport function noop() {\n  return PADDING.length\n}\n`,
    'utf8',
  )

  // A single function with 15 if-statements: cyclomatic complexity 16,
  // above HIGH_COMPLEXITY_THRESHOLD (15).
  const complexBranches = Array.from({ length: 15 }, (_, index) => (
    `  if (value === ${index + 1}) return '${index + 1}'`
  )).join('\n')
  await writeFile(
    join(rootDir, 'src', 'complex.js'),
    `export function classify(value) {\n${complexBranches}\n  return 'unknown'\n}\n`,
    'utf8',
  )

  await writeFile(join(rootDir, 'src', 'dup1.js'), DUPLICATE_BLOCK, 'utf8')
  await writeFile(join(rootDir, 'src', 'dup2.js'), DUPLICATE_BLOCK, 'utf8')

  await writeFile(
    join(rootDir, 'src', 'orphan', 'service.js'),
    "export function ping() {\n  return 'pong'\n}\n",
    'utf8',
  )

  await writeFile(
    join(rootDir, 'src', 'buggy.js'),
    "export function normalize(value) {\n  return String(value || '').trim()\n}\n",
    'utf8',
  )

  await writeFile(
    join(rootDir, 'src', 'stale.js'),
    "export function legacyHelper() {\n  return true\n}\n",
    'utf8',
  )

  // LCOV report: only src/complex.js is measured, and poorly covered.
  // Every other file is absent from the report — "unavailable", not "0%".
  await writeFile(
    join(rootDir, 'coverage', 'lcov.info'),
    'SF:src/complex.js\n'
    + 'DA:1,5\nDA:2,5\nDA:3,0\nDA:4,0\nDA:5,0\nDA:6,0\nDA:7,0\nDA:8,0\n'
    + 'DA:9,0\nDA:10,0\nDA:11,0\nDA:12,0\nDA:13,0\nDA:14,0\nDA:15,0\nDA:16,0\n'
    + 'end_of_record\n',
    'utf8',
  )

  // Commit 1 (2025-01-01): everything except the later buggy.js edits.
  // This is the last time src/stale.js is touched.
  await commit(rootDir, 'Initial commit', '2025-01-01T00:00:00Z')

  // Commit 2 (2026-01-15): empty — exists only to reach the minimum churn
  // sample size (5 commits) without touching any file's own change count,
  // so src/stale.js's staleness signal can be evaluated cleanly.
  await commit(rootDir, 'chore: housekeeping', '2026-01-15T00:00:00Z')

  // Commit 3 (2026-07-01): create buggy.js.
  await writeFile(
    join(rootDir, 'src', 'buggy.js'),
    "export function normalize(value) {\n  return String(value || '').trim()\n}\n\n// TODO: handle null\n",
    'utf8',
  )
  await commit(rootDir, 'feat: add normalize helper', '2026-07-01T00:00:00Z')

  // Commit 4 (2026-07-05): first bug fix on buggy.js.
  await writeFile(
    join(rootDir, 'src', 'buggy.js'),
    "export function normalize(value) {\n  if (value === null) return ''\n  return String(value || '').trim()\n}\n",
    'utf8',
  )
  await commit(rootDir, 'fix: normalize crashed on null input', '2026-07-05T00:00:00Z')

  // Commit 5 (2026-07-10): second bug fix on buggy.js.
  await writeFile(
    join(rootDir, 'src', 'buggy.js'),
    "export function normalize(value) {\n  if (value === null || value === undefined) return ''\n  return String(value).trim()\n}\n",
    'utf8',
  )
  await commit(rootDir, 'fix: normalize also crashed on undefined input', '2026-07-10T00:00:00Z')

  return { localPath: rootDir }
}

/** Matches the fixed commit timeline above; pass as `now` to every analyzer. */
export const EVALUATION_NOW = new Date('2026-08-19T00:00:00.000Z')
