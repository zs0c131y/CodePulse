import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const documentationDirectories = new Set(['docs', 'doc', 'documentation', 'wiki'])
const namedDocumentationFiles = [
  /^readme(?:\.[^.]+)?$/i,
  /^changelog(?:\.[^.]+)?$/i,
  /^changes(?:\.[^.]+)?$/i,
  /^contributing(?:\.[^.]+)?$/i,
  /^license(?:\.[^.]+)?$/i,
  /^api(?:\.[^.]+)?$/i,
]
const textDocumentationExtensions = new Set(['.md', '.mdx', '.rst', '.adoc', '.txt'])
const maxContentBytes = 1024 * 1024

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function absolutePathFromRepo(repositoryPath, relativePath) {
  return join(repositoryPath, ...relativePath.split('/'))
}

export function getDocumentationType(filePath) {
  const parts = filePath.split('/')
  const fileName = parts.at(-1) || ''
  const lowerName = fileName.toLowerCase()

  if (lowerName.startsWith('readme')) return 'readme'
  if (lowerName.startsWith('changelog') || lowerName.startsWith('changes')) return 'changelog'
  if (lowerName.startsWith('contributing')) return 'contributing'
  if (lowerName.startsWith('license')) return 'license'
  if (lowerName.startsWith('api')) return 'api'
  if (parts.some(part => documentationDirectories.has(part.toLowerCase()))) return 'guide'

  return 'documentation'
}

export function isDocumentationCandidate(file) {
  const pathParts = file.path.split('/')
  const fileName = pathParts.at(-1) || ''
  const extension = extname(fileName).toLowerCase()
  const isReadableTextDocument = extension === '' || textDocumentationExtensions.has(extension)

  return (
    (file.file_type === 'documentation' && isReadableTextDocument) ||
    (isReadableTextDocument && namedDocumentationFiles.some(pattern => pattern.test(fileName))) ||
    (textDocumentationExtensions.has(extension) && pathParts.some(part => documentationDirectories.has(part.toLowerCase())))
  )
}

export function summarizeDocumentation(content) {
  const lines = String(content || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  const heading = lines.find(line => /^#{1,6}\s+\S/.test(line))

  if (heading) {
    return normalizeWhitespace(heading.replace(/^#{1,6}\s+/, '')).slice(0, 280)
  }

  return normalizeWhitespace(lines.join(' ')).slice(0, 280)
}

export async function extractDocumentation(repositoryPath, files, options = {}) {
  const docs = []
  const maxFiles = Math.max(1, Number(options.maxFiles) || 500)
  const maxTotalBytes = Math.max(maxContentBytes, Number(options.maxTotalBytes) || 16 * 1024 * 1024)
  let totalBytes = 0

  const candidates = files.filter(isDocumentationCandidate).slice(0, maxFiles)

  for (const file of candidates) {
    if (options.signal?.aborted) {
      throw options.signal.reason instanceof Error ? options.signal.reason : Object.assign(new Error('Repository analysis cancelled.'), { code: 'ABORT_ERR' })
    }
    if (totalBytes >= maxTotalBytes) break
    const absolutePath = absolutePathFromRepo(repositoryPath, file.path)
    const buffer = await readFile(absolutePath)
    const remainingBytes = maxTotalBytes - totalBytes
    const selectedBytes = Math.min(buffer.length, maxContentBytes, remainingBytes)
    const truncated = selectedBytes < buffer.length
    const content = buffer.subarray(0, selectedBytes).toString('utf8')
    totalBytes += selectedBytes

    docs.push({
      doc_path: file.path,
      file_name: file.name,
      documentation_type: getDocumentationType(file.path),
      content,
      content_summary: summarizeDocumentation(content),
      size: file.size,
      truncated,
    })
    await options.onProgress?.({
      processed: docs.length,
      total: candidates.length,
      message: `${docs.length.toLocaleString()} documentation files extracted.`,
    })
  }

  return docs.sort((left, right) => {
    const a = left.doc_path.toLowerCase()
    const b = right.doc_path.toLowerCase()
    if (a < b) return -1
    if (a > b) return 1
    return left.doc_path < right.doc_path ? -1 : Number(left.doc_path > right.doc_path)
  })
}

