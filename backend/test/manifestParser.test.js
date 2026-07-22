import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePackageJsonManifest, parseRequirementsTxtManifest } from '../src/features/repositories/services/manifestParser.js'
import { fetchRepositoryManifests } from '../src/features/repositories/services/manifestFetcher.js'

test('parsePackageJsonManifest extracts dependencies and devDependencies', () => {
  const manifest = parsePackageJsonManifest(JSON.stringify({
    name: 'demo',
    version: '1.0.0',
    dependencies: { express: '^5.2.1' },
    devDependencies: { nodemon: '^3.1.14' },
  }))

  assert.equal(manifest.type, 'npm')
  assert.equal(manifest.name, 'demo')
  assert.deepEqual(manifest.dependencies, [
    { name: 'express', version: '^5.2.1', kind: 'dependency' },
    { name: 'nodemon', version: '^3.1.14', kind: 'devDependency' },
  ])
})

test('parsePackageJsonManifest returns null for invalid JSON', () => {
  assert.equal(parsePackageJsonManifest('{ not json'), null)
})

test('parsePackageJsonManifest handles a manifest with no dependency fields', () => {
  const manifest = parsePackageJsonManifest(JSON.stringify({ name: 'demo' }))
  assert.deepEqual(manifest.dependencies, [])
})

test('parseRequirementsTxtManifest parses pinned versions and skips comments/blank lines/editable installs', () => {
  const content = [
    '# core deps',
    'requests==2.31.0',
    '',
    'flask>=2.0,<3.0',
    '-e .',
    'numpy',
  ].join('\n')

  const manifest = parseRequirementsTxtManifest(content)

  assert.equal(manifest.type, 'pip')
  assert.deepEqual(manifest.dependencies, [
    { name: 'requests', version: '==2.31.0', kind: 'dependency' },
    { name: 'flask', version: '>=2.0,<3.0', kind: 'dependency' },
    { name: 'numpy', version: null, kind: 'dependency' },
  ])
})

test('fetchRepositoryManifests skips manifests that 404 and parses the ones that resolve', async () => {
  const calledUrls = []
  const fetchImpl = async url => {
    calledUrls.push(url)

    if (url.endsWith('package.json')) {
      return { ok: true, text: async () => JSON.stringify({ name: 'demo', dependencies: { express: '^5.0.0' } }) }
    }

    return { ok: false }
  }

  const manifests = await fetchRepositoryManifests({
    repoFullName: 'owner/demo',
    defaultBranch: 'main',
    fetchImpl,
  })

  assert.equal(manifests.length, 1)
  assert.equal(manifests[0].type, 'npm')
  assert.deepEqual(calledUrls, [
    'https://raw.githubusercontent.com/owner/demo/main/package.json',
    'https://raw.githubusercontent.com/owner/demo/main/requirements.txt',
  ])
})

test('fetchRepositoryManifests returns an empty list when repoFullName is missing', async () => {
  const manifests = await fetchRepositoryManifests({ repoFullName: null, fetchImpl: async () => ({ ok: true, text: async () => '' }) })
  assert.deepEqual(manifests, [])
})

test('fetchRepositoryManifests tolerates a fetch rejection for one file and still checks the rest', async () => {
  const fetchImpl = async url => {
    if (url.endsWith('package.json')) throw new Error('network error')
    return { ok: true, text: async () => 'flask==2.0.0' }
  }

  const manifests = await fetchRepositoryManifests({ repoFullName: 'owner/demo', fetchImpl })

  assert.equal(manifests.length, 1)
  assert.equal(manifests[0].type, 'pip')
})
