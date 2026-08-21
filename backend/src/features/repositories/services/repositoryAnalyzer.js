import { cloneRepository, materializeRepositoryFiles, removeRepositoryWorkspace } from './gitClient.js'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import { parseRepositoryStructure } from './fileParser.js'
import { extractDocumentation, isDocumentationCandidate } from './documentationExtractor.js'
import { extractCommitHistory } from './commitExtractor.js'
import { generateDependencyGraph, getDependencyGraphCoverage } from './dependencyGraph.js'
import { analyzeCodeStructure } from './codeAnalyzer.js'
import { analyzeDocumentation } from './documentationAnalyzer.js'
import { extractCoverageReport } from './coverageParser.js'
import { persistStructuredAnalysis } from './structuredAnalysisStore.js'
import { scoreRepositoryAnalysis } from '../../analysis/services/analysisScorer.js'
import {
  REPOSITORY_MAX_DEPENDENCY_FILE_BYTES,
  REPOSITORY_MAX_DEPENDENCY_EDGES,
  REPOSITORY_MAX_DEPENDENCY_SOURCE_FILES,
  REPOSITORY_MAX_DOCUMENTATION_FILES,
  REPOSITORY_MAX_DOCUMENTATION_TOTAL_BYTES,
  REPOSITORY_MAX_FILES,
} from '../../../config/index.js'

function absolutePath(repositoryPath, relativePath) {
  return join(repositoryPath, ...relativePath.split('/'))
}

async function hydrateMaterializedFileSizes(repositoryPath, files, materializedPaths, signal) {
  const byPath = new Map(files.map(file => [file.path, file]))
  for (const filePath of materializedPaths) {
    if (signal?.aborted) throw signal.reason
    try {
      const details = await stat(absolutePath(repositoryPath, filePath))
      const file = byPath.get(filePath)
      if (file) file.size = details.size
    } catch {
      // A missing optional coverage path or an unusual Git entry is handled by
      // the downstream reader that requested it.
    }
  }
}

export async function analyzeRepositorySource({
  sourceUrl,
  userId,
  repositoryId,
  scanId,
  cloneOptions = {},
  commitLimit = 100,
  persistAnalysis,
  persistStructured = persistStructuredAnalysis,
  scoreAnalysis = scoreRepositoryAnalysis,
  signal,
  onProgress,
}) {
  let clonedRepository

  const progress = async (phase, label, phaseProgress, overallProgress, details = {}) => {
    await onProgress?.({
      phase,
      label,
      phaseProgress: Math.max(0, Math.min(100, Math.round(Number(phaseProgress) || 0))),
      overallProgress: Math.max(0, Math.min(100, Math.round(Number(overallProgress) || 0))),
      processed: Number.isFinite(details.processed) ? details.processed : null,
      total: Number.isFinite(details.total) ? details.total : null,
      message: details.message || null,
    })
  }

  try {
    await progress('cloning', 'Repository clone', 0, 1, { message: 'Starting filtered Git clone.' })
    clonedRepository = await cloneRepository(sourceUrl, {
      ...cloneOptions,
      signal,
      onProgress(details) {
        const clonePercent = details.percent || 0
        onProgress?.({
          phase: 'cloning',
          label: 'Repository clone',
          phaseProgress: clonePercent,
          overallProgress: Math.round(1 + clonePercent * 0.29),
          processed: details.processed,
          total: details.total,
          message: 'Receiving repository objects without checking out the full working tree.',
        })
      },
    })
    await progress('inventory', 'File inventory', 0, 30, { message: 'Reading the complete tracked Git tree.' })
    const structure = await parseRepositoryStructure(clonedRepository.localPath, {
      maxFiles: cloneOptions.maxFiles ?? REPOSITORY_MAX_FILES,
      trackedTreeOnly: clonedRepository.trackedTreeOnly,
      signal,
      onProgress(details) {
        const phasePercent = details.total ? details.processed / details.total * 100 : 0
        return progress('inventory', 'File inventory', phasePercent, 30 + phasePercent * 0.15, {
          ...details,
          message: `${details.processed.toLocaleString()} tracked files inventoried.`,
        })
      },
    })
    await progress('inventory', 'File inventory', 100, 45, {
      processed: structure.summary.totalFiles,
      total: structure.summary.totalFiles,
      message: `${structure.summary.totalFiles.toLocaleString()} tracked files inventoried.`,
    })

    const dependencyOptions = {
      maxSourceFiles: cloneOptions.maxDependencySourceFiles || REPOSITORY_MAX_DEPENDENCY_SOURCE_FILES,
      maxFileBytes: cloneOptions.maxDependencyFileBytes || REPOSITORY_MAX_DEPENDENCY_FILE_BYTES,
    }
    const dependencyGraph = getDependencyGraphCoverage(structure.files, dependencyOptions)
    const documentationCandidates = structure.files
      .filter(isDocumentationCandidate)
      .slice(0, cloneOptions.maxDocumentationFiles || REPOSITORY_MAX_DOCUMENTATION_FILES)
    const trackedFilePaths = new Set(structure.files.map(file => file.path))
    const materializedPaths = [
      ...documentationCandidates.map(file => file.path),
      ...dependencyGraph.scannedFilePaths,
      'coverage/lcov.info',
      'coverage/lcov-report/lcov.info',
      '.nyc_output/lcov.info',
      'lcov.info',
    ].filter(path => trackedFilePaths.has(path))

    if (clonedRepository.trackedTreeOnly) {
      await progress('materializing', 'Analysis checkout', 0, 45, {
        processed: 0,
        total: materializedPaths.length,
        message: 'Materializing only files that require content analysis.',
      })
      await materializeRepositoryFiles(clonedRepository.localPath, materializedPaths, {
        signal,
        onProgress(details) {
          const phasePercent = details.percent || 0
          onProgress?.({
            phase: 'materializing',
            label: 'Analysis checkout',
            phaseProgress: phasePercent,
            overallProgress: Math.round(45 + phasePercent * 0.05),
            processed: details.processed,
            total: details.total || materializedPaths.length,
            message: 'Downloading the bounded content-analysis working set.',
          })
        },
      })
      await hydrateMaterializedFileSizes(clonedRepository.localPath, structure.files, materializedPaths, signal)
    }
    await progress('documentation', 'Documentation', 0, 50, { message: 'Extracting repository documentation.' })
    const documentation = await extractDocumentation(clonedRepository.localPath, structure.files, {
      maxFiles: cloneOptions.maxDocumentationFiles || REPOSITORY_MAX_DOCUMENTATION_FILES,
      maxTotalBytes: cloneOptions.maxDocumentationTotalBytes || REPOSITORY_MAX_DOCUMENTATION_TOTAL_BYTES,
      signal,
      onProgress(details) {
        const phasePercent = details.total ? details.processed / details.total * 100 : 0
        return progress('documentation', 'Documentation', phasePercent, 50 + phasePercent * 0.08, details)
      },
    })
    await progress('commits', 'Commit history', 0, 58, { message: 'Reading recent commit history.' })
    const commits = await extractCommitHistory(clonedRepository.localPath, { limit: commitLimit })
    await progress('commits', 'Commit history', 100, 63, { processed: commits.length, total: commits.length, message: `${commits.length} commits captured.` })
    await progress('dependencies', 'Dependency graph', 0, 63, { message: 'Extracting supported dependency edges.' })
    const allDependencies = await generateDependencyGraph(clonedRepository.localPath, structure.files, {
      ...dependencyOptions,
      signal,
      onProgress(details) {
        const phasePercent = details.total ? details.processed / details.total * 100 : 0
        return progress('dependencies', 'Dependency graph', phasePercent, 63 + phasePercent * 0.10, details)
      },
    })
    const dependencies = allDependencies.slice(0, REPOSITORY_MAX_DEPENDENCY_EDGES)
    await progress('dependencies', 'Dependency graph', 100, 73, { processed: dependencyGraph.scannedFilePaths.length, total: dependencyGraph.scannedFilePaths.length, message: `${dependencies.length.toLocaleString()} dependency edges captured.` })
    await progress('code_analysis', 'Code analysis', 0, 73, { message: 'Parsing supported source files.' })
    const codeAnalysis = await analyzeCodeStructure(clonedRepository.localPath, structure.files, {
      dependencies,
      maxSourceFiles: dependencyOptions.maxSourceFiles,
      maxFileBytes: dependencyOptions.maxFileBytes,
      signal,
      onProgress(details) {
        const phasePercent = details.total ? details.processed / details.total * 100 : 0
        return progress('code_analysis', 'Code analysis', phasePercent, 73 + phasePercent * 0.12, details)
      },
    })
    await progress('scoring', 'Debt, drift, and risk scoring', 0, 85, { message: 'Building documentation and coverage evidence.' })
    const documentationAnalysis = analyzeDocumentation(documentation, {
      files: structure.files,
      codeAnalysis,
    })
    const coverage = await extractCoverageReport(clonedRepository.localPath)
    const analysis = {
      userId,
      repositoryId,
      scanId,
      repository: clonedRepository,
      directories: structure.directories,
      files: structure.files,
      documentation,
      commits,
      dependencies,
      dependencyGraph,
      codeAnalysis,
      documentationAnalysis,
      coverage,
      fileSummary: structure.summary,
    }
    await progress('persistence', 'Persisting analysis', 0, 88, { message: 'Saving repository evidence.' })
    const persisted = persistAnalysis ? await persistAnalysis(analysis) : null
    await progress('persistence', 'Persisting analysis', 60, 93, { message: 'Saving structured code and documentation evidence.' })
    const structured = persisted?.repositoryId && typeof persistStructured === 'function'
      ? await persistStructured({
        repositoryId: persisted.repositoryId,
        scanId,
        codeAnalysis,
        documentationAnalysis,
      })
      : null
    await progress('scoring', 'Debt, drift, and risk scoring', 25, 95, { message: 'Calculating repository health and recommendations.' })
    const scoring = persisted?.repositoryId && typeof scoreAnalysis === 'function'
      ? await scoreAnalysis({
        repositoryId: persisted.repositoryId,
        analysis,
        repositoryPath: clonedRepository.localPath,
      })
      : null
    await progress('completed', 'Analysis complete', 100, 100, { message: 'Repository analysis completed.' })

    return {
      analysis,
      persisted,
      structured,
      scoring,
      summary: {
        repository: persisted?.summary.repository || {
          name: clonedRepository.repoName,
          fullName: clonedRepository.repoFullName,
          url: clonedRepository.repoUrl,
          defaultBranch: clonedRepository.defaultBranch,
        },
        totalDirectories: structure.summary.totalDirectories,
        totalFiles: structure.summary.totalFiles,
        totalDocumentation: documentation.length,
        totalCommits: commits.length,
        totalDependencies: dependencies.length,
        totalCodeFacts: codeAnalysis.files.length,
        totalCodeRoutes: codeAnalysis.routes.length,
        filesByType: structure.summary.filesByType,
      },
    }
  } finally {
    await removeRepositoryWorkspace(clonedRepository?.localPath)
  }
}

