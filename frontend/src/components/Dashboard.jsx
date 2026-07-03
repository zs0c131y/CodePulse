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
  },
  {
    label: 'Critical risks',
    value: '7',
    unit: 'modules',
    trend: '-2 today',
    trendTone: 'good',
    icon: ShieldAlert,
    accent: 'rose',
  },
  {
    label: 'Documentation drift',
    value: '19',
    unit: 'findings',
    trend: '+5 this week',
    trendTone: 'bad',
    icon: BookOpenCheck,
    accent: 'amber',
  },
  {
    label: 'AI actions ready',
    value: '12',
    unit: 'recommendations',
    trend: '4 high impact',
    trendTone: 'neutral',
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

function KpiCard({ item }) {
  const Icon = item.icon
  const TrendIcon = item.trendTone === 'bad' ? ArrowUpRight : ArrowDownRight
  const trendClass =
    item.trendTone === 'bad'
      ? 'text-rose-700 bg-rose-50 border-rose-200'
      : item.trendTone === 'good'
        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
        : 'text-slate-600 bg-slate-50 border-slate-200'

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${accentClasses(item.accent)}`}>
          <Icon size={18} />
        </div>
        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${trendClass}`}>
          <TrendIcon size={13} />
          {item.trend}
        </span>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{item.label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-950">{item.value}</span>
        <span className="text-sm font-semibold text-slate-500">{item.unit}</span>
      </div>
    </article>
  )
}

function PipelinePanel() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950">Analysis pipeline</h2>
          <p className="mt-1 text-sm text-slate-500">Current processing state for the selected repository.</p>
        </div>
        <RefreshCw size={18} className="text-slate-400" />
      </div>
      <div className="mt-5 space-y-4">
        {pipeline.map(item => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-500">{item.detail}</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">{item.status}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-950"
                style={{ width: `${item.progress}%` }}
                aria-label={`${item.label} ${item.progress}% complete`}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function DebtTable() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
        <div>
          <h2 className="text-base font-bold text-slate-950">Highest-risk modules</h2>
          <p className="mt-1 text-sm text-slate-500">Ranked by complexity, churn, duplication, and drift adjacency.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <ListFilter size={16} />
          Filter
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-180 text-left">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Module</th>
              <th className="px-5 py-3">Owner</th>
              <th className="px-5 py-3">Complexity</th>
              <th className="px-5 py-3">Churn</th>
              <th className="px-5 py-3">Duplication</th>
              <th className="px-5 py-3">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {debtModules.map(item => (
              <tr key={item.module} className="hover:bg-slate-50/80">
                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-900">{item.module}</p>
                  <p className="text-xs text-slate-500">Last touched in recent scan window</p>
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">{item.owner}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-slate-950" style={{ width: `${item.complexity}%` }} />
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
    </section>
  )
}

function DriftPanel() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950">Risk trend</h2>
          <p className="mt-1 text-sm text-slate-500">Composite maintainability risk over the last 7 days.</p>
        </div>
        <BarChart3 size={18} className="text-slate-500" />
      </div>
      <div className="mt-6 flex h-44 items-end gap-3">
        {riskBars.map(day => (
          <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-36 w-full items-end rounded-md bg-slate-100 p-1">
              <div
                className="w-full rounded-sm bg-linear-to-t from-slate-950 to-cyan-500"
                style={{ height: `${day.value}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-500">{day.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function RecommendationPanel() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
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
          <KpiCard item={{ label: 'Avg complexity', value: '41', unit: 'score', trend: '+3', trendTone: 'bad', icon: Code2, accent: 'amber' }} />
          <KpiCard item={{ label: 'Duplicated code', value: '8.7', unit: '%', trend: '-1.1%', trendTone: 'good', icon: GitBranch, accent: 'cyan' }} />
          <KpiCard item={{ label: 'Circular deps', value: '5', unit: 'loops', trend: '2 new', trendTone: 'bad', icon: AlertTriangle, accent: 'rose' }} />
        </div>
        <DebtTable />
      </div>
    )
  }

  if (activeTab === 'Knowledge Drift') {
    return (
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <DriftPanel />
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-cyan-600" style={{ width: `${value}%` }} />
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
        <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
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
          setStatus(`Session verified for ${data.user.email}`)
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
            <p className="mt-2 text-xs leading-5 text-slate-400">{status}</p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Workspace</span>
                <span>/</span>
                <span className="text-slate-950">{repository.name}</span>
                <span className={`rounded-md border px-2 py-0.5 ${severityClass(repository.risk)}`}>
                  {repository.risk} risk
                </span>
              </div>
              <h1 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">Engineering intelligence dashboard</h1>
            </div>

            <div className="flex items-center gap-2">
              <button className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="Notifications">
                <Bell size={18} />
              </button>
              <a
                href="/settings"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                aria-label="Settings"
              >
                <Settings size={18} />
              </a>
              <a
                href="/profile"
                className="hidden h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 md:inline-flex"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-950 text-xs font-bold text-white">
                  {initials(user.name, user.email)}
                </span>
                Profile
              </a>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6">
          <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr_auto] xl:items-end">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Repository</span>
                <span className="relative block">
                  <select
                    value={selectedRepo}
                    onChange={event => setSelectedRepo(event.target.value)}
                    className="h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-10 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
                  >
                    {repositories.map(item => (
                      <option key={item.name} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Analyze a repository</span>
                <span className="relative block">
                  <GitPullRequest size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={repoUrl}
                    onChange={event => setRepoUrl(event.target.value)}
                    placeholder="https://github.com/company/repository"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-10 text-sm outline-none placeholder:text-slate-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
                  />
                  <Search size={17} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </span>
              </label>

              <button
                type="button"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                disabled={!repoUrl.trim()}
              >
                <Play size={16} />
                Start scan
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
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
              <span className="inline-flex items-center gap-2">
                <Users size={15} />
                Signed in as {user.email}
              </span>
            </div>
          </section>

          <div className="mb-5 flex gap-2 overflow-x-auto lg:hidden" role="tablist" aria-label="Dashboard sections">
            {navItems.map(item => {
              const selected = activeTab === item.label
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActiveTab(item.label)}
                  className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold ${
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
