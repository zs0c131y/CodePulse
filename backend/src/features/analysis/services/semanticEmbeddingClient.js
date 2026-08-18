import { randomUUID } from 'node:crypto'
import {
  QDRANT_COLLECTION,
  QDRANT_URL,
  SEMANTIC_DRIFT_ALLOW_HOSTED,
  SEMANTIC_DRIFT_ENABLED,
  SEMANTIC_DRIFT_PROVIDER,
  SEMANTIC_EMBEDDING_MODEL,
  SEMANTIC_EMBEDDING_URL,
} from '../../../config/index.js'

function asEmbedding(value) {
  const candidate = Array.isArray(value) ? value : null
  return candidate && candidate.length > 0 && candidate.every(entry => Number.isFinite(entry)) ? candidate : null
}

function responseEmbeddings(payload) {
  const values = Array.isArray(payload) ? payload : payload?.embeddings || payload?.data
  if (!Array.isArray(values)) return null
  return values.map(entry => asEmbedding(entry?.embedding || entry)).filter(Boolean)
}

function configurationError() {
  if (!SEMANTIC_DRIFT_ENABLED) return 'disabled'
  if (!SEMANTIC_EMBEDDING_URL) return 'embedding_endpoint_not_configured'
  if (SEMANTIC_DRIFT_PROVIDER === 'hosted' && !SEMANTIC_DRIFT_ALLOW_HOSTED) return 'hosted_provider_not_approved'
  return null
}

export function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || left.length === 0) return null
  let dot = 0
  let leftMagnitude = 0
  let rightMagnitude = 0
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index]
    leftMagnitude += left[index] ** 2
    rightMagnitude += right[index] ** 2
  }
  if (!leftMagnitude || !rightMagnitude) return null
  return dot / Math.sqrt(leftMagnitude * rightMagnitude)
}

export function createSemanticEmbeddingClient(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch
  const embeddingUrl = options.embeddingUrl ?? SEMANTIC_EMBEDDING_URL
  const model = options.model ?? SEMANTIC_EMBEDDING_MODEL
  const qdrantUrl = options.qdrantUrl ?? QDRANT_URL
  const qdrantCollection = options.qdrantCollection ?? QDRANT_COLLECTION

  async function embed(texts) {
    if (!fetchImpl || !embeddingUrl) throw new Error('Semantic embedding endpoint is not configured.')
    const response = await fetchImpl(embeddingUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ inputs: texts, model }),
    })
    if (!response.ok) throw new Error(`Semantic embedding service returned ${response.status}.`)
    const embeddings = responseEmbeddings(await response.json())
    if (!embeddings || embeddings.length !== texts.length) throw new Error('Semantic embedding service returned an invalid embedding payload.')
    return embeddings
  }

  async function persistVectors(vectors) {
    if (!qdrantUrl || vectors.length === 0 || !fetchImpl) return false
    const vectorSize = vectors[0].vector.length
    try {
      await fetchImpl(`${qdrantUrl}/collections/${encodeURIComponent(qdrantCollection)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ vectors: { size: vectorSize, distance: 'Cosine' } }),
      })
      const response = await fetchImpl(`${qdrantUrl}/collections/${encodeURIComponent(qdrantCollection)}/points?wait=true`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ points: vectors.map(vector => ({ id: randomUUID(), vector: vector.vector, payload: vector.payload })) }),
      })
      return response.ok
    } catch {
      // Qdrant is an optional cache/index and never makes a scan fail.
      return false
    }
  }

  return { embed, persistVectors, model, qdrantEnabled: Boolean(qdrantUrl) }
}

export function semanticDriftAvailability(options = {}) {
  const enabled = options.enabled ?? SEMANTIC_DRIFT_ENABLED
  if (!enabled) return { available: false, reason: 'disabled' }
  const reason = options.embeddingUrl === undefined ? configurationError() : (!options.embeddingUrl ? 'embedding_endpoint_not_configured' : null)
  return reason ? { available: false, reason } : { available: true, reason: null }
}
