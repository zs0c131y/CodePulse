import { ChevronDown, Flag, Grid3X3 } from 'lucide-react'
import { EmptyPanel, SeverityBadge } from './shared'

const heatByRisk = {
  low: 'bg-(--sev-low-wash) border-(--sev-low-line)',
  medium: 'bg-(--sev-medium-wash) border-(--sev-medium-line)',
  high: 'bg-(--sev-high-wash) border-(--sev-high-line)',
  critical: 'bg-(--sev-critical-wash) border-(--sev-critical-line)',
}

const riskOrder = ['Critical', 'High', 'Medium', 'Low']

function groupByRisk(items) {
  const groups = new Map(riskOrder.map(risk => [risk, []]))
  items.forEach(item => {
    const normalized = riskOrder.find(risk => risk.toLowerCase() === String(item.risk || '').toLowerCase()) || 'Low'
    groups.get(normalized).push(item)
  })
  return riskOrder.map(risk => ({ risk, items: groups.get(risk) })).filter(group => group.items.length > 0)
}

function RiskFile({ item, risk }) {
  const heatClass = heatByRisk[risk.toLowerCase()] || heatByRisk.low
  const reasons = item.reasons?.length > 0
    ? item.reasons
    : ['The combined complexity, churn, dependency, and ownership signals placed this file in this risk level.']

  return (
    <li>
      <article className={`rounded-(--r-md) border p-4 ${heatClass}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-all font-mono text-xs font-medium text-ink-1">{item.module}</p>
            <p className="tnum mt-1 text-xs text-ink-3">Risk score {item.debtScore ?? 0}/100</p>
          </div>
          <SeverityBadge severity={risk} className="shrink-0" />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <span><span className="block text-ink-3">Complexity</span><strong className="tnum mt-1 block text-ink-1">{item.complexity}</strong></span>
          <span><span className="block text-ink-3">Churn</span><strong className="tnum mt-1 block text-ink-1">{item.churn}</strong></span>
          <span><span className="block text-ink-3">Duplicate</span><strong className="tnum mt-1 block text-ink-1">{item.duplication}</strong></span>
        </div>

        <div className="mt-4 border-t border-current/15 pt-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-1">
            <Flag size={13} aria-hidden="true" /> Why this file was flagged
          </p>
          <ul className="mt-2 space-y-1.5">
            {reasons.map(reason => (
              <li key={reason} className="flex gap-2 text-xs leading-5 text-ink-2">
                <span aria-hidden="true">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </li>
  )
}

export default function RiskHeatmapPanel({ items = [], description = 'Module risk from the Technical Debt engine.' }) {
  if (items.length === 0) {
    return (
      <EmptyPanel
        title="No file risk overview yet"
        description="File-level risk appears after CodePulse has enough analysis evidence to score this repository."
        icon={Grid3X3}
      />
    )
  }

  const groups = groupByRisk(items)

  return (
    <section className="panel p-5 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold text-ink-1">Module risk heatmap</h2>
        <p className="mt-1 max-w-3xl text-[0.8125rem] leading-5 text-ink-3">
          {description} Files with similar risk are grouped together. Expand a level to see the files and the evidence that triggered each flag.
        </p>
      </div>

      <div className="mt-5 space-y-2">
        {groups.map(group => (
          <details key={group.risk} className="group rounded-(--r-md) border border-line-1 bg-surface-2">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--accent) [&::-webkit-details-marker]:hidden">
              <SeverityBadge severity={group.risk} />
              <span className="min-w-0 flex-1 text-sm text-ink-2">
                {group.items.length} {group.items.length === 1 ? 'file' : 'files'} at this level
              </span>
              <span className="hidden text-xs text-ink-3 sm:inline">View files and triggers</span>
              <ChevronDown size={16} className="shrink-0 text-ink-4 transition-transform duration-(--d-2) group-open:rotate-180" aria-hidden="true" />
            </summary>
            <ul className="grid gap-3 border-t border-line-1 p-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.items.map(item => <RiskFile key={item.module} item={item} risk={group.risk} />)}
            </ul>
          </details>
        ))}
      </div>
    </section>
  )
}
