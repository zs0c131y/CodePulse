import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import { BookOpenCheck } from 'lucide-react'
import { EmptyPanel } from './shared'

export default function CoveragePanel({ items = [], title = 'Documentation coverage', description = 'Coverage by repository area.', emptyTitle = 'No coverage data yet', emptyDescription = 'Documentation coverage appears here after the Knowledge Debt engine measures documented versus undocumented areas of this repository.' }) {
  if (items.length === 0) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} icon={BookOpenCheck} />
  }

  const data = items.map(item => ({
    label: item.label,
    percent: Math.min(100, Math.max(0, Number(item.percent) || 0)),
  }))

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <h2 className="text-base font-bold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-6 h-56" aria-label={title} role="img">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} unit="%" />
            <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 12, fill: '#334155' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
            <ChartTooltip
              formatter={value => [`${value}%`, 'Coverage']}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
            />
            <Bar dataKey="percent" fill="#0891b2" radius={[0, 6, 6, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
