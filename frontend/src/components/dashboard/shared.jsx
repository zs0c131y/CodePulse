import { CircleAlert } from 'lucide-react'

export function Tooltip({ label }) {
  return (
    <span className="pointer-events-none absolute right-0 top-full z-30 mt-2 hidden whitespace-nowrap rounded-lg border border-white/10 bg-night-900 px-2.5 py-1.5 text-xs font-semibold text-mist-100 shadow-xl shadow-black/40 group-hover:block group-focus-within:block">
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
  const dotClass = tone === 'bad' ? 'fill-rose-400' : tone === 'good' ? 'fill-emerald-400' : 'fill-cyan-400'

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0 overflow-visible" aria-hidden="true">
      <path d={path} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.5" className={dotClass} />
    </svg>
  )
}

export function EmptyPanel({ title, description, icon: Icon = CircleAlert, action = null }) {
  return (
    <section className="glass-panel rounded-2xl p-5">
      <div className="flex gap-3 text-mist-400">
        <Icon size={18} className="mt-0.5 shrink-0 text-mist-600" />
        <div>
          <h2 className="font-display text-base font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-mist-500">{description}</p>
          {action}
        </div>
      </div>
    </section>
  )
}
