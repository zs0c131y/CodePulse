import { execFile } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { promisify } from 'node:util'
import {
  extractCommitHistory,
  parseGitLog,
} from '../src/features/repositories/services/commitExtractor.js'

const execFileAsync = promisify(execFile)

async function git(args, cwd) {
  await execFileAsync('git', args, { cwd, windowsHide: true })
}

test('parses git log output into commit records', () => {
  const records = parseGitLog(
    '--CODEPULSE-COMMIT--\nabc\nAda\nada@example.com\n2026-07-04T10:00:00+05:30\nAdd API\nsrc/api.js\nREADME.md\n',
  )

  assert.deepEqual(records, [
    {
      commit_hash: 'abc',
      author: 'Ada',
      author_email: 'ada@example.com',
      commit_date: '2026-07-04T10:00:00+05:30',
      message: 'Add API',
      changed_files: ['src/api.js', 'README.md'],
    },
  ])
})

test('extracts recent commit history from a repository', async () => {
  const root = join(tmpdir(), `codepulse-commit-extractor-${Date.now()}`)

  try {
    await mkdir(root, { recursive: true })
    await git(['init', '-b', 'main'], root)
    await git(['config', 'user.email', 'test@example.com'], root)
    await git(['config', 'user.name', 'CodePulse Test'], root)
    await writeFile(join(root, 'README.md'), '# Fixture\n', 'utf8')
    await git(['add', 'README.md'], root)
    await git(['commit', '-m', 'Initial commit'], root)
    await mkdir(join(root, 'src'), { recursive: true })
    await writeFile(join(root, 'src', 'index.js'), 'console.log("ok")\n', 'utf8')
    await git(['add', 'src/index.js'], root)
    await git(['commit', '-m', 'Add source file'], root)

    const commits = await extractCommitHistory(root, { limit: 10 })

    assert.equal(commits.length, 2)
    assert.equal(commits[0].message, 'Add source file')
    assert.deepEqual(commits[0].changed_files, ['src/index.js'])
    assert.equal(commits[1].message, 'Initial commit')
    assert.deepEqual(commits[1].changed_files, ['README.md'])
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 3 })
  }
})

test('returns an empty list for repositories without commits', async () => {
  const root = join(tmpdir(), `codepulse-empty-commit-extractor-${Date.now()}`)

  try {
    await mkdir(root, { recursive: true })
    await git(['init', '-b', 'main'], root)

    const commits = await extractCommitHistory(root)

    assert.deepEqual(commits, [])
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 3 })
  }
})
