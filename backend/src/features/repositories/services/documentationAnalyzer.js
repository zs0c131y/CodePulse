export const DOCUMENTATION_ANALYSIS_VERSION = 1

const setupHeadingPattern = /\b(getting started|quick ?start|installation|installing|setup|development setup|running locally|prerequisites?)\b/i
const apiHeadingPattern = /\b(api|apis|endpoint|endpoints|routes?|http|rest|graphql)\b/i
const architectureHeadingPattern = /\b(architecture|system design|technical design|components?|data flow|deployment|decisions?|adr)\b/i
const sourceReferencePattern = /`((?:(?:[\w@.-]+\/)+)?[\w.-]+\.(?:[cm]?[jt]sx?|py|java|kt|go|rs|rb|php|cs|cpp|h|swift))`/gi
const httpEndpointPattern = /\b(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b(?:\s*\|\s*|\s+)(\/[A-Za-z0-9_~!$&'()*+,;=:@%./{}<>:-]*)/gi

function normalizePath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '')
}

function compareText(left, right) {
  return left.localeCompare(right, 'en', { sensitivity: 'base' }) || left.localeCompare(right)
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
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

function directoryOf(path) {
  const normalized = normalizePath(path)
  const separator = normalized.lastIndexOf('/')
  return separator === -1 ? '.' : normalized.slice(0, separator) || '.'
}

function baseNameWithoutExtension(path) {
  const name = normalizePath(path).split('/').at(-1) || ''
  const separator = name.lastIndexOf('.')
  return (separator === -1 ? name : name.slice(0, separator)).toLowerCase()
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
}

function normalizeEndpointPath(value) {
  const path = String(value || '')
    .trim()
    .replace(/[),.;:`]+$/, '')
  if (!path || path === '/') return '/'
  return path.replace(/\/+$/, '') || '/'
}

function endpointKey(endpoint) {
  return `${String(endpoint.method || '').toUpperCase()} ${normalizeEndpointPath(endpoint.path)}`
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

function parseMarkdown(content) {
  const lines = String(content || '').split(/\r?\n/)
  const headings = []
  const codeBlocks = []
  const sections = []
  let currentSection = null
  let activeFence = null

  function closeSection(endLine) {
    if (!currentSection) return
    currentSection.endLine = endLine
    currentSection.content = currentSection.lines.join('\n').trim()
    delete currentSection.lines
    sections.push(currentSection)
    currentSection = null
  }

  lines.forEach((line, index) => {
    const lineNumber = index + 1
    const fence = line.match(/^\s*(```+|~~~+)\s*([^\s]*)\s*$/)
    if (fence) {
      if (!activeFence) {
        activeFence = {
          marker: fence[1][0],
          language: fence[2].toLowerCase() || null,
          line: lineNumber,
          section: currentSection?.title || null,
          lines: [],
        }
      } else if (fence[1][0] === activeFence.marker) {
        codeBlocks.push({
          language: activeFence.language,
          line: activeFence.line,
          endLine: lineNumber,
          section: activeFence.section,
          content: activeFence.lines.join('\n').trim(),
        })
        activeFence = null
      }
      if (currentSection) currentSection.lines.push(line)
      return
    }

    if (activeFence) {
      activeFence.lines.push(line)
      if (currentSection) currentSection.lines.push(line)
      return
    }

    let heading = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/)
    let headingLine = lineNumber
    if (!heading && index + 1 < lines.length && /^\s*(=+|-+)\s*$/.test(lines[index + 1]) && line.trim()) {
      heading = [line, lines[index + 1].trim().startsWith('=') ? '#' : '##', line.trim()]
    } else if (!heading && index > 0 && /^\s*(=+|-+)\s*$/.test(line)) {
      return
    }

    if (heading) {
      closeSection(headingLine - 1)
      const fact = {
        level: heading[1].length,
        title: normalizeWhitespace(heading[2]),
        slug: slugify(heading[2]),
        line: headingLine,
      }
      headings.push(fact)
      currentSection = { ...fact, lines: [] }
      return
    }

    if (currentSection) currentSection.lines.push(line)
  })

  closeSection(lines.length)
  if (activeFence) {
    codeBlocks.push({
      language: activeFence.language,
      line: activeFence.line,
      endLine: lines.length,
      section: activeFence.section,
      content: activeFence.lines.join('\n').trim(),
      unterminated: true,
    })
  }

  return { lines, headings, sections, codeBlocks }
}

function sectionForLine(sections, line) {
  return sections
    .filter(section => section.line <= line && section.endLine >= line)
    .sort((left, right) => right.level - left.level || right.line - left.line)[0] || null
}

function extractSetupFacts(parsed) {
  const sections = parsed.sections.filter(section => (
    setupHeadingPattern.test(section.title)
    && normalizeWhitespace(section.content.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, ''))
  ))
  const steps = []

  for (const section of sections) {
    const sectionLines = section.content.split(/\r?\n/)
    sectionLines.forEach((line, index) => {
      const item = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.+?)\s*$/)
      if (!item) return
      const text = normalizeWhitespace(item[1])
      if (text) steps.push({ text, section: section.title, line: section.line + index + 1 })
    })
  }

  const commands = parsed.codeBlocks
    .filter(block => block.section && setupHeadingPattern.test(block.section) && block.content)
    .map(block => ({
      command: block.content,
      language: block.language,
      section: block.section,
      line: block.line,
    }))

  return {
    sections: sections.map(section => ({ title: section.title, line: section.line })),
    steps: deduplicate(steps, item => `${item.section}:${item.text}`),
    commands: deduplicate(commands, item => `${item.section}:${item.command}`),
  }
}

function extractApiFacts(parsed) {
  const endpoints = []
  const apiSections = parsed.sections
    .filter(section => apiHeadingPattern.test(section.title))
    .map(section => ({ title: section.title, line: section.line }))

  parsed.lines.forEach((line, index) => {
    for (const match of line.matchAll(httpEndpointPattern)) {
      const section = sectionForLine(parsed.sections, index + 1)
      endpoints.push({
        method: match[1].toUpperCase(),
        path: normalizeEndpointPath(match[2]),
        line: index + 1,
        section: section?.title || null,
      })
    }

    const curl = line.match(/\bcurl\b(?:\s+(?:-X|--request)\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD))?[^\r\n]*?https?:\/\/[^\s/]+(\/[^\s'"`]*)?/i)
    if (curl) {
      const section = sectionForLine(parsed.sections, index + 1)
      endpoints.push({
        method: (curl[1] || 'GET').toUpperCase(),
        path: normalizeEndpointPath(curl[2] || '/'),
        line: index + 1,
        section: section?.title || null,
      })
    }
  })

  return {
    sections: apiSections,
    endpoints: deduplicate(endpoints, endpointKey)
      .sort((left, right) => compareText(left.path, right.path) || compareText(left.method, right.method)),
  }
}

function extractArchitectureFacts(parsed) {
  const architectureSections = parsed.sections.filter(section => architectureHeadingPattern.test(section.title))
  const diagramBlocks = parsed.codeBlocks.filter(block => ['mermaid', 'dot', 'plantuml', 'puml'].includes(block.language))

  return architectureSections
    .map(section => ({
      title: section.title,
      line: section.line,
      summary: normalizeWhitespace(section.content.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '')).slice(0, 500),
      diagramTypes: [...new Set(diagramBlocks
        .filter(block => block.line >= section.line && block.line <= section.endLine)
        .map(block => block.language))],
    }))
    .filter(section => section.summary || section.diagramTypes.length > 0)
}

function extractSourceReferences(content) {
  const lineNumberAt = createLineNumberLookup(content)
  return deduplicate(
    [...String(content || '').matchAll(sourceReferencePattern)].map(match => ({
      path: normalizePath(match[1]),
      line: lineNumberAt(match.index),
    })),
    item => item.path,
  ).sort((left, right) => compareText(left.path, right.path))
}

export function analyzeDocumentationEntry(document) {
  const content = String(document?.content || '')
  const docPath = normalizePath(document?.doc_path || document?.path)
  const parsed = parseMarkdown(content)
  const setup = extractSetupFacts(parsed)
  const api = extractApiFacts(parsed)
  const architectureNotes = extractArchitectureFacts(parsed)
  const title = parsed.headings[0]?.title || document?.content_summary || document?.summary || document?.file_name || docPath

  return {
    docPath,
    type: String(document?.documentation_type || document?.type || 'documentation').toLowerCase(),
    title: normalizeWhitespace(title),
    truncated: Boolean(document?.truncated),
    headings: parsed.headings,
    setup,
    api,
    architecture: {
      present: architectureNotes.length > 0 || parsed.codeBlocks.some(block => ['mermaid', 'dot', 'plantuml', 'puml'].includes(block.language)),
      notes: architectureNotes,
      diagrams: parsed.codeBlocks
        .filter(block => ['mermaid', 'dot', 'plantuml', 'puml'].includes(block.language))
        .map(block => ({ language: block.language, line: block.line, section: block.section })),
    },
    sourceReferences: extractSourceReferences(content),
  }
}

function documentsModule(document, modulePath) {
  const path = normalizePath(document.docPath).toLowerCase()
  const module = normalizePath(modulePath).toLowerCase()
  const docDirectory = directoryOf(path).toLowerCase()
  const docBaseName = baseNameWithoutExtension(path)
  const leaf = module.split('/').at(-1) || ''

  return docDirectory === module
    || (module !== '.' && path.startsWith(`${module}/`))
    || docBaseName === leaf
    || (module !== '.' && path.endsWith(`/${module}.md`))
    || (module === '.' && (docBaseName === 'readme' || document.type === 'readme'))
}

function deriveModules(options) {
  const codeModules = Array.isArray(options?.codeAnalysis?.modules)
    ? options.codeAnalysis.modules.map(module => normalizePath(module.path)).filter(Boolean)
    : []
  const fileModules = (options?.files || [])
    .filter(file => file?.file_type === 'code')
    .map(file => directoryOf(file.path))

  return [...new Set([...codeModules, ...fileModules])]
    .sort(compareText)
}

function deriveCodeRoutes(options) {
  if (!Array.isArray(options?.codeAnalysis?.routes)) return []
  return deduplicate(options.codeAnalysis.routes.map(route => ({
    method: String(route.method || '').toUpperCase(),
    path: normalizeEndpointPath(route.path),
    filePath: normalizePath(route.filePath),
    line: route.line || null,
  })).filter(route => route.method && route.path), endpointKey)
}

function percentage(numerator, denominator) {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 100)
}

function buildCoverage(documents, options) {
  const modules = deriveModules(options)
  const documentedModules = modules.filter(modulePath => documents.some(document => documentsModule(document, modulePath)))
  const undocumentedModules = modules.filter(modulePath => !documentedModules.includes(modulePath))
  const codeRoutes = deriveCodeRoutes(options)
  const documentedEndpointKeys = new Set(documents.flatMap(document => document.api.endpoints).map(endpointKey))
  const documentedRoutes = codeRoutes.filter(route => documentedEndpointKeys.has(endpointKey(route)))
  const undocumentedRoutes = codeRoutes.filter(route => !documentedEndpointKeys.has(endpointKey(route)))
  const hasSetupDocumentation = documents.some(document => document.setup.sections.length > 0 || document.setup.commands.length > 0)
  const hasArchitectureDocumentation = documents.some(document => document.architecture.present)
  const components = [
    {
      name: 'module',
      available: modules.length > 0,
      percent: percentage(documentedModules.length, modules.length),
    },
    {
      name: 'api',
      available: codeRoutes.length > 0,
      percent: percentage(documentedRoutes.length, codeRoutes.length),
    },
    { name: 'setup', available: true, percent: hasSetupDocumentation ? 100 : 0 },
    { name: 'architecture', available: true, percent: hasArchitectureDocumentation ? 100 : 0 },
  ]
  const availableComponents = components.filter(component => component.available)
  const overallPercent = availableComponents.length === 0
    ? 100
    : Math.round(availableComponents.reduce((sum, component) => sum + component.percent, 0) / availableComponents.length)

  return {
    overallPercent,
    components,
    modules: {
      available: modules.length > 0,
      percent: percentage(documentedModules.length, modules.length),
      total: modules.length,
      documented: documentedModules,
      undocumented: undocumentedModules,
    },
    api: {
      available: codeRoutes.length > 0,
      percent: percentage(documentedRoutes.length, codeRoutes.length),
      total: codeRoutes.length,
      documented: documentedRoutes,
      undocumented: undocumentedRoutes,
    },
    setup: { present: hasSetupDocumentation, percent: hasSetupDocumentation ? 100 : 0 },
    architecture: { present: hasArchitectureDocumentation, percent: hasArchitectureDocumentation ? 100 : 0 },
  }
}

export function analyzeDocumentation(documentation, options = {}) {
  const documents = (Array.isArray(documentation) ? documentation : [])
    .filter(document => document?.doc_path || document?.path)
    .map(analyzeDocumentationEntry)
    .sort((left, right) => compareText(left.docPath, right.docPath))
  const setupSteps = documents.flatMap(document => document.setup.steps.map(item => ({ ...item, docPath: document.docPath })))
  const setupCommands = documents.flatMap(document => document.setup.commands.map(item => ({ ...item, docPath: document.docPath })))
  const apiEndpoints = deduplicate(
    documents.flatMap(document => document.api.endpoints.map(item => ({ ...item, docPath: document.docPath }))),
    endpointKey,
  ).sort((left, right) => compareText(left.path, right.path) || compareText(left.method, right.method))
  const architectureNotes = documents.flatMap(document => document.architecture.notes.map(item => ({ ...item, docPath: document.docPath })))
  const sourceReferences = deduplicate(
    documents.flatMap(document => document.sourceReferences.map(item => ({ ...item, docPath: document.docPath }))),
    item => `${item.docPath}:${item.path}`,
  )
  const coverage = buildCoverage(documents, options)

  return {
    analysisVersion: DOCUMENTATION_ANALYSIS_VERSION,
    documents,
    facts: {
      setup: {
        present: coverage.setup.present,
        steps: setupSteps,
        commands: setupCommands,
      },
      api: {
        present: documents.some(document => document.api.sections.length > 0 || document.api.endpoints.length > 0),
        endpoints: apiEndpoints,
      },
      architecture: {
        present: coverage.architecture.present,
        notes: architectureNotes,
      },
      sourceReferences,
    },
    coverage,
    metrics: {
      documentCount: documents.length,
      headingCount: documents.reduce((sum, document) => sum + document.headings.length, 0),
      setupStepCount: setupSteps.length,
      setupCommandCount: setupCommands.length,
      apiEndpointCount: apiEndpoints.length,
      architectureNoteCount: architectureNotes.length,
      sourceReferenceCount: sourceReferences.length,
      heuristic: true,
    },
  }
}
