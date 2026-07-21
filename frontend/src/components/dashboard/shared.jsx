import { CircleAlert } from 'lucide-react'

export function Tooltip({ label }) {
  return (
    <span className="pointer-events-none absolute right-0 top-full z-30 mt-2 hidden whitespace-nowrap rounded-md border border-slate-200 bg-slate-950 px-2 py-1 text-xs font-semibold text-white shadow-lg group-hover:block group-focus-within:block">
      {label}
    </span>
  )
}

export function Sparkline({ points, tone }) {
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
  const dotClass = tone === 'bad' ? 'fill-rose-500' : tone === 'good' ? 'fill-emerald-500' : 'fill-cyan-500'

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0 overflow-visible" aria-hidden="true">
      <path d={path} fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.5" className={dotClass} />
    </svg>
  )
}

export function EmptyPanel({ title, description, icon: Icon = CircleAlert, action = null }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex gap-3 text-slate-600">
        <Icon size={18} className="mt-0.5 shrink-0 text-slate-400" />
        <div>
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          {action}
        </div>
      </div>
    </section>
  )
}
