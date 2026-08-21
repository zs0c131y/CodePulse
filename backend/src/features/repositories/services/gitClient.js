import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, rename, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'
import {
  REPOSITORY_CLONE_DEPTH,
  REPOSITORY_CLONE_TIMEOUT_MS,
  REPOSITORY_MAX_SIZE_KB,
} from '../../../config/index.js'

const execFileAsync = promisify(execFile)
const githubRepoPattern = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/
const inaccessibleCloneErrorPattern = /could not read username|terminal prompts disabled|authentication failed|repository not found/i

// A private, renamed, or deleted GitHub repository fails clone with a raw git
// auth-prompt error rather than a clean 404 — the pre-flight metadata check
// (assertRepositorySizeAllowed) is best-effort and can silently pass through
// on network hiccups, so this is the reliable place to catch it.
export function isInaccessibleCloneError(message) {
  return inaccessibleCloneErrorPattern.test(String(message || ''))
}

export const defaultRepositoryWorkspace = join(tmpdir(), 'codepulse', 'repositories')
const cleanupRetryDelayMs = 500
const cleanupMaxRetries = 12

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
      env: options.env || process.env,
      timeout: options.timeoutMs || REPOSITORY_CLONE_TIMEOUT_MS,
      maxBuffer: options.maxBuffer || 10 * 1024 * 1024,
      killSignal: 'SIGKILL',
      windowsHide: true,
    })

    return { stdout, stderr }
  } catch (error) {
    if (error.code === 'ENOENT') {
      const wrapped = new Error('Git is not installed or is not available on PATH.')
      wrapped.statusCode = 503
      wrapped.code = error.code
      wrapped.cause = error
      throw wrapped
    }

    const details = String(error.stderr || error.message || '').trim()
    const wrapped = new Error(details || 'Git command failed.')
    wrapped.code = error.code
    wrapped.cause = error
    throw wrapped
  }
}

async function fetchGitHubRepositoryMetadata(repositoryInfo) {
  const response = await fetch(`https://api.github.com/repos/${repositoryInfo.owner}/${repositoryInfo.name}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'CodePulse repository analyzer',
    },
    signal: AbortSignal.timeout(10000),
  })

  if (response.status === 404) {
    const error = new Error('Repository was not found or is not public.')
    error.statusCode = 404
    throw error
  }

  if (!response.ok) return null

  return response.json()
}

export async function assertRepositorySizeAllowed(repositoryInfo, options = {}) {
  const maxSizeKb = options.maxSizeKb ?? REPOSITORY_MAX_SIZE_KB
  if (!repositoryInfo?.owner || !repositoryInfo?.name || !maxSizeKb) return

  let metadata

  try {
    metadata = await fetchGitHubRepositoryMetadata(repositoryInfo)
  } catch (error) {
    if (error.statusCode) throw error
    return
  }

  const sizeKb = Number(metadata?.size)
  if (!Number.isFinite(sizeKb) || sizeKb <= maxSizeKb) return

  const error = new Error(
    `Repository is too large for interactive analysis (${Math.round(sizeKb / 1024)} MB). ` +
      `Current limit is ${Math.round(maxSizeKb / 1024)} MB.`,
  )
  error.statusCode = 413
  throw error
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
  const cloneDepth = options.depth || REPOSITORY_CLONE_DEPTH

  await mkdir(workspaceRoot, { recursive: true })

  if (!options.allowLocalPath) {
    await assertRepositorySizeAllowed(repositoryInfo, { maxSizeKb: options.maxSizeKb })
  }

  try {
    await runGit(['clone', '--no-tags', '--single-branch', '--depth', String(cloneDepth), repositoryInfo.cloneUrl, targetPath], {
      timeoutMs: options.timeoutMs || REPOSITORY_CLONE_TIMEOUT_MS,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    })
  } catch (error) {
    await removeRepositoryWorkspace(targetPath)
    if (!options.allowLocalPath && isInaccessibleCloneError(error.message)) {
      const wrapped = new Error('Repository was not found or is not public.')
      wrapped.statusCode = 404
      wrapped.cause = error
      throw wrapped
    }
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

export async function removeRepositoryWorkspace(repositoryPath, options = {}) {
  if (!repositoryPath) return

  try {
    await rm(repositoryPath, {
      recursive: true,
      force: true,
      maxRetries: options.maxRetries || cleanupMaxRetries,
      retryDelay: options.retryDelayMs || cleanupRetryDelayMs,
    })
  } catch {
    const pendingPath = `${repositoryPath}.delete-${Date.now()}`

    try {
      await rename(repositoryPath, pendingPath)
      await rm(pendingPath, {
        recursive: true,
        force: true,
        maxRetries: options.maxRetries || cleanupMaxRetries,
        retryDelay: options.retryDelayMs || cleanupRetryDelayMs,
      })
    } catch (renameOrRemoveError) {
      if (options.throwOnError) throw renameOrRemoveError
      console.warn(`CodePulse could not remove repository workspace ${repositoryPath}:`, renameOrRemoveError.message)
    }
  }
}
