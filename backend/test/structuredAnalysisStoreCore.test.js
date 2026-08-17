import test from 'node:test'
import assert from 'node:assert/strict'
import {
  persistStructuredAnalysisWithCollections,
  serializeCodeAnalysis,
  serializeDocumentationAnalysis,
} from '../src/features/repositories/services/structuredAnalysisStoreCore.js'

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

  async insertMany(records) {
    for (const record of records) await this.insertOne(record)
  }

  async updateOne(filter, update) {
    const record = await this.findOne(filter)
    if (record && update.$set) Object.assign(record, update.$set)
  }

  async deleteMany(filter) {
    this.records = this.records.filter(record => !this.matches(record, filter))
  }
}

function collections() {
  return {
    codeAnalysisSummaries: new FakeCollection(),
    codeFacts: new FakeCollection(),
    documentationAnalysisSummaries: new FakeCollection(),
    documentationFacts: new FakeCollection(),
  }
}

function input() {
  return {
    repositoryId: 'repo-1',
    now: '2026-08-12T10:00:00.000Z',
    codeAnalysis: {
      analysisVersion: 1,
      metrics: { analyzedFileCount: 1, routeCount: 1 },
      modules: [{ path: 'src', files: ['src/app.js'] }],
      routes: [{ method: 'GET', path: '/health', filePath: 'src/app.js' }],
      orphanFiles: [],
      skippedFiles: [],
      files: [{
        filePath: 'src/app.js',
        modulePath: 'src',
        moduleName: 'src.app',
        language: 'JavaScript',
        lineCount: 8,
        imports: [],
        exports: [],
        functions: [{ name: 'health', line: 2 }],
        classes: [],
        routes: [{ method: 'GET', path: '/health', line: 5 }],
      }],
    },
    documentationAnalysis: {
      analysisVersion: 1,
      metrics: { documentCount: 1, apiEndpointCount: 1 },
      coverage: { overallPercent: 100 },
      facts: {
        setup: { present: true, steps: [], commands: [{ command: 'npm install' }] },
        api: { present: true, endpoints: [{ method: 'GET', path: '/health' }] },
        architecture: { present: false, notes: [] },
        sourceReferences: [],
      },
      documents: [{
        docPath: 'README.md',
        type: 'readme',
        title: 'Demo',
        headings: [{ title: 'Demo', line: 1 }],
        setup: {},
        api: {},
        architecture: { present: false },
        sourceReferences: [],
      }],
    },
  }
}

test('persists and replaces structured code and documentation facts', async () => {
  const stores = collections()
  await persistStructuredAnalysisWithCollections(input(), stores)

  assert.equal(stores.codeAnalysisSummaries.records.length, 1)
  assert.equal(stores.codeFacts.records[0].file_path, 'src/app.js')
  assert.equal(stores.documentationFacts.records[0].doc_path, 'README.md')

  const rescanned = input()
  rescanned.codeAnalysis.files[0].filePath = 'src/server.js'
  rescanned.codeAnalysis.files[0].moduleName = 'src.server'
  rescanned.documentationAnalysis.documents = []
  await persistStructuredAnalysisWithCollections(rescanned, stores)

  assert.equal(stores.codeAnalysisSummaries.records.length, 1)
  assert.equal(stores.codeFacts.records.length, 1)
  assert.equal(stores.codeFacts.records[0].file_path, 'src/server.js')
  assert.equal(stores.documentationFacts.records.length, 0)
})

test('serializes paginated structured facts without exposing persistence fields', async () => {
  const stores = collections()
  await persistStructuredAnalysisWithCollections(input(), stores)

  const code = serializeCodeAnalysis(
    stores.codeAnalysisSummaries.records[0],
    stores.codeFacts.records,
    { limit: 1, skip: 0 },
  )
  const documentation = serializeDocumentationAnalysis(
    stores.documentationAnalysisSummaries.records[0],
    stores.documentationFacts.records,
  )

  assert.equal(code.files.total, 1)
  assert.equal(code.files.items[0].filePath, 'src/app.js')
  assert.equal(code.files.items[0].repository_id, undefined)
  assert.equal(documentation.documents.items[0].docPath, 'README.md')
  assert.equal(documentation.coverage.overallPercent, 100)
})
