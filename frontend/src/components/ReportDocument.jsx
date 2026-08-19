import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  GitBranch,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { SeverityBadge } from './dashboard/shared'

function formatDate(value) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString()
}

function formatPercent(value) {
  const number = Number(value)
  return Number.isFinite(number) ? `${number}%` : '—'
}

function sectionDescription(section, singular, plural = `${singular}s`) {
  if (section?.status !== 'included') return ''
  const total = Number(section.totalItems) || 0
  const included = Number(section.includedItems) || 0
  const noun = total === 1 ? singular : plural
  if (section.truncated) return `Showing ${included} of ${total} ${noun} captured in this snapshot.`
  return `${total} ${noun} captured in this snapshot.`
}

function ReportSection({ icon: Icon, eyebrow, title, description, children, available = true }) {
  return (
    <section className="report-section panel overflow-hidden">
      <div className="flex items-start gap-3 border-b border-[var(--line-1)] px-5 py-4 sm:px-6">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[var(--r-md)] bg-[var(--surface-2)] text-[var(--ink-3)]">
          <Icon size={16} aria-hidden="true" />
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
            This analysis source was unavailable when the immutable snapshot was generated.
          </p>
        )}
      </div>
    </section>
  )
}

export default function ReportDocument({ report }) {
  const repository = report.repository || {}
  const totals = repository.totals || {}
  const summary = report.summary || null
  const technicalDebt = report.sections?.technicalDebt || null
  const knowledgeDrift = report.sections?.knowledgeDrift || null
  const recommendations = report.sections?.recommendations || null
  const contributors = report.sections?.contributors || null
  const technicalDebtAvailable = technicalDebt?.status === 'included'
  const knowledgeDriftAvailable = knowledgeDrift?.status === 'included'
  const recommendationsAvailable = recommendations?.status === 'included'
  const contributorsAvailable = contributors?.status === 'included'
  const availability = [
    ['Repository summary', true],
    ['Health scores', Boolean(summary)],
    ['Technical debt', technicalDebtAvailable],
    ['Knowledge drift', knowledgeDriftAvailable],
    ['AI recommendations', recommendationsAvailable],
    ['Contributors', contributorsAvailable],
  ]

  return (
    <div className="space-y-5">
      <section className="report-cover panel p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="font-mono text-xs text-[var(--accent-ink)]">
              {repository.fullName || repository.name || 'Repository'}
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink-1)]">
              Repository health review
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-3)]">
              Branch {repository.defaultBranch || 'unknown'} · Snapshot generated {formatDate(report.generatedAt)}
            </p>
            {report.sourceAnalysis?.analyzedAt && (
              <p className="mt-1 text-xs text-[var(--ink-3)]">
                Source analysis completed {formatDate(report.sourceAnalysis.analyzedAt)}
              </p>
            )}
          </div>
          <span className="rounded-[var(--r-md)] border border-[var(--line-2)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs text-[var(--ink-2)]">
            CODEPULSE / SNAPSHOT V{report.version ?? 1}
          </span>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--r-md)] bg-[var(--line-1)] lg:grid-cols-4">
          {[
            [totals.files, 'Files'],
            [totals.documentation, 'Documents'],
            [totals.commits, 'Commits'],
            [totals.dependencies, 'Import edges'],
          ].map(([value, label]) => (
            <div key={label} className="bg-[var(--surface-2)] p-4">
              <p className="tnum text-2xl font-semibold text-[var(--ink-1)]">{value ?? 0}</p>
              <p className="mt-1 text-xs text-[var(--ink-3)]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <ReportSection
        icon={ShieldCheck}
        eyebrow="01 / Health"
        title="Repository health summary"
        available={Boolean(summary)}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [summary?.healthScore ?? '—', 'Health /100'],
            [summary?.technicalDebt?.score ?? '—', 'Technical debt'],
            [summary?.knowledgeDebt?.score ?? '—', 'Knowledge debt'],
            [summary?.risk?.criticalModules ?? '—', 'Critical modules'],
          ].map(([value, label]) => (
            <div key={label} className="panel-2 p-4">
              <p className="tnum text-2xl font-semibold text-[var(--ink-1)]">{value}</p>
              <p className="mt-1 text-xs text-[var(--ink-3)]">{label}</p>
            </div>
          ))}
        </div>
      </ReportSection>

      <ReportSection
        icon={GitBranch}
        eyebrow="02 / Debt"
        title="Highest-risk modules"
        available={technicalDebtAvailable}
        description={sectionDescription(technicalDebt, 'module')}
      >
        {(technicalDebt?.items || []).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] text-left text-sm">
              <thead>
                <tr className="overline text-[var(--ink-3)]">
                  <th className="pb-2">Module</th>
                  <th className="pb-2">Risk</th>
                  <th className="pb-2">Complexity</th>
                  <th className="pb-2">Churn</th>
                </tr>
              </thead>
              <tbody>
                {(technicalDebt?.items || []).map(module => (
                  <tr key={module.path} className="border-t border-[var(--line-1)]">
                    <td className="max-w-80 truncate py-3 font-mono text-xs text-[var(--ink-2)]">{module.path}</td>
                    <td className="py-3"><SeverityBadge severity={module.risk || 'Low'} /></td>
                    <td className="tnum py-3 text-[var(--ink-2)]">{module.complexity ?? '—'}</td>
                    <td className="tnum py-3 text-[var(--ink-2)]">{formatPercent(module.churnPercent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-[var(--ink-3)]">No module-level debt findings were captured in this snapshot.</p>}
      </ReportSection>

      <ReportSection
        icon={BookOpenCheck}
        eyebrow="03 / Drift"
        title="Knowledge drift findings"
        available={knowledgeDriftAvailable}
        description={sectionDescription(knowledgeDrift, 'finding')}
      >
        {(knowledgeDrift?.items || []).length > 0 ? (
          <ul className="space-y-3">
            {(knowledgeDrift?.items || []).map(finding => (
              <li key={finding.id || `${finding.filePath}-${finding.title}`} className="panel-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--ink-1)]">{finding.title}</p>
                    <p className="mt-1 font-mono text-xs text-[var(--ink-3)]">{finding.filePath}</p>
                  </div>
                  <SeverityBadge severity={finding.severity || 'Low'} />
                </div>
                {finding.evidence && <p className="mt-3 text-sm leading-6 text-[var(--ink-2)]">{finding.evidence}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-[var(--ink-3)]">No documentation drift findings were captured in this snapshot.</p>}
      </ReportSection>

      <ReportSection
        icon={Sparkles}
        eyebrow="04 / Actions"
        title="AI recommendations"
        available={recommendationsAvailable}
        description={sectionDescription(recommendations, 'recommendation')}
      >
        {(recommendations?.items || []).length > 0 ? (
          <ol className="space-y-3">
            {(recommendations?.items || []).map((recommendation, index) => (
              <li key={recommendation.id || `${recommendation.title}-${index}`} className="panel-2 p-4">
                <div className="flex gap-3">
                  <span className="tnum text-sm font-semibold text-[var(--accent-ink)]">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="font-medium text-[var(--ink-1)]">{recommendation.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-2)]">{recommendation.reason}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : <p className="text-sm text-[var(--ink-3)]">No recommendations were required when this snapshot was generated.</p>}
      </ReportSection>

      <ReportSection
        icon={Users}
        eyebrow="05 / Ownership"
        title="Contributor distribution"
        available={contributorsAvailable}
        description={sectionDescription(contributors, 'contributor')}
      >
        {(contributors?.items || []).length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {(contributors?.items || []).map(contributor => (
              <div key={contributor.email || contributor.name} className="panel-2 flex items-center gap-3 p-3.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-3)] text-xs font-semibold text-[var(--ink-2)]">
                  {contributor.name?.[0] || '?'}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--ink-1)]">{contributor.name}</span>
                <span className="tnum text-sm font-semibold text-[var(--ink-1)]">{contributor.commitCount ?? 0}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-[var(--ink-3)]">No contributor records were captured in this snapshot.</p>}
      </ReportSection>

      <section className="report-section panel p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-[var(--ink-1)]">Availability ledger</h2>
        <p className="mt-1 text-[0.8125rem] text-[var(--ink-3)]">
          This immutable snapshot never substitutes sample data for unavailable evidence.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {availability.map(([label, available]) => (
            <li key={label} className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--line-1)] px-3 py-2 text-sm text-[var(--ink-2)]">
              {available
                ? <CheckCircle2 size={15} className="text-[var(--sev-nominal-ink)]" aria-hidden="true" />
                : <AlertTriangle size={15} className="text-[var(--sev-medium-ink)]" aria-hidden="true" />}
              {label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
