import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Sparkline } from './shared'
import { accentClasses } from './utils'

export default function KpiCard({ item }) {
  const Icon = item.icon
  const isMeta = item.deltaKind === 'meta'
  const TrendIcon = item.trendTone === 'bad' ? ArrowUpRight : ArrowDownRight
  const trendClass =
    item.trendTone === 'bad'
      ? 'text-rose-700 bg-rose-50 border-rose-200'
      : item.trendTone === 'good'
        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
        : 'text-slate-600 bg-slate-50 border-slate-200'

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${accentClasses(item.accent)}`}>
          <Icon size={18} />
        </div>
        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${trendClass}`}>
          {!isMeta && <TrendIcon size={13} />}
          {item.trend}
        </span>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{item.label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-slate-950">{item.value}</span>
          <span className="text-sm font-semibold text-slate-500">{item.unit}</span>
        </div>
        <Sparkline points={item.sparkline} tone={item.trendTone} />
      </div>
    </article>
  )
}
