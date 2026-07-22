import test from 'node:test'
import assert from 'node:assert/strict'
import { aggregateContributors } from '../src/features/repositories/services/contributorAggregator.js'

test('groups commits by author email and counts commits', () => {
  const contributors = aggregateContributors([
    { author: 'Ada Lovelace', author_email: 'Ada@Example.com', commit_date: '2026-07-01T00:00:00.000Z' },
    { author: 'Ada Lovelace', author_email: 'ada@example.com', commit_date: '2026-07-10T00:00:00.000Z' },
    { author: 'Grace Hopper', author_email: 'grace@example.com', commit_date: '2026-07-05T00:00:00.000Z' },
  ])

  assert.equal(contributors.length, 2)
  assert.equal(contributors[0].name, 'Ada Lovelace')
  assert.equal(contributors[0].commitCount, 2)
  assert.equal(contributors[0].firstCommitAt, '2026-07-01T00:00:00.000Z')
  assert.equal(contributors[0].lastCommitAt, '2026-07-10T00:00:00.000Z')
  assert.equal(contributors[1].name, 'Grace Hopper')
  assert.equal(contributors[1].commitCount, 1)
})

test('falls back to author name when no email is present, and sorts by commit count desc', () => {
  const contributors = aggregateContributors([
    { author: 'Bot', author_email: '', commit_date: '2026-07-01T00:00:00.000Z' },
    { author: 'Bot', author_email: '', commit_date: '2026-07-02T00:00:00.000Z' },
    { author: 'Human', author_email: 'human@example.com', commit_date: '2026-07-03T00:00:00.000Z' },
  ])

  assert.deepEqual(contributors.map(contributor => contributor.name), ['Bot', 'Human'])
  assert.equal(contributors[0].email, null)
  assert.equal(contributors[0].commitCount, 2)
})

test('returns an empty list for repositories without commits', () => {
  assert.deepEqual(aggregateContributors([]), [])
})
