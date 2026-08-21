import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { extname, join } from 'node:path'
import { parseSourceAst } from './astParser.js'

export const CODE_ANALYSIS_VERSION = 1

const DEFAULT_MAX_SOURCE_FILES = 2_000
const DEFAULT_MAX_FILE_BYTES = 1024 * 1024
const DEFAULT_MAX_TOTAL_BYTES = 32 * 1024 * 1024
const DUPLICATION_BLOCK_LINES = 6
const LONG_FUNCTION_LINES = 50
const LARGE_CLASS_LINES = 300
const supportedLanguages = new Set([
  'JavaScript',
  'JavaScript JSX',
  'TypeScript',
  'TypeScript JSX',
  'Python',
])
const classMethodExclusions = new Set([
  'catch',
  'do',
  'else',
  'for',
  'if',
  'switch',
  'try',
  'while',
  'with',
])

function normalizePath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '')
}

function compareText(left, right) {
  return left.localeCompare(right, 'en', { sensitivity: 'base' }) || left.localeCompare(right)
}

function directoryOf(path) {
  const normalized = normalizePath(path)
  const separator = normalized.lastIndexOf('/')
  return separator === -1 ? '.' : normalized.slice(0, separator) || '.'
}

function moduleNameForPath(path) {
  return normalizePath(path)
    .replace(extname(path), '')
    .replaceAll('/', '.')
}

function absolutePathFromRepo(repositoryPath, relativePath) {
  return join(repositoryPath, ...normalizePath(relativePath).split('/'))
}

function languageFamily(language) {
  if (String(language).startsWith('JavaScript') || String(language).startsWith('TypeScript')) return 'javascript'
  if (language === 'Python') return 'python'
  return null
}

function createLineNumberLookup(content) {
  const lineStarts = [0]
  for (let index = 0; index < content.length; index += 1) {
    if (content.charCodeAt(index) === 10) lineStarts.push(index + 1)
  }

  return index => {
    let low = 0
    let high = lineStarts.length
    while (low < high) {
      const middle = Math.floor((low + high) / 2)
      if (lineStarts[middle] <= index) low = middle + 1
      else high = middle
    }
    return Math.max(1, low)
  }
}

function countCharacter(value, character) {
  let count = 0
  for (const item of value) {
    if (item === character) count += 1
  }
  return count
}

function indentationOf(line) {
  const whitespace = line.match(/^\s*/)?.[0] || ''
  return [...whitespace].reduce((total, character) => total + (character === '\t' ? 4 : 1), 0)
}

function normalizeSignature(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function splitParameters(value) {
  const parameters = []
  let current = ''
  let depth = 0
  let quote = null
  let escaped = false

  for (const character of String(value || '')) {
    if (escaped) {
      current += character
      escaped = false
      continue
    }

    if (quote) {
      current += character
      if (character === '\\') escaped = true
      else if (character === quote) quote = null
      continue
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character
      current += character
      continue
    }

    if ('([{<'.includes(character)) depth += 1
    if (')]}>' .includes(character)) depth = Math.max(0, depth - 1)

    if (character === ',' && depth === 0) {
      const parameter = normalizeSignature(current)
      if (parameter) parameters.push(parameter)
      current = ''
      continue
    }

    current += character
  }

  const finalParameter = normalizeSignature(current)
  if (finalParameter) parameters.push(finalParameter)
  return parameters
}

function maskCommentsAndStrings(content, family) {
  let state = 'normal'
  let escaped = false
  let output = ''

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index]
    const next = content[index + 1]

    if (character === '\n') {
      output += '\n'
      if (state === 'line-comment') state = 'normal'
      continue
    }

    if (state === 'line-comment') {
      output += ' '
      continue
    }

    if (state === 'block-comment') {
      if (character === '*' && next === '/') {
        output += '  '
        index += 1
        state = 'normal'
      } else {
        output += ' '
      }
      continue
    }

    if (state !== 'normal') {
      output += ' '
      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (
        (state === 'single-quote' && character === "'")
        || (state === 'double-quote' && character === '"')
        || (state === 'template' && character === '`')
      ) {
        state = 'normal'
      }
      continue
    }

    if (family === 'javascript' && character === '/' && next === '/') {
      output += '  '
      index += 1
      state = 'line-comment'
      continue
    }

    if (family === 'javascript' && character === '/' && next === '*') {
      output += '  '
      index += 1
      state = 'block-comment'
      continue
    }

    if (family === 'python' && character === '#') {
      output += ' '
      state = 'line-comment'
      continue
    }

    if (character === "'") state = 'single-quote'
    else if (character === '"') state = 'double-quote'
    else if (family === 'javascript' && character === '`') state = 'template'

    output += state === 'normal' ? character : ' '
  }

  return output
}

function maskComments(content, family) {
  let state = 'normal'
  let escaped = false
  let output = ''

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index]
    const next = content[index + 1]

    if (character === '\n') {
      output += '\n'
      if (state === 'line-comment') state = 'normal'
      continue
    }

    if (state === 'line-comment') {
      output += ' '
      continue
    }

    if (state === 'block-comment') {
      if (character === '*' && next === '/') {
        output += '  '
        index += 1
        state = 'normal'
      } else {
        output += ' '
      }
      continue
    }

    if (state !== 'normal') {
      output += character
      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (
        (state === 'single-quote' && character === "'")
        || (state === 'double-quote' && character === '"')
        || (state === 'template' && character === '`')
      ) {
        state = 'normal'
      }
      continue
    }

    if (family === 'javascript' && character === '/' && next === '/') {
      output += '  '
      index += 1
      state = 'line-comment'
      continue
    }

    if (family === 'javascript' && character === '/' && next === '*') {
      output += '  '
      index += 1
      state = 'block-comment'
      continue
    }

    if (family === 'python' && character === '#') {
      output += ' '
      state = 'line-comment'
      continue
    }

    if (character === "'") state = 'single-quote'
    else if (character === '"') state = 'double-quote'
    else if (family === 'javascript' && character === '`') state = 'template'

    output += character
  }

  return output
}

function decisionCount(content, family) {
  const masked = maskCommentsAndStrings(content, family)
  const keywordPattern = family === 'python'
    ? /\b(?:if|elif|for|while|except|case|and|or)\b/g
    : /\b(?:if|for|while|case|catch)\b|&&|\|\||\?\?/g
  return [...masked.matchAll(keywordPattern)].length
}

function functionRanges(content, family) {
  const sourceLines = String(content || '').split(/\r?\n/)
  const maskedLines = maskCommentsAndStrings(content, family).split(/\r?\n/)

  if (family === 'python') {
    const ranges = []
    for (let index = 0; index < maskedLines.length; index += 1) {
      const line = maskedLines[index]
      if (!/^\s*(?:async\s+)?def\s+[A-Za-z_]\w*\s*\(/.test(line)) continue
      const indent = indentationOf(sourceLines[index])
      let endIndex = index
      for (let cursor = index + 1; cursor < sourceLines.length; cursor += 1) {
        const candidate = sourceLines[cursor]
        if (!candidate.trim() || candidate.trim().startsWith('#')) continue
        if (indentationOf(candidate) <= indent) break
        endIndex = cursor
      }
      const body = sourceLines.slice(index, endIndex + 1).join('\n')
      ranges.push({
        line: index + 1,
        endLine: endIndex + 1,
        lineCount: endIndex - index + 1,
        complexity: 1 + decisionCount(body, family),
      })
    }
    return ranges
  }

  const ranges = []
  const startPattern = /^\s*(?:(?:export|default|public|private|protected|static|abstract|readonly|override|async|get|set)\s+)*(?:function\s*\*?\s*[A-Za-z_$][\w$]*|(?:const|let|var)\s+[A-Za-z_$][\w$]*[^=]*=|[A-Za-z_$][\w$]*\s*(?:<[^>]+>)?\s*\([^;]*\))/

  for (let index = 0; index < maskedLines.length; index += 1) {
    const line = maskedLines[index]
    if (!startPattern.test(line)) continue
    const looksLikeArrow = line.includes('=>')
    const searchStart = looksLikeArrow ? line.indexOf('=>') + 2 : line.lastIndexOf(')') + 1
    let openingLine = index
    let openingColumn = line.indexOf('{', Math.max(0, searchStart))

    for (let cursor = index + 1; openingColumn === -1 && cursor < Math.min(maskedLines.length, index + 4); cursor += 1) {
      openingColumn = maskedLines[cursor].indexOf('{')
      if (openingColumn !== -1) openingLine = cursor
    }

    if (openingColumn === -1) {
      ranges.push({ line: index + 1, endLine: index + 1, lineCount: 1, complexity: 1 })
      continue
    }

    let depth = 0
    let opened = false
    let endLine = openingLine
    for (let cursor = openingLine; cursor < maskedLines.length; cursor += 1) {
      const segment = cursor === openingLine ? maskedLines[cursor].slice(openingColumn) : maskedLines[cursor]
      depth += countCharacter(segment, '{')
      if (segment.includes('{')) opened = true
      depth -= countCharacter(segment, '}')
      endLine = cursor
      if (opened && depth <= 0) break
    }
    const body = sourceLines.slice(index, endLine + 1).join('\n')
    ranges.push({
      line: index + 1,
      endLine: endLine + 1,
      lineCount: endLine - index + 1,
      complexity: 1 + decisionCount(body, family),
    })
  }

  return ranges
}

function sourceMetrics(content, family) {
  const ranges = functionRanges(content, family)
  const maxFunctionLines = ranges.reduce((maximum, range) => Math.max(maximum, range.lineCount), 0)
  return {
    cyclomaticComplexity: 1 + decisionCount(content, family),
    functionCount: ranges.length,
    maxFunctionLines,
    longFunctionCount: ranges.filter(range => range.lineCount >= LONG_FUNCTION_LINES).length,
    duplicationPercent: 0,
    duplicateLineCount: 0,
    normalizedLineCount: 0,
  }
}

function attachFallbackRanges(facts, content, family) {
  const ranges = functionRanges(content, family)
  const rangeForLine = line => ranges.find(range => range.line === line) || null
  const enrichFunction = item => {
    const range = rangeForLine(item.line)
    return {
      ...item,
      endLine: range?.endLine || item.line,
      lineCount: range?.lineCount || 1,
      complexity: range?.complexity || 1,
    }
  }
  const functions = facts.functions.map(enrichFunction)
  const classes = facts.classes.map(item => {
    const lineCount = Math.max(1, (item.endLine || item.line) - item.line + 1)
    const methods = item.methods.map(enrichFunction)
    return {
      ...item,
      lineCount,
      complexity: methods.reduce((sum, method) => sum + method.complexity, 0),
      methods,
    }
  })
  return { functions, classes }
}

function mergeAstFacts(heuristicFacts, astFacts, content, family) {
  if (!astFacts.parsed) return attachFallbackRanges(heuristicFacts, content, family)

  const heuristicMethods = heuristicFacts.classes.flatMap(item => item.methods)
  const classes = astFacts.classes.map(item => ({
    ...item,
    methods: item.methods.map(method => {
      const heuristic = heuristicMethods.find(candidate => (
        candidate.name === method.name && candidate.line === method.line
      ))
      return {
        ...method,
        static: heuristic?.static ?? method.static,
        visibility: heuristic?.visibility || method.visibility,
      }
    }),
  }))
  return { functions: astFacts.functions, classes }
}

function metricsFromFacts(content, family, functions, classes, astFacts) {
  const callableFacts = [...functions, ...classes.flatMap(item => item.methods)]
  const longFunctions = callableFacts
    .filter(item => item.lineCount >= LONG_FUNCTION_LINES)
    .map(item => ({ name: item.name, line: item.line, endLine: item.endLine, lineCount: item.lineCount }))
  const largeClasses = classes
    .filter(item => item.lineCount >= LARGE_CLASS_LINES)
    .map(item => ({ name: item.name, line: item.line, endLine: item.endLine, lineCount: item.lineCount }))
  const fallback = sourceMetrics(content, family)
  return {
    ...fallback,
    cyclomaticComplexity: astFacts.parsed
      ? Math.max(1, callableFacts.reduce((sum, item) => sum + Number(item.complexity || 1), 0))
      : fallback.cyclomaticComplexity,
    functionCount: callableFacts.length,
    classCount: classes.length,
    maxFunctionLines: callableFacts.reduce((maximum, item) => Math.max(maximum, item.lineCount || 1), 0),
    longFunctionCount: longFunctions.length,
    longFunctions,
    maxClassLines: classes.reduce((maximum, item) => Math.max(maximum, item.lineCount || 1), 0),
    largeClassCount: largeClasses.length,
    largeClasses,
    parserMode: astFacts.parsed ? 'ast' : 'heuristic-fallback',
  }
}

function normalizedSourceLines(content, family) {
  return maskComments(content, family)
    .split(/\r?\n/)
    .map((line, index) => ({ text: line.trim().replace(/\s+/g, ' '), line: index + 1 }))
    .filter(item => item.text && !/^[{}()[\],;]+$/.test(item.text))
}

function applyDuplicationMetrics(codeFacts, sourceContents) {
  const occurrences = new Map()
  const linesByPath = new Map()

  for (const fact of codeFacts) {
    const content = sourceContents.get(fact.filePath) || ''
    const lines = normalizedSourceLines(content, languageFamily(fact.language))
    linesByPath.set(fact.filePath, lines)
    for (let index = 0; index + DUPLICATION_BLOCK_LINES <= lines.length; index += 1) {
      const block = lines.slice(index, index + DUPLICATION_BLOCK_LINES).map(item => item.text).join('\n')
      if (block.length < 80) continue
      const hash = createHash('sha256').update(block).digest('hex')
      const matches = occurrences.get(hash) || []
      matches.push({ path: fact.filePath, index, line: lines[index].line })
      occurrences.set(hash, matches)
    }
  }

  const duplicateLinesByPath = new Map(codeFacts.map(fact => [fact.filePath, new Set()]))
  let duplicateBlockCount = 0
  const duplicateGroups = []
  for (const [hash, matches] of occurrences.entries()) {
    if (matches.length < 2) continue
    const distinctOccurrences = matches.some((match, index) => matches.some((candidate, candidateIndex) => (
      candidateIndex !== index
      && (candidate.path !== match.path || Math.abs(candidate.index - match.index) >= DUPLICATION_BLOCK_LINES)
    )))
    if (!distinctOccurrences) continue
    duplicateBlockCount += 1
    if (duplicateGroups.length < 1_000) {
      duplicateGroups.push({
        id: hash.slice(0, 16),
        blockLines: DUPLICATION_BLOCK_LINES,
        occurrences: matches.slice(0, 100).map(match => ({
          filePath: match.path,
          startLine: match.line,
        })),
        totalOccurrences: matches.length,
        truncated: matches.length > 100,
      })
    }
    for (const match of matches) {
      const duplicateLines = duplicateLinesByPath.get(match.path)
      for (let offset = 0; offset < DUPLICATION_BLOCK_LINES; offset += 1) {
        duplicateLines.add(match.index + offset)
      }
    }
  }

  for (const fact of codeFacts) {
    const normalizedLineCount = linesByPath.get(fact.filePath)?.length || 0
    const duplicateLineCount = duplicateLinesByPath.get(fact.filePath)?.size || 0
    fact.metrics.normalizedLineCount = normalizedLineCount
    fact.metrics.duplicateLineCount = duplicateLineCount
    fact.metrics.duplicationPercent = normalizedLineCount === 0
      ? 0
      : Math.round((duplicateLineCount / normalizedLineCount) * 1_000) / 10
  }

  return { duplicateBlockCount, duplicateGroups }
}

function findClosingBrace(maskedContent, openingIndex) {
  let depth = 0
  for (let index = openingIndex; index < maskedContent.length; index += 1) {
    if (maskedContent[index] === '{') depth += 1
    if (maskedContent[index] === '}') depth -= 1
    if (depth === 0) return index
  }
  return maskedContent.length - 1
}

function deduplicate(items, keyForItem) {
  const seen = new Set()
  return items.filter(item => {
    const key = keyForItem(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function importBindings(clause) {
  const normalized = normalizeSignature(clause).replace(/^type\s+/, '')
  if (!normalized) return []

  const bindings = []
  const namedMatch = normalized.match(/\{([^}]+)\}/)
  if (namedMatch) {
    bindings.push(...namedMatch[1]
      .split(',')
      .map(name => normalizeSignature(name).replace(/^type\s+/, ''))
      .filter(Boolean))
  }

  const namespaceMatch = normalized.match(/\*\s+as\s+([\w$]+)/)
  if (namespaceMatch) bindings.push(`* as ${namespaceMatch[1]}`)

  const defaultBinding = normalized.split(',')[0].trim()
  if (defaultBinding && !defaultBinding.startsWith('{') && !defaultBinding.startsWith('*')) {
    bindings.unshift(defaultBinding)
  }

  return [...new Set(bindings)]
}

function parseJavaScriptImports(content, structuralMask) {
  const imports = []
  const lineNumberAt = createLineNumberLookup(content)
  const patterns = [
    {
      kind: 'static',
      pattern: /\bimport\s+(?!\()(?:(.*?)\s+from\s+)?(['"])([^'"\r\n]+)\2/g,
      toFact: match => ({ source: match[3], bindings: importBindings(match[1]) }),
    },
    {
      kind: 're-export',
      pattern: /\bexport\s+(?:\*|\{([^}]*)\})\s+from\s+(['"])([^'"\r\n]+)\2/g,
      toFact: match => ({ source: match[3], bindings: importBindings(`{${match[1] || '*'}}`) }),
    },
    {
      kind: 'require',
      pattern: /\brequire\s*\(\s*(['"])([^'"\r\n]+)\1\s*\)/g,
      toFact: match => ({ source: match[2], bindings: [] }),
    },
    {
      kind: 'dynamic',
      pattern: /\bimport\s*\(\s*(['"])([^'"\r\n]+)\1\s*\)/g,
      toFact: match => ({ source: match[2], bindings: [] }),
    },
  ]

  for (const { kind, pattern, toFact } of patterns) {
    for (const match of content.matchAll(pattern)) {
      if (!structuralMask.slice(match.index, match.index + match[0].length).trim()) continue
      imports.push({
        ...toFact(match),
        kind,
        line: lineNumberAt(match.index),
      })
    }
  }

  return deduplicate(imports, item => `${item.line}:${item.kind}:${item.source}`)
    .sort((left, right) => left.line - right.line || compareText(left.source, right.source))
}

function parseJavaScriptFunctions(lines) {
  const functions = []

  lines.forEach((line, index) => {
    const declaration = line.match(/^\s*(export\s+(?:default\s+)?)?(async\s+)?function\s*(\*)?\s*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/)
    if (declaration) {
      functions.push({
        name: declaration[4],
        kind: 'declaration',
        async: Boolean(declaration[2]),
        generator: Boolean(declaration[3]),
        exported: Boolean(declaration[1]),
        parameters: splitParameters(declaration[5]),
        line: index + 1,
      })
      return
    }

    const arrow = line.match(/^\s*(export\s+)?(?:declare\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)(?:\s*:[^=]+)?\s*=\s*(async\s*)?(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*(?::[^=]+)?=>/)
    if (arrow) {
      functions.push({
        name: arrow[2],
        kind: 'arrow',
        async: Boolean(arrow[3]),
        generator: false,
        exported: Boolean(arrow[1]),
        parameters: splitParameters(arrow[4] || arrow[5]),
        line: index + 1,
      })
      return
    }

    const expression = line.match(/^\s*(export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\s+)?function\s*(?:[A-Za-z_$][\w$]*)?\s*\(([^)]*)\)/)
    if (expression) {
      functions.push({
        name: expression[2],
        kind: 'function-expression',
        async: Boolean(expression[3]),
        generator: false,
        exported: Boolean(expression[1]),
        parameters: splitParameters(expression[4]),
        line: index + 1,
      })
    }
  })

  return functions
}

function parseClassMethods(content, maskedContent, openingIndex, closingIndex) {
  const lineNumberAt = createLineNumberLookup(content)
  const body = content.slice(openingIndex + 1, closingIndex)
  const maskedBody = maskedContent.slice(openingIndex + 1, closingIndex)
  const rawLines = body.split(/\r?\n/)
  const maskedLines = maskedBody.split(/\r?\n/)
  const firstLine = lineNumberAt(openingIndex + 1)
  const methods = []
  let depth = 0

  rawLines.forEach((rawLine, index) => {
    const structuralLine = maskedLines[index] || ''
    if (depth === 0) {
      const method = rawLine.match(/^\s*(?:(public|private|protected)\s+)?(?:(static|abstract|readonly|override|async|get|set)\s+)*([A-Za-z_$][\w$]*)\s*(?:<[^>]+>)?\s*\(([^)]*)\)/)
      const name = method?.[3]
      if (method && !classMethodExclusions.has(name)) {
        methods.push({
          name,
          async: /\basync\b/.test(method[0]),
          static: /\bstatic\b/.test(method[0]),
          visibility: method[1] || 'public',
          parameters: splitParameters(method[4]),
          line: firstLine + index,
        })
      }
    }

    depth += countCharacter(structuralLine, '{') - countCharacter(structuralLine, '}')
    depth = Math.max(depth, 0)
  })

  return methods
}

function parseJavaScriptClasses(content, maskedContent) {
  const classes = []
  const lineNumberAt = createLineNumberLookup(content)
  const pattern = /\b((?:export\s+(?:default\s+)?)?)(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([^\s{]+))?\s*\{/g

  for (const match of maskedContent.matchAll(pattern)) {
    const openingIndex = match.index + match[0].lastIndexOf('{')
    const closingIndex = findClosingBrace(maskedContent, openingIndex)
    classes.push({
      name: match[2],
      extends: match[3] || null,
      exported: /\bexport\b/.test(match[1]),
      methods: parseClassMethods(content, maskedContent, openingIndex, closingIndex),
      line: lineNumberAt(match.index),
      endLine: lineNumberAt(closingIndex),
    })
  }

  return classes
}

function isRouteReceiver(receiver) {
  const leaf = receiver.split('.').at(-1)?.toLowerCase() || ''
  return ['app', 'api', 'router', 'server', 'fastify'].includes(leaf) || leaf.endsWith('router')
}

function normalizeRoutePath(path) {
  const normalized = String(path || '').trim()
  return normalized || '/'
}

function parseJavaScriptRoutes(lines, structuralLines) {
  const routes = []
  const directPattern = /\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\.\s*(get|post|put|patch|delete|options|head|all)\s*\(\s*(['"`])([^'"`\r\n]*?)\3(?:\s*,\s*([A-Za-z_$][\w$.]*))?/gi
  const chainedPattern = /\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\.\s*route\s*\(\s*(['"`])([^'"`\r\n]*?)\2\s*\)\s*\.\s*(get|post|put|patch|delete|options|head|all)\s*\(\s*([A-Za-z_$][\w$.]*)?/gi
  const decoratorPattern = /^\s*@(Get|Post|Put|Patch|Delete|Options|Head|All)\s*\(\s*(['"`])([^'"`\r\n]*?)\2/i

  lines.forEach((line, index) => {
    const structuralLine = structuralLines[index] || ''
    for (const match of line.matchAll(directPattern)) {
      if (!structuralLine.slice(match.index, match.index + match[1].length).trim()) continue
      if (!isRouteReceiver(match[1])) continue
      routes.push({
        method: match[2].toUpperCase(),
        path: normalizeRoutePath(match[4]),
        handler: match[5] || null,
        framework: 'javascript-http',
        line: index + 1,
      })
    }

    for (const match of line.matchAll(chainedPattern)) {
      if (!structuralLine.slice(match.index, match.index + match[1].length).trim()) continue
      if (!isRouteReceiver(match[1])) continue
      routes.push({
        method: match[4].toUpperCase(),
        path: normalizeRoutePath(match[3]),
        handler: match[5] || null,
        framework: 'javascript-http',
        line: index + 1,
      })
    }

    const decorator = structuralLine.trim() ? line.match(decoratorPattern) : null
    if (!decorator) return

    const handlerLine = lines.slice(index + 1, index + 7).find(candidate => (
      /^\s*(?:(?:public|private|protected|static|async)\s+)*[A-Za-z_$][\w$]*\s*\(/.test(candidate)
      || /^\s*(?:export\s+)?(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/.test(candidate)
    ))
    const handler = handlerLine?.match(/(?:function\s+)?([A-Za-z_$][\w$]*)\s*\(/)?.[1] || null
    routes.push({
      method: decorator[1].toUpperCase(),
      path: normalizeRoutePath(decorator[3]),
      handler,
      framework: 'decorator-http',
      line: index + 1,
    })
  })

  return deduplicate(routes, route => `${route.line}:${route.method}:${route.path}`)
    .sort((left, right) => left.line - right.line || compareText(left.method, right.method))
}

function parseJavaScriptExports(lines, functions, classes) {
  const exports = [
    ...functions.filter(item => item.exported).map(item => ({ name: item.name, kind: 'function', line: item.line })),
    ...classes.filter(item => item.exported).map(item => ({ name: item.name, kind: 'class', line: item.line })),
  ]

  lines.forEach((line, index) => {
    const variable = line.match(/^\s*export\s+(?:declare\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/)
    if (variable && !functions.some(item => item.name === variable[1] && item.line === index + 1)) {
      exports.push({ name: variable[1], kind: 'variable', line: index + 1 })
    }

    const named = line.match(/^\s*export\s*\{([^}]+)\}/)
    if (named) {
      for (const name of named[1].split(',')) {
        const normalized = normalizeSignature(name).replace(/^type\s+/, '')
        if (normalized) exports.push({ name: normalized, kind: 'named', line: index + 1 })
      }
    }

    const commonJs = line.match(/^\s*(?:module\.exports\s*=|exports\.([A-Za-z_$][\w$]*)\s*=)/)
    if (commonJs) exports.push({ name: commonJs[1] || 'default', kind: 'commonjs', line: index + 1 })
  })

  return deduplicate(exports, item => `${item.line}:${item.kind}:${item.name}`)
    .sort((left, right) => left.line - right.line || compareText(left.name, right.name))
}

function parseJavaScript(content) {
  const parseableContent = maskComments(content, 'javascript')
  const lines = parseableContent.split(/\r?\n/)
  const maskedContent = maskCommentsAndStrings(content, 'javascript')
  const structuralLines = maskedContent.split(/\r?\n/)
  const functions = parseJavaScriptFunctions(lines)
  const classes = parseJavaScriptClasses(parseableContent, maskedContent)

  return {
    imports: parseJavaScriptImports(parseableContent, maskedContent),
    exports: parseJavaScriptExports(lines, functions, classes),
    functions,
    classes,
    routes: parseJavaScriptRoutes(lines, structuralLines),
  }
}

function maskPythonCode(content) {
  let output = ''
  let state = 'normal'
  let escaped = false

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index]
    const triple = content.slice(index, index + 3)

    if (character === '\n') {
      output += '\n'
      if (state === 'comment') state = 'normal'
      continue
    }

    if (state === 'comment') {
      output += ' '
      continue
    }

    if (state === 'triple-single' || state === 'triple-double') {
      const marker = state === 'triple-single' ? "'''" : '"""'
      if (triple === marker) {
        output += '   '
        index += 2
        state = 'normal'
      } else {
        output += ' '
      }
      continue
    }

    if (state === 'single' || state === 'double') {
      output += ' '
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if ((state === 'single' && character === "'") || (state === 'double' && character === '"')) state = 'normal'
      continue
    }

    if (character === '#') {
      output += ' '
      state = 'comment'
      continue
    }
    if (triple === "'''" || triple === '"""') {
      output += '   '
      index += 2
      state = triple === "'''" ? 'triple-single' : 'triple-double'
      continue
    }
    if (character === "'" || character === '"') {
      output += ' '
      state = character === "'" ? 'single' : 'double'
      continue
    }
    output += character
  }

  return output
}

function parsePythonImports(lines, structuralLines) {
  const imports = []

  lines.forEach((line, index) => {
    if (!(structuralLines[index] || '').trim()) return
    const direct = line.match(/^\s*import\s+(.+?)(?:\s+#.*)?$/)
    if (direct) {
      for (const item of direct[1].split(',')) {
        const source = item.trim().split(/\s+as\s+/)[0]
        if (source) imports.push({ source, bindings: [normalizeSignature(item)], kind: 'import', line: index + 1 })
      }
      return
    }

    const from = line.match(/^\s*from\s+([.\w]+)\s+import\s+(.+?)(?:\s+#.*)?$/)
    if (from) {
      imports.push({
        source: from[1],
        bindings: from[2].split(',').map(normalizeSignature).filter(Boolean),
        kind: 'from',
        line: index + 1,
      })
    }
  })

  return imports
}

function methodsFromPythonDecorator(decorator) {
  const match = decorator.text.match(/^\s*@([\w.]+)\.(get|post|put|patch|delete|options|head|route)\s*\(\s*(['"])([^'"]*)\3(.*)\)\s*$/i)
  if (!match) return []
  if (match[2].toLowerCase() !== 'route') return [{ method: match[2].toUpperCase(), path: match[4] }]

  const methodsMatch = match[5].match(/methods\s*=\s*(?:\[|\()([^)\]]+)(?:\]|\))/i)
  const methods = methodsMatch
    ? [...methodsMatch[1].matchAll(/['"]([A-Za-z]+)['"]/g)].map(item => item[1].toUpperCase())
    : ['GET']

  return methods.map(method => ({ method, path: match[4] }))
}

function parsePython(content) {
  const lines = content.split(/\r?\n/)
  const structuralLines = maskPythonCode(content).split(/\r?\n/)
  const functions = []
  const classes = []
  const routes = []
  const exports = []
  const classStack = []
  let decorators = []

  lines.forEach((line, index) => {
    const structuralLine = structuralLines[index] || ''
    if (!structuralLine.trim()) return
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const indent = indentationOf(line)

    if (trimmed.startsWith('@')) {
      decorators.push({ text: line, line: index + 1, indent })
      return
    }

    while (classStack.length > 0 && indent <= classStack.at(-1).indent) {
      classStack.pop().fact.endLine = index
    }

    const classMatch = line.match(/^\s*class\s+([A-Za-z_]\w*)(?:\(([^)]*)\))?\s*:/)
    if (classMatch) {
      const fact = {
        name: classMatch[1],
        extends: normalizeSignature(classMatch[2]) || null,
        exported: !classMatch[1].startsWith('_'),
        methods: [],
        line: index + 1,
        endLine: null,
      }
      classes.push(fact)
      classStack.push({ fact, indent })
      if (fact.exported && classStack.length === 1) exports.push({ name: fact.name, kind: 'class', line: fact.line })
      decorators = []
      return
    }

    const functionMatch = line.match(/^\s*(async\s+)?def\s+([A-Za-z_]\w*)\s*\((.*)\)\s*(?:->\s*[^:]+)?\s*:/)
    if (functionMatch) {
      const fact = {
        name: functionMatch[2],
        kind: classStack.length > 0 ? 'method' : 'declaration',
        async: Boolean(functionMatch[1]),
        generator: false,
        exported: classStack.length === 0 && !functionMatch[2].startsWith('_'),
        parameters: splitParameters(functionMatch[3]),
        line: index + 1,
      }

      if (classStack.length > 0) {
        classStack.at(-1).fact.methods.push({
          name: fact.name,
          async: fact.async,
          static: decorators.some(item => /@staticmethod\b/.test(item.text)),
          visibility: fact.name.startsWith('_') ? 'private' : 'public',
          parameters: fact.parameters,
          line: fact.line,
        })
      } else {
        functions.push(fact)
        if (fact.exported) exports.push({ name: fact.name, kind: 'function', line: fact.line })
      }

      for (const decorator of decorators) {
        for (const route of methodsFromPythonDecorator(decorator)) {
          routes.push({
            ...route,
            path: normalizeRoutePath(route.path),
            handler: fact.name,
            framework: 'python-http',
            line: decorator.line,
          })
        }
      }

      decorators = []
      return
    }

    const djangoPath = line.match(/^\s*(?:re_)?path\s*\(\s*(['"])([^'"]+)\1\s*,\s*([A-Za-z_][\w.]*)/)
    if (djangoPath) {
      routes.push({
        method: 'ANY',
        path: normalizeRoutePath(djangoPath[2].startsWith('/') ? djangoPath[2] : `/${djangoPath[2]}`),
        handler: djangoPath[3],
        framework: 'django',
        line: index + 1,
      })
    }

    decorators = []
  })

  while (classStack.length > 0) classStack.pop().fact.endLine = lines.length

  return {
    imports: parsePythonImports(lines, structuralLines),
    exports,
    functions,
    classes,
    routes: deduplicate(routes, route => `${route.line}:${route.method}:${route.path}`)
      .sort((left, right) => left.line - right.line || compareText(left.method, right.method)),
  }
}

export function isCodeAnalysisCandidate(file, options = {}) {
  const acceptedTypes = options.includeTests ? new Set(['code', 'test']) : new Set(['code'])
  return acceptedTypes.has(file?.file_type) && supportedLanguages.has(file?.language)
}

export function analyzeSourceFile({ filePath, language, content, isTest = false }) {
  const normalizedPath = normalizePath(filePath)
  const family = languageFamily(language)
  if (!family) throw new TypeError(`Unsupported code-analysis language: ${language || 'Unknown'}`)

  const source = String(content || '')
  const heuristicFacts = family === 'python' ? parsePython(source) : parseJavaScript(source)
  const ast = parseSourceAst(source, language)
  const structuralFacts = mergeAstFacts(heuristicFacts, ast, source, family)
  const exports = deduplicate([
    ...heuristicFacts.exports,
    ...structuralFacts.functions
      .filter(item => item.exported)
      .map(item => ({ name: item.name, kind: 'function', line: item.line })),
    ...structuralFacts.classes
      .filter(item => item.exported)
      .map(item => ({ name: item.name, kind: 'class', line: item.line })),
  ], item => `${item.line}:${item.kind}:${item.name}`)
  return {
    filePath: normalizedPath,
    modulePath: directoryOf(normalizedPath),
    moduleName: moduleNameForPath(normalizedPath),
    language,
    isTest,
    lineCount: source.split(/\r?\n/).length,
    metrics: metricsFromFacts(source, family, structuralFacts.functions, structuralFacts.classes, ast),
    parser: {
      engine: ast.parser,
      mode: ast.parsed ? 'ast' : 'heuristic-fallback',
      parsed: ast.parsed,
      errors: ast.errors,
    },
    ...heuristicFacts,
    ...structuralFacts,
    exports,
  }
}

function isEntrypoint(path) {
  return /(^|\/)(index|main|app|server|cli|routes?)\.[^.]+$|(^|\/)(manage\.py|__init__\.py)$/i.test(path)
}

export function identifyOrphanFiles(codeFacts, dependencies = []) {
  const paths = new Set(codeFacts.map(file => normalizePath(file.filePath)))
  const connected = new Set()

  for (const dependency of dependencies) {
    if (!dependency?.resolved) continue
    const source = normalizePath(dependency.source_file || dependency.sourceFile)
    const target = normalizePath(dependency.target_file || dependency.targetFile)
    if (!paths.has(source) || !paths.has(target)) continue
    connected.add(source)
    connected.add(target)
  }

  return codeFacts
    .filter(file => !connected.has(file.filePath) && !isEntrypoint(file.filePath))
    .map(file => ({
      filePath: file.filePath,
      confidence: 'low',
      reason: 'No resolved internal import connects this file to another analyzed source file.',
    }))
    .sort((left, right) => compareText(left.filePath, right.filePath))
}

function buildModules(codeFacts) {
  const byPath = new Map()

  for (const file of codeFacts) {
    const module = byPath.get(file.modulePath) || {
      path: file.modulePath,
      files: [],
      languages: new Set(),
      functionCount: 0,
      classCount: 0,
      routeCount: 0,
      exportCount: 0,
    }
    module.files.push(file.filePath)
    module.languages.add(file.language)
    module.functionCount += file.functions.length + file.classes.reduce((sum, item) => sum + item.methods.length, 0)
    module.classCount += file.classes.length
    module.routeCount += file.routes.length
    module.exportCount += file.exports.length
    byPath.set(file.modulePath, module)
  }

  return [...byPath.values()]
    .map(module => ({
      ...module,
      files: module.files.sort(compareText),
      languages: [...module.languages].sort(compareText),
    }))
    .sort((left, right) => compareText(left.path, right.path))
}

function positiveLimit(value, fallback) {
  if (value === 0) return Number.POSITIVE_INFINITY
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : fallback
}

export async function analyzeCodeStructure(repositoryPath, files, options = {}) {
  const includeTests = Boolean(options.includeTests)
  const maxSourceFiles = positiveLimit(options.maxSourceFiles, DEFAULT_MAX_SOURCE_FILES)
  const maxFileBytes = positiveLimit(options.maxFileBytes, DEFAULT_MAX_FILE_BYTES)
  const maxTotalBytes = positiveLimit(options.maxTotalBytes, DEFAULT_MAX_TOTAL_BYTES)
  const sourceFiles = (Array.isArray(files) ? files : [])
    .filter(file => ['code', ...(includeTests ? ['test'] : [])].includes(file?.file_type))
    .sort((left, right) => compareText(normalizePath(left.path), normalizePath(right.path)))
  const supported = sourceFiles.filter(file => isCodeAnalysisCandidate(file, { includeTests }))
  const sizeEligible = supported.filter(file => (Number(file.size) || 0) <= maxFileBytes)
  const selected = []
  const skippedByTotalBytes = []
  let selectedBytes = 0
  for (const file of sizeEligible.slice(0, maxSourceFiles)) {
    const size = Number(file.size) || 0
    if (selectedBytes + size > maxTotalBytes) {
      skippedByTotalBytes.push(file)
      continue
    }
    selected.push(file)
    selectedBytes += size
  }
  const skippedFiles = [
    ...sourceFiles
      .filter(file => !isCodeAnalysisCandidate(file, { includeTests }))
      .map(file => ({ filePath: normalizePath(file.path), reason: 'unsupported_language' })),
    ...supported
      .filter(file => (Number(file.size) || 0) > maxFileBytes)
      .map(file => ({ filePath: normalizePath(file.path), reason: 'file_too_large' })),
    ...sizeEligible
      .slice(maxSourceFiles)
      .map(file => ({ filePath: normalizePath(file.path), reason: 'source_file_limit' })),
    ...skippedByTotalBytes
      .map(file => ({ filePath: normalizePath(file.path), reason: 'total_byte_limit' })),
  ]
  const codeFacts = []
  const sourceContents = new Map()

  for (let index = 0; index < selected.length; index += 1) {
    if (options.signal?.aborted) {
      throw options.signal.reason instanceof Error ? options.signal.reason : Object.assign(new Error('Repository analysis cancelled.'), { code: 'ABORT_ERR' })
    }
    const file = selected[index]
    try {
      const content = await readFile(absolutePathFromRepo(repositoryPath, file.path), 'utf8')
      const facts = analyzeSourceFile({
        filePath: file.path,
        language: file.language,
        content,
        isTest: file.file_type === 'test',
      })
      codeFacts.push(facts)
      sourceContents.set(facts.filePath, content)
    } catch (error) {
      skippedFiles.push({
        filePath: normalizePath(file.path),
        reason: 'read_error',
        errorCode: error?.code || null,
      })
    }

    if (index === 0 || (index + 1) % 25 === 0 || index + 1 === selected.length) {
      await options.onProgress?.({
        processed: index + 1,
        total: selected.length,
        message: `${(index + 1).toLocaleString()} supported source files analyzed.`,
      })
    }
  }

  codeFacts.sort((left, right) => compareText(left.filePath, right.filePath))
  const { duplicateBlockCount, duplicateGroups } = applyDuplicationMetrics(codeFacts, sourceContents)
  skippedFiles.sort((left, right) => compareText(left.filePath, right.filePath))
  const modules = buildModules(codeFacts)
  const routes = codeFacts
    .flatMap(file => file.routes.map(route => ({ ...route, filePath: file.filePath })))
    .sort((left, right) => compareText(left.filePath, right.filePath) || left.line - right.line)
  const orphanFiles = identifyOrphanFiles(codeFacts, options.dependencies)

  return {
    analysisVersion: CODE_ANALYSIS_VERSION,
    files: codeFacts,
    modules,
    routes,
    duplicateGroups,
    orphanFiles,
    skippedFiles,
    metrics: {
      candidateFileCount: sourceFiles.length,
      supportedFileCount: supported.length,
      analyzedFileCount: codeFacts.length,
      skippedFileCount: skippedFiles.length,
      moduleCount: modules.length,
      importCount: codeFacts.reduce((sum, file) => sum + file.imports.length, 0),
      exportCount: codeFacts.reduce((sum, file) => sum + file.exports.length, 0),
      functionCount: codeFacts.reduce((sum, file) => sum + file.functions.length + file.classes.reduce((methodSum, item) => methodSum + item.methods.length, 0), 0),
      classCount: codeFacts.reduce((sum, file) => sum + file.classes.length, 0),
      routeCount: routes.length,
      orphanFileCount: orphanFiles.length,
      averageCyclomaticComplexity: codeFacts.length === 0
        ? 0
        : Math.round((codeFacts.reduce((sum, file) => sum + file.metrics.cyclomaticComplexity, 0) / codeFacts.length) * 10) / 10,
      maxCyclomaticComplexity: codeFacts.reduce((maximum, file) => Math.max(maximum, file.metrics.cyclomaticComplexity), 0),
      longFunctionCount: codeFacts.reduce((sum, file) => sum + file.metrics.longFunctionCount, 0),
      largeClassCount: codeFacts.reduce((sum, file) => sum + file.metrics.largeClassCount, 0),
      duplicationPercent: codeFacts.length === 0
        ? 0
        : Math.round((codeFacts.reduce((sum, file) => sum + file.metrics.duplicationPercent, 0) / codeFacts.length) * 10) / 10,
      duplicateBlockCount,
      duplicateGroupCount: duplicateGroups.length,
      parseUnavailableFileCount: codeFacts.filter(file => !file.parser.parsed).length,
      analyzedBytes: selectedBytes,
      maxTotalBytes: Number.isFinite(maxTotalBytes) ? maxTotalBytes : null,
      parser: 'babel-and-lezer-with-bounded-heuristic-fallback',
      heuristic: true,
    },
  }
}
