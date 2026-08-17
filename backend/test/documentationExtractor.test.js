import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRepositoryStructure } from '../src/features/repositories/services/fileParser.js'
import {
  extractDocumentation,
  getDocumentationType,
  summarizeDocumentation,
} from '../src/features/repositories/services/documentationExtractor.js'

test('summarizes documentation using the first markdown heading', () => {
  assert.equal(summarizeDocumentation('\n# Project Title\n\nDetails here.'), 'Project Title')
  assert.equal(summarizeDocumentation('No heading here.\nMore text.'), 'No heading here. More text.')
})

test('detects documentation types', () => {
  assert.equal(getDocumentationType('README.md'), 'readme')
  assert.equal(getDocumentationType('CHANGELOG.md'), 'changelog')
  assert.equal(getDocumentationType('docs/api.md'), 'api')
  assert.equal(getDocumentationType('docs/architecture.md'), 'guide')
})

test('extracts documentation files from parsed repository files', async () => {
  const root = join(tmpdir(), `codepulse-doc-extractor-${Date.now()}`)

  try {
    await mkdir(join(root, 'docs'), { recursive: true })
    await mkdir(join(root, 'src'), { recursive: true })
    await writeFile(join(root, 'README.md'), '# Fixture Project\n\nIntro text.\n', 'utf8')
    await writeFile(join(root, 'CHANGELOG.md'), '# Changelog\n\n- Initial\n', 'utf8')
    await writeFile(join(root, 'docs', 'architecture.md'), '# Architecture\n\nSystem notes.\n', 'utf8')
    await writeFile(join(root, 'docs', 'notes.txt'), 'Operational notes.\n', 'utf8')
    await writeFile(join(root, 'docs', 'diagram.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    await writeFile(join(root, 'docs', 'guide.pdf'), Buffer.from('%PDF-1.7\n'))
    await writeFile(join(root, 'README.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    await writeFile(join(root, 'src', 'index.js'), 'console.log("ok")\n', 'utf8')

    const parsed = await parseRepositoryStructure(root)
    const docs = await extractDocumentation(root, parsed.files)

    assert.deepEqual(docs.map(doc => doc.doc_path), [
      'CHANGELOG.md',
      'docs/architecture.md',
      'docs/notes.txt',
      'README.md',
    ])
    assert.equal(docs.find(doc => doc.doc_path === 'README.md').content_summary, 'Fixture Project')
    assert.equal(docs.some(doc => doc.doc_path === 'src/index.js'), false)
    assert.equal(docs.some(doc => /\.(?:pdf|png)$/i.test(doc.doc_path)), false)
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 3 })
  }
})

