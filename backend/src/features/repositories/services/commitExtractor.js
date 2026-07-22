import { runGit } from './gitClient.js'

const commitMarker = '--CODEPULSE-COMMIT--'

function parseCommitChunk(chunk) {
  const lines = chunk
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (lines.length < 5) return null

  const [commitHash, author, authorEmail, commitDate, message, ...changedFiles] = lines

  return {
    commit_hash: commitHash,
    author,
    author_email: authorEmail,
    message,
    commit_date: commitDate,
    changed_files: changedFiles,
  }
}

export function parseGitLog(output) {
  return String(output || '')
    .split(commitMarker)
    .map(chunk => chunk.trim())
    .filter(Boolean)
    .map(parseCommitChunk)
    .filter(Boolean)
}

export async function extractCommitHistory(repositoryPath, options = {}) {
  const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : 100
  let stdout

  try {
    const result = await runGit(
      [
        'log',
        `--max-count=${limit}`,
        '--date=iso-strict',
        `--pretty=format:${commitMarker}%n%H%n%an%n%ae%n%aI%n%s`,
        '--name-only',
      ],
      { cwd: repositoryPath, maxBuffer: 20 * 1024 * 1024 },
    )
    stdout = result.stdout
  } catch (error) {
    if (/does not have any commits|no commits yet/i.test(error.message)) return []
    throw error
  }

  return parseGitLog(stdout)
}
