import { readdir, stat } from 'node:fs/promises'
import { extname, join, relative, sep } from 'node:path'

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

async function walkDirectory(rootPath, currentPath, output) {
  const entries = await readdir(currentPath, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) continue

    const absolutePath = join(currentPath, entry.name)
    const relativePath = normalizePath(relative(rootPath, absolutePath))

    if (entry.isDirectory()) {
      output.directories.push({
        path: relativePath,
        name: entry.name,
        depth: depthOf(relativePath),
      })
      await walkDirectory(rootPath, absolutePath, output)
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
  }
}

export async function parseRepositoryStructure(repositoryPath) {
  const output = {
    directories: [],
    files: [],
  }

  await walkDirectory(repositoryPath, repositoryPath, output)

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
