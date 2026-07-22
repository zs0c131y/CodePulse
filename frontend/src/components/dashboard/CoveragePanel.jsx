import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import { BookOpenCheck } from 'lucide-react'
import { EmptyPanel } from './shared'

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(11, 14, 30, 0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  fontSize: 12,
  color: '#eef1fb',
  boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
}

function coverageColor(percent) {
  if (percent >= 75) return '#34d399'
  if (percent >= 50) return '#22d3ee'
  if (percent >= 30) return '#fbbf24'
  return '#fb7185'
}

export default function CoveragePanel({ items = [], title = 'Documentation coverage', description = 'Coverage by repository area.', emptyTitle = 'No coverage data yet', emptyDescription = 'Documentation coverage appears here after the Knowledge Debt engine measures documented versus undocumented areas of this repository.' }) {
  if (items.length === 0) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} icon={BookOpenCheck} />
  }

  const data = items.map(item => ({
    label: item.label,
    percent: Math.min(100, Math.max(0, Number(item.percent) || 0)),
  }))

  return (
    <section className="glass-panel card-hover rounded-2xl p-5">
      <h2 className="font-display text-base font-bold text-white">{title}</h2>
      <p className="mt-1 text-sm text-mist-500">{description}</p>
      <div className="mt-6 h-56" aria-label={title} role="img">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: '#8b93b8' }} tickLine={false} axisLine={false} unit="%" />
            <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 12, fill: '#a4adc9' }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
            <ChartTooltip
              formatter={value => [`${value}%`, 'Coverage']}
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: '#a4adc9' }}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar dataKey="percent" radius={[0, 6, 6, 0]} maxBarSize={22}>
              {data.map(entry => (
                <Cell key={entry.label} fill={coverageColor(entry.percent)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
