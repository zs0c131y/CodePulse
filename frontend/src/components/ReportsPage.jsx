import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  FileDown,
  FilePlus2,
  FileText,
  Link2,
  Loader2,
  RefreshCw,
  ShieldOff,
} from 'lucide-react'
import { Link } from '../lib/router'
import { listRepositories } from '../api/repositories'
import {
  createRepositoryReport,
  getReport,
  listReports,
  revokeReportShare,
  shareReport,
} from '../api/reports'
import { AppTopBar } from './AppChrome'
import ReportDocument from './ReportDocument'
import { EmptyPanel } from './dashboard/shared'
import { Button } from './ui/button'
import { Select } from './ui/select'

function errorMessage(error, fallback) {
  return error instanceof Error && error.message ? error.message : fallback
}

function formatSnapshotLabel(report) {
  const repository = report.repository?.fullName || report.repository?.name || 'Repository'
  const date = new Date(report.generatedAt)
  const generated = Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString()
  return `${repository} · ${generated}`
}

function buildShareUrl(token) {
  const url = new URL('/shared-report', window.location.origin)
  url.hash = new URLSearchParams({ token }).toString()
  return url.toString()
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch {
      // Fall back for browsers that expose Clipboard API without granting it.
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('Copy is not available in this browser.')
}

const statusClasses = {
  success: 'border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] text-[var(--sev-nominal-ink)]',
  error: 'border-[var(--sev-critical-line)] bg-[var(--sev-critical-wash)] text-[var(--sev-critical-ink)]',
  info: 'border-[var(--accent-line)] bg-[var(--accent-wash)] text-[var(--accent-ink)]',
}

function StatusBanner({ status }) {
  if (!status?.message) return null
  return (
    <p
      className={`rounded-[var(--r-md)] border px-3.5 py-3 text-sm ${statusClasses[status.tone] || statusClasses.info}`}
      role={status.tone === 'error' ? 'alert' : 'status'}
    >
      {status.message}
    </p>
  )
}

export default function ReportsPage({ user, accessToken, onLogout }) {
  const [repositories, setRepositories] = useState([])
  const [reports, setReports] = useState([])
  const [selectedRepositoryId, setSelectedRepositoryId] = useState('')
  const [selectedReportId, setSelectedReportId] = useState('')
  const [report, setReport] = useState(null)
  const [repositoriesLoading, setRepositoriesLoading] = useState(true)
  const [reportsLoading, setReportsLoading] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)
  const [repositoriesError, setRepositoriesError] = useState('')
  const [reportsError, setReportsError] = useState('')
  const [reportError, setReportError] = useState('')
  const [workspaceRevision, setWorkspaceRevision] = useState(0)
  const [reportRevision, setReportRevision] = useState(0)
  const [action, setAction] = useState('')
  const [actionStatus, setActionStatus] = useState(null)
  const [printStatus, setPrintStatus] = useState(null)
  const [shareUrl, setShareUrl] = useState('')

  const selectedRepository = useMemo(
    () => repositories.find(repository => repository.id === selectedRepositoryId) || null,
    [repositories, selectedRepositoryId],
  )

  useEffect(() => {
    let cancelled = false
    setRepositoriesLoading(true)
    setReportsLoading(true)
    setRepositoriesError('')
    setReportsError('')

    Promise.allSettled([
      listRepositories(accessToken),
      listReports(accessToken),
    ]).then(([repositoryResult, reportResult]) => {
      if (cancelled) return

      if (repositoryResult.status === 'fulfilled') {
        const items = repositoryResult.value
        setRepositories(items)
        setSelectedRepositoryId(current => (
          items.some(repository => repository.id === current) ? current : items[0]?.id || ''
        ))
      } else {
        setRepositories([])
        setSelectedRepositoryId('')
        setRepositoriesError(errorMessage(repositoryResult.reason, 'Repositories could not be loaded.'))
      }

      if (reportResult.status === 'fulfilled') {
        const items = reportResult.value
        setReports(items)
        setSelectedReportId(current => (
          items.some(item => item.id === current) ? current : items[0]?.id || ''
        ))
      } else {
        setReports([])
        setSelectedReportId('')
        setReportsError(errorMessage(reportResult.reason, 'Saved reports could not be loaded.'))
      }

      setRepositoriesLoading(false)
      setReportsLoading(false)
    })

    return () => { cancelled = true }
  }, [accessToken, workspaceRevision])

  useEffect(() => {
    if (!selectedReportId) {
      setReport(null)
      setReportError('')
      setShareUrl('')
      return undefined
    }

    let cancelled = false
    setReportLoading(true)
    setReport(null)
    setReportError('')
    setShareUrl('')

    getReport(accessToken, selectedReportId)
      .then(item => {
        if (cancelled) return
        if (!item) throw new Error('The report snapshot was empty.')
        setReport(item)
      })
      .catch(loadError => {
        if (!cancelled) setReportError(errorMessage(loadError, 'The report snapshot could not be loaded.'))
      })
      .finally(() => {
        if (!cancelled) setReportLoading(false)
      })

    return () => { cancelled = true }
  }, [accessToken, reportRevision, selectedReportId])

  function selectReport(reportId) {
    setActionStatus(null)
    setPrintStatus(null)
    setSelectedReportId(reportId)
  }

  async function generateSnapshot() {
    if (!selectedRepository) return
    setAction('create')
    setActionStatus(null)
    setPrintStatus(null)

    try {
      const created = await createRepositoryReport(accessToken, selectedRepository.id)
      if (!created) throw new Error('The API did not return the generated report.')
      setReports(current => [created, ...current.filter(item => item.id !== created.id)])
      setReport(created)
      setSelectedReportId(created.id)
      setActionStatus({
        tone: 'success',
        message: `Snapshot created for ${created.repository?.fullName || created.repository?.name || 'the repository'}.`,
      })
    } catch (createError) {
      setActionStatus({
        tone: 'error',
        message: errorMessage(createError, 'The report snapshot could not be generated.'),
      })
    } finally {
      setAction('')
    }
  }

  async function enableSharing() {
    if (!report) return
    if (
      report.sharing?.enabled
      && !window.confirm('Replace the active share link? The previous link will stop working immediately.')
    ) return

    setAction('share')
    setActionStatus(null)
    try {
      const shared = await shareReport(accessToken, report.id)
      if (!shared?.report || !shared.share?.token) throw new Error('The API did not return a share token.')
      const nextShareUrl = buildShareUrl(shared.share.token)
      setReport(shared.report)
      setReports(current => current.map(item => (item.id === shared.report.id ? shared.report : item)))
      setShareUrl(nextShareUrl)
      setActionStatus({
        tone: 'success',
        message: `${report.sharing?.enabled ? 'The share link was replaced.' : 'A public share link was created.'} It expires ${new Date(shared.share.expiresAt).toLocaleString()}. Copy it before leaving this report.`,
      })
    } catch (shareError) {
      setActionStatus({ tone: 'error', message: errorMessage(shareError, 'The report could not be shared.') })
    } finally {
      setAction('')
    }
  }

  async function copyShareLink() {
    if (!shareUrl) return
    setAction('copy')
    try {
      await copyText(shareUrl)
      setActionStatus({ tone: 'success', message: 'Share link copied to the clipboard.' })
    } catch (copyError) {
      setActionStatus({
        tone: 'error',
        message: `${errorMessage(copyError, 'The link could not be copied.')} Select and copy the visible link manually.`,
      })
    } finally {
      setAction('')
    }
  }

  async function revokeSharing() {
    if (!report || !window.confirm('Revoke this public share link? Anyone using it will immediately lose access.')) return
    setAction('revoke')
    setActionStatus(null)
    try {
      const updated = await revokeReportShare(accessToken, report.id)
      if (!updated) throw new Error('The API did not return the updated report.')
      setReport(updated)
      setReports(current => current.map(item => (item.id === updated.id ? updated : item)))
      setShareUrl('')
      setActionStatus({ tone: 'success', message: 'Public access to this report was revoked.' })
    } catch (revokeError) {
      setActionStatus({ tone: 'error', message: errorMessage(revokeError, 'The share link could not be revoked.') })
    } finally {
      setAction('')
    }
  }

  function printReport() {
    setPrintStatus({ tone: 'info', message: 'Opening the browser print dialog. Choose “Save as PDF” to export this snapshot.' })
    requestAnimationFrame(() => window.print())
  }

  const actionBusy = Boolean(action)
  const repositoryOptions = repositories.map(repository => ({
    value: repository.id,
    label: repository.fullName || repository.name,
  }))
  const reportOptions = reports.map(item => ({ value: item.id, label: formatSnapshotLabel(item) }))

  return (
    <div className="density-surface report-page min-h-screen bg-[var(--surface-canvas)] text-[var(--ink-1)]">
      <div className="report-screen-only">
        <AppTopBar user={user} onLogout={onLogout} active="reports" />
      </div>
      <main className="cp-prose py-7 sm:py-10">
        <div className="report-screen-only">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-3)] hover:text-[var(--ink-1)]">
            <ArrowLeft size={15} aria-hidden="true" /> Dashboard
          </Link>

          <header className="mt-6">
            <p className="overline text-[var(--accent-ink)]">Durable repository reports</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink-1)] sm:text-3xl">
              Evidence frozen for review.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ink-3)]">
              Generate immutable snapshots, revisit earlier analyses, and control a revocable public link without changing the stored evidence.
            </p>
          </header>

          <section className="panel mt-6 overflow-hidden" aria-label="Report controls">
            <div className="grid gap-px bg-[var(--line-1)] sm:grid-cols-2">
              <div className="bg-[var(--surface-1)] p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--r-md)] bg-[var(--surface-2)] text-[var(--ink-3)]">
                    <FilePlus2 size={16} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-[var(--ink-1)]">Generate a snapshot</h2>
                    <p className="mt-1 text-xs leading-5 text-[var(--ink-3)]">Uses the latest completed analysis. Existing snapshots stay unchanged.</p>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="overline mb-1.5 block text-[var(--ink-3)]">Repository</span>
                  <Select
                    value={selectedRepositoryId}
                    onChange={setSelectedRepositoryId}
                    options={repositoryOptions}
                    placeholder={repositoriesLoading ? 'Loading repositories…' : 'Select a repository'}
                    disabled={repositoriesLoading || repositories.length === 0 || actionBusy}
                    ariaLabel="Repository to snapshot"
                  />
                </div>
                <Button
                  type="button"
                  onClick={generateSnapshot}
                  disabled={!selectedRepository || repositoriesLoading || actionBusy}
                  className="mt-3 w-full"
                >
                  {action === 'create' ? <Loader2 className="motion-safe-loop animate-spin" /> : <FilePlus2 />}
                  {action === 'create' ? 'Generating snapshot…' : 'Generate snapshot'}
                </Button>
              </div>

              <div className="bg-[var(--surface-1)] p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--r-md)] bg-[var(--surface-2)] text-[var(--ink-3)]">
                    <FileText size={16} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-[var(--ink-1)]">Review a saved snapshot</h2>
                    <p className="mt-1 text-xs leading-5 text-[var(--ink-3)]">Saved evidence remains available even after a repository is removed.</p>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="overline mb-1.5 block text-[var(--ink-3)]">Saved snapshot</span>
                  <Select
                    value={selectedReportId}
                    onChange={selectReport}
                    options={reportOptions}
                    placeholder={reportsLoading ? 'Loading snapshots…' : 'Select a saved snapshot'}
                    disabled={reportsLoading || reports.length === 0 || actionBusy}
                    ariaLabel="Saved report snapshot"
                  />
                </div>
                <Button
                  type="button"
                  onClick={printReport}
                  disabled={!report || reportLoading || actionBusy}
                  variant="outline"
                  className="mt-3 w-full"
                >
                  <FileDown /> Print / Save as PDF
                </Button>
              </div>
            </div>

            {report && (
              <div className="border-t border-[var(--line-1)] bg-[var(--surface-2)] p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-[var(--ink-1)]">Public sharing</h2>
                      <span className={`rounded-[var(--r-xs)] border px-2 py-0.5 text-xs font-medium ${report.sharing?.enabled ? 'border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] text-[var(--sev-nominal-ink)]' : 'border-[var(--line-2)] bg-[var(--surface-1)] text-[var(--ink-3)]'}`}>
                        {report.sharing?.enabled ? 'Active link' : 'Private'}
                      </span>
                    </div>
                    <p className="mt-1 max-w-lg text-xs leading-5 text-[var(--ink-3)]">
                      {report.sharing?.enabled
                        ? `The share token is only revealed when created and expires ${report.sharing.expiresAt ? new Date(report.sharing.expiresAt).toLocaleString() : 'automatically'}. Replace the link to receive a new URL.`
                        : 'Create an unlisted, automatically expiring link to this immutable snapshot. You can revoke it at any time.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={enableSharing} disabled={actionBusy}>
                      {action === 'share' ? <Loader2 className="motion-safe-loop animate-spin" /> : <Link2 />}
                      {report.sharing?.enabled ? 'Replace share link' : 'Create share link'}
                    </Button>
                    {report.sharing?.enabled && (
                      <Button type="button" variant="outline" size="sm" onClick={revokeSharing} disabled={actionBusy}>
                        {action === 'revoke' ? <Loader2 className="motion-safe-loop animate-spin" /> : <ShieldOff />}
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>

                {shareUrl && (
                  <div className="mt-4 rounded-[var(--r-md)] border border-[var(--line-2)] bg-[var(--surface-1)] p-3">
                    <p className="overline text-[var(--ink-3)]">New share link · shown once</p>
                    <p className="mt-2 break-all font-mono text-xs leading-5 text-[var(--ink-2)]" aria-label="Generated share link">{shareUrl}</p>
                    <Button type="button" variant="secondary" size="sm" onClick={copyShareLink} disabled={actionBusy} className="mt-3">
                      {action === 'copy' ? <Loader2 className="motion-safe-loop animate-spin" /> : <Copy />}
                      Copy link
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>

          <div className="mt-3 space-y-3" aria-live="polite">
            {repositoriesError && <StatusBanner status={{ tone: 'error', message: `Repositories: ${repositoriesError}` }} />}
            {reportsError && <StatusBanner status={{ tone: 'error', message: `Saved snapshots: ${reportsError}` }} />}
            <StatusBanner status={actionStatus} />
            <StatusBanner status={printStatus} />
          </div>
        </div>

        <div className="mt-6 print:mt-0">
          {reportsLoading && reports.length === 0 ? (
            <div className="panel flex items-center justify-center gap-3 p-10 text-sm text-[var(--ink-3)]" role="status">
              <Loader2 size={17} className="motion-safe-loop animate-spin" /> Loading saved snapshots…
            </div>
          ) : reportsError && reports.length === 0 ? (
            <EmptyPanel
              title="Saved snapshots could not be loaded"
              description={reportsError}
              icon={AlertTriangle}
              action={(
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setWorkspaceRevision(value => value + 1)}>
                  <RefreshCw /> Try again
                </Button>
              )}
            />
          ) : reports.length === 0 ? (
            <EmptyPanel
              title="No saved report snapshots"
              description={repositories.length > 0
                ? 'Choose a repository above and generate its first durable report snapshot.'
                : 'Run a repository scan first, then return here to generate a durable report snapshot.'}
              icon={FileText}
              action={repositories.length === 0 ? <Button asChild variant="outline" size="sm" className="mt-3"><Link to="/dashboard">Open scan console</Link></Button> : null}
            />
          ) : reportLoading ? (
            <div className="panel flex items-center justify-center gap-3 p-10 text-sm text-[var(--ink-3)]" role="status">
              <Loader2 size={17} className="motion-safe-loop animate-spin" /> Loading immutable snapshot…
            </div>
          ) : reportError ? (
            <EmptyPanel
              title="Snapshot could not be loaded"
              description={reportError}
              icon={AlertTriangle}
              action={(
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setReportRevision(value => value + 1)}>
                  <RefreshCw /> Try again
                </Button>
              )}
            />
          ) : report ? (
            <ReportDocument report={report} />
          ) : null}
        </div>
      </main>
    </div>
  )
}
