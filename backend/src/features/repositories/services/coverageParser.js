import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Test coverage ingestion (docs/pending.md item 2). Reads a coverage report
 * that already exists in the cloned repository — produced by the project's
 * own CI/test run before CodePulse ever saw it. CodePulse never executes a
 * project's test suite or any other repository command; a missing report
 * means "coverage unavailable", never "zero coverage".
 */

// Checked in priority order; the first file found wins. Covers the default
// output locations for Istanbul/nyc/Jest (LCOV) tooling across common
// project layouts.
const LCOV_REPORT_PATHS = [
  'coverage/lcov.info',
  'coverage/lcov-report/lcov.info',
  '.nyc_output/lcov.info',
  'lcov.info',
]

const MAX_REPORT_BYTES = 8 * 1024 * 1024

function normalizePath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '')
}

/**
 * Parses the LCOV text format (`SF:`/`DA:`/`end_of_record` records) into
 * per-file line coverage. Unrecognized lines are ignored rather than
 * treated as a parse failure, since real-world LCOV output includes
 * branch (`BRDA:`/`BRF:`/`BRH:`) and function (`FN:`/`FNDA:`) records this
 * ingestion does not need.
 */
export function parseLcov(content) {
  const files = []
  let current = null

  for (const rawLine of String(content || '').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    if (line.startsWith('SF:')) {
      current = { filePath: normalizePath(line.slice(3)), linesFound: 0, linesHit: 0 }
      continue
    }

    if (!current) continue

    if (line.startsWith('DA:')) {
      const [, hitCountRaw] = line.slice(3).split(',')
      current.linesFound += 1
      if (Number(hitCountRaw) > 0) current.linesHit += 1
      continue
    }

    if (line === 'end_of_record') {
      files.push(current)
      current = null
    }
  }

  return files
    .filter(file => file.filePath)
    .map(file => ({
      filePath: file.filePath,
      linesFound: file.linesFound,
      linesHit: file.linesHit,
      coveredPercent: file.linesFound > 0 ? Math.round((file.linesHit / file.linesFound) * 1000) / 10 : null,
    }))
}

async function readReportFile(repositoryPath) {
  for (const relativePath of LCOV_REPORT_PATHS) {
    const absolutePath = join(repositoryPath, relativePath)
    try {
      const content = await readFile(absolutePath, 'utf8')
      if (Buffer.byteLength(content, 'utf8') > MAX_REPORT_BYTES) {
        return { relativePath, error: 'exceeds-size-limit' }
      }
      return { relativePath, content }
    } catch (error) {
      if (error?.code !== 'ENOENT') return { relativePath, error: error.message }
    }
  }

  return null
}

/**
 * Reads whatever LCOV report already exists in the cloned repository, if
 * any. Never runs a command and never executes repository code. Returns
 * `available: false` (not zero coverage) when no report is found, unreadable,
 * or too large to parse safely.
 */
export async function extractCoverageReport(repositoryPath) {
  if (!repositoryPath) return { available: false, reason: 'no-repository-path', modules: [] }

  const found = await readReportFile(repositoryPath)
  if (!found) return { available: false, reason: 'no-report-found', modules: [] }
  if (found.error) return { available: false, reason: found.error, reportPath: found.relativePath, modules: [] }

  let modules
  try {
    modules = parseLcov(found.content)
  } catch (error) {
    return { available: false, reason: `parse-error: ${error.message}`, reportPath: found.relativePath, modules: [] }
  }

  if (modules.length === 0) {
    return { available: false, reason: 'empty-report', reportPath: found.relativePath, modules: [] }
  }

  return { available: true, format: 'lcov', reportPath: found.relativePath, modules }
}
