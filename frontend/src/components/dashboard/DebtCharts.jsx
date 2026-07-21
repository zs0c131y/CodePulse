import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import { BarChart3 } from 'lucide-react'
import { EmptyPanel } from './shared'

const RISK_COLORS = {
  Critical: '#e11d48',
  High: '#ea580c',
  Medium: '#d97706',
  Low: '#059669',
}

function shortenPath(path) {
  if (!path) return 'unknown'
  const parts = String(path).split('/')
  return parts.length > 2 ? `…/${parts.slice(-2).join('/')}` : String(path)
}

export default function DebtCharts({ items = [], emptyTitle = 'No debt charts yet', emptyDescription = 'Complexity and churn charts appear here once the Technical Debt engine has scored modules in this repository.' }) {
  if (items.length === 0) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} icon={BarChart3} />
  }

  const complexityData = items.map(item => ({
    name: shortenPath(item.module),
    fullName: item.module,
    complexity: Number(item.complexity) || 0,
    risk: item.risk,
  }))

  const churnData = items.map(item => ({
    name: shortenPath(item.module),
    fullName: item.module,
    churn: Number(String(item.churn).replace('%', '')) || 0,
    duplication: Number(String(item.duplication).replace('%', '')) || 0,
  }))

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-2">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
        <h2 className="text-base font-bold text-slate-950">Complexity by module</h2>
        <p className="mt-1 text-sm text-slate-500">Highest-complexity modules, colored by risk level.</p>
        <div className="mt-6 h-56" aria-label="Complexity by module" role="img">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={complexityData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <ChartTooltip
                formatter={(value, name, entry) => [`${value}/100`, entry?.payload?.fullName || 'Complexity']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Bar dataKey="complexity" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {complexityData.map(entry => (
                  <Cell key={entry.fullName} fill={RISK_COLORS[entry.risk] || '#0891b2'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
        <h2 className="text-base font-bold text-slate-950">Churn vs duplication</h2>
        <p className="mt-1 text-sm text-slate-500">Change frequency and duplicated code per module.</p>
        <div className="mt-6 h-56" aria-label="Churn versus duplication" role="img">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={churnData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} unit="%" />
              <ChartTooltip
                formatter={(value, name) => [`${value}%`, name === 'churn' ? 'Churn' : 'Duplication']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Bar dataKey="churn" name="churn" fill="#0891b2" radius={[6, 6, 0, 0]} maxBarSize={32} />
              <Bar dataKey="duplication" name="duplication" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-cyan-600" />
            Churn
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
            Duplication
          </span>
        </div>
      </section>
    </div>
  )
}
