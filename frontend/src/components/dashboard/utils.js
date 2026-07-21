export function accentClasses(accent) {
  const map = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  }

  return map[accent] || map.cyan
}

export function severityClass(severity) {
  if (severity === 'Critical') return 'bg-rose-50 text-rose-700 border-rose-200'
  if (severity === 'High') return 'bg-orange-50 text-orange-700 border-orange-200'
  if (severity === 'Medium') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-emerald-50 text-emerald-700 border-emerald-200'
}

export const ANALYSIS_STATUS_META = {
  queued: { label: 'Queued', badgeClass: 'bg-slate-50 text-slate-600 border-slate-200' },
  running: { label: 'Running', badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  completed: { label: 'Completed', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { label: 'Failed', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
}

export function analysisStatusClass(status) {
  return (ANALYSIS_STATUS_META[status] || ANALYSIS_STATUS_META.queued).badgeClass
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
