import { useEffect, useState } from 'react'
import { AlertTriangle, FileDown, Loader2, LockKeyhole } from 'lucide-react'
import { getSharedReport } from '../api/reports'
import { Link } from '../lib/router'
import ReportDocument from './ReportDocument'
import { EmptyPanel } from './dashboard/shared'
import { Button } from './ui/button'
import { PulseMark } from './ui/pulse-mark'
import { ThemeToggle } from './ui/theme-toggle'

function messageOf(error) {
  if (error?.status === 404) return 'This shared report link is invalid, expired, or has been revoked.'
  return error instanceof Error && error.message
    ? error.message
    : 'The shared report could not be loaded.'
}

export default function SharedReportPage({ token }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(Boolean(token))
  const [error, setError] = useState(token ? '' : 'This shared report link is missing its access token.')
  const [printStatus, setPrintStatus] = useState('')

  useEffect(() => {
    if (!token) return undefined

    let cancelled = false
    setLoading(true)
    setError('')
    setReport(null)

    getSharedReport(token)
      .then(item => {
        if (cancelled) return
        if (!item) throw new Error('The shared report response was empty.')
        setReport(item)
      })
      .catch(loadError => {
        if (!cancelled) setError(messageOf(loadError))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [token])

  function printReport() {
    setPrintStatus('Opening the browser print dialog. Choose “Save as PDF” to export this snapshot.')
    requestAnimationFrame(() => window.print())
  }

  return (
    <div className="report-page min-h-screen bg-[var(--surface-canvas)] text-[var(--ink-1)]">
      <div className="report-screen-only">
        <header className="sticky top-0 z-40 border-b border-[var(--line-1)] bg-[var(--surface-1)]">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <Link to="/" className="flex items-center gap-2.5" aria-label="CodePulse home">
              <PulseMark size={24} />
              <span className="text-[0.9375rem] font-semibold tracking-[-0.02em] text-[var(--ink-1)]">CodePulse</span>
            </Link>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={printReport}
                disabled={!report || loading}
                aria-label="Print or save report as PDF"
                title="Print / Save as PDF"
              >
                <FileDown /> <span className="hidden sm:inline">Print / Save as PDF</span>
              </Button>
            </div>
          </div>
        </header>
      </div>

      <main className="cp-prose py-7 sm:py-10">
        <header className="report-screen-only mb-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-md)] bg-[var(--surface-2)] text-[var(--ink-3)]">
              <LockKeyhole size={17} aria-hidden="true" />
            </span>
            <div>
              <p className="overline text-[var(--accent-ink)]">Shared report snapshot</p>
              <h1 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[var(--ink-1)]">Immutable evidence from CodePulse</h1>
              <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--ink-3)]">
                This unlisted view is fixed to the analysis captured when its owner generated the snapshot.
              </p>
            </div>
          </div>
          {printStatus && (
            <p className="mt-4 rounded-[var(--r-md)] border border-[var(--accent-line)] bg-[var(--accent-wash)] px-3.5 py-3 text-sm text-[var(--accent-ink)]" role="status">
              {printStatus}
            </p>
          )}
        </header>

        {loading ? (
          <div className="panel flex items-center justify-center gap-3 p-10 text-sm text-[var(--ink-3)]" role="status">
            <Loader2 size={17} className="motion-safe-loop animate-spin" /> Loading shared snapshot…
          </div>
        ) : error ? (
          <EmptyPanel
            title="Shared report unavailable"
            description={error}
            icon={AlertTriangle}
            action={<Button asChild variant="outline" size="sm" className="mt-3"><Link to="/">Go to CodePulse</Link></Button>}
          />
        ) : report ? <ReportDocument report={report} /> : null}
      </main>
    </div>
  )
}
