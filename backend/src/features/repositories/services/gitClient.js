import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const githubRepoPattern = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/

export const defaultRepositoryWorkspace = join(tmpdir(), 'codepulse', 'repositories')

function cleanRepoName(value) {
  return String(value || 'repository')
    .replace(/\.git$/i, '')
    .replace(/[^A-Za-z0-9_.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'repository'
}

function getLocalRepoName(sourceUrl) {
  return cleanRepoName(basename(String(sourceUrl || '').replace(/[\\/]+$/, '')))
}

export function parseGitHubRepositoryUrl(input) {
  let parsed

  try {
    parsed = new URL(String(input || '').trim())
  } catch {
    return null
  }

  if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'github.com') {
    return null
  }

  parsed.hash = ''
  parsed.search = ''
  const normalizedPath = parsed.pathname.replace(/\/+$/, '')
  const match = `https://github.com${normalizedPath}`.match(githubRepoPattern)

  if (!match) return null

  const owner = match[1]
  const name = match[2].replace(/\.git$/i, '')

  return {
    owner,
    name,
    fullName: `${owner}/${name}`,
    webUrl: `https://github.com/${owner}/${name}`,
    cloneUrl: `https://github.com/${owner}/${name}.git`,
  }
}

export function validatePublicGitHubRepositoryUrl(input) {
  return Boolean(parseGitHubRepositoryUrl(input))
}

export async function runGit(args, options = {}) {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, {
      cwd: options.cwd,
      timeout: options.timeoutMs || 120000,
      maxBuffer: options.maxBuffer || 10 * 1024 * 1024,
      windowsHide: true,
    })

    return { stdout, stderr }
  } catch (error) {
    const details = String(error.stderr || error.message || '').trim()
    const wrapped = new Error(details || 'Git command failed.')
    wrapped.code = error.code
    wrapped.cause = error
    throw wrapped
  }
}

export async function getCurrentBranch(repositoryPath) {
  const { stdout } = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repositoryPath })
  return stdout.trim()
}

export async function cloneRepository(sourceUrl, options = {}) {
  const repositoryInfo = options.allowLocalPath
    ? {
        name: getLocalRepoName(sourceUrl),
        webUrl: String(sourceUrl),
        cloneUrl: String(sourceUrl),
      }
    : parseGitHubRepositoryUrl(sourceUrl)

  if (!repositoryInfo) {
    const error = new Error('A valid public GitHub repository URL is required.')
    error.statusCode = 400
    throw error
  }

  const workspaceRoot = options.workspaceRoot || defaultRepositoryWorkspace
  const targetPath = join(workspaceRoot, `${cleanRepoName(repositoryInfo.name)}-${randomUUID()}`)

  await mkdir(workspaceRoot, { recursive: true })
  try {
    await runGit(['clone', '--no-tags', repositoryInfo.cloneUrl, targetPath], {
      timeoutMs: options.timeoutMs || 120000,
    })
  } catch (error) {
    await removeRepositoryWorkspace(targetPath)
    throw error
  }

  return {
    repoName: repositoryInfo.name,
    repoFullName: repositoryInfo.fullName || repositoryInfo.name,
    repoUrl: repositoryInfo.webUrl,
    cloneUrl: repositoryInfo.cloneUrl,
    localPath: targetPath,
    defaultBranch: await getCurrentBranch(targetPath),
  }
}

export async function removeRepositoryWorkspace(repositoryPath) {
  if (!repositoryPath) return
  await rm(repositoryPath, { recursive: true, force: true, maxRetries: 3 })
}
