export function accentClasses(accent) {
  const map = {
    emerald: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
    rose: 'bg-rose-400/10 text-rose-300 border-rose-400/20',
    amber: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
    cyan: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/20',
  }

  return map[accent] || map.cyan
}

export function severityClass(severity) {
  if (severity === 'Critical') return 'bg-rose-400/10 text-rose-300 border-rose-400/25'
  if (severity === 'High') return 'bg-orange-400/10 text-orange-300 border-orange-400/25'
  if (severity === 'Medium') return 'bg-amber-400/10 text-amber-300 border-amber-400/25'
  return 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25'
}

export const ANALYSIS_STATUS_META = {
  queued: { label: 'Queued', badgeClass: 'bg-white/[0.06] text-mist-400 border-white/10' },
  running: { label: 'Running', badgeClass: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/25' },
  completed: { label: 'Completed', badgeClass: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25' },
  failed: { label: 'Failed', badgeClass: 'bg-rose-400/10 text-rose-300 border-rose-400/25' },
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
