import { SEMANTIC_DRIFT_SIMILARITY_THRESHOLD } from '../../../config/index.js'
import { extractCodeOutlines } from './codeOutlineExtractor.js'
import { cosineSimilarity, createSemanticEmbeddingClient, semanticDriftAvailability } from './semanticEmbeddingClient.js'

function normalizePath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '')
}

function moduleMatchesDocument(modulePath, documentPath) {
  const module = normalizePath(modulePath).toLowerCase()
  const document = normalizePath(documentPath).toLowerCase()
  const documentDirectory = document.includes('/') ? document.slice(0, document.lastIndexOf('/')) : '.'
  const baseName = document.split('/').at(-1).replace(/\.[^.]+$/, '')
  const moduleName = module.split('/').at(-1)
  return documentDirectory === module || document.startsWith(`${module}/`) || baseName === moduleName || (module === '.' && baseName === 'readme')
}

function documentationSections(document) {
  const chunks = String(document.content || '')
    .split(/(?=^#{1,3}\s+)/m)
    .map(value => value.replace(/\s+/g, ' ').trim())
    .filter(value => value.length >= 80)
  return (chunks.length ? chunks : [String(document.content || '').replace(/\s+/g, ' ').trim()])
    .filter(Boolean)
    .slice(0, 8)
    .map(value => value.slice(0, 1200))
}

function severityFor(similarity) {
  if (similarity < 0.3) return 'High'
  if (similarity < 0.42) return 'Medium'
  return 'Low'
}

/**
 * Compares compact code outlines to relevant documentation sections. A low
 * embedding similarity is deliberately an evidence-backed review lead, not a
 * claim that the documentation is incorrect.
 */
export async function analyzeSemanticDrift(analysis, options = {}) {
  const availability = semanticDriftAvailability({
    enabled: options.enabled ?? (options.embeddingClient ? true : undefined),
    embeddingUrl: options.embeddingClient ? 'injected' : options.embeddingUrl,
  })
  if (!availability.available) return { findings: [], metrics: { status: availability.reason, comparedPairs: 0, flagged: 0 } }

  const client = options.embeddingClient || createSemanticEmbeddingClient(options)
  const threshold = options.threshold ?? SEMANTIC_DRIFT_SIMILARITY_THRESHOLD
  const outlines = options.codeOutlines || await extractCodeOutlines(options.repositoryPath, analysis?.files, options)
  const documents = Array.isArray(analysis?.documentation) ? analysis.documentation : []
  const candidates = outlines.flatMap(outline => documents
    .filter(document => moduleMatchesDocument(outline.modulePath, document.doc_path))
    .flatMap(document => documentationSections(document).map(section => ({ outline, document, section }))))
    .slice(0, options.maxPairs || 250)

  if (candidates.length === 0) return { findings: [], metrics: { status: 'ready', comparedPairs: 0, flagged: 0 } }

  try {
    const embeddings = await client.embed(candidates.flatMap(candidate => [candidate.outline.summary, candidate.section]))
    const findings = []
    const vectors = []
    candidates.forEach((candidate, index) => {
      const codeEmbedding = embeddings[index * 2]
      const documentationEmbedding = embeddings[index * 2 + 1]
      const similarity = cosineSimilarity(codeEmbedding, documentationEmbedding)
      if (similarity === null) return
      vectors.push(
        { vector: codeEmbedding, payload: { kind: 'code_outline', path: candidate.outline.path, documentPath: candidate.document.doc_path, model: client.model } },
        { vector: documentationEmbedding, payload: { kind: 'documentation_section', path: candidate.document.doc_path, codePath: candidate.outline.path, model: client.model } },
      )
      if (similarity >= threshold) return
      const confidence = Math.round(((threshold - similarity) / threshold) * 100)
      findings.push({
        key: `semantic_mismatch:${candidate.outline.path}:${normalizePath(candidate.document.doc_path)}:${index}`,
        type: 'semantic_mismatch',
        title: `Review documentation alignment for ${candidate.outline.path}`,
        filePath: normalizePath(candidate.document.doc_path),
        modulePath: candidate.outline.modulePath,
        severity: severityFor(similarity),
        evidence: `Code and documentation summaries have ${(similarity * 100).toFixed(0)}% semantic similarity (review threshold ${(threshold * 100).toFixed(0)}%). This is a review lead, not proof of incorrect documentation.`,
        ageDays: null,
        semantic: {
          similarity: Number(similarity.toFixed(4)),
          threshold,
          confidence,
          model: client.model,
          codeSection: candidate.outline.summary,
          documentationSection: candidate.section,
        },
      })
    })
    const qdrantPersisted = await client.persistVectors(vectors)
    return {
      findings,
      metrics: { status: 'ready', comparedPairs: candidates.length, flagged: findings.length, qdrantPersisted },
    }
  } catch {
    // Semantic enrichment is optional. Preserve the successful structural scan.
    return { findings: [], metrics: { status: 'unavailable', comparedPairs: 0, flagged: 0 } }
  }
}
