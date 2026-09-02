import { useMemo, useState } from 'react'
import {
  BookOpen,
  Boxes,
  FileCode2,
  GitCommitHorizontal,
  Package,
  Search,
  Users,
} from 'lucide-react'
import { Input } from '../ui/input'
import DependencyGraphPanel from './DependencyGraphPanel'
import RepositoryTreeExplorer from './RepositoryTreeExplorer'
import { EmptyPanel, PanelSkeleton } from './shared'

const views = ['Inventory', 'Dependencies', 'Activity', 'Documentation']
const EMPTY_ITEMS = []

function formatBytes(value) {
  const bytes = Number(value) || 0
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function Stat({ value, label }) {
  return (
    <div className="panel-2 px-3.5 py-3">
      <p className="tnum text-lg font-semibold text-[var(--ink-1)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--ink-3)]">{label}</p>
    </div>
  )
}

export default function RepositoryIntelligencePanel({ data, loading = false, error = '', repositoryName, onLoadTree }) {
  const [activeView, setActiveView] = useState('Inventory')
  const [query, setQuery] = useState('')
  const files = data?.files?.items || EMPTY_ITEMS
  const fileTotal = data?.files?.total || files.length
  const documentation = data?.documentation?.items || EMPTY_ITEMS
  const commits = data?.commits?.items || EMPTY_ITEMS
  const contributors = data?.contributors || EMPTY_ITEMS
  const manifests = data?.manifests || EMPTY_ITEMS
  const dependencies = data?.dependencies?.items || EMPTY_ITEMS
  const dependencyTotal = data?.dependencies?.total || dependencies.length

  const languageCounts = useMemo(() => {
    const counts = new Map()
    files.forEach(file => {
      const label = file.language || file.extension || 'Other'
      counts.set(label, (counts.get(label) || 0) + 1)
    })
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [files])

  const filteredFiles = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return files.filter(file => !needle || `${file.path} ${file.language} ${file.fileType}`.toLowerCase().includes(needle))
  }, [files, query])

  if (loading) {
    return (
      <div className="grid gap-5 xl:grid-cols-2">
        <PanelSkeleton rows={4} />
        <PanelSkeleton rows={4} />
      </div>
    )
  }

  if (error) {
    return <EmptyPanel title="Repository evidence could not be loaded" description={error} icon={Boxes} />
  }

  if (!data) {
    return <EmptyPanel title="Select an analyzed repository" description="Repository evidence appears here after a completed scan." icon={Boxes} />
  }

  function handleViewKeyDown(event, index) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? views.length - 1
        : event.key === 'ArrowRight'
          ? (index + 1) % views.length
          : (index - 1 + views.length) % views.length
    setActiveView(views[next])
    event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')[next]?.focus()
  }

  return (
    <div className="space-y-5">
      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--line-1)] px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="overline text-[var(--accent-ink)]">Repository Intelligence</p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--ink-1)]">Inspectable repository evidence</h2>
              <p className="mt-1 text-sm text-[var(--ink-3)]">Files, imports, documentation, activity, and declared packages from the latest scan.</p>
            </div>
            <span className="rounded-[var(--r-xs)] border border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] px-2 py-1 text-xs font-medium text-[var(--sev-nominal-ink)]">
              Live scan data
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-[var(--line-1)] sm:grid-cols-4">
          {[
            [fileTotal, 'Files indexed'],
            [dependencyTotal, 'Import edges'],
            [data.documentation?.total || documentation.length, 'Documents'],
            [data.commits?.total || commits.length, 'Commits'],
          ].map(([value, label]) => (
            <div key={label} className="bg-[var(--surface-1)] px-5 py-4">
              <p className="tnum text-xl font-semibold text-[var(--ink-1)]">{value}</p>
              <p className="mt-1 text-xs text-[var(--ink-3)]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <nav className="flex gap-1 overflow-x-auto border-b border-[var(--line-1)]" role="tablist" aria-label="Repository evidence views">
        {views.map((view, index) => {
          const selected = activeView === view
          return (
            <button
              key={view}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveView(view)}
              onKeyDown={event => handleViewKeyDown(event, index)}
              className={`relative shrink-0 px-3 py-3 text-sm ${selected ? 'font-medium text-[var(--ink-1)] after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-[var(--contrast)]' : 'text-[var(--ink-3)] hover:text-[var(--ink-1)]'}`}
            >
              {view}
            </button>
          )
        })}
      </nav>

      {activeView === 'Inventory' && (
        <div className="space-y-5">
          <RepositoryTreeExplorer
            repositoryName={repositoryName || 'Repository'}
            root={data.tree}
            fallbackFiles={files}
            onLoadChildren={onLoadTree}
          />
          <div className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <FileCode2 size={17} className="text-[var(--ink-4)]" />
              <h3 className="text-sm font-semibold text-[var(--ink-1)]">Language footprint</h3>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {languageCounts.map(([language, count]) => <Stat key={language} value={count} label={language} />)}
              {languageCounts.length === 0 && <p className="col-span-2 text-sm text-[var(--ink-3)]">No language metadata was detected.</p>}
            </div>
          </section>
          <section className="panel min-w-0 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--ink-1)]">File inventory</h3>
                <p className="mt-1 text-xs text-[var(--ink-3)]">Showing {Math.min(filteredFiles.length, 60)} of {fileTotal} stored files.</p>
              </div>
              <label className="relative block w-full sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-4)]" />
                <span className="sr-only">Filter files</span>
                <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter files…" className="h-9 pl-9" />
              </label>
            </div>
            <div className="mt-4 max-h-96 overflow-auto">
              <ul className="divide-y divide-[var(--line-1)]">
                {filteredFiles.slice(0, 60).map(file => (
                  <li key={file.path} className="flex items-center gap-3 py-2.5">
                    <FileCode2 size={15} className="shrink-0 text-[var(--ink-4)]" />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--ink-2)]" title={file.path}>{file.path}</span>
                    <span className="hidden text-xs text-[var(--ink-3)] sm:block">{file.language || file.fileType}</span>
                    <span className="tnum text-xs text-[var(--ink-4)]">{formatBytes(file.size)}</span>
                  </li>
                ))}
              </ul>
              {filteredFiles.length === 0 && <p className="py-10 text-center text-sm text-[var(--ink-3)]">No files match this filter.</p>}
            </div>
          </section>
          </div>
        </div>
      )}

      {activeView === 'Dependencies' && <DependencyGraphPanel edges={dependencies} total={dependencyTotal} />}

      {activeView === 'Activity' && (
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-2"><Users size={17} className="text-[var(--ink-4)]" /><h3 className="text-sm font-semibold text-[var(--ink-1)]">Contributors</h3></div>
            <ul className="mt-4 divide-y divide-[var(--line-1)]">
              {contributors.slice(0, 12).map(contributor => (
                <li key={contributor.email || contributor.name} className="flex items-center gap-3 py-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-2)] text-xs font-semibold text-[var(--ink-2)]">{contributor.name?.[0]?.toUpperCase() || '?'}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-[var(--ink-1)]">{contributor.name}</span><span className="block truncate text-xs text-[var(--ink-3)]">Last active {formatDate(contributor.lastCommitAt)}</span></span>
                  <span className="tnum text-sm font-semibold text-[var(--ink-1)]">{contributor.commitCount}</span>
                </li>
              ))}
              {contributors.length === 0 && <p className="py-8 text-center text-sm text-[var(--ink-3)]">No contributor history was stored.</p>}
            </ul>
          </section>
          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-2"><GitCommitHorizontal size={17} className="text-[var(--ink-4)]" /><h3 className="text-sm font-semibold text-[var(--ink-1)]">Recent commits</h3></div>
            <ul className="mt-4 divide-y divide-[var(--line-1)]">
              {commits.slice(0, 12).map(commit => (
                <li key={commit.hash} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium text-[var(--ink-1)]">{commit.message}</p>
                    <code className="shrink-0 text-xs text-[var(--accent-ink)]">{String(commit.hash).slice(0, 7)}</code>
                  </div>
                  <p className="mt-1 text-xs text-[var(--ink-3)]">{commit.author} · {formatDate(commit.date)} · {commit.changedFiles?.length || 0} files</p>
                </li>
              ))}
              {commits.length === 0 && <p className="py-8 text-center text-sm text-[var(--ink-3)]">No commit history was stored.</p>}
            </ul>
          </section>
        </div>
      )}

      {activeView === 'Documentation' && (
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-2"><BookOpen size={17} className="text-[var(--ink-4)]" /><h3 className="text-sm font-semibold text-[var(--ink-1)]">Documentation corpus</h3></div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {documentation.map(doc => (
                <li key={doc.path} className="panel-2 p-4">
                  <p className="truncate font-mono text-xs font-medium text-[var(--ink-1)]" title={doc.path}>{doc.path}</p>
                  <p className="mt-2 line-clamp-3 text-[0.8125rem] leading-5 text-[var(--ink-3)]">{doc.summary || 'No summary extracted.'}</p>
                  <p className="overline mt-3 text-[var(--ink-4)]">{doc.type || 'documentation'} · {formatBytes(doc.size)}</p>
                </li>
              ))}
              {documentation.length === 0 && <p className="text-sm text-[var(--ink-3)]">No documentation files were detected.</p>}
            </ul>
          </section>
          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-2"><Package size={17} className="text-[var(--ink-4)]" /><h3 className="text-sm font-semibold text-[var(--ink-1)]">Declared packages</h3></div>
            <div className="mt-4 space-y-4">
              {manifests.map(manifest => (
                <div key={manifest.path} className="panel-2 p-4">
                  <div className="flex items-center justify-between gap-3"><code className="text-xs text-[var(--ink-1)]">{manifest.path}</code><span className="overline text-[var(--ink-4)]">{manifest.type}</span></div>
                  <ul className="mt-3 space-y-2">
                    {manifest.dependencies?.slice(0, 12).map(dependency => (
                      <li key={`${dependency.kind}-${dependency.name}`} className="flex items-center justify-between gap-3 text-xs"><span className="truncate text-[var(--ink-2)]">{dependency.name}</span><code className="shrink-0 text-[var(--ink-3)]">{dependency.version || 'latest'}</code></li>
                    ))}
                  </ul>
                </div>
              ))}
              {manifests.length === 0 && <p className="text-sm leading-6 text-[var(--ink-3)]">No supported root manifest was available for this repository.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
