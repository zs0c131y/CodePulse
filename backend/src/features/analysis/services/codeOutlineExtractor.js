import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  SEMANTIC_DRIFT_MAX_CODE_FILES,
  SEMANTIC_DRIFT_MAX_SOURCE_BYTES,
} from '../../../config/index.js'

function normalizePath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '')
}

function directoryOf(filePath) {
  const normalized = normalizePath(filePath)
  const separator = normalized.lastIndexOf('/')
  return separator === -1 ? '.' : normalized.slice(0, separator) || '.'
}

function unique(values, maximum = 8) {
  return [...new Set(values.filter(Boolean))].slice(0, maximum)
}

function identifiers(source, pattern) {
  return unique([...source.matchAll(pattern)].map(match => match[1]))
}

function sourceDescription(file, source) {
  const classes = identifiers(source, /\bclass\s+([A-Za-z_$][\w$]*)/g)
  const functions = unique([
    ...identifiers(source, /\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g),
    ...identifiers(source, /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g),
  ])
  const exports = unique([
    ...identifiers(source, /\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g),
    ...identifiers(source, /\bmodule\.exports\.([A-Za-z_$][\w$]*)/g),
  ])
  const imports = unique([
    ...identifiers(source, /\bfrom\s+['"]([^'"]+)['"]/g),
    ...identifiers(source, /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g),
    ...identifiers(source, /\bimport\s+['"]([^'"]+)['"]/g),
  ])
  const routes = unique([...source.matchAll(/\.(?:get|post|put|patch|delete)\(\s*['"]([^'"]+)/g)].map(match => match[1]))
  const parts = [`${normalizePath(file.path)} is a ${file.language || 'source code'} module.`]
  if (exports.length) parts.push(`Exports ${exports.join(', ')}.`)
  if (classes.length) parts.push(`Defines classes ${classes.join(', ')}.`)
  if (functions.length) parts.push(`Defines functions ${functions.join(', ')}.`)
  if (routes.length) parts.push(`Handles routes ${routes.join(', ')}.`)
  if (imports.length) parts.push(`Uses ${imports.join(', ')}.`)

  return {
    path: normalizePath(file.path),
    modulePath: directoryOf(file.path),
    summary: parts.join(' '),
  }
}

/**
 * Builds compact, ephemeral source descriptions for semantic comparison.
 * Full source is neither persisted nor sent to the embedding provider.
 */
export async function extractCodeOutlines(repositoryPath, files, options = {}) {
  if (!repositoryPath) return []
  const maximumFiles = options.maxCodeFiles || SEMANTIC_DRIFT_MAX_CODE_FILES
  const maximumBytes = options.maxSourceBytes || SEMANTIC_DRIFT_MAX_SOURCE_BYTES
  const codeFiles = (files || []).filter(file => file?.file_type === 'code').slice(0, maximumFiles)
  const outlines = []

  for (const file of codeFiles) {
    try {
      const source = await readFile(join(repositoryPath, ...normalizePath(file.path).split('/')))
      outlines.push(sourceDescription(file, source.subarray(0, maximumBytes).toString('utf8')))
    } catch {
      // An unreadable source file is simply unavailable for semantic analysis.
    }
  }

  return outlines
}
