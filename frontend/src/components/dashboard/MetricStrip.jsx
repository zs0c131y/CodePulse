import { Delta, Sparkline } from './shared'
import { accentClasses } from './utils'

/**
 * Key metrics as one continuous strip of borderless cells separated by
 * hairlines (the gap-px technique: the track is the line colour, each cell
 * paints its own surface). Replaces boxed KPI cards — the numbers share a
 * baseline and read like an instrument readout.
 */
export default function MetricStrip({ items = [] }) {
  const columns =
    items.length === 3
      ? 'sm:grid-cols-3'
      : items.length === 2
        ? 'sm:grid-cols-2'
        : 'sm:grid-cols-2 xl:grid-cols-4'

  return (
    <section className="panel overflow-hidden" aria-label="Key metrics">
      <div className={`grid grid-cols-1 gap-px bg-[var(--line-1)] ${columns}`}>
        {items.map(item => {
          const Icon = item.icon

          return (
            <article
              key={item.label}
              className="bg-[var(--surface-1)] p-5 transition-colors duration-[var(--d-2)] hover:bg-[var(--surface-2)]"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="overline text-[var(--ink-3)]">{item.label}</p>
                <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--r-xs)] border ${accentClasses(item.accent)}`}>
                  <Icon size={12} aria-hidden="true" />
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="tnum text-[1.875rem] font-semibold leading-none tracking-[-0.03em] text-[var(--ink-1)]">
                  {item.value}
                </span>
                <span className="text-xs text-[var(--ink-4)]">{item.unit}</span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <Delta
                  value={item.trend}
                  tone={item.trendTone}
                  polarity={item.polarity}
                  meta={item.deltaKind === 'meta'}
                />
                <Sparkline points={item.sparkline} tone={item.trendTone} />
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
