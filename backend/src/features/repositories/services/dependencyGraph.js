import { readFile } from 'node:fs/promises'
import { dirname, join, posix } from 'node:path'
import {
  REPOSITORY_MAX_DEPENDENCY_FILE_BYTES,
  REPOSITORY_MAX_DEPENDENCY_SOURCE_FILES,
} from '../../../config/index.js'

const jsExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json']
const pythonExtensions = ['.py']

function absolutePathFromRepo(repositoryPath, relativePath) {
  return join(repositoryPath, ...relativePath.split('/'))
}

function createFileIndex(files) {
  return new Set(files.map(file => file.path))
}

function resolveCandidates(candidateBase, extensions) {
  const normalizedBase = posix.normalize(candidateBase)
  const candidates = [normalizedBase]

  for (const extension of extensions) {
    candidates.push(`${normalizedBase}${extension}`)
  }

  for (const extension of extensions) {
    candidates.push(posix.join(normalizedBase, `index${extension}`))
    candidates.push(posix.join(normalizedBase, `__init__${extension}`))
  }

  return candidates
}

function resolveImportPath(sourceFile, importPath, fileIndex, extensions) {
  if (!importPath.startsWith('.')) {
    return { targetFile: importPath, resolved: false }
  }

  const sourceDirectory = dirname(sourceFile).replaceAll('\\', '/')
  const candidateBase = posix.normalize(posix.join(sourceDirectory === '.' ? '' : sourceDirectory, importPath))
  const targetFile = resolveCandidates(candidateBase, extensions).find(candidate => fileIndex.has(candidate))

  return {
    targetFile: targetFile || importPath,
    resolved: Boolean(targetFile),
  }
}

function parseJavaScriptImports(content) {
  const imports = []
  const patterns = [
    /\bimport\s+(?:[^'"]+?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bexport\s+[^'"]+?\s+from\s+['"]([^'"]+)['"]/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      imports.push(match[1])
    }
  }

  return imports
}

function parsePythonImports(content) {
  const imports = []

  for (const line of content.split(/\r?\n/)) {
    const importMatch = line.match(/^\s*import\s+(.+)$/)
    if (importMatch) {
      for (const part of importMatch[1].split(',')) {
        const moduleName = part.trim().split(/\s+as\s+/i)[0]
        if (moduleName) imports.push(moduleName)
      }
      continue
    }

    const fromMatch = line.match(/^\s*from\s+([.\w]+)\s+import\s+(.+)$/)
    if (fromMatch) {
      const moduleName = fromMatch[1]
      const importedNames = fromMatch[2]
        .split(',')
        .map(part => part.trim().split(/\s+as\s+/i)[0])
        .filter(Boolean)

      if (/^\.+$/.test(moduleName)) {
        for (const importedName of importedNames) {
          if (importedName !== '*') imports.push(`${moduleName}${importedName}`)
        }
      } else {
        imports.push(moduleName)
      }
    }
  }

  return imports
}

function resolvePythonImportPath(sourceFile, importPath, fileIndex) {
  if (!importPath.startsWith('.')) {
    const modulePath = importPath.replaceAll('.', '/')
    const targetFile = resolveCandidates(modulePath, pythonExtensions).find(candidate => fileIndex.has(candidate))
    return {
      targetFile: targetFile || importPath,
      resolved: Boolean(targetFile),
    }
  }

  const sourceParts = dirname(sourceFile).replaceAll('\\', '/').split('/').filter(Boolean)
  const dotPrefix = importPath.match(/^\.+/)?.[0] || ''
  const moduleSuffix = importPath.slice(dotPrefix.length)
  const levelsUp = Math.max(dotPrefix.length - 1, 0)
  const baseParts = sourceParts.slice(0, Math.max(sourceParts.length - levelsUp, 0))
  const moduleParts = moduleSuffix ? moduleSuffix.split('.') : []
  const candidateBase = posix.join(...baseParts, ...moduleParts)
  const targetFile = resolveCandidates(candidateBase, pythonExtensions).find(candidate => fileIndex.has(candidate))

  return {
    targetFile: targetFile || importPath,
    resolved: Boolean(targetFile),
  }
}

export function isDependencyGraphSource(file) {
  return ['code', 'test'].includes(file.file_type) && ['JavaScript', 'JavaScript JSX', 'TypeScript', 'TypeScript JSX', 'Python'].includes(file.language)
}

export function getDependencyGraphCoverage(files, options = {}) {
  const maxSourceFiles = options.maxSourceFiles || REPOSITORY_MAX_DEPENDENCY_SOURCE_FILES
  const maxFileBytes = options.maxFileBytes || REPOSITORY_MAX_DEPENDENCY_FILE_BYTES
  const candidates = files.filter(isDependencyGraphSource)
  const sizeEligibleFiles = candidates.filter(file => !maxFileBytes || file.size <= maxFileBytes)
  const sourceFiles = sizeEligibleFiles.slice(0, maxSourceFiles)

  return {
    scannedFilePaths: sourceFiles.map(file => file.path),
    candidateFileCount: candidates.length,
    skippedOversizedFileCount: candidates.length - sizeEligibleFiles.length,
    skippedByLimitFileCount: Math.max(sizeEligibleFiles.length - sourceFiles.length, 0),
  }
}

export async function generateDependencyGraph(repositoryPath, files, options = {}) {
  const fileIndex = createFileIndex(files)
  const edges = []
  const coverage = getDependencyGraphCoverage(files, options)
  const sourcePathSet = new Set(coverage.scannedFilePaths)
  const sourceFiles = files.filter(file => sourcePathSet.has(file.path))

  for (const file of sourceFiles) {
    const content = await readFile(absolutePathFromRepo(repositoryPath, file.path), 'utf8')

    if (file.language.startsWith('JavaScript') || file.language.startsWith('TypeScript')) {
      for (const importPath of parseJavaScriptImports(content)) {
        const resolved = resolveImportPath(file.path, importPath, fileIndex, jsExtensions)
        edges.push({
          source_file: file.path,
          target_file: resolved.targetFile,
          dependency_type: importPath.startsWith('.') ? 'relative-import' : 'package-import',
          import_path: importPath,
          resolved: resolved.resolved,
        })
      }
      continue
    }

    if (file.language === 'Python') {
      for (const importPath of parsePythonImports(content)) {
        const resolved = resolvePythonImportPath(file.path, importPath, fileIndex)
        edges.push({
          source_file: file.path,
          target_file: resolved.targetFile,
          dependency_type: importPath.startsWith('.') ? 'relative-import' : 'module-import',
          import_path: importPath,
          resolved: resolved.resolved,
        })
      }
    }
  }

  return edges.sort((left, right) => {
    const leftKey = `${left.source_file}:${left.import_path}`
    const rightKey = `${right.source_file}:${right.import_path}`
    return leftKey < rightKey ? -1 : Number(leftKey > rightKey)
  })
}
