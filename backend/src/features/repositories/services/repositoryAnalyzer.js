import { cloneRepository, removeRepositoryWorkspace } from './gitClient.js'
import { parseRepositoryStructure } from './fileParser.js'
import { extractDocumentation } from './documentationExtractor.js'
import { extractCommitHistory } from './commitExtractor.js'
import { generateDependencyGraph, getDependencyGraphCoverage } from './dependencyGraph.js'
import { analyzeCodeStructure } from './codeAnalyzer.js'
import { analyzeDocumentation } from './documentationAnalyzer.js'
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
}) {
  let clonedRepository

  try {
    clonedRepository = await cloneRepository(sourceUrl, cloneOptions)
    const structure = await parseRepositoryStructure(clonedRepository.localPath, {
      maxFiles: cloneOptions.maxFiles || REPOSITORY_MAX_FILES,
    })
    const documentation = await extractDocumentation(clonedRepository.localPath, structure.files, {
      maxFiles: cloneOptions.maxDocumentationFiles || REPOSITORY_MAX_DOCUMENTATION_FILES,
      maxTotalBytes: cloneOptions.maxDocumentationTotalBytes || REPOSITORY_MAX_DOCUMENTATION_TOTAL_BYTES,
    })
    const commits = await extractCommitHistory(clonedRepository.localPath, { limit: commitLimit })
    const dependencyOptions = {
      maxSourceFiles: cloneOptions.maxDependencySourceFiles || REPOSITORY_MAX_DEPENDENCY_SOURCE_FILES,
      maxFileBytes: cloneOptions.maxDependencyFileBytes || REPOSITORY_MAX_DEPENDENCY_FILE_BYTES,
    }
    const allDependencies = await generateDependencyGraph(clonedRepository.localPath, structure.files, dependencyOptions)
    const dependencies = allDependencies.slice(0, REPOSITORY_MAX_DEPENDENCY_EDGES)
    const dependencyGraph = getDependencyGraphCoverage(structure.files, dependencyOptions)
    const codeAnalysis = await analyzeCodeStructure(clonedRepository.localPath, structure.files, {
      dependencies,
      maxSourceFiles: dependencyOptions.maxSourceFiles,
      maxFileBytes: dependencyOptions.maxFileBytes,
    })
    const documentationAnalysis = analyzeDocumentation(documentation, {
      files: structure.files,
      codeAnalysis,
    })
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
      fileSummary: structure.summary,
    }
    const persisted = persistAnalysis ? await persistAnalysis(analysis) : null
    const structured = persisted?.repositoryId && typeof persistStructured === 'function'
      ? await persistStructured({
        repositoryId: persisted.repositoryId,
        scanId,
        codeAnalysis,
        documentationAnalysis,
      })
      : null
    const scoring = persisted?.repositoryId && typeof scoreAnalysis === 'function'
      ? await scoreAnalysis({
        repositoryId: persisted.repositoryId,
        analysis,
        repositoryPath: clonedRepository.localPath,
      })
      : null

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

