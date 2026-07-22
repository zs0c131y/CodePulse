import { useId, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import { EmptyPanel } from './shared'
import { axisTick, tooltipStyle, useChartTokens } from '../../lib/useChartTokens'

export default function RiskTrendPanel({
  bars = [],
  title = 'Risk trend',
  description = 'Composite maintainability risk over the last 7 days.',
  emptyTitle = 'No risk trend yet',
  emptyDescription = 'Risk trend data appears here once the Risk Intelligence engine has scored this repository.',
}) {
  const [view, setView] = useState('chart')
  const tokens = useChartTokens()
  const gradientId = useId()

  if (bars.length === 0) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} icon={BarChart3} />
  }

  const values = bars.map(bar => Number(bar.value) || 0)
  const peak = bars[values.indexOf(Math.max(...values))]
  const low = bars[values.indexOf(Math.min(...values))]

  return (
    <section className="glass-panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--ink-1)]">{title}</h2>
          <p className="mt-1 text-sm text-[var(--ink-3)]">{description}</p>
        </div>

        {/* The table view is the accessibility relief channel and the
            copy-paste path into a document. Every chart gets one. */}
        <div
          className="glass-panel inline-flex rounded-[var(--r-md)] p-1 shadow-inner"
          role="group"
          aria-label="Risk trend view"
        >
          {['chart', 'table'].map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              aria-pressed={view === option}
              className={
                view === option
                  ? 'rounded-[var(--r-xs)] bg-[var(--surface-3)] px-2.5 py-1 text-xs font-semibold capitalize text-[var(--ink-1)]'
                  : 'rounded-[var(--r-xs)] px-2.5 py-1 text-xs font-semibold capitalize text-[var(--ink-3)] transition-colors duration-[var(--d-1)] hover:text-[var(--ink-1)]'
              }
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {view === 'table' ? (
        <table className="mt-6 w-full text-left text-sm">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="overline text-[var(--ink-3)]">
              <th scope="col" className="border-b border-[var(--line-1)] py-2 font-semibold">Day</th>
              <th scope="col" className="border-b border-[var(--line-1)] py-2 font-semibold">Risk score</th>
            </tr>
          </thead>
          <tbody>
            {bars.map(day => (
              <tr key={day.label} className="border-b border-[var(--line-1)] last:border-0">
                <td className="py-2 font-medium text-[var(--ink-2)]">{day.label}</td>
                <td className="tnum py-2 font-semibold text-[var(--ink-1)]">{day.value}/100</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div
          className="mt-6 h-48"
          role="img"
          aria-label={`${title}. Peak ${peak.value} on ${peak.label}, low ${low.value} on ${low.label}.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={bars} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <defs>
                {/* One of the three permitted gradients: an area fill, single
                    hue, 22% -> 0%. */}
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tokens['series-1']} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={tokens['series-1']} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={tokens['chart-grid']} vertical={false} />
              <XAxis
                dataKey="label"
                tick={axisTick(tokens)}
                tickLine={false}
                axisLine={{ stroke: tokens['chart-axis'] }}
              />
              <YAxis domain={[0, 100]} tick={axisTick(tokens)} tickLine={false} axisLine={false} />
              <ChartTooltip
                formatter={value => [`${value}/100`, 'Risk score']}
                contentStyle={tooltipStyle(tokens)}
                labelStyle={{ color: tokens['ink-3'] }}
                cursor={{ stroke: tokens['line-2'] }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={tokens['series-1']}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                activeDot={{ r: 4, fill: tokens['series-1'], stroke: tokens['surface-1'], strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
