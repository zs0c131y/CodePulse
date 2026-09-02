import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileCog,
  FileText,
  FolderClosed,
  FolderOpen,
  LoaderCircle,
} from 'lucide-react'

const MAX_VISIBLE_NODES = 1000
const EMPTY_ENTRIES = []

function formatBytes(value) {
  const bytes = Number(value) || 0
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(entry) {
  if (entry.fileType === 'documentation') return FileText
  if (entry.fileType === 'config' || entry.fileType === 'manifest') return FileCog
  return FileCode2
}

function buildStaticTree(files) {
  const children = new Map()
  const add = (parentPath, entry) => {
    const entries = children.get(parentPath) || []
    if (!entries.some(item => item.path === entry.path)) entries.push(entry)
    children.set(parentPath, entries)
  }

  files.forEach(file => {
    const segments = String(file.path || '').split('/').filter(Boolean)
    let parentPath = ''
    segments.forEach((segment, index) => {
      const path = parentPath ? `${parentPath}/${segment}` : segment
      const isFile = index === segments.length - 1
      add(parentPath, isFile
        ? { ...file, path, name: segment, type: 'file' }
        : { path, name: segment, type: 'directory' })
      parentPath = path
    })
  })

  children.forEach(entries => entries.sort((left, right) => {
    if (left.type !== right.type) return left.type === 'directory' ? -1 : 1
    return left.name.localeCompare(right.name)
  }))
  return children
}

export default function RepositoryTreeExplorer({
  repositoryName = 'Repository',
  root,
  fallbackFiles = [],
  onLoadChildren,
}) {
  const fallbackTree = useMemo(() => buildStaticTree(fallbackFiles), [fallbackFiles])
  const rootEntries = useMemo(
    () => root?.entries || fallbackTree.get('') || EMPTY_ENTRIES,
    [fallbackTree, root?.entries],
  )
  const [entriesByPath, setEntriesByPath] = useState({ '': rootEntries })
  const [expandedPaths, setExpandedPaths] = useState(() => new Set())
  const [loadingPaths, setLoadingPaths] = useState(() => new Set())
  const [errorsByPath, setErrorsByPath] = useState({})

  useEffect(() => {
    setEntriesByPath({ '': rootEntries })
    setExpandedPaths(new Set())
    setLoadingPaths(new Set())
    setErrorsByPath({})
  }, [repositoryName, root?.path, rootEntries])

  const rows = useMemo(() => {
    const output = []
    const visit = (parentPath, depth) => {
      const entries = entriesByPath[parentPath] || []
      for (const entry of entries) {
        if (output.length >= MAX_VISIBLE_NODES) return
        output.push({ entry, depth })
        if (entry.type === 'directory' && expandedPaths.has(entry.path)) visit(entry.path, depth + 1)
      }
    }
    visit('', 0)
    return output
  }, [entriesByPath, expandedPaths])

  const hasMoreVisibleNodes = rows.length >= MAX_VISIBLE_NODES
  const rootWasTruncated = Boolean(root?.truncated)

  async function toggleDirectory(path) {
    if (expandedPaths.has(path)) {
      setExpandedPaths(current => {
        const next = new Set(current)
        next.delete(path)
        return next
      })
      return
    }

    if (!entriesByPath[path]) {
      const staticEntries = fallbackTree.get(path)
      if (staticEntries) {
        setEntriesByPath(current => ({ ...current, [path]: staticEntries }))
      } else if (onLoadChildren) {
        setLoadingPaths(current => new Set(current).add(path))
        setErrorsByPath(current => ({ ...current, [path]: '' }))
        try {
          const result = await onLoadChildren(path)
          setEntriesByPath(current => ({ ...current, [path]: Array.isArray(result?.entries) ? result.entries : [] }))
          setErrorsByPath(current => ({ ...current, [path]: result?.truncated ? 'This folder has more than 500 direct items. Refine the repository structure or inspect its files through search.' : '' }))
        } catch (error) {
          setErrorsByPath(current => ({ ...current, [path]: error instanceof Error ? error.message : 'Folder contents could not be loaded.' }))
        } finally {
          setLoadingPaths(current => {
            const next = new Set(current)
            next.delete(path)
            return next
          })
        }
      }
    }

    setExpandedPaths(current => new Set(current).add(path))
  }

  return (
    <section className="panel min-w-0 p-5 sm:p-6" aria-labelledby="repository-tree-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FolderOpen size={17} className="text-[var(--accent-ink)]" />
            <h3 id="repository-tree-title" className="text-sm font-semibold text-[var(--ink-1)]">Repository tree</h3>
          </div>
          <p className="mt-1 text-[0.8125rem] leading-5 text-[var(--ink-3)]">Expand folders to inspect the scanned repository structure without loading every file at once.</p>
        </div>
        <span className="font-mono text-xs text-[var(--ink-4)]">{repositoryName}</span>
      </div>

      <div className="mt-5 max-h-[34rem] overflow-auto rounded-[var(--r-md)] border border-[var(--line-1)] bg-[var(--surface-sunken)] p-2" role="tree" aria-label={`${repositoryName} file tree`}>
        <div className="flex items-center gap-2 rounded-[var(--r-sm)] px-2 py-1.5 font-mono text-xs font-semibold text-[var(--ink-1)]">
          <FolderOpen size={15} className="text-[var(--accent-ink)]" aria-hidden="true" />
          <span>{repositoryName}</span>
        </div>
        {rows.map(({ entry, depth }) => {
          const isDirectory = entry.type === 'directory'
          const expanded = expandedPaths.has(entry.path)
          const loading = loadingPaths.has(entry.path)
          const Icon = isDirectory ? (expanded ? FolderOpen : FolderClosed) : fileIcon(entry)
          const error = errorsByPath[entry.path]
          return (
            <div key={entry.path}>
              {isDirectory ? (
                <button
                  type="button"
                  role="treeitem"
                  aria-expanded={expanded}
                  onClick={() => toggleDirectory(entry.path)}
                  className="group flex w-full items-center gap-1 rounded-[var(--r-sm)] py-1.5 pr-2 text-left hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  style={{ paddingLeft: `${(depth + 1) * 16}px` }}
                >
                  {loading
                    ? <LoaderCircle size={14} className="shrink-0 animate-spin text-[var(--accent-ink)]" aria-label="Loading folder" />
                    : expanded
                      ? <ChevronDown size={14} className="shrink-0 text-[var(--ink-4)]" aria-hidden="true" />
                      : <ChevronRight size={14} className="shrink-0 text-[var(--ink-4)]" aria-hidden="true" />}
                  <Icon size={15} className="shrink-0 text-[var(--accent-ink)]" aria-hidden="true" />
                  <span className="min-w-0 truncate font-mono text-xs font-medium text-[var(--ink-2)]">{entry.name}</span>
                </button>
              ) : (
                <div
                  role="treeitem"
                  aria-level={depth + 2}
                  className="flex items-center gap-2 rounded-[var(--r-sm)] py-1.5 pr-2"
                  style={{ paddingLeft: `${(depth + 2) * 16}px` }}
                  title={entry.path}
                >
                  <Icon size={14} className="shrink-0 text-[var(--ink-4)]" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--ink-2)]">{entry.name}</span>
                  <span className="hidden shrink-0 text-[0.6875rem] text-[var(--ink-4)] sm:block">{entry.language || entry.fileType || 'file'}</span>
                  {entry.size != null && <span className="tnum shrink-0 text-[0.6875rem] text-[var(--ink-4)]">{formatBytes(entry.size)}</span>}
                </div>
              )}
              {isDirectory && expanded && error && (
                <p className="flex items-start gap-1.5 py-1 text-xs leading-5 text-[var(--sev-medium-ink)]" style={{ paddingLeft: `${(depth + 3) * 16}px` }}>
                  <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              )}
            </div>
          )
        })}
        {rows.length === 0 && <p className="px-2 py-8 text-center text-sm text-[var(--ink-3)]">No stored files are available for this repository.</p>}
      </div>
      {(rootWasTruncated || hasMoreVisibleNodes) && (
        <p className="mt-3 text-xs leading-5 text-[var(--sev-medium-ink)]">
          {rootWasTruncated ? 'The repository root has more than 500 direct items. ' : ''}
          {hasMoreVisibleNodes ? 'Only the first 1,000 expanded nodes are rendered to keep this view responsive.' : ''}
        </p>
      )}
    </section>
  )
}
