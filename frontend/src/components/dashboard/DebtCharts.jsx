import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import { EmptyPanel } from './shared'
import { axisTick, tooltipStyle, useChartTokens } from '../../lib/useChartTokens'

function shortenPath(path) {
  if (!path) return 'unknown'
  const parts = String(path).split('/')
  return parts.length > 2 ? `…/${parts.slice(-2).join('/')}` : String(path)
}

export default function DebtCharts({
  items = [],
  emptyTitle = 'No debt charts yet',
  emptyDescription = 'Complexity and churn charts appear here once the Technical Debt engine has scored modules in this repository.',
}) {
  const tokens = useChartTokens()

  if (items.length === 0) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} icon={BarChart3} />
  }

  // Sorted descending and laid out horizontally: module paths are long, and a
  // vertical axis gives the labels room without truncating them to nothing.
  const complexityData = [...items]
    .map(item => ({
      name: shortenPath(item.module),
      fullName: item.module,
      complexity: Number(item.complexity) || 0,
    }))
    .sort((a, b) => b.complexity - a.complexity)
    .slice(0, 10)

  const churnData = items.map(item => ({
    name: shortenPath(item.module),
    fullName: item.module,
    churn: Number(String(item.churn).replace('%', '')) || 0,
    duplication: Number(String(item.duplication).replace('%', '')) || 0,
  }))

  const worst = complexityData[0]

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-2">
      <section className="panel p-6">
        <h2 className="text-sm font-semibold text-[var(--ink-1)]">Complexity by module</h2>
        <p className="mt-1 text-[0.8125rem] text-[var(--ink-3)]">
          Ten highest-complexity modules. Risk level is in the table below.
        </p>
        {/*
          One nominal series -> every bar wears slot 1, and no legend (the
          title names the series). Colouring bars by their own risk band would
          re-encode what the bar length already shows.
        */}
        <div
          className="mt-6 h-72"
          role="img"
          aria-label={`Complexity by module. Highest: ${worst.fullName} at ${worst.complexity} out of 100.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={complexityData}
              layout="vertical"
              margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
            >
              <CartesianGrid stroke={tokens['chart-grid']} horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={axisTick(tokens)}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                tick={{ ...axisTick(tokens), fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: tokens['chart-axis'] }}
              />
              <ChartTooltip
                formatter={(value, name, entry) => [`${value}/100`, entry?.payload?.fullName || 'Complexity']}
                contentStyle={tooltipStyle(tokens)}
                labelStyle={{ color: tokens['ink-3'] }}
                cursor={{ fill: tokens['line-1'] }}
              />
              <Bar dataKey="complexity" fill={tokens['series-1']} radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="text-sm font-semibold text-[var(--ink-1)]">Churn vs duplication</h2>
        <p className="mt-1 text-[0.8125rem] text-[var(--ink-3)]">Change frequency and duplicated code per module.</p>

        <div className="mt-6 h-72" role="img" aria-label="Churn versus duplication per module, as a percentage.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={churnData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={tokens['chart-grid']} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ ...axisTick(tokens), fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: tokens['chart-axis'] }}
              />
              <YAxis domain={[0, 100]} tick={axisTick(tokens)} tickLine={false} axisLine={false} unit="%" />
              <ChartTooltip
                formatter={(value, name) => [`${value}%`, name === 'churn' ? 'Churn' : 'Duplication']}
                contentStyle={tooltipStyle(tokens)}
                labelStyle={{ color: tokens['ink-3'] }}
                cursor={{ fill: tokens['line-1'] }}
              />
              {/* Two series -> slots 1 and 2, in fixed order, with a legend. */}
              <Bar dataKey="churn" name="churn" fill={tokens['series-1']} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar
                dataKey="duplication"
                name="duplication"
                fill={tokens['series-2']}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs font-medium text-[var(--ink-3)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[var(--series-1)]" aria-hidden="true" />
            Churn
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[var(--series-2)]" aria-hidden="true" />
            Duplication
          </span>
        </div>
      </section>
    </div>
  )
}
