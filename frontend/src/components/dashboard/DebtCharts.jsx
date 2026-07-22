import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import { BarChart3 } from 'lucide-react'
import { EmptyPanel } from './shared'

const RISK_COLORS = {
  Critical: '#fb7185',
  High: '#fb923c',
  Medium: '#fbbf24',
  Low: '#34d399',
}

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(11, 14, 30, 0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  fontSize: 12,
  color: '#eef1fb',
  boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
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
      <section className="glass-panel card-hover rounded-2xl p-5">
        <h2 className="font-display text-base font-bold text-white">Complexity by module</h2>
        <p className="mt-1 text-sm text-mist-500">Highest-complexity modules, colored by risk level.</p>
        <div className="mt-6 h-56" aria-label="Complexity by module" role="img">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={complexityData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8b93b8' }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#8b93b8' }} tickLine={false} axisLine={false} />
              <ChartTooltip
                formatter={(value, name, entry) => [`${value}/100`, entry?.payload?.fullName || 'Complexity']}
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: '#a4adc9' }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="complexity" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {complexityData.map(entry => (
                  <Cell key={entry.fullName} fill={RISK_COLORS[entry.risk] || '#22d3ee'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="glass-panel card-hover rounded-2xl p-5">
        <h2 className="font-display text-base font-bold text-white">Churn vs duplication</h2>
        <p className="mt-1 text-sm text-mist-500">Change frequency and duplicated code per module.</p>
        <div className="mt-6 h-56" aria-label="Churn versus duplication" role="img">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={churnData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8b93b8' }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#8b93b8' }} tickLine={false} axisLine={false} unit="%" />
              <ChartTooltip
                formatter={(value, name) => [`${value}%`, name === 'churn' ? 'Churn' : 'Duplication']}
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: '#a4adc9' }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="churn" name="churn" fill="#22d3ee" radius={[6, 6, 0, 0]} maxBarSize={32} />
              <Bar dataKey="duplication" name="duplication" fill="#fbbf24" radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-mist-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-cyan-400" />
            Churn
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
            Duplication
          </span>
        </div>
      </section>
    </div>
  )
}
