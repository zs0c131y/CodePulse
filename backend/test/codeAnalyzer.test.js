import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRepositoryStructure } from '../src/features/repositories/services/fileParser.js'
import {
  analyzeCodeStructure,
  analyzeSourceFile,
  identifyOrphanFiles,
} from '../src/features/repositories/services/codeAnalyzer.js'

test('extracts JavaScript symbols, imports, classes, exports, and HTTP routes', () => {
  const facts = analyzeSourceFile({
    filePath: 'src/users.js',
    language: 'TypeScript',
    content: [
      "import express from 'express'",
      "import { audit as recordAudit } from './audit.js'",
      '',
      'export class UsersController extends BaseController {',
      '  async list(request, response) {',
      '    return response.json([])',
      '  }',
      '}',
      'export async function loadUser(id, options = {}) { return { id, options } }',
      'export const validate = value => Boolean(value)',
      "router.get('/users/:id', loadUser)",
      "router.route('/users').post(createUser)",
      "@Delete('/users/:id')",
      'async remove(request, response) { return response.sendStatus(204) }',
      '/*',
      "export function ghost() {}",
      "router.patch('/ghost', ghost)",
      '*/',
    ].join('\n'),
  })

  assert.deepEqual(facts.imports.map(item => item.source), ['express', './audit.js'])
  assert.deepEqual(facts.functions.map(item => item.name), ['loadUser', 'validate'])
  assert.equal(facts.functions.find(item => item.name === 'loadUser').async, true)
  assert.equal(facts.classes[0].name, 'UsersController')
  assert.equal(facts.classes[0].extends, 'BaseController')
  assert.deepEqual(facts.classes[0].methods.map(item => item.name), ['list'])
  assert.deepEqual(facts.exports.map(item => item.name), ['UsersController', 'loadUser', 'validate'])
  assert.deepEqual(
    facts.routes.map(route => `${route.method} ${route.path} -> ${route.handler}`),
    [
      'GET /users/:id -> loadUser',
      'POST /users -> createUser',
      'DELETE /users/:id -> remove',
    ],
  )
  assert.ok(facts.metrics.cyclomaticComplexity >= 1)
  assert.equal(facts.metrics.functionCount >= 3, true)
})

test('extracts Python imports, functions, class methods, and decorated routes', () => {
  const facts = analyzeSourceFile({
    filePath: 'api/items.py',
    language: 'Python',
    content: [
      'from fastapi import APIRouter',
      'import json as serializer',
      '',
      '@router.post("/items")',
      'async def create_item(payload: dict):',
      '    return payload',
      '',
      'class ItemService(BaseService):',
      '    @staticmethod',
      '    def normalize(value: str):',
      '        return value.strip()',
    ].join('\n'),
  })

  assert.deepEqual(facts.imports.map(item => item.source), ['fastapi', 'json'])
  assert.deepEqual(facts.functions.map(item => item.name), ['create_item'])
  assert.equal(facts.functions[0].async, true)
  assert.equal(facts.classes[0].name, 'ItemService')
  assert.equal(facts.classes[0].extends, 'BaseService')
  assert.deepEqual(facts.classes[0].methods.map(item => item.name), ['normalize'])
  assert.equal(facts.classes[0].methods[0].static, true)
  assert.deepEqual(facts.routes.map(route => `${route.method} ${route.path}`), ['POST /items'])
})

test('analyzes supported repository files and reports bounded coverage and orphan evidence', async () => {
  const root = join(tmpdir(), `codepulse-code-analysis-${Date.now()}`)

  try {
    await mkdir(join(root, 'src'), { recursive: true })
    await writeFile(
      join(root, 'src', 'server.js'),
      "import service from './service.py'\napp.get('/health', health)\nexport function health() {}\n",
      'utf8',
    )
    await writeFile(join(root, 'src', 'service.py'), 'def execute(value):\n    return value\n', 'utf8')
    await writeFile(join(root, 'src', 'orphan.ts'), 'export const unused = () => true\n', 'utf8')
    await writeFile(join(root, 'src', 'Legacy.java'), 'class Legacy {}\n', 'utf8')

    const structure = await parseRepositoryStructure(root)
    const result = await analyzeCodeStructure(root, structure.files, {
      dependencies: [{
        source_file: 'src/server.js',
        target_file: 'src/service.py',
        resolved: true,
      }],
    })

    assert.equal(result.analysisVersion, 1)
    assert.equal(result.metrics.candidateFileCount, 4)
    assert.equal(result.metrics.supportedFileCount, 3)
    assert.equal(result.metrics.analyzedFileCount, 3)
    assert.equal(result.metrics.moduleCount, 1)
    assert.equal(result.metrics.routeCount, 1)
    assert.deepEqual(result.routes.map(route => route.filePath), ['src/server.js'])
    assert.deepEqual(result.orphanFiles.map(item => item.filePath), ['src/orphan.ts'])
    assert.deepEqual(result.skippedFiles, [{ filePath: 'src/Legacy.java', reason: 'unsupported_language' }])
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 3 })
  }
})

test('does not label conventional entrypoints as orphan files', () => {
  const orphanFiles = identifyOrphanFiles([
    { filePath: 'src/index.js' },
    { filePath: 'src/server.js' },
    { filePath: 'src/standalone.js' },
  ])

  assert.deepEqual(orphanFiles.map(item => item.filePath), ['src/standalone.js'])
  assert.equal(orphanFiles[0].confidence, 'low')
})

test('measures decision complexity, long functions, and repeated source blocks', async () => {
  const root = join(tmpdir(), `codepulse-source-metrics-${Date.now()}`)
  const repeatedBlock = [
    'const first = payload.first',
    'const second = payload.second',
    'const third = first + second',
    'const fourth = third * 2',
    'const fifth = fourth - first',
    'return fifth + second',
  ].join('\n')

  try {
    await mkdir(join(root, 'src'), { recursive: true })
    await writeFile(
      join(root, 'src', 'a.js'),
      `export function calculate(payload) {\nif (payload) {\n${repeatedBlock}\n}\nreturn 0\n}\n`,
      'utf8',
    )
    await writeFile(
      join(root, 'src', 'b.js'),
      `export function calculateAgain(payload) {\nwhile (payload.ready) {\n${repeatedBlock}\n}\nreturn 0\n}\n`,
      'utf8',
    )
    const structure = await parseRepositoryStructure(root)
    const result = await analyzeCodeStructure(root, structure.files)

    assert.equal(result.metrics.maxCyclomaticComplexity >= 2, true)
    assert.equal(result.metrics.duplicateBlockCount > 0, true)
    assert.equal(result.metrics.duplicationPercent > 0, true)
    assert.equal(result.files.every(file => file.metrics.duplicationPercent > 0), true)
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 3 })
  }
})

test('ignores JavaScript strings and Python docstrings that look like code facts', () => {
  const javascript = analyzeSourceFile({
    filePath: 'src/messages.js',
    language: 'JavaScript',
    content: [
      'const routeExample = "router.get(\'/ghost\', handler)"',
      'const importExample = "import fake from \'not-a-module\'"',
      "router.get('/real', realHandler)",
    ].join('\n'),
  })
  const python = analyzeSourceFile({
    filePath: 'src/messages.py',
    language: 'Python',
    content: [
      '"""',
      'def ghost():',
      '    return True',
      '"""',
      'def real():',
      '    return True',
    ].join('\n'),
  })

  assert.deepEqual(javascript.imports, [])
  assert.deepEqual(javascript.routes.map(route => route.path), ['/real'])
  assert.deepEqual(python.functions.map(item => item.name), ['real'])
})

test('does not treat Express router mounts as HTTP endpoints', () => {
  const facts = analyzeSourceFile({
    filePath: 'src/app.js',
    language: 'JavaScript',
    content: "app.use('/api', apiRouter)\napp.get('/health', health)\n",
  })

  assert.deepEqual(facts.routes.map(route => `${route.method} ${route.path}`), ['GET /health'])
})
