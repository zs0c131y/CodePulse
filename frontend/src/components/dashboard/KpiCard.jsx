import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Sparkline } from './shared'
import { accentClasses } from './utils'

export default function KpiCard({ item }) {
  const Icon = item.icon
  const isMeta = item.deltaKind === 'meta'
  const TrendIcon = item.trendTone === 'bad' ? ArrowUpRight : ArrowDownRight
  const trendClass =
    item.trendTone === 'bad'
      ? 'text-rose-300 bg-rose-400/10 border-rose-400/20'
      : item.trendTone === 'good'
        ? 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20'
        : 'text-mist-400 bg-white/[0.05] border-white/[0.08]'

  return (
    <article className="glass-panel card-hover rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${accentClasses(item.accent)}`}>
          <Icon size={18} />
        </div>
        <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold ${trendClass}`}>
          {!isMeta && <TrendIcon size={13} />}
          {item.trend}
        </span>
      </div>
      <p className="mt-4 text-sm font-medium text-mist-500">{item.label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-3xl font-bold text-white">{item.value}</span>
          <span className="text-sm font-semibold text-mist-500">{item.unit}</span>
        </div>
        <Sparkline points={item.sparkline} tone={item.trendTone} />
      </div>
    </article>
  )
}
