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

/**
 * Measures documentation debt from the structured repository facts. A module
 * is a directory containing at least one code file. It is considered covered
 * when documentation lives alongside it or a documentation file is named for
 * that directory. This deliberately avoids treating a single root README as
 * complete coverage for every source area.
 */
export function analyzeKnowledgeDebt(analysis) {
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
        onboardingDifficultyScore: 0,
      },
      documentedModules,
      undocumentedModules,
      moduleMetrics: [],
    }
  }

  const coverageGap = 100 - documentationCoverage
  const onboardingDifficultyScore = round(clamp(
    coverageGap * 0.6 + (architectureDocumentation ? 0 : 25) + (setupDocumentation ? 0 : 15),
    0,
    100,
  ))
  const score = round(clamp(
    coverageGap * 0.7 + (architectureDocumentation ? 0 : 20) + (setupDocumentation ? 0 : 10),
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
      onboardingDifficultyScore,
    },
    documentedModules,
    undocumentedModules,
    moduleMetrics: modules.map(path => ({
      path,
      documented: documentedModuleSet.has(path),
      missingReason: documentedModuleSet.has(path) ? null : 'No adjacent or module-named documentation was found.',
    })),
  }
}
