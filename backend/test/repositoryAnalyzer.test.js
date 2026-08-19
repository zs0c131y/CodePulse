import { execFile } from 'node:child_process'
import { access, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { promisify } from 'node:util'
import { analyzeRepositorySource } from '../src/features/repositories/services/repositoryAnalyzer.js'
import { persistRepositoryAnalysisWithCollections } from '../src/features/repositories/services/repositoryStoreCore.js'

const execFileAsync = promisify(execFile)

class FakeCollection {
  constructor() {
    this.records = []
    this.nextId = 1
  }

  matches(record, filter) {
    return Object.entries(filter).every(([key, value]) => record[key] === value)
  }

  async findOne(filter) {
    return this.records.find(record => this.matches(record, filter)) || null
  }

  async insertOne(record) {
    const inserted = { _id: `fake-${this.nextId++}`, ...record }
    this.records.push(inserted)
    return { insertedId: inserted._id }
  }

  async updateOne(filter, update) {
    const record = await this.findOne(filter)
    if (record && update.$set) Object.assign(record, update.$set)
    return { matchedCount: record ? 1 : 0 }
  }

  async deleteMany(filter) {
    this.records = this.records.filter(record => !this.matches(record, filter))
  }

  async insertMany(records) {
    for (const record of records) await this.insertOne(record)
  }
}

function createCollections() {
  return {
    repositories: new FakeCollection(),
    repoFiles: new FakeCollection(),
    commits: new FakeCollection(),
    dependencies: new FakeCollection(),
    documentation: new FakeCollection(),
  }
}

async function git(args, cwd) {
  await execFileAsync('git', args, { cwd, windowsHide: true })
}

test('runs the repository intelligence pipeline against a local fixture repository', async () => {
  const root = join(tmpdir(), `codepulse-analyzer-${Date.now()}`)
  const source = join(root, 'source')
  const workspace = join(root, 'workspace')
  const collections = createCollections()
  let scoringInput
  let structuredInput

  try {
    await mkdir(join(source, 'src'), { recursive: true })
    await git(['init', '-b', 'main'], source)
    await git(['config', 'user.email', 'test@example.com'], source)
    await git(['config', 'user.name', 'CodePulse Test'], source)
    await writeFile(join(source, 'README.md'), '# Demo Repository\n', 'utf8')
    await writeFile(join(source, 'src', 'util.js'), 'export const value = 1\n', 'utf8')
    await writeFile(join(source, 'src', 'index.js'), 'import { value } from "./util.js"\nconsole.log(value)\n', 'utf8')
    await git(['add', '.'], source)
    await git(['commit', '-m', 'Initial repository'], source)

    const result = await analyzeRepositorySource({
      sourceUrl: source,
      userId: 'user-1',
      cloneOptions: {
        allowLocalPath: true,
        workspaceRoot: workspace,
      },
      persistAnalysis: analysis => persistRepositoryAnalysisWithCollections(analysis, collections),
      persistStructured: async input => {
        structuredInput = input
        return { codeFactCount: input.codeAnalysis.files.length }
      },
      scoreAnalysis: async input => {
        scoringInput = input
        await access(join(input.repositoryPath, 'src', 'index.js'))
        return { healthScore: 80 }
      },
    })

    assert.equal(result.summary.repository.name, 'source')
    assert.equal(result.summary.totalFiles, 3)
    assert.equal(result.summary.totalDocumentation, 1)
    assert.equal(result.summary.totalCommits, 1)
    assert.equal(result.summary.totalDependencies, 1)
    assert.equal(collections.repositories.records.length, 1)
    assert.equal(collections.repoFiles.records.length, 3)
    assert.equal(collections.dependencies.records[0].target_file, 'src/util.js')
    assert.equal(scoringInput.repositoryId, result.persisted.repositoryId)
    assert.deepEqual(scoringInput.analysis.dependencyGraph.scannedFilePaths, ['src/index.js', 'src/util.js'])
    assert.equal(structuredInput.repositoryId, result.persisted.repositoryId)
    assert.equal(structuredInput.codeAnalysis.metrics.analyzedFileCount, 2)
    assert.equal(structuredInput.documentationAnalysis.metrics.documentCount, 1)
    assert.equal(result.summary.totalCodeFacts, 2)
    assert.equal(result.scoring.healthScore, 80)
    assert.deepEqual(scoringInput.analysis.coverage, { available: false, reason: 'no-report-found', modules: [] })
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 3 })
  }
})

test('ingests an LCOV coverage report already committed in the repository', async () => {
  const root = join(tmpdir(), `codepulse-analyzer-coverage-${Date.now()}`)
  const source = join(root, 'source')
  const workspace = join(root, 'workspace')
  const collections = createCollections()
  let scoringInput

  try {
    await mkdir(join(source, 'src'), { recursive: true })
    await mkdir(join(source, 'coverage'), { recursive: true })
    await git(['init', '-b', 'main'], source)
    await git(['config', 'user.email', 'test@example.com'], source)
    await git(['config', 'user.name', 'CodePulse Test'], source)
    await writeFile(join(source, 'src', 'util.js'), 'export const value = 1\n', 'utf8')
    await writeFile(
      join(source, 'coverage', 'lcov.info'),
      'SF:src/util.js\nDA:1,1\nDA:2,0\nend_of_record\n',
      'utf8',
    )
    await git(['add', '.'], source)
    await git(['commit', '-m', 'Initial repository'], source)

    await analyzeRepositorySource({
      sourceUrl: source,
      userId: 'user-1',
      cloneOptions: { allowLocalPath: true, workspaceRoot: workspace },
      persistAnalysis: analysis => persistRepositoryAnalysisWithCollections(analysis, collections),
      persistStructured: async () => ({}),
      scoreAnalysis: async input => {
        scoringInput = input
        return { healthScore: 80 }
      },
    })

    assert.equal(scoringInput.analysis.coverage.available, true)
    assert.equal(scoringInput.analysis.coverage.reportPath, 'coverage/lcov.info')
    assert.deepEqual(scoringInput.analysis.coverage.modules, [
      { filePath: 'src/util.js', linesFound: 2, linesHit: 1, coveredPercent: 50 },
    ])
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 3 })
  }
})
