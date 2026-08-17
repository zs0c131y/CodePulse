import test from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzeDocumentation,
  analyzeDocumentationEntry,
} from '../src/features/repositories/services/documentationAnalyzer.js'

test('extracts structured setup, API, architecture, and source-reference facts', () => {
  const result = analyzeDocumentationEntry({
    doc_path: 'README.md',
    documentation_type: 'readme',
    content: [
      '# Demo Service',
      '',
      '## Installation',
      '',
      '1. Install dependencies.',
      '2. Copy the environment template.',
      '',
      '```bash',
      'npm install',
      'npm run dev',
      '```',
      '',
      '## API Endpoints',
      '',
      '| Method | Path |',
      '| --- | --- |',
      '| GET | /users |',
      '| POST | /users |',
      '',
      '## Architecture',
      '',
      'Requests pass through the HTTP adapter into the domain service.',
      '',
      '```mermaid',
      'graph LR',
      '  API --> Service',
      '```',
      '',
      'The implementation lives in `src/users/controller.js`.',
    ].join('\n'),
  })

  assert.equal(result.title, 'Demo Service')
  assert.deepEqual(result.setup.steps.map(item => item.text), [
    'Install dependencies.',
    'Copy the environment template.',
  ])
  assert.equal(result.setup.commands[0].command, 'npm install\nnpm run dev')
  assert.deepEqual(result.api.endpoints.map(item => `${item.method} ${item.path}`), [
    'GET /users',
    'POST /users',
  ])
  assert.equal(result.architecture.present, true)
  assert.deepEqual(result.architecture.notes[0].diagramTypes, ['mermaid'])
  assert.deepEqual(result.sourceReferences.map(item => item.path), ['src/users/controller.js'])
  assert.equal(result.sourceReferences[0].line, 29)
})

test('measures module and route documentation coverage against structured code facts', () => {
  const result = analyzeDocumentation([
    {
      doc_path: 'README.md',
      documentation_type: 'readme',
      content: [
        '# Demo Service',
        '## Setup',
        '```sh',
        'npm install',
        '```',
        '## API',
        'GET /users',
        'POST /users',
        '## Architecture',
        'The service uses ports and adapters.',
      ].join('\n'),
    },
    {
      doc_path: 'src/users/README.md',
      documentation_type: 'readme',
      content: '# Users module\n\nOwns user operations.\n',
    },
  ], {
    codeAnalysis: {
      modules: [{ path: 'src/users' }, { path: 'src/billing' }],
      routes: [
        { method: 'GET', path: '/users', filePath: 'src/users/router.js', line: 10 },
        { method: 'POST', path: '/users', filePath: 'src/users/router.js', line: 11 },
        { method: 'DELETE', path: '/users/:id', filePath: 'src/users/router.js', line: 12 },
      ],
    },
  })

  assert.equal(result.analysisVersion, 1)
  assert.equal(result.coverage.modules.percent, 50)
  assert.deepEqual(result.coverage.modules.documented, ['src/users'])
  assert.deepEqual(result.coverage.modules.undocumented, ['src/billing'])
  assert.equal(result.coverage.api.percent, 67)
  assert.deepEqual(
    result.coverage.api.undocumented.map(route => `${route.method} ${route.path}`),
    ['DELETE /users/:id'],
  )
  assert.equal(result.coverage.setup.percent, 100)
  assert.equal(result.coverage.architecture.percent, 100)
  assert.equal(result.coverage.overallPercent, 79)
  assert.equal(result.metrics.documentCount, 2)
  assert.equal(result.metrics.apiEndpointCount, 2)
})

test('marks API coverage unavailable instead of reporting a misleading perfect score', () => {
  const result = analyzeDocumentation([
    {
      doc_path: 'README.md',
      documentation_type: 'readme',
      content: 'Project\n=======\n\nA small library.\n',
    },
  ])

  assert.equal(result.documents[0].title, 'Project')
  assert.equal(result.coverage.api.available, false)
  assert.equal(result.coverage.api.percent, null)
  assert.equal(result.coverage.modules.available, false)
  assert.equal(result.facts.setup.present, false)
  assert.equal(result.facts.architecture.present, false)
})

test('does not count empty setup and architecture headings as coverage', () => {
  const result = analyzeDocumentation([{
    doc_path: 'README.md',
    documentation_type: 'readme',
    content: '# Demo\n\n## Setup\n\n## Architecture\n',
  }])

  assert.equal(result.coverage.setup.present, false)
  assert.equal(result.coverage.architecture.present, false)
  assert.equal(result.coverage.setup.percent, 0)
  assert.equal(result.coverage.architecture.percent, 0)
})

test('includes unsupported-language modules in documentation coverage', () => {
  const result = analyzeDocumentation([{
    doc_path: 'src/js/README.md',
    documentation_type: 'readme',
    content: '# JavaScript module\n',
  }], {
    files: [
      { path: 'src/js/index.js', file_type: 'code', language: 'JavaScript' },
      { path: 'src/java/App.java', file_type: 'code', language: 'Java' },
    ],
    codeAnalysis: { modules: [{ path: 'src/js' }], routes: [] },
  })

  assert.equal(result.coverage.modules.total, 2)
  assert.equal(result.coverage.modules.percent, 50)
  assert.deepEqual(result.coverage.modules.undocumented, ['src/java'])
})
