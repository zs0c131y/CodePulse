import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import { BarChart3 } from 'lucide-react'
import { EmptyPanel } from './shared'

export default function RiskTrendPanel({ bars = [], title = 'Risk trend', description = 'Composite maintainability risk over the last 7 days.', emptyTitle = 'No risk trend yet', emptyDescription = 'Risk trend data appears here once the Risk Intelligence engine has scored this repository.' }) {
  const [showTable, setShowTable] = useState(false)

  if (bars.length === 0) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} icon={BarChart3} />
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowTable(value => !value)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-950 hover:underline"
          >
            {showTable ? 'View as chart' : 'View as table'}
          </button>
          <BarChart3 size={18} className="text-slate-400" />
        </div>
      </div>

      {showTable ? (
        <table className="mt-6 w-full text-left text-sm">
          <thead className="text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="border-b border-slate-200 py-2">Day</th>
              <th className="border-b border-slate-200 py-2">Risk score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bars.map(day => (
              <tr key={day.label}>
                <td className="py-2 font-semibold text-slate-700">{day.label}</td>
                <td className="py-2 font-bold text-slate-950">{day.value}/100</td>
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
                  <stop offset="0%" stopColor="#0891b2" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <ChartTooltip
                formatter={value => [`${value}/100`, 'Risk score']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="value" stroke="#0891b2" strokeWidth={2.5} fill="url(#riskTrendFill)" activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
