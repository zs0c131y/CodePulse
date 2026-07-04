import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRepositoryStructure } from '../src/features/repositories/services/fileParser.js'
import { generateDependencyGraph } from '../src/features/repositories/services/dependencyGraph.js'

test('generates basic dependency edges for JavaScript and Python files', async () => {
  const root = join(tmpdir(), `codepulse-dependency-graph-${Date.now()}`)

  try {
    await mkdir(join(root, 'src'), { recursive: true })
    await mkdir(join(root, 'pkg'), { recursive: true })
    await writeFile(
      join(root, 'src', 'index.js'),
      'import util from "./util.js"\nconst express = require("express")\n',
      'utf8',
    )
    await writeFile(join(root, 'src', 'util.js'), 'export default 1\n', 'utf8')
    await writeFile(join(root, 'pkg', '__init__.py'), '', 'utf8')
    await writeFile(join(root, 'pkg', 'helpers.py'), 'VALUE = 1\n', 'utf8')
    await writeFile(join(root, 'pkg', 'main.py'), 'from . import helpers\nimport pkg.helpers\n', 'utf8')

    const parsed = await parseRepositoryStructure(root)
    const edges = await generateDependencyGraph(root, parsed.files)

    assert.deepEqual(
      edges.map(edge => ({
        source_file: edge.source_file,
        target_file: edge.target_file,
        import_path: edge.import_path,
        resolved: edge.resolved,
      })),
      [
        {
          source_file: 'pkg/main.py',
          target_file: 'pkg/helpers.py',
          import_path: '.helpers',
          resolved: true,
        },
        {
          source_file: 'pkg/main.py',
          target_file: 'pkg/helpers.py',
          import_path: 'pkg.helpers',
          resolved: true,
        },
        {
          source_file: 'src/index.js',
          target_file: 'src/util.js',
          import_path: './util.js',
          resolved: true,
        },
        {
          source_file: 'src/index.js',
          target_file: 'express',
          import_path: 'express',
          resolved: false,
        },
      ],
    )
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 3 })
  }
})
