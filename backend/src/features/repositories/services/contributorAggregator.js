function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function contributorKey(commit) {
  const email = String(commit.author_email || '').trim().toLowerCase()
  if (email) return `email:${email}`

  const name = String(commit.author || 'Unknown').trim().toLowerCase()
  return `name:${name}`
}

export function aggregateContributors(commits) {
  const byKey = new Map()

  for (const commit of commits) {
    const key = contributorKey(commit)
    const date = toDate(commit.commit_date)
    const existing = byKey.get(key)

    if (existing) {
      existing.commitCount += 1
      if (date && (!existing.firstCommitAt || date < existing.firstCommitAt)) existing.firstCommitAt = date
      if (date && (!existing.lastCommitAt || date > existing.lastCommitAt)) existing.lastCommitAt = date
      continue
    }

    byKey.set(key, {
      name: commit.author || 'Unknown',
      email: commit.author_email || null,
      commitCount: 1,
      firstCommitAt: date,
      lastCommitAt: date,
    })
  }

  return [...byKey.values()]
    .sort((left, right) => right.commitCount - left.commitCount || left.name.localeCompare(right.name))
    .map(contributor => ({
      ...contributor,
      firstCommitAt: contributor.firstCommitAt ? contributor.firstCommitAt.toISOString() : null,
      lastCommitAt: contributor.lastCommitAt ? contributor.lastCommitAt.toISOString() : null,
    }))
}
