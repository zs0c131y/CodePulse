import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  FileDown,
  FileText,
  GitBranch,
  Loader2,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { Link } from '../lib/router'
import {
  getRepositoryContributors,
  getRepositoryDebt,
  getRepositoryDrift,
  getRepositoryRecommendations,
  getRepositoryScores,
  listRepositories,
} from '../api/repositories'
import { AppTopBar } from './AppChrome'
import { Button } from './ui/button'
import { Select } from './ui/select'
import { EmptyPanel, SeverityBadge } from './dashboard/shared'

function valueOf(result, fallback = null) {
  return result.status === 'fulfilled' ? result.value : fallback
}

function ReportSection({ icon: Icon, eyebrow, title, description, children, available = true }) {
  return (
    <section className="report-section panel overflow-hidden">
      <div className="flex items-start gap-3 border-b border-[var(--line-1)] px-5 py-4 sm:px-6">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[var(--r-md)] bg-[var(--surface-2)] text-[var(--ink-3)]">
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="overline text-[var(--accent-ink)]">{eyebrow}</p>
          <h2 className="mt-1 text-base font-semibold text-[var(--ink-1)]">{title}</h2>
          {description && <p className="mt-1 text-[0.8125rem] text-[var(--ink-3)]">{description}</p>}
        </div>
        <span className={`rounded-[var(--r-xs)] border px-2 py-1 text-[0.6875rem] font-medium ${available ? 'border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] text-[var(--sev-nominal-ink)]' : 'border-[var(--line-2)] bg-[var(--surface-2)] text-[var(--ink-3)]'}`}>
          {available ? 'Included' : 'Unavailable'}
        </span>
      </div>
      <div className="p-5 sm:p-6">
        {available ? children : (
          <p className="text-sm leading-6 text-[var(--ink-3)]">
            This section will populate when its analysis engine has produced results for the selected repository.
          </p>
        )}
      </div>
    </section>
  )
}

export default function ReportsPage({ user, accessToken, onLogout }) {
  const [repositories, setRepositories] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [repositoriesLoading, setRepositoriesLoading] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)
  const [printStatus, setPrintStatus] = useState('')

  const selectedRepository = useMemo(
    () => repositories.find(repository => repository.id === selectedId) || null,
    [repositories, selectedId],
  )

  useEffect(() => {
    let cancelled = false
    setRepositoriesLoading(true)
    listRepositories(accessToken)
      .then(items => {
        if (cancelled) return
        setRepositories(items)
        setSelectedId(current => current || items[0]?.id || '')
        setError('')
      })
      .catch(loadError => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Repositories could not be loaded.')
      })
      .finally(() => {
        if (!cancelled) setRepositoriesLoading(false)
      })
    return () => { cancelled = true }
  }, [accessToken])

  useEffect(() => {
    if (!selectedId) {
      setReport(null)
      return undefined
    }

    let cancelled = false
    async function loadReport() {
      setReportLoading(true)
      setPrintStatus('')
      const [scores, debt, drift, recommendations, contributors] = await Promise.allSettled([
        getRepositoryScores(accessToken, selectedId),
        getRepositoryDebt(accessToken, selectedId),
        getRepositoryDrift(accessToken, selectedId),
        getRepositoryRecommendations(accessToken, selectedId),
        getRepositoryContributors(accessToken, selectedId),
      ])
      if (cancelled) return
      setReport({
        scores: valueOf(scores),
        debt: valueOf(debt),
        drift: valueOf(drift),
        recommendations: valueOf(recommendations, []),
        contributors: valueOf(contributors, []),
        availability: {
          scores: scores.status === 'fulfilled',
          debt: debt.status === 'fulfilled',
          drift: drift.status === 'fulfilled',
          recommendations: recommendations.status === 'fulfilled',
          contributors: contributors.status === 'fulfilled',
        },
        generatedAt: new Date().toISOString(),
      })
      setReportLoading(false)
    }
    loadReport()
    return () => { cancelled = true }
  }, [accessToken, selectedId])

  function printReport() {
    setPrintStatus('Opening the browser print dialog. Choose “Save as PDF” to export this report.')
    requestAnimationFrame(() => window.print())
  }

  const availability = report ? [
    ['Repository summary', true],
    ['Health scores', report.availability.scores],
    ['Technical debt', report.availability.debt],
    ['Knowledge drift', report.availability.drift],
    ['AI recommendations', report.availability.recommendations],
    ['Contributors', report.availability.contributors],
  ] : []

  return (
    <div className="density-surface report-page min-h-screen bg-[var(--surface-canvas)] text-[var(--ink-1)]">
      <div className="report-screen-only">
        <AppTopBar user={user} onLogout={onLogout} active="reports" />
      </div>
      <main className="cp-prose py-7 sm:py-10">
        <div className="report-screen-only mb-6">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-3)] hover:text-[var(--ink-1)]">
            <ArrowLeft size={15} /> Dashboard
          </Link>
        </div>

        <header className="report-header mb-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="overline text-[var(--accent-ink)]">Repository health report</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink-1)] sm:text-3xl">
                Evidence ready for review.
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ink-3)]">
                A print-ready view assembled from the same persisted evidence and analysis results shown in CodePulse.
              </p>
            </div>
            <Button
              type="button"
              onClick={printReport}
              disabled={!selectedRepository || reportLoading}
              className="report-screen-only shrink-0"
            >
              <FileDown size={15} />
              Print / Save as PDF
            </Button>
          </div>

          <div className="report-screen-only mt-6 panel p-4">
            <label className="block">
              <span className="overline mb-1.5 block text-[var(--ink-4)]">Repository</span>
              <Select
                value={selectedId}
                onChange={setSelectedId}
                options={repositories.map(repository => ({ value: repository.id, label: repository.fullName || repository.name }))}
                placeholder={repositoriesLoading ? 'Loading repositories…' : 'Select a repository'}
                disabled={repositoriesLoading || repositories.length === 0}
                ariaLabel="Report repository"
              />
            </label>
          </div>

          {printStatus && <p className="report-screen-only mt-3 rounded-[var(--r-md)] border border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] px-3.5 py-3 text-sm text-[var(--sev-nominal-ink)]" role="status">{printStatus}</p>}
        </header>

        {error ? (
          <EmptyPanel title="Report data could not be loaded" description={error} icon={AlertTriangle} />
        ) : repositoriesLoading ? (
          <div className="panel flex items-center justify-center gap-3 p-10 text-sm text-[var(--ink-3)]" role="status">
            <Loader2 size={17} className="motion-safe-loop animate-spin" /> Loading repositories…
          </div>
        ) : repositories.length === 0 ? (
          <EmptyPanel
            title="No repositories to report"
            description="Run a repository scan first, then return here to assemble its health report."
            icon={FileText}
            action={<Button asChild variant="outline" size="sm" className="mt-3"><Link to="/dashboard">Open scan console</Link></Button>}
          />
        ) : reportLoading || !report ? (
          <div className="panel flex items-center justify-center gap-3 p-10 text-sm text-[var(--ink-3)]" role="status">
            <Loader2 size={17} className="motion-safe-loop animate-spin" /> Assembling report…
          </div>
        ) : (
          <div className="space-y-5">
            <section className="report-cover panel p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="font-mono text-xs text-[var(--accent-ink)]">{selectedRepository.fullName || selectedRepository.name}</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink-1)]">Repository health review</h2>
                  <p className="mt-2 text-sm text-[var(--ink-3)]">Branch {selectedRepository.defaultBranch || 'unknown'} · Generated {new Date(report.generatedAt).toLocaleString()}</p>
                </div>
                <span className="rounded-[var(--r-md)] border border-[var(--line-2)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs text-[var(--ink-2)]">CODEPULSE / REPORT</span>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--r-md)] bg-[var(--line-1)] lg:grid-cols-4">
                {[
                  [selectedRepository.totalFiles, 'Files'],
                  [selectedRepository.totalDocumentation, 'Documents'],
                  [selectedRepository.totalCommits, 'Commits'],
                  [selectedRepository.totalDependencies, 'Import edges'],
                ].map(([value, label]) => (
                  <div key={label} className="bg-[var(--surface-2)] p-4">
                    <p className="tnum text-2xl font-semibold text-[var(--ink-1)]">{value ?? 0}</p>
                    <p className="mt-1 text-xs text-[var(--ink-3)]">{label}</p>
                  </div>
                ))}
              </div>
            </section>

            <ReportSection icon={ShieldCheck} eyebrow="01 / Health" title="Repository health summary" available={report.availability.scores}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  [report.scores?.healthScore ?? '—', 'Health /100'],
                  [report.scores?.technicalDebt?.score ?? '—', 'Technical debt'],
                  [report.scores?.knowledgeDebt?.score ?? '—', 'Knowledge debt'],
                  [report.scores?.risk?.criticalModules ?? '—', 'Critical modules'],
                ].map(([value, label]) => <div key={label} className="panel-2 p-4"><p className="tnum text-2xl font-semibold text-[var(--ink-1)]">{value}</p><p className="mt-1 text-xs text-[var(--ink-3)]">{label}</p></div>)}
              </div>
            </ReportSection>

            <ReportSection icon={GitBranch} eyebrow="02 / Debt" title="Highest-risk modules" available={report.availability.debt}>
              {(report.debt?.modules || []).length > 0 ? <div className="overflow-x-auto">
                <table className="w-full min-w-[38rem] text-left text-sm">
                  <thead><tr className="overline text-[var(--ink-3)]"><th className="pb-2">Module</th><th className="pb-2">Risk</th><th className="pb-2">Complexity</th><th className="pb-2">Churn</th></tr></thead>
                  <tbody>
                    {(report.debt?.modules || []).slice(0, 12).map(module => (
                      <tr key={module.path} className="border-t border-[var(--line-1)]">
                        <td className="max-w-80 truncate py-3 font-mono text-xs text-[var(--ink-2)]">{module.path}</td>
                        <td className="py-3"><SeverityBadge severity={module.risk || 'Low'} /></td>
                        <td className="tnum py-3 text-[var(--ink-2)]">{module.complexity}</td>
                        <td className="tnum py-3 text-[var(--ink-2)]">{module.churnPercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div> : <p className="text-sm text-[var(--ink-3)]">No module-level debt findings were produced for this repository.</p>}
            </ReportSection>

            <ReportSection icon={BookOpenCheck} eyebrow="03 / Drift" title="Knowledge drift findings" available={report.availability.drift}>
              {(report.drift?.findings || []).length > 0 ? <ul className="space-y-3">
                {(report.drift?.findings || []).slice(0, 12).map(finding => (
                  <li key={finding.id || finding.title} className="panel-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium text-[var(--ink-1)]">{finding.title}</p><p className="mt-1 font-mono text-xs text-[var(--ink-3)]">{finding.filePath}</p></div><SeverityBadge severity={finding.severity || 'Low'} /></div>
                    {finding.evidence && <p className="mt-3 text-sm leading-6 text-[var(--ink-2)]">{finding.evidence}</p>}
                  </li>
                ))}
              </ul> : <p className="text-sm text-[var(--ink-3)]">No documentation drift findings were produced for this repository.</p>}
            </ReportSection>

            <ReportSection icon={Sparkles} eyebrow="04 / Actions" title="AI recommendations" available={report.availability.recommendations}>
              {report.recommendations.length > 0 ? <ol className="space-y-3">
                {report.recommendations.slice(0, 10).map((recommendation, index) => (
                  <li key={recommendation.id || recommendation.title} className="panel-2 p-4">
                    <div className="flex gap-3"><span className="tnum text-sm font-semibold text-[var(--accent-ink)]">{String(index + 1).padStart(2, '0')}</span><div><p className="font-medium text-[var(--ink-1)]">{recommendation.title}</p><p className="mt-2 text-sm leading-6 text-[var(--ink-2)]">{recommendation.reason}</p></div></div>
                  </li>
                ))}
              </ol> : <p className="text-sm text-[var(--ink-3)]">No recommendations are currently required.</p>}
            </ReportSection>

            <ReportSection icon={Users} eyebrow="05 / Ownership" title="Contributor distribution" available={report.availability.contributors}>
              {report.contributors.length > 0 ? <div className="grid gap-2 sm:grid-cols-2">
                {report.contributors.slice(0, 12).map(contributor => (
                  <div key={contributor.email || contributor.name} className="panel-2 flex items-center gap-3 p-3.5">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-3)] text-xs font-semibold text-[var(--ink-2)]">{contributor.name?.[0] || '?'}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--ink-1)]">{contributor.name}</span>
                    <span className="tnum text-sm font-semibold text-[var(--ink-1)]">{contributor.commitCount}</span>
                  </div>
                ))}
              </div> : <p className="text-sm text-[var(--ink-3)]">No contributor records are available for the current scan.</p>}
            </ReportSection>

            <section className="report-section panel p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-[var(--ink-1)]">Availability ledger</h2>
              <p className="mt-1 text-[0.8125rem] text-[var(--ink-3)]">A report never substitutes sample data for an engine that has not run.</p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {availability.map(([label, available]) => (
                  <li key={label} className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--line-1)] px-3 py-2 text-sm text-[var(--ink-2)]">
                    {available ? <CheckCircle2 size={15} className="text-[var(--sev-nominal-ink)]" /> : <AlertTriangle size={15} className="text-[var(--sev-medium-ink)]" />}
                    {label}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
