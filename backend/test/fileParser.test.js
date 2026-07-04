import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyFile,
  getLanguage,
  parseRepositoryStructure,
} from '../src/features/repositories/services/fileParser.js'

test('classifies common repository files', () => {
  assert.equal(classifyFile('README.md'), 'documentation')
  assert.equal(classifyFile('docs/api.md'), 'documentation')
  assert.equal(classifyFile('src/index.js'), 'code')
  assert.equal(classifyFile('src/index.test.js'), 'test')
  assert.equal(classifyFile('package.json'), 'config')
  assert.equal(classifyFile('public/logo.svg'), 'asset')
  assert.equal(getLanguage('service.ts'), 'TypeScript')
})

test('parses repository directories and files while skipping ignored folders', async () => {
  const root = join(tmpdir(), `codepulse-file-parser-${Date.now()}`)

  try {
    await mkdir(join(root, 'src', '__tests__'), { recursive: true })
    await mkdir(join(root, 'docs'), { recursive: true })
    await mkdir(join(root, 'node_modules', 'left-pad'), { recursive: true })
    await writeFile(join(root, 'README.md'), '# Fixture\n', 'utf8')
    await writeFile(join(root, 'package.json'), '{}\n', 'utf8')
    await writeFile(join(root, 'src', 'index.js'), 'import "./util.js"\n', 'utf8')
    await writeFile(join(root, 'src', 'util.js'), 'export const value = 1\n', 'utf8')
    await writeFile(join(root, 'src', '__tests__', 'index.test.js'), 'test("ok")\n', 'utf8')
    await writeFile(join(root, 'docs', 'api.md'), '# API\n', 'utf8')
    await writeFile(join(root, 'node_modules', 'left-pad', 'index.js'), 'module.exports = null\n', 'utf8')

    const parsed = await parseRepositoryStructure(root)
    const paths = parsed.files.map(file => file.path)

    assert.deepEqual(paths, [
      'docs/api.md',
      'package.json',
      'README.md',
      'src/__tests__/index.test.js',
      'src/index.js',
      'src/util.js',
    ])
    assert.equal(parsed.summary.totalFiles, 6)
    assert.equal(parsed.summary.filesByType.documentation, 2)
    assert.equal(parsed.summary.filesByType.code, 2)
    assert.equal(parsed.summary.filesByType.config, 1)
    assert.equal(parsed.summary.filesByType.test, 1)
    assert.equal(parsed.directories.some(directory => directory.path === 'node_modules'), false)
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 3 })
  }
})
