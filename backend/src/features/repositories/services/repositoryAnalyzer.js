import { cloneRepository, removeRepositoryWorkspace } from './gitClient.js'
import { parseRepositoryStructure } from './fileParser.js'
import { extractDocumentation } from './documentationExtractor.js'
import { extractCommitHistory } from './commitExtractor.js'
import { generateDependencyGraph } from './dependencyGraph.js'
import {
  REPOSITORY_MAX_DEPENDENCY_FILE_BYTES,
  REPOSITORY_MAX_DEPENDENCY_SOURCE_FILES,
  REPOSITORY_MAX_FILES,
} from '../../../config/index.js'

export async function analyzeRepositorySource({
  sourceUrl,
  userId,
  cloneOptions = {},
  commitLimit = 100,
  persistAnalysis,
}) {
  let clonedRepository

  try {
    clonedRepository = await cloneRepository(sourceUrl, cloneOptions)
    const structure = await parseRepositoryStructure(clonedRepository.localPath, {
      maxFiles: cloneOptions.maxFiles || REPOSITORY_MAX_FILES,
    })
    const documentation = await extractDocumentation(clonedRepository.localPath, structure.files)
    const commits = await extractCommitHistory(clonedRepository.localPath, { limit: commitLimit })
    const dependencies = await generateDependencyGraph(clonedRepository.localPath, structure.files, {
      maxSourceFiles: cloneOptions.maxDependencySourceFiles || REPOSITORY_MAX_DEPENDENCY_SOURCE_FILES,
      maxFileBytes: cloneOptions.maxDependencyFileBytes || REPOSITORY_MAX_DEPENDENCY_FILE_BYTES,
    })
    const analysis = {
      userId,
      repository: clonedRepository,
      directories: structure.directories,
      files: structure.files,
      documentation,
      commits,
      dependencies,
      fileSummary: structure.summary,
    }
    const persisted = persistAnalysis ? await persistAnalysis(analysis) : null

    return {
      analysis,
      persisted,
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
        filesByType: structure.summary.filesByType,
      },
    }
  } finally {
    await removeRepositoryWorkspace(clonedRepository?.localPath)
  }
}

