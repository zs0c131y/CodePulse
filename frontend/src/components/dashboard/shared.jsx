import { ArrowDownRight, ArrowRight, ArrowUpRight, CircleAlert } from 'lucide-react'
import { severityMeta } from './utils'

export function Tooltip({ label }) {
  return (
    <span className="pointer-events-none absolute right-0 top-full z-30 mt-2 hidden whitespace-nowrap rounded-[var(--r-sm)] border border-[var(--line-2)] bg-[var(--surface-overlay)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ink-1)] shadow-[var(--shadow-e3)] group-hover:block">
      {label}
    </span>
  )
}

/**
 * Severity badge — icon + label + colour, never colour alone.
 * The only sanctioned way to render a severity: Medium and High sit below
 * 3:1 as marks on the light surface by design, and the icon is the mitigation.
 */
export function SeverityBadge({ severity, className = '' }) {
  const meta = severityMeta(severity)
  const Icon = meta.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--r-xs)] border px-2 py-0.5 text-xs font-semibold ${meta.className} ${className}`}
    >
      <Icon size={13} className="shrink-0" aria-hidden="true" />
      {severity}
    </span>
  )
}

/**
 * Direction-of-change indicator. The caller states the polarity of the
 * measure; the component picks the colour. A rising health score and a rising
 * drift count are both "up", and they are not both good.
 */
export function Delta({ value, polarity = 'higher-is-better', tone, meta = false }) {
  if (value === null || value === undefined || value === '') return null

  const raw = String(value)

  if (meta) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--r-xs)] border border-[var(--line-2)] bg-[var(--surface-3)] px-2 py-1 text-xs font-semibold text-[var(--ink-3)]">
        {raw}
      </span>
    )
  }

  const direction = raw.trim().startsWith('-') || /\bdown\b/i.test(raw) ? 'down' : 'up'
  // `tone` is an explicit override for datasets that already carry the
  // judgement; otherwise the measure's polarity decides.
  const good =
    tone === 'good' ? true
      : tone === 'bad' ? false
        : polarity === 'higher-is-better' ? direction === 'up' : direction === 'down'
  const Icon = direction === 'up' ? ArrowUpRight : ArrowDownRight
  const toneClass = good
    ? 'text-[var(--delta-up)] border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)]'
    : 'text-[var(--delta-down)] border-[var(--sev-critical-line)] bg-[var(--sev-critical-wash)]'

  return (
    <span className={`tnum inline-flex items-center gap-1 rounded-[var(--r-xs)] border px-2 py-1 text-xs font-semibold ${toneClass}`}>
      <Icon size={13} aria-hidden="true" />
      {raw}
    </span>
  )
}

export function Sparkline({ points, tone = 'neutral' }) {
  if (!points || points.length < 2) return null

  const width = 64
  const height = 22
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const stepX = width / (points.length - 1)
  const coords = points.map((point, index) => [index * stepX, height - ((point - min) / range) * height])
  const path = coords.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lastX, lastY] = coords[coords.length - 1]
  const dotFill =
    tone === 'bad' ? 'var(--delta-down)' : tone === 'good' ? 'var(--delta-up)' : 'var(--accent)'

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 overflow-visible"
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke="var(--ink-4)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill={dotFill} />
    </svg>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

/** Loading placeholder shaped like the panel it replaces, so nothing shifts. */
export function PanelSkeleton({ rows = 3 }) {
  return (
    <section className="panel p-5" aria-busy="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-2 h-3 w-64" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </section>
  )
}

export function EmptyPanel({ title, description, icon: Icon = CircleAlert, action = null }) {
  return (
    <section className="panel p-5">
      <div className="flex gap-3">
        <Icon size={18} className="mt-0.5 shrink-0 text-[var(--ink-4)]" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[var(--ink-1)]">{title}</h2>
          <p className="mt-1 max-w-[52ch] text-sm leading-6 text-[var(--ink-3)]">{description}</p>
          {action}
        </div>
      </div>
    </section>
  )
}

/**
 * Marks a panel whose backing engine has not shipped yet. Replaces the
 * page-level banner: availability is a property of a panel, not of the page.
 */
export function UnavailableChip({ label = 'Not available yet' }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[var(--r-xs)] border border-[var(--line-2)] bg-[var(--surface-3)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ink-3)]">
      <ArrowRight size={11} aria-hidden="true" />
      {label}
    </span>
  )
}
