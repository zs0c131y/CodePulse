import { readdir, stat } from 'node:fs/promises'
import { extname, join, relative, sep } from 'node:path'
import { REPOSITORY_MAX_FILES } from '../../../config/index.js'
import { runGit } from './gitClient.js'

export const ignoredDirectoryNames = new Set([
  '.git',
  '.hg',
  '.svn',
  '.cache',
  '.next',
  '.nuxt',
  '.parcel-cache',
  '.turbo',
  'coverage',
  'dist',
  'build',
  'out',
  'node_modules',
  'vendor',
  '__pycache__',
])

const languageByExtension = new Map([
  ['.js', 'JavaScript'],
  ['.jsx', 'JavaScript JSX'],
  ['.mjs', 'JavaScript'],
  ['.cjs', 'JavaScript'],
  ['.ts', 'TypeScript'],
  ['.tsx', 'TypeScript JSX'],
  ['.py', 'Python'],
  ['.java', 'Java'],
  ['.kt', 'Kotlin'],
  ['.go', 'Go'],
  ['.rs', 'Rust'],
  ['.rb', 'Ruby'],
  ['.php', 'PHP'],
  ['.cs', 'C#'],
  ['.c', 'C'],
  ['.h', 'C/C++ Header'],
  ['.cpp', 'C++'],
  ['.cc', 'C++'],
  ['.swift', 'Swift'],
  ['.html', 'HTML'],
  ['.css', 'CSS'],
  ['.scss', 'SCSS'],
  ['.sql', 'SQL'],
  ['.sh', 'Shell'],
  ['.ps1', 'PowerShell'],
  ['.md', 'Markdown'],
  ['.mdx', 'MDX'],
  ['.json', 'JSON'],
  ['.yaml', 'YAML'],
  ['.yml', 'YAML'],
  ['.toml', 'TOML'],
  ['.xml', 'XML'],
])

const documentationExtensions = new Set(['.md', '.mdx', '.rst', '.adoc', '.txt'])
const configExtensions = new Set(['.json', '.yaml', '.yml', '.toml', '.ini', '.env', '.xml'])
const assetExtensions = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.svg',
  '.pdf',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.mp4',
  '.mp3',
  '.wav',
])
const codeExtensions = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.py',
  '.java',
  '.kt',
  '.go',
  '.rs',
  '.rb',
  '.php',
  '.cs',
  '.c',
  '.h',
  '.cpp',
  '.cc',
  '.swift',
  '.html',
  '.css',
  '.scss',
  '.sql',
  '.sh',
  '.ps1',
])

function normalizePath(pathValue) {
  return pathValue.split(sep).join('/')
}

function depthOf(relativePath) {
  if (!relativePath) return 0
  return relativePath.split('/').filter(Boolean).length
}

function comparePaths(left, right) {
  const a = left.path.toLowerCase()
  const b = right.path.toLowerCase()
  if (a < b) return -1
  if (a > b) return 1
  return left.path < right.path ? -1 : Number(left.path > right.path)
}

function isTestFile(relativePath) {
  return /(^|\/)(__tests__|tests?|spec)\//i.test(relativePath) || /\.(test|spec)\.[^.]+$/i.test(relativePath)
}

export function getLanguage(fileName) {
  return languageByExtension.get(extname(fileName).toLowerCase()) || 'Unknown'
}

export function classifyFile(relativePath) {
  const normalized = normalizePath(relativePath)
  const fileName = normalized.split('/').pop() || ''
  const lowerName = fileName.toLowerCase()
  const extension = extname(lowerName)

  if (isTestFile(normalized)) return 'test'
  if (lowerName === 'readme' || lowerName.startsWith('readme.') || documentationExtensions.has(extension)) {
    return 'documentation'
  }
  if (
    lowerName.startsWith('.env') ||
    lowerName === 'dockerfile' ||
    lowerName === 'makefile' ||
    lowerName.includes('config') ||
    configExtensions.has(extension)
  ) {
    return 'config'
  }
  if (assetExtensions.has(extension)) return 'asset'
  if (codeExtensions.has(extension)) return 'code'

  return 'unknown'
}

function assertWithinFileLimit(output, maxFiles) {
  if (!maxFiles || output.files.length <= maxFiles) return

  const error = new Error(
    `Repository has more than ${maxFiles} analyzable files. Increase REPOSITORY_MAX_FILES or analyze a smaller repository.`,
  )
  error.statusCode = 413
  throw error
}

function throwIfAborted(signal) {
  if (!signal?.aborted) return
  throw signal.reason instanceof Error ? signal.reason : Object.assign(new Error('Repository analysis cancelled.'), { code: 'ABORT_ERR' })
}

function shouldReportProgress(count) {
  return count === 1 || count % 500 === 0
}

async function reportProgress(options, processed, total = null) {
  if (!shouldReportProgress(processed) && processed !== total) return
  await options.onProgress?.({ processed, total })
}

async function walkDirectory(rootPath, currentPath, output, options) {
  throwIfAborted(options.signal)
  const entries = await readdir(currentPath, { withFileTypes: true })

  for (const entry of entries) {
    throwIfAborted(options.signal)
    if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) continue

    const absolutePath = join(currentPath, entry.name)
    const relativePath = normalizePath(relative(rootPath, absolutePath))

    if (entry.isDirectory()) {
      output.directories.push({
        path: relativePath,
        name: entry.name,
        depth: depthOf(relativePath),
      })
      await walkDirectory(rootPath, absolutePath, output, options)
      continue
    }

    if (!entry.isFile()) continue

    const stats = await stat(absolutePath)
    const extension = extname(entry.name).toLowerCase()

    output.files.push({
      path: relativePath,
      name: entry.name,
      extension,
      file_type: classifyFile(relativePath),
      language: getLanguage(entry.name),
      size: stats.size,
      depth: depthOf(relativePath),
    })
    assertWithinFileLimit(output, options.maxFiles)
    await reportProgress(options, output.files.length)
  }
}

function isIgnoredTrackedPath(filePath) {
  const parts = filePath.split('/')
  return parts.slice(0, -1).some(part => ignoredDirectoryNames.has(part))
}

function directoriesFromFilePath(filePath, output) {
  const parts = filePath.split('/')
  for (let index = 1; index < parts.length; index += 1) {
    const path = parts.slice(0, index).join('/')
    if (!output.has(path)) {
      output.set(path, {
        path,
        name: parts[index - 1],
        depth: depthOf(path),
      })
    }
  }
}

async function parseTrackedTree(repositoryPath, options) {
  const { stdout } = await (options.runGitImpl || runGit)(
    ['ls-tree', '-rz', '--full-tree', 'HEAD'],
    {
      cwd: repositoryPath,
      signal: options.signal,
      maxBuffer: 256 * 1024 * 1024,
    },
  )
  const entries = stdout.split('\0').filter(Boolean)
  const output = { directories: [], files: [] }
  const directories = new Map()
  const total = entries.length

  for (let index = 0; index < entries.length; index += 1) {
    throwIfAborted(options.signal)
    const entry = entries[index]
    const tabIndex = entry.indexOf('\t')
    if (tabIndex === -1) continue
    const header = entry.slice(0, tabIndex)
    const filePath = entry.slice(tabIndex + 1)
    const match = header.match(/^\d+\s+blob\s+[0-9a-f]+$/i)
    if (!match || isIgnoredTrackedPath(filePath)) continue

    const fileName = filePath.split('/').at(-1) || filePath
    output.files.push({
      path: filePath,
      name: fileName,
      extension: extname(fileName).toLowerCase(),
      file_type: classifyFile(filePath),
      language: getLanguage(fileName),
      // Tree objects do not contain blob sizes. Asking a partial clone for
      // them would lazily fetch every blob and defeat the no-checkout design.
      size: null,
      depth: depthOf(filePath),
    })
    directoriesFromFilePath(filePath, directories)
    assertWithinFileLimit(output, options.maxFiles)
    await reportProgress(options, output.files.length, total)

    if (index > 0 && index % 1000 === 0) {
      await new Promise(resolve => setImmediate(resolve))
    }
  }

  output.directories = [...directories.values()]
  return output
}

export async function parseRepositoryStructure(repositoryPath, options = {}) {
  const parserOptions = {
    maxFiles: options.maxFiles ?? REPOSITORY_MAX_FILES,
    signal: options.signal,
    onProgress: options.onProgress,
    runGitImpl: options.runGitImpl,
  }
  const output = options.trackedTreeOnly
    ? await parseTrackedTree(repositoryPath, parserOptions)
    : { directories: [], files: [] }

  if (!options.trackedTreeOnly) {
    await walkDirectory(repositoryPath, repositoryPath, output, parserOptions)
  }

  output.directories.sort(comparePaths)
  output.files.sort(comparePaths)

  return {
    ...output,
    summary: {
      totalDirectories: output.directories.length,
      totalFiles: output.files.length,
      filesByType: output.files.reduce((counts, file) => {
        counts[file.file_type] = (counts[file.file_type] || 0) + 1
        return counts
      }, {}),
    },
  }
}
