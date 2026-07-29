import { Grid3X3 } from 'lucide-react'
import { EmptyPanel, SeverityBadge } from './shared'

const heatByRisk = {
  low: 'bg-(--sev-low-wash) border-(--sev-low-line)',
  medium: 'bg-(--sev-medium-wash) border-(--sev-medium-line)',
  high: 'bg-(--sev-high-wash) border-(--sev-high-line)',
  critical: 'bg-(--sev-critical-wash) border-(--sev-critical-line)',
}

export default function RiskHeatmapPanel({ items = [], description = 'Module risk from the Technical Debt engine.' }) {
  if (items.length === 0) {
    return (
      <EmptyPanel
        title="No module risk map yet"
        description="The heatmap appears after module-level debt and risk evidence is available."
        icon={Grid3X3}
      />
    )
  }

  return (
    <section className="panel p-5 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold text-ink-1">Module risk heatmap</h2>
        <p className="mt-1 text-[0.8125rem] text-ink-3">{description}</p>
      </div>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(item => {
          const risk = String(item.risk || 'Low')
          const heatClass = heatByRisk[risk.toLowerCase()] || heatByRisk.low
          return (
            <li key={item.module}>
              <article className={`h-full rounded-(--r-md) border p-3.5 ${heatClass}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-mono text-xs font-medium text-ink-1" title={item.module}>{item.module}</p>
                  <SeverityBadge severity={risk} className="shrink-0" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <span><span className="block text-ink-4">Complexity</span><strong className="tnum mt-1 block text-ink-1">{item.complexity}</strong></span>
                  <span><span className="block text-ink-4">Churn</span><strong className="tnum mt-1 block text-ink-1">{item.churn}</strong></span>
                  <span><span className="block text-ink-4">Duplicate</span><strong className="tnum mt-1 block text-ink-1">{item.duplication}</strong></span>
                </div>
              </article>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
