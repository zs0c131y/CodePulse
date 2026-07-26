import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BookOpenCheck } from 'lucide-react'
import { EmptyPanel } from './shared'
import { axisTick, tooltipStyle, useChartTokens } from '../../lib/useChartTokens'

const COVERAGE_TARGET = 80

export default function CoveragePanel({
  items = [],
  title = 'Documentation coverage',
  description = 'Coverage by repository area, against an 80% target.',
  emptyTitle = 'No coverage data yet',
  emptyDescription = 'Documentation coverage appears here after the Knowledge Debt engine measures documented versus undocumented areas of this repository.',
}) {
  const tokens = useChartTokens()

  if (items.length === 0) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} icon={BookOpenCheck} />
  }

  const data = items.map(item => ({
    label: item.label,
    percent: Math.min(100, Math.max(0, Number(item.percent) || 0)),
  }))

  const lowest = data.reduce((min, item) => (item.percent < min.percent ? item : min), data[0])

  return (
    <section className="panel p-6">
      <h2 className="text-sm font-semibold text-[var(--ink-1)]">{title}</h2>
      <p className="mt-1 text-[0.8125rem] text-[var(--ink-3)]">{description}</p>

      {/*
        One nominal series, so every bar wears slot 1. Colouring each bar by
        its own value would spend the identity channel re-encoding what the
        bar length already shows.
      */}
      <div
        className="mt-6 h-56"
        role="img"
        aria-label={`${title}. ${data.length} areas. Lowest: ${lowest.label} at ${lowest.percent}%. Target ${COVERAGE_TARGET}%.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid stroke={tokens['chart-grid']} horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={axisTick(tokens)}
              tickLine={false}
              axisLine={false}
              unit="%"
            />
            <YAxis
              type="category"
              dataKey="label"
              width={130}
              tick={axisTick(tokens)}
              tickLine={false}
              axisLine={{ stroke: tokens['chart-axis'] }}
            />
            <ChartTooltip
              formatter={value => [`${value}%`, 'Coverage']}
              contentStyle={tooltipStyle(tokens)}
              labelStyle={{ color: tokens['ink-3'] }}
              cursor={{ fill: tokens['line-1'] }}
            />
            <ReferenceLine
              x={COVERAGE_TARGET}
              stroke={tokens['ink-4']}
              strokeDasharray="4 4"
              label={{
                value: `target ${COVERAGE_TARGET}%`,
                position: 'top',
                fill: tokens['ink-3'],
                fontSize: 11,
              }}
            />
            <Bar dataKey="percent" fill={tokens['series-1']} radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
