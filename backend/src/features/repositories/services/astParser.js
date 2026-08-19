import { parse as parseJavaScriptAst } from '@babel/parser'
import { parser as pythonParser } from '@lezer/python'

const javascriptDecisionTypes = new Set([
  'IfStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'CatchClause',
  'ConditionalExpression',
  'LogicalExpression',
])
const javascriptFunctionTypes = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ObjectMethod',
])
const javascriptClassMethodTypes = new Set(['ClassMethod', 'ClassPrivateMethod'])
const pythonDecisionTypes = new Set([
  'IfStatement',
  'ForStatement',
  'WhileStatement',
  'ExceptClause',
  'CaseClause',
  'BooleanExpression',
])

function lineLookup(source) {
  const starts = [0]
  for (let index = 0; index < source.length; index += 1) {
    if (source.charCodeAt(index) === 10) starts.push(index + 1)
  }
  return offset => {
    let low = 0
    let high = starts.length
    while (low < high) {
      const middle = Math.floor((low + high) / 2)
      if (starts[middle] <= offset) low = middle + 1
      else high = middle
    }
    return Math.max(1, low)
  }
}

function boundedMessage(error) {
  return String(error?.message || 'Syntax could not be parsed.').replace(/\s*\(\d+:\d+\)\s*$/, '').slice(0, 300)
}

function sourceFor(node, source) {
  return source.slice(node?.start ?? node?.from ?? 0, node?.end ?? node?.to ?? 0).trim()
}

function javascriptName(node, parent) {
  if (node.id?.name) return node.id.name
  if (parent?.type === 'VariableDeclarator' && parent.id?.name) return parent.id.name
  if (node.key?.name) return node.key.name
  if (node.key?.value !== undefined) return String(node.key.value)
  return '<anonymous>'
}

function javascriptParameters(node, source) {
  return (node.params || []).map(parameter => sourceFor(parameter, source)).filter(Boolean)
}

function javascriptExported(ancestors) {
  return ancestors.some(node => node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration')
}

function javascriptComplexity(node) {
  let decisions = 0
  const stack = [node.body || node]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current || typeof current !== 'object') continue
    if (current !== node && (javascriptFunctionTypes.has(current.type) || javascriptClassMethodTypes.has(current.type))) continue
    if (javascriptDecisionTypes.has(current.type)) decisions += 1
    if (current.type === 'SwitchCase' && current.test) decisions += 1
    for (const [key, value] of Object.entries(current)) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'tokens' || key === 'comments') continue
      if (Array.isArray(value)) stack.push(...value)
      else if (value && typeof value === 'object') stack.push(value)
    }
  }
  return 1 + decisions
}

function javascriptFunctionFact(node, parent, ancestors, source, kind = null) {
  const line = node.loc?.start?.line || 1
  const endLine = node.loc?.end?.line || line
  return {
    name: javascriptName(node, parent),
    kind: kind || (node.type === 'ArrowFunctionExpression' ? 'arrow' : 'declaration'),
    async: Boolean(node.async),
    generator: Boolean(node.generator),
    exported: javascriptExported(ancestors),
    parameters: javascriptParameters(node, source),
    line,
    endLine,
    lineCount: Math.max(1, endLine - line + 1),
    complexity: javascriptComplexity(node),
  }
}

function parseJavaScript(source, language) {
  const plugins = [
    ...(String(language).startsWith('TypeScript') ? ['typescript'] : []),
    ...(String(language).includes('JSX') ? ['jsx'] : []),
    'decorators-legacy',
  ]

  let ast
  try {
    ast = parseJavaScriptAst(source, {
      sourceType: 'unambiguous',
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
      plugins,
    })
  } catch (error) {
    return {
      parser: '@babel/parser',
      parsed: false,
      fallbackUsed: true,
      errors: [{
        message: boundedMessage(error),
        line: error?.loc?.line || null,
        column: error?.loc?.column ?? null,
      }],
      functions: [],
      classes: [],
    }
  }

  const functions = []
  const classes = []
  const stack = [{ node: ast.program, parent: null, ancestors: [] }]
  while (stack.length > 0) {
    const { node, parent, ancestors } = stack.pop()
    if (!node || typeof node !== 'object') continue

    if (javascriptFunctionTypes.has(node.type) && !ancestors.some(item => javascriptClassMethodTypes.has(item.type))) {
      functions.push(javascriptFunctionFact(node, parent, ancestors, source))
    }
    if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
      const line = node.loc?.start?.line || 1
      const endLine = node.loc?.end?.line || line
      const methods = (node.body?.body || [])
        .filter(method => javascriptClassMethodTypes.has(method.type))
        .map(method => ({
          ...javascriptFunctionFact(method, node, [...ancestors, node], source, 'method'),
          static: Boolean(method.static),
          visibility: method.accessibility || (method.key?.type === 'PrivateName' ? 'private' : 'public'),
        }))
      classes.push({
        name: javascriptName(node, parent),
        extends: node.superClass ? sourceFor(node.superClass, source) : null,
        exported: javascriptExported(ancestors),
        methods,
        line,
        endLine,
        lineCount: Math.max(1, endLine - line + 1),
        complexity: methods.reduce((sum, method) => sum + method.complexity, 0),
      })
    }

    const nextAncestors = [...ancestors, node]
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'tokens' || key === 'comments') continue
      if (Array.isArray(value)) {
        for (let index = value.length - 1; index >= 0; index -= 1) {
          if (value[index]?.type) stack.push({ node: value[index], parent: node, ancestors: nextAncestors })
        }
      } else if (value?.type) {
        stack.push({ node: value, parent: node, ancestors: nextAncestors })
      }
    }
  }

  return {
    parser: '@babel/parser',
    parsed: true,
    fallbackUsed: false,
    errors: [],
    functions,
    classes,
  }
}

function lezerNode(node) {
  const cursor = node.cursor()
  function convert(activeCursor) {
    const result = {
      name: activeCursor.name,
      from: activeCursor.from,
      to: activeCursor.to,
      children: [],
    }
    if (activeCursor.firstChild()) {
      do result.children.push(convert(activeCursor))
      while (activeCursor.nextSibling())
      activeCursor.parent()
    }
    return result
  }
  return convert(cursor)
}

function child(node, name) {
  return node.children.find(item => item.name === name) || null
}

function descendants(node) {
  const result = []
  const stack = [...node.children]
  while (stack.length > 0) {
    const current = stack.pop()
    result.push(current)
    stack.push(...current.children)
  }
  return result
}

function pythonComplexity(node) {
  return 1 + descendants(node).filter(item => pythonDecisionTypes.has(item.name)).length
}

function pythonFunctionFact(node, source, lineNumberAt, inClass) {
  const names = node.children.filter(item => item.name === 'VariableName')
  const name = names[0] ? sourceFor(names[0], source) : '<anonymous>'
  const params = child(node, 'ParamList')
  const line = lineNumberAt(node.from)
  const endLine = lineNumberAt(Math.max(node.from, node.to - 1))
  return {
    name,
    kind: inClass ? 'method' : 'declaration',
    async: node.children.some(item => item.name === 'async'),
    generator: false,
    exported: !inClass && !name.startsWith('_'),
    parameters: params
      ? params.children.filter(item => item.name === 'VariableName').map(item => sourceFor(item, source))
      : [],
    line,
    endLine,
    lineCount: Math.max(1, endLine - line + 1),
    complexity: pythonComplexity(node),
  }
}

function parsePython(source) {
  const root = lezerNode(pythonParser.parse(source).topNode)
  const lineNumberAt = lineLookup(source)
  const errors = descendants(root)
    .filter(node => node.name === '⚠')
    .slice(0, 20)
    .map(node => ({
      message: 'Python syntax could not be parsed at this location.',
      line: lineNumberAt(node.from),
      column: null,
    }))
  if (errors.length > 0) {
    return {
      parser: '@lezer/python',
      parsed: false,
      fallbackUsed: true,
      errors,
      functions: [],
      classes: [],
    }
  }

  const functions = []
  const classes = []
  const stack = [{ node: root, classNode: null, functionNode: null }]
  while (stack.length > 0) {
    const { node, classNode, functionNode } = stack.pop()
    const activeClass = node.name === 'ClassDefinition' ? node : classNode
    const activeFunction = node.name === 'FunctionDefinition' ? node : functionNode

    if (node.name === 'FunctionDefinition' && !functionNode) {
      const fact = pythonFunctionFact(node, source, lineNumberAt, Boolean(classNode))
      if (!classNode) functions.push(fact)
    }
    if (node.name === 'ClassDefinition') {
      const nameNode = node.children.find(item => item.name === 'VariableName')
      const baseNode = child(node, 'ArgList')
      const line = lineNumberAt(node.from)
      const endLine = lineNumberAt(Math.max(node.from, node.to - 1))
      const methods = descendants(node)
        .filter(item => item.name === 'FunctionDefinition')
        .filter(method => !descendants(method).some(nested => nested.name === 'ClassDefinition'))
        .map(method => ({
          ...pythonFunctionFact(method, source, lineNumberAt, true),
          static: false,
          visibility: sourceFor(method.children.find(item => item.name === 'VariableName'), source).startsWith('_')
            ? 'private'
            : 'public',
        }))
      classes.push({
        name: sourceFor(nameNode, source) || '<anonymous>',
        extends: baseNode ? sourceFor(baseNode, source).replace(/^\(|\)$/g, '').trim() || null : null,
        exported: !sourceFor(nameNode, source).startsWith('_'),
        methods,
        line,
        endLine,
        lineCount: Math.max(1, endLine - line + 1),
        complexity: methods.reduce((sum, method) => sum + method.complexity, 0),
      })
    }

    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      stack.push({ node: node.children[index], classNode: activeClass, functionNode: activeFunction })
    }
  }

  return {
    parser: '@lezer/python',
    parsed: true,
    fallbackUsed: false,
    errors: [],
    functions,
    classes,
  }
}

export function parseSourceAst(content, language) {
  const source = String(content || '')
  return language === 'Python'
    ? parsePython(source)
    : parseJavaScript(source, language)
}
