import { Delta, Sparkline } from './shared'
import { accentClasses } from './utils'

/**
 * Metric tile: label, value, unit, delta, sparkline.
 * The value uses tabular figures so a row of tiles shares a baseline and the
 * digits do not jitter when the number updates.
 */
export default function KpiCard({ item }) {
  const Icon = item.icon

  return (
    <article className="glass-panel p-5 transition-all hover:-translate-y-[2px] hover:shadow-[var(--shadow-e3)]">
      <div className="flex items-start justify-between gap-3">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-[var(--r-sm)] border ${accentClasses(item.accent)}`}>
          <Icon size={18} aria-hidden="true" />
        </div>
        <Delta
          value={item.trend}
          tone={item.trendTone}
          polarity={item.polarity}
          meta={item.deltaKind === 'meta'}
        />
      </div>

      <p className="mt-4 text-sm font-medium text-[var(--ink-3)]">{item.label}</p>

      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className="tnum text-[var(--text-title-1)] font-semibold leading-none tracking-tight text-[var(--ink-1)]">
            {item.value}
          </span>
          <span className="text-sm font-medium text-[var(--ink-3)]">{item.unit}</span>
        </div>
        <Sparkline points={item.sparkline} tone={item.trendTone} />
      </div>
    </article>
  )
}
