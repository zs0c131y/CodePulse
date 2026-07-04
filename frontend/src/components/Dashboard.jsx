import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Code2,
  FileWarning,
  GitBranch,
  GitPullRequest,
  LayoutDashboard,
  ListFilter,
  LockKeyhole,
  LogOut,
  Play,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select } from './ui/select'

function apiUrl(path) {
  return `${import.meta.env.VITE_API_BASE_URL || ''}${path}`
}

const repositories = [
  {
    name: 'acme/platform',
    branch: 'main',
    language: 'TypeScript',
    lastScan: '12 min ago',
    health: 86,
    risk: 'Medium',
  },
  {
    name: 'acme/billing-service',
    branch: 'release/2.8',
    language: 'Node.js',
    lastScan: '38 min ago',
    health: 72,
    risk: 'High',
  },
  {
    name: 'acme/mobile-api',
    branch: 'main',
    language: 'Python',
    lastScan: '1 hr ago',
    health: 91,
    risk: 'Low',
  },
]

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Technical Debt', icon: Code2 },
  { label: 'Knowledge Drift', icon: FileWarning },
  { label: 'Risk & AI', icon: Brain },
]

const accountNavItems = [
  { label: 'Profile', href: '/profile', icon: User },
  { label: 'Settings', href: '/settings', icon: Settings },
]

const kpis = [
  {
    label: 'Repository health',
    value: '86',
    unit: '/100',
    trend: '+4.2%',
    trendTone: 'good',
    icon: ShieldCheck,
    accent: 'emerald',
    sparkline: [78, 79, 80, 79, 81, 82, 83, 84, 83, 85, 86, 86],
  },
  {
    label: 'Critical risks',
    value: '7',
    unit: 'modules',
    trend: '-2 today',
    trendTone: 'good',
    icon: ShieldAlert,
    accent: 'rose',
    sparkline: [11, 10, 10, 9, 9, 9, 8, 8, 8, 7, 7, 7],
  },
  {
    label: 'Documentation drift',
    value: '19',
    unit: 'findings',
    trend: '+5 this week',
    trendTone: 'bad',
    icon: BookOpenCheck,
    accent: 'amber',
    sparkline: [12, 13, 13, 14, 15, 15, 16, 17, 17, 18, 19, 19],
  },
  {
    label: 'AI actions ready',
    value: '12',
    unit: 'recommendations',
    trend: '4 high impact',
    trendTone: 'neutral',
    deltaKind: 'meta',
    icon: Sparkles,
    accent: 'cyan',
  },
]

const pipeline = [
  { label: 'Repository indexed', status: 'Complete', detail: '14,286 files parsed', progress: 100 },
  { label: 'Dependency graph', status: 'Complete', detail: '812 edges mapped', progress: 100 },
  { label: 'Debt analysis', status: 'Running', detail: 'Complexity and churn scan', progress: 76 },
  { label: 'AI explanations', status: 'Queued', detail: 'Waiting on risk scoring', progress: 28 },
]

const debtModules = [
  {
    module: 'src/billing/InvoicePipeline.ts',
    owner: 'Payments',
    complexity: 91,
    churn: '84%',
    duplication: '18%',
    risk: 'Critical',
  },
  {
    module: 'src/auth/sessionStore.ts',
    owner: 'Platform',
    complexity: 73,
    churn: '61%',
    duplication: '9%',
    risk: 'High',
  },
  {
    module: 'src/docs/markdownParser.ts',
    owner: 'DX',
    complexity: 64,
    churn: '44%',
    duplication: '12%',
    risk: 'High',
  },
  {
    module: 'src/api/reportRoutes.ts',
    owner: 'Insights',
    complexity: 52,
    churn: '38%',
    duplication: '6%',
    risk: 'Medium',
  },
]

const driftFindings = [
  {
    title: 'README references removed webhook flow',
    file: 'docs/auth/README.md',
    severity: 'High',
    age: '18 days',
    evidence: 'Payment webhook handler was removed in commit b91a4f2.',
  },
  {
    title: 'Authentication guide needs an update',
    file: 'docs/api/authentication.md',
    severity: 'Medium',
    age: '9 days',
    evidence: 'Recent sign-in changes are not reflected in the onboarding guide.',
  },
  {
    title: 'Architecture diagram missing risk engine',
    file: 'docs/architecture/system.md',
    severity: 'Medium',
    age: '27 days',
    evidence: 'Risk scoring service now depends on churn and ownership signals.',
  },
]

const recommendations = [
  {
    title: 'Split InvoicePipeline into orchestration and calculation units',
    impact: 'High',
    effort: '2-3 days',
    reason:
      'The module combines retry orchestration, tax calculation, and notification side effects, which explains the high complexity and churn correlation.',
    steps: ['Extract pure invoice calculator', 'Move retry policy into queue worker', 'Add contract tests for tax boundaries'],
  },
  {
    title: 'Refresh authentication documentation',
    impact: 'Medium',
    effort: '4 hours',
    reason:
      'Authentication behavior changed recently. Update the docs so onboarding, support, and incident response stay accurate.',
    steps: ['Update sequence diagram', 'Document session lifecycle', 'Add reset link expiry notes'],
  },
  {
    title: 'Assign secondary owners to billing hotspots',
    impact: 'High',
    effort: '1 sprint',
    reason:
      'Billing files show concentrated authorship and frequent bug-fix commits, increasing operational risk during incident response.',
    steps: ['Pair-review next three billing PRs', 'Create ownership rotation', 'Capture runbook gaps as docs tasks'],
  },
]

const riskBars = [
  { label: 'Mon', value: 62 },
  { label: 'Tue', value: 58 },
  { label: 'Wed', value: 64 },
  { label: 'Thu', value: 71 },
  { label: 'Fri', value: 67 },
  { label: 'Sat', value: 54 },
  { label: 'Sun', value: 49 },
]

function accentClasses(accent) {
  const map = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  }

  return map[accent] || map.cyan
}

function severityClass(severity) {
  if (severity === 'Critical') return 'bg-rose-50 text-rose-700 border-rose-200'
  if (severity === 'High') return 'bg-orange-50 text-orange-700 border-orange-200'
  if (severity === 'Medium') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-emerald-50 text-emerald-700 border-emerald-200'
}

function initials(name, email) {
  const source = name || email || 'CodePulse'
  return source
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')
}

function Sparkline({ points, tone }) {
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
  const dotClass = tone === 'bad' ? 'fill-rose-500' : tone === 'good' ? 'fill-emerald-500' : 'fill-cyan-500'

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0 overflow-visible" aria-hidden="true">
      <path d={path} fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.5" className={dotClass} />
    </svg>
  )
}

function KpiCard({ item }) {
  const Icon = item.icon
  const isMeta = item.deltaKind === 'meta'
  const TrendIcon = item.trendTone === 'bad' ? ArrowUpRight : ArrowDownRight
  const trendClass =
    item.trendTone === 'bad'
      ? 'text-rose-700 bg-rose-50 border-rose-200'
      : item.trendTone === 'good'
        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
        : 'text-slate-600 bg-slate-50 border-slate-200'

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${accentClasses(item.accent)}`}>
          <Icon size={18} />
        </div>
        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${trendClass}`}>
          {!isMeta && <TrendIcon size={13} />}
          {item.trend}
        </span>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{item.label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-slate-950">{item.value}</span>
          <span className="text-sm font-semibold text-slate-500">{item.unit}</span>
        </div>
        <Sparkline points={item.sparkline} tone={item.trendTone} />
      </div>
    </article>
  )
}

function pipelineStatusMeta(status) {
  if (status === 'Complete') {
    return { icon: CheckCircle2, badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200', track: 'bg-emerald-100', fill: 'bg-emerald-500' }
  }
  if (status === 'Running') {
    return { icon: RefreshCw, badgeClass: 'text-cyan-700 bg-cyan-50 border-cyan-200', track: 'bg-cyan-100', fill: 'bg-cyan-500', spin: true }
  }
  return { icon: Clock3, badgeClass: 'text-slate-600 bg-slate-50 border-slate-200', track: 'bg-slate-100', fill: 'bg-slate-300' }
}

function PipelinePanel() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950">Analysis pipeline</h2>
          <p className="mt-1 text-sm text-slate-500">Current processing state for the selected repository.</p>
        </div>
        <RefreshCw size={18} className="text-slate-400" />
      </div>
      <div className="mt-5 space-y-4">
        {pipeline.map(item => {
          const meta = pipelineStatusMeta(item.status)
          const StatusIcon = meta.icon

          return (
            <div key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.detail}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold ${meta.badgeClass}`}>
                  <StatusIcon size={12} className={meta.spin ? 'animate-spin' : ''} />
                  {item.status}
                </span>
              </div>
              <div className={`h-2 rounded-full ${meta.track}`}>
                <div
                  className={`h-full rounded-full ${meta.fill}`}
                  style={{ width: `${item.progress}%` }}
                  aria-label={`${item.label} ${item.progress}% complete`}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function DebtTable() {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
        <div>
          <h2 className="text-base font-bold text-slate-950">Highest-risk modules</h2>
          <p className="mt-1 text-sm text-slate-500">Ranked by complexity, churn, duplication, and drift adjacency.</p>
        </div>
        <Button type="button" variant="outline" size="sm">
          <ListFilter size={16} />
          Filter
        </Button>
      </div>
      <div className="hidden lg:block">
        <table className="w-full table-fixed text-left">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="w-[34%] px-5 py-3">Module</th>
              <th className="w-[14%] px-5 py-3">Owner</th>
              <th className="w-[20%] px-5 py-3">Complexity</th>
              <th className="w-[10%] px-5 py-3">Churn</th>
              <th className="w-[12%] px-5 py-3">Duplication</th>
              <th className="w-[10%] px-5 py-3">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {debtModules.map(item => (
              <tr key={item.module} className="hover:bg-slate-50/80">
                <td className="min-w-0 px-5 py-4">
                  <p className="truncate font-semibold text-slate-900" title={item.module}>
                    {item.module}
                  </p>
                  <p className="text-xs text-slate-500">Last touched in recent scan window</p>
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">
                  <span className="block truncate">{item.owner}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-2 min-w-0 flex-1 rounded-full bg-cyan-100">
                      <div className="h-full rounded-full bg-cyan-500" style={{ width: `${item.complexity}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{item.complexity}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-700">{item.churn}</td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-700">{item.duplication}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${severityClass(item.risk)}`}>
                    {item.risk}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 p-4 lg:hidden">
        {debtModules.map(item => (
          <article key={item.module} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-slate-900" title={item.module}>
                  {item.module}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{item.owner}</p>
              </div>
              <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-bold ${severityClass(item.risk)}`}>
                {item.risk}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Complexity</p>
                <p className="mt-1 font-bold text-slate-950">{item.complexity}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Churn</p>
                <p className="mt-1 font-bold text-slate-950">{item.churn}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Duplication</p>
                <p className="mt-1 font-bold text-slate-950">{item.duplication}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function DriftPanel() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950">Knowledge drift queue</h2>
          <p className="mt-1 text-sm text-slate-500">Documentation conflicts that need owner review.</p>
        </div>
        <FileWarning size={18} className="text-amber-600" />
      </div>
      <div className="mt-5 space-y-3">
        {driftFindings.map(item => (
          <article key={item.title} className="rounded-lg border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{item.file}</p>
              </div>
              <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${severityClass(item.severity)}`}>
                {item.severity}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-600">{item.evidence}</p>
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Clock3 size={13} />
              Open for {item.age}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function RiskPanel() {
  const [showTable, setShowTable] = useState(false)
  const peak = Math.max(...riskBars.map(day => day.value))

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950">Risk trend</h2>
          <p className="mt-1 text-sm text-slate-500">Composite maintainability risk over the last 7 days.</p>
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
            {riskBars.map(day => (
              <tr key={day.label}>
                <td className="py-2 font-semibold text-slate-700">{day.label}</td>
                <td className="py-2 font-bold text-slate-950">{day.value}/100</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="mt-6">
          <div className="relative h-44 border-b border-slate-200">
            {[25, 50, 75].map(line => (
              <div key={line} className="absolute inset-x-0 border-t border-slate-100" style={{ bottom: `${line}%` }} />
            ))}
            <div className="relative flex h-full items-end gap-3">
              {riskBars.map(day => (
                <div key={day.label} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                  <div
                    className="pointer-events-none absolute z-10 hidden -translate-x-1/2 -translate-y-2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-md group-hover:block"
                    style={{ left: '50%', bottom: `${day.value}%` }}
                  >
                    {day.value}/100
                  </div>
                  <div
                    className={`w-full max-w-6 rounded-t-md transition-colors ${
                      day.value === peak ? 'bg-cyan-600' : 'bg-cyan-500 group-hover:bg-cyan-600'
                    }`}
                    style={{ height: `${day.value}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex gap-3">
            {riskBars.map(day => (
              <span key={day.label} className="flex-1 text-center text-xs font-semibold text-slate-500">
                {day.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function RecommendationPanel() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950">AI recommendations</h2>
          <p className="mt-1 text-sm text-slate-500">Prioritized remediation work with explainable evidence.</p>
        </div>
        <Sparkles size={18} className="text-cyan-700" />
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {recommendations.map(item => (
          <article key={item.title} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-slate-950">{item.title}</h3>
              <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-bold ${severityClass(item.impact)}`}>
                {item.impact}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.reason}</p>
            <p className="mt-3 text-xs font-bold text-slate-500">Estimated effort: {item.effort}</p>
            <ul className="mt-3 space-y-2">
              {item.steps.map(step => (
                <li key={step} className="flex gap-2 text-sm text-slate-700">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}

function OverviewContent() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map(item => (
          <KpiCard key={item.label} item={item} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <PipelinePanel />
        <RiskPanel />
      </div>
      <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <DebtTable />
        <DriftPanel />
      </div>
    </div>
  )
}

function MainContent({ activeTab }) {
  if (activeTab === 'Technical Debt') {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard
            item={{
              label: 'Avg complexity',
              value: '41',
              unit: 'score',
              trend: '+3',
              trendTone: 'bad',
              icon: Code2,
              accent: 'amber',
              sparkline: [35, 36, 36, 37, 38, 38, 39, 40, 40, 41, 41, 41],
            }}
          />
          <KpiCard
            item={{
              label: 'Duplicated code',
              value: '8.7',
              unit: '%',
              trend: '-1.1%',
              trendTone: 'good',
              icon: GitBranch,
              accent: 'cyan',
              sparkline: [11, 10.8, 10.5, 10.2, 10, 9.7, 9.5, 9.3, 9.1, 9, 8.8, 8.7],
            }}
          />
          <KpiCard
            item={{
              label: 'Circular deps',
              value: '5',
              unit: 'loops',
              trend: '2 new',
              trendTone: 'bad',
              icon: AlertTriangle,
              accent: 'rose',
              sparkline: [2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5],
            }}
          />
        </div>
        <DebtTable />
      </div>
    )
  }

  if (activeTab === 'Knowledge Drift') {
    return (
      <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <DriftPanel />
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <h2 className="text-base font-bold text-slate-950">Documentation coverage</h2>
          <p className="mt-1 text-sm text-slate-500">Coverage by repository area.</p>
          <div className="mt-6 space-y-4">
            {[
              ['API routes', 84],
              ['Domain modules', 63],
              ['Architecture docs', 71],
              ['Runbooks', 48],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-semibold text-slate-700">{label}</span>
                  <span className="font-bold text-slate-950">{value}%</span>
                </div>
                <div className="h-2 rounded-full bg-cyan-100">
                  <div className="h-full rounded-full bg-cyan-500" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  }

  if (activeTab === 'Risk & AI') {
    return (
      <div className="space-y-5">
        <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <RiskPanel />
          <PipelinePanel />
        </div>
        <RecommendationPanel />
      </div>
    )
  }

  return <OverviewContent />
}

export default function Dashboard({ user, accessToken, onLogout }) {
  const [activeTab, setActiveTab] = useState('Overview')
  const [status, setStatus] = useState('Verifying session...')
  const [selectedRepo, setSelectedRepo] = useState(repositories[0].name)
  const [repoUrl, setRepoUrl] = useState('')
  const [scanLoading, setScanLoading] = useState(false)
  const [scanMessage, setScanMessage] = useState('')
  const [scanError, setScanError] = useState('')
  const [scanSummary, setScanSummary] = useState(null)
  const repository = useMemo(
    () => repositories.find(item => item.name === selectedRepo) || repositories[0],
    [selectedRepo],
  )

  useEffect(() => {
    let cancelled = false

    async function loadProtectedUser() {
      try {
        const response = await fetch(apiUrl('/api/auth/me'), {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.message || 'Session verification failed.')
        }

        if (!cancelled) {
          setStatus('Session verified')
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : 'Session verification failed.')
        }
      }
    }

    loadProtectedUser()

    return () => {
      cancelled = true
    }
  }, [accessToken])

  async function handleStartScan() {
    const trimmedRepoUrl = repoUrl.trim()

    if (!trimmedRepoUrl || scanLoading) return

    setScanLoading(true)
    setScanMessage('')
    setScanError('')

    try {
      const response = await fetch(apiUrl('/api/repositories/analyze'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          repoUrl: trimmedRepoUrl,
          commitLimit: 100,
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Repository scan failed.')
      }

      setScanSummary(data.summary || null)
      setScanMessage(data.message || 'Repository analyzed.')
      setRepoUrl('')
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Repository scan failed.')
    } finally {
      setScanLoading(false)
    }
  }

  return (
    <div className="product-shell min-h-screen bg-[#030309] text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-[#10131a] text-white lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500 text-slate-950">
            <Activity size={18} strokeWidth={2.5} />
          </span>
          <span className="text-lg font-bold">
            Code<span className="text-cyan-300">Pulse</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Dashboard">
          {navItems.map(item => {
            const Icon = item.icon
            const selected = activeTab === item.label

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveTab(item.label)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                  selected ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                <Icon size={17} />
                {item.label}
              </button>
            )
          })}

          <div className="my-4 h-px bg-white/10" />

          {accountNavItems.map(item => {
            const Icon = item.icon

            return (
              <a
                key={item.label}
                href={item.href}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-300 transition-colors hover:bg-white/8 hover:text-white"
              >
                <Icon size={17} />
                {item.label}
              </a>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <LockKeyhole size={16} className="text-emerald-300" />
              Protected session
            </div>
            <div className="mt-3 flex min-w-0 items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-slate-400" title={user.email}>
                {user.email}
              </span>
              <span className="shrink-0 rounded-md border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-[11px] font-bold text-emerald-200">
                {status === 'Session verified' ? 'Verified' : 'Checking'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Workspace</span>
                <span>/</span>
                <span className="text-slate-950">{repository.name}</span>
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold capitalize ${severityClass(repository.risk)}`}>
                  {repository.risk} risk
                </span>
              </div>
              <h1 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">Engineering intelligence dashboard</h1>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" aria-label="Notifications">
                <Bell size={18} />
              </Button>
              <Button
                href="/settings"
                asChild
                variant="outline"
                size="icon"
                aria-label="Settings"
              >
                <a href="/settings">
                  <Settings size={18} />
                </a>
              </Button>
              <Button
                href="/profile"
                asChild
                variant="outline"
                className="hidden md:inline-flex"
              >
                <a href="/profile">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-400 text-xs font-bold text-slate-950">
                    {initials(user.name, user.email)}
                  </span>
                  Profile
                </a>
              </Button>
              <Button
                type="button"
                onClick={onLogout}
                variant="outline"
              >
                <LogOut size={16} />
                Sign out
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto min-w-0 max-w-[1600px] px-4 py-5 sm:px-6">
          <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(18rem,1fr)_minmax(22rem,1.2fr)_auto] 2xl:items-end">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Repository</span>
                <span className="relative block">
                  <Select
                    value={selectedRepo}
                    onChange={event => setSelectedRepo(event.target.value)}
                    className="appearance-none border-slate-200 bg-white pr-10 text-slate-900 focus:border-cyan-400 focus:ring-cyan-100"
                  >
                    {repositories.map(item => (
                      <option key={item.name} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Analyze a repository</span>
                <span className="relative block">
                  <GitPullRequest size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={repoUrl}
                    onChange={event => setRepoUrl(event.target.value)}
                    placeholder="https://github.com/company/repository"
                    className="border-slate-200 bg-white px-10 text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-100"
                  />
                  <Search size={17} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </span>
              </label>

              <Button
                type="button"
                size="lg"
                onClick={handleStartScan}
                disabled={!repoUrl.trim() || scanLoading}
              >
                {scanLoading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                {scanLoading ? 'Scanning...' : 'Start scan'}
              </Button>
            </div>

            {(scanMessage || scanError) && (
              <div
                className={`mt-4 flex gap-2 rounded-lg border px-4 py-3 text-sm ${
                  scanError
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
                role="status"
              >
                {scanError ? <AlertTriangle size={17} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={17} className="mt-0.5 shrink-0" />}
                <div className="min-w-0">
                  <p className="font-semibold">{scanError || scanMessage}</p>
                  {scanSummary?.repository && (
                    <p className="mt-1 truncate text-xs">
                      {scanSummary.repository.fullName || scanSummary.repository.name} on{' '}
                      {scanSummary.repository.defaultBranch || 'default branch'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {scanSummary && !scanError && (
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ['Files', scanSummary.totalFiles],
                  ['Docs', scanSummary.totalDocumentation],
                  ['Commits', scanSummary.totalCommits],
                  ['Dependencies', scanSummary.totalDependencies],
                  ['Directories', scanSummary.totalDirectories],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                    <p className="mt-1 text-lg font-bold text-slate-950">{value ?? 0}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex min-w-0 flex-wrap gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <GitBranch size={15} />
                {repository.branch}
              </span>
              <span className="inline-flex items-center gap-2">
                <Code2 size={15} />
                {repository.language}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 size={15} />
                Last scan {repository.lastScan}
              </span>
              <span className="inline-flex min-w-0 items-center gap-2">
                <Users size={15} />
                <span className="truncate">Signed in as {user.email}</span>
              </span>
            </div>
          </section>

          <div className="mb-5 flex flex-wrap gap-2 lg:hidden" role="tablist" aria-label="Dashboard sections">
            {navItems.map(item => {
              const selected = activeTab === item.label
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActiveTab(item.label)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    selected
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          <div className="mb-5 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
            <div className="flex gap-2">
              <CircleAlert size={17} className="mt-0.5 shrink-0" />
              <p>
                Repository intelligence preview. Connect analysis services to populate this workspace with live
                repository signals.
              </p>
            </div>
          </div>

          <MainContent activeTab={activeTab} />
        </main>
      </div>
    </div>
  )
}
