function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function round(value, precision = 0) {
  const multiplier = 10 ** precision
  return Math.round(value * multiplier) / multiplier
}

function normalizePath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '')
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

function isCodeFile(file) {
  return file?.file_type === 'code'
}

function normalizeDocumentation(documentation) {
  return (documentation || []).map(doc => {
    const path = normalizePath(doc.doc_path || doc.path)
    return {
      path,
      directory: directoryOf(path),
      baseName: baseNameWithoutExtension(path),
      type: String(doc.documentation_type || doc.type || '').toLowerCase(),
      content: String(doc.content || doc.content_summary || doc.summary || ''),
    }
  }).filter(doc => Boolean(doc.path))
}

function documentsModule(modulePath, documentation) {
  const normalizedModule = normalizePath(modulePath).toLowerCase()
  const leaf = normalizedModule.split('/').at(-1) || ''

  return documentation.some(doc => {
    const path = doc.path.toLowerCase()
    const directory = doc.directory.toLowerCase()

    if (directory === normalizedModule) return true
    if (normalizedModule !== '.' && path.startsWith(`${normalizedModule}/`)) return true
    if (doc.baseName === leaf) return true
    if (normalizedModule !== '.' && path.endsWith(`/${normalizedModule}.md`)) return true
    if (normalizedModule === '.' && (doc.baseName === 'readme' || doc.type === 'readme')) return true

    return false
  })
}

function hasArchitectureDocumentation(documentation) {
  return documentation.some(doc => {
    const haystack = `${doc.path} ${doc.type} ${doc.content}`.toLowerCase()
    return /architecture|system design|component diagram|mermaid|adr\b/.test(haystack)
  })
}

function hasSetupDocumentation(documentation) {
  return documentation.some(doc => {
    const haystack = `${doc.path} ${doc.content}`.toLowerCase()
    return /getting started|quick start|installation|install\b|setup|prerequisites/.test(haystack)
  })
}

function uniqueApiRoutes(codeOutlines) {
  const routes = new Map()
  for (const outline of codeOutlines || []) {
    for (const route of outline?.routes || []) {
      const method = String(route.method || '').toUpperCase()
      const path = String(route.path || '').trim()
      if (!method || !path) continue
      const key = `${method} ${path}`
      if (!routes.has(key)) routes.set(key, {
        method,
        path,
        modulePath: outline.modulePath || directoryOf(outline.path),
        sourcePath: outline.path,
      })
    }
  }
  return [...routes.values()]
}

function documentsApiRoute(route, documentation) {
  const endpoint = `${route.method} ${route.path}`.toLowerCase()
  const path = route.path.toLowerCase()
  return documentation.some(document => {
    const content = document.content.toLowerCase()
    return content.includes(endpoint) || content.includes(`\`${endpoint}\``) || content.includes(`\`${path}\``)
  })
}

function complexityForModule(modulePath, technicalDebt) {
  const values = (technicalDebt?.modules || [])
    .filter(module => directoryOf(module.path) === modulePath)
    .map(module => Number(module.complexity))
    .filter(Number.isFinite)
  return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null
}

/**
 * Measures documentation debt from the structured repository facts. A module
 * is a directory containing at least one code file. It is considered covered
 * when documentation lives alongside it or a documentation file is named for
 * that directory. This deliberately avoids treating a single root README as
 * complete coverage for every source area.
 */
export function analyzeKnowledgeDebt(analysis, options = {}) {
  const files = Array.isArray(analysis?.files) ? analysis.files : []
  const documentation = normalizeDocumentation(analysis?.documentation)
  const modules = [...new Set(files.filter(isCodeFile).map(file => directoryOf(file.path)))].sort((left, right) => left.localeCompare(right))
  const documentedModules = modules.filter(modulePath => documentsModule(modulePath, documentation))
  const undocumentedModules = modules.filter(modulePath => !documentedModules.includes(modulePath))
  const documentedModuleSet = new Set(documentedModules)
  const totalModules = modules.length
  const documentationCoverage = totalModules === 0 ? 100 : round((documentedModules.length / totalModules) * 100)
  const architectureDocumentation = hasArchitectureDocumentation(documentation)
  const setupDocumentation = hasSetupDocumentation(documentation)
  const apiRoutes = uniqueApiRoutes(options.codeOutlines)
    .map(route => ({ ...route, documented: documentsApiRoute(route, documentation) }))
  const documentedApiRoutes = apiRoutes.filter(route => route.documented)
  const undocumentedApiRoutes = apiRoutes.filter(route => !route.documented)
  const apiDocumentationCoverage = apiRoutes.length === 0 ? 100 : round((documentedApiRoutes.length / apiRoutes.length) * 100)

  if (totalModules === 0) {
    return {
      score: 0,
      metrics: {
        totalModules,
        documentedModules: 0,
        undocumentedModules: 0,
        documentationCoverage,
        hasArchitectureDocumentation: architectureDocumentation,
        hasSetupDocumentation: setupDocumentation,
        totalApiRoutes: 0,
        documentedApiRoutes: 0,
        undocumentedApiRoutes: 0,
        apiDocumentationCoverage,
        averageModuleExplainability: 100,
        unexplainedModules: 0,
        onboardingDifficultyScore: 0,
      },
      documentedModules,
      undocumentedModules,
      moduleMetrics: [],
    }
  }

  const moduleMetrics = modules.map(path => {
    const documented = documentedModuleSet.has(path)
    const moduleApiRoutes = apiRoutes.filter(route => route.modulePath === path)
    const moduleDocumentedApiRoutes = moduleApiRoutes.filter(route => route.documented)
    const apiExplainability = moduleApiRoutes.length === 0 ? 25 : round((moduleDocumentedApiRoutes.length / moduleApiRoutes.length) * 25)
    const hasOutline = (options.codeOutlines || []).some(outline => outline.modulePath === path)
    const complexity = complexityForModule(path, options.technicalDebt)
    const complexityPenalty = complexity === null ? 0 : round(Math.min(15, complexity * 0.15))
    const explainabilityScore = round(Math.max(0, (documented ? 60 : 0) + (hasOutline ? 15 : 0) + apiExplainability - complexityPenalty))
    return {
      path,
      documented,
      missingReason: documented ? null : 'No adjacent or module-named documentation was found.',
      apiRoutes: moduleApiRoutes.length,
      documentedApiRoutes: moduleDocumentedApiRoutes.length,
      undocumentedApiRoutes: moduleApiRoutes.length - moduleDocumentedApiRoutes.length,
      explainabilityScore,
      complexity,
      complexityPenalty,
    }
  })
  const averageModuleExplainability = round(moduleMetrics.reduce((sum, module) => sum + module.explainabilityScore, 0) / moduleMetrics.length)
  const unexplainedModules = moduleMetrics.filter(module => module.explainabilityScore < 60).length
  const coverageGap = 100 - documentationCoverage
  const apiCoverageGap = 100 - apiDocumentationCoverage
  const explainabilityGap = 100 - averageModuleExplainability
  const onboardingDifficultyScore = round(clamp(
    coverageGap * 0.45 + apiCoverageGap * 0.15 + explainabilityGap * 0.15 + (architectureDocumentation ? 0 : 15) + (setupDocumentation ? 0 : 10),
    0,
    100,
  ))
  const score = round(clamp(
    coverageGap * 0.5 + apiCoverageGap * 0.2 + explainabilityGap * 0.15 + (architectureDocumentation ? 0 : 10) + (setupDocumentation ? 0 : 5),
    0,
    100,
  ))

  return {
    score,
    metrics: {
      totalModules,
      documentedModules: documentedModules.length,
      undocumentedModules: undocumentedModules.length,
      documentationCoverage,
      hasArchitectureDocumentation: architectureDocumentation,
      hasSetupDocumentation: setupDocumentation,
      totalApiRoutes: apiRoutes.length,
      documentedApiRoutes: documentedApiRoutes.length,
      undocumentedApiRoutes: undocumentedApiRoutes.length,
      apiDocumentationCoverage,
      averageModuleExplainability,
      unexplainedModules,
      onboardingDifficultyScore,
    },
    documentedModules,
    undocumentedModules,
    apiRoutes,
    moduleMetrics,
  }
}
