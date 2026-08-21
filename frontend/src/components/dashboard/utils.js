import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Circle,
  OctagonAlert,
} from 'lucide-react'

/**
 * Severity is the product's real palette. Every level ships an icon AND a text
 * label so hue never carries meaning alone — required, because Medium and High
 * sit below 3:1 as marks on the light surface by design.
 *
 * Spec: docs/design.md §3.1
 */
export const SEVERITY_META = {
  Critical: {
    key: 'critical',
    icon: OctagonAlert,
    className: 'border-[var(--sev-critical-line)] bg-[var(--sev-critical-wash)] text-[var(--sev-critical-ink)]',
    mark: 'var(--sev-critical)',
  },
  High: {
    key: 'high',
    icon: AlertTriangle,
    className: 'border-[var(--sev-high-line)] bg-[var(--sev-high-wash)] text-[var(--sev-high-ink)]',
    mark: 'var(--sev-high)',
  },
  Medium: {
    key: 'medium',
    icon: AlertCircle,
    className: 'border-[var(--sev-medium-line)] bg-[var(--sev-medium-wash)] text-[var(--sev-medium-ink)]',
    mark: 'var(--sev-medium)',
  },
  Low: {
    key: 'low',
    icon: Circle,
    className: 'border-[var(--sev-low-line)] bg-[var(--sev-low-wash)] text-[var(--sev-low-ink)]',
    mark: 'var(--sev-low)',
  },
  Nominal: {
    key: 'nominal',
    icon: CheckCircle2,
    className: 'border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] text-[var(--sev-nominal-ink)]',
    mark: 'var(--sev-nominal)',
  },
}

export function severityMeta(severity) {
  return SEVERITY_META[severity] || SEVERITY_META.Nominal
}

export function severityClass(severity) {
  return severityMeta(severity).className
}

/**
 * Explains why a module landed at its risk level, for the SeverityBadge
 * hover/focus tooltip. Prefers the backend's own evidence (`item.reasons`,
 * produced by the technical-debt/risk engines) and only falls back to a
 * generic summary of the visible metrics when none was captured.
 */
export function riskReasons(item) {
  if (Array.isArray(item?.reasons) && item.reasons.length > 0) return item.reasons

  const metrics = []
  if (item?.complexity != null) metrics.push(`complexity ${item.complexity}/100`)
  if (item?.churn != null) metrics.push(`${item.churn}% commit churn`)
  if (item?.duplication != null) metrics.push(`${item.duplication}% duplicated code`)

  if (metrics.length === 0) return []
  return [`Combined ${metrics.join(', ')} placed this module in the ${String(item.risk || '').toLowerCase()} risk band.`]
}

/** Bucket a 0-100 score into a severity level. Higher score = higher risk. */
export function severityForScore(score) {
  const value = Number(score) || 0
  if (value >= 80) return 'Critical'
  if (value >= 60) return 'High'
  if (value >= 40) return 'Medium'
  if (value >= 20) return 'Low'
  return 'Nominal'
}

/** Health runs the other way: a high health score is good. */
export function severityForHealth(score) {
  return severityForScore(100 - (Number(score) || 0))
}

export const ANALYSIS_STATUS_META = {
  queued: {
    label: 'Queued',
    badgeClass: 'border-[var(--line-2)] bg-[var(--surface-3)] text-[var(--ink-3)]',
  },
  running: {
    label: 'Running',
    badgeClass: 'border-[var(--accent-line)] bg-[var(--accent-wash)] text-[var(--accent-ink)]',
  },
  completed: {
    label: 'Completed',
    badgeClass: 'border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] text-[var(--sev-nominal-ink)]',
  },
  failed: {
    label: 'Failed',
    badgeClass: 'border-[var(--sev-critical-line)] bg-[var(--sev-critical-wash)] text-[var(--sev-critical-ink)]',
  },
}

export function analysisStatusClass(status) {
  return (ANALYSIS_STATUS_META[status] || ANALYSIS_STATUS_META.queued).badgeClass
}

/**
 * Icon chip for a metric tile. These are series slots, not severity — a KPI
 * icon identifies a measure, it does not grade it.
 */
export function accentClasses(accent) {
  const slots = {
    1: 'border-[var(--line-2)] bg-[var(--surface-3)] text-[var(--series-1)]',
    2: 'border-[var(--line-2)] bg-[var(--surface-3)] text-[var(--series-2)]',
    3: 'border-[var(--line-2)] bg-[var(--surface-3)] text-[var(--series-3)]',
    4: 'border-[var(--line-2)] bg-[var(--surface-3)] text-[var(--series-4)]',
    5: 'border-[var(--line-2)] bg-[var(--surface-3)] text-[var(--series-5)]',
    6: 'border-[var(--line-2)] bg-[var(--surface-3)] text-[var(--series-6)]',
  }

  // Legacy hue names from the demo dataset map onto series slots.
  const legacy = { cyan: 1, iris: 1, emerald: 2, rose: 3, amber: 4 }

  return slots[accent] || slots[legacy[accent]] || slots[1]
}

export function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

export function formatRelativeTime(isoTimestamp) {
  if (!isoTimestamp) return 'never'

  const timestamp = new Date(isoTimestamp).getTime()
  if (Number.isNaN(timestamp)) return 'never'

  const diffMs = Date.now() - timestamp
  if (diffMs < 0) return 'just now'

  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`

  return new Date(timestamp).toLocaleDateString()
}
