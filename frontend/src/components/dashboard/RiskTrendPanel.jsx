import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import { BarChart3 } from 'lucide-react'
import { EmptyPanel } from './shared'

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(11, 14, 30, 0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  fontSize: 12,
  color: '#eef1fb',
  boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
}

export default function RiskTrendPanel({ bars = [], title = 'Risk trend', description = 'Composite maintainability risk over the last 7 days.', emptyTitle = 'No risk trend yet', emptyDescription = 'Risk trend data appears here once the Risk Intelligence engine has scored this repository.' }) {
  const [showTable, setShowTable] = useState(false)

  if (bars.length === 0) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} icon={BarChart3} />
  }

  return (
    <section className="glass-panel card-hover rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm text-mist-500">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowTable(value => !value)}
            className="text-xs font-semibold text-mist-500 transition-colors hover:text-white hover:underline"
          >
            {showTable ? 'View as chart' : 'View as table'}
          </button>
          <BarChart3 size={18} className="text-mist-600" />
        </div>
      </div>

      {showTable ? (
        <table className="mt-6 w-full text-left text-sm">
          <thead className="text-xs font-semibold uppercase text-mist-500">
            <tr>
              <th className="border-b border-white/[0.08] py-2">Day</th>
              <th className="border-b border-white/[0.08] py-2">Risk score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {bars.map(day => (
              <tr key={day.label}>
                <td className="py-2 font-semibold text-mist-300">{day.label}</td>
                <td className="py-2 font-bold text-white">{day.value}/100</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="mt-6 h-48" aria-label={title} role="img">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={bars} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="riskTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
                  <stop offset="60%" stopColor="#8b5cf6" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#8b93b8' }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#8b93b8' }} tickLine={false} axisLine={false} />
              <ChartTooltip
                formatter={value => [`${value}/100`, 'Risk score']}
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: '#a4adc9' }}
                cursor={{ stroke: 'rgba(255,255,255,0.15)' }}
              />
              <Area type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2.5} fill="url(#riskTrendFill)" activeDot={{ r: 4, fill: '#67e8f9', stroke: '#0b0e1e' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
