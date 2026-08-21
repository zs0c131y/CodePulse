import { execFile } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { promisify } from 'node:util'
import {
  assertRepositorySizeAllowed,
  cloneRepository,
  isInaccessibleCloneError,
  materializeRepositoryFiles,
  parseGitHubRepositoryUrl,
  runGit,
  validatePublicGitHubRepositoryUrl,
} from '../src/features/repositories/services/gitClient.js'

const execFileAsync = promisify(execFile)

async function git(args, cwd) {
  await execFileAsync('git', args, { cwd, windowsHide: true })
}

test('parses and normalizes public GitHub repository URLs', () => {
  const parsed = parseGitHubRepositoryUrl('https://github.com/openai/codex.git')

  assert.equal(validatePublicGitHubRepositoryUrl('https://github.com/openai/codex'), true)
  assert.equal(validatePublicGitHubRepositoryUrl('http://github.com/openai/codex'), false)
  assert.equal(validatePublicGitHubRepositoryUrl('https://example.com/openai/codex'), false)
  assert.deepEqual(parsed, {
    owner: 'openai',
    name: 'codex',
    fullName: 'openai/codex',
    webUrl: 'https://github.com/openai/codex',
    cloneUrl: 'https://github.com/openai/codex.git',
  })
})

test('materializes selected paths from a no-checkout clone', async () => {
  const root = join(tmpdir(), `codepulse-materialize-test-${Date.now()}`)
  const source = join(root, 'source')
  const clone = join(root, 'clone')

  try {
    await mkdir(source, { recursive: true })
    await git(['init', '-b', 'main'], source)
    await git(['config', 'user.email', 'test@example.com'], source)
    await git(['config', 'user.name', 'CodePulse Test'], source)
    await writeFile(join(source, 'README.md'), '# Selective checkout\n', 'utf8')
    await git(['add', 'README.md'], source)
    await git(['commit', '-m', 'Initial commit'], source)
    await runGit(['clone', '--no-checkout', source, clone])

    await assert.rejects(() => readFile(join(clone, 'README.md'), 'utf8'), { code: 'ENOENT' })
    await materializeRepositoryFiles(clone, ['README.md'])
    assert.equal((await readFile(join(clone, 'README.md'), 'utf8')).replaceAll('\r\n', '\n'), '# Selective checkout\n')
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 3 })
  }
})

test('clones a repository into a controlled workspace', async () => {
  const root = join(tmpdir(), `codepulse-clone-test-${Date.now()}`)
  const source = join(root, 'source-repo')
  const workspace = join(root, 'workspace')

  try {
    await mkdir(source, { recursive: true })
    await git(['init', '-b', 'main'], source)
    await git(['config', 'user.email', 'test@example.com'], source)
    await git(['config', 'user.name', 'CodePulse Test'], source)
    await writeFile(join(source, 'README.md'), '# Fixture\n', 'utf8')
    await git(['add', 'README.md'], source)
    await git(['commit', '-m', 'Initial commit'], source)

    const cloned = await cloneRepository(source, {
      allowLocalPath: true,
      workspaceRoot: workspace,
    })

    assert.equal(cloned.repoName, 'source-repo')
    assert.equal(cloned.defaultBranch, 'main')
    assert.match(cloned.localPath, /source-repo-/)
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 3 })
  }
})

test('rejects repositories above the configured size limit', async () => {
  const originalFetch = globalThis.fetch

  try {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      async json() {
        return { size: 2048 }
      },
    })

    await assert.rejects(
      () => assertRepositorySizeAllowed({ owner: 'large', name: 'repo' }, { maxSizeKb: 1024 }),
      error => {
        assert.equal(error.statusCode, 413)
        assert.match(error.message, /too large/i)
        return true
      },
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('allows unlimited repository size when the size limit is zero', async () => {
  const originalFetch = globalThis.fetch

  try {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      async json() {
        return { size: 10 * 1024 * 1024 }
      },
    })

    await assert.doesNotReject(
      () => assertRepositorySizeAllowed({ owner: 'large', name: 'repo' }, { maxSizeKb: 0 }),
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('recognizes the raw git errors a private or missing repository produces', () => {
  assert.equal(
    isInaccessibleCloneError("fatal: could not read Username for 'https://github.com': No such device or address"),
    true,
  )
  assert.equal(isInaccessibleCloneError("fatal: could not read Username for 'https://github.com': terminal prompts disabled"), true)
  assert.equal(isInaccessibleCloneError('remote: Repository not found.\nfatal: repository not found'), true)
  assert.equal(isInaccessibleCloneError('fatal: unable to access: Could not resolve host'), false)
})

test('returns a service error when git is unavailable', async () => {
  await assert.rejects(
    () => runGit(['--version'], { env: { PATH: '' } }),
    error => {
      assert.equal(error.statusCode, 503)
      assert.match(error.message, /Git is not installed/i)
      return true
    },
  )
})

