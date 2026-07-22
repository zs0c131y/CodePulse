import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Code2,
  Database,
  FileWarning,
  GitBranch,
  GitPullRequest,
  LayoutDashboard,
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
import { ApiError, apiFetch } from '../api/client'
import {
  analyzeRepository,
  getRepositoryDebt,
  getRepositoryDrift,
  getRepositoryRecommendations,
  getRepositoryScores,
  getRepositoryStatus,
  listRepositories,
} from '../api/repositories'
import { listConnectedRepositories } from '../api/integrations'
import {
  demoCoverage,
  demoDebtKpis,
  demoDebtModules,
  demoDriftFindings,
  demoKpis,
  demoPipeline,
  demoRecommendations,
  demoRepositories,
  demoRiskTrend,
} from '../demo/dashboardDemoData'
import CoveragePanel from './dashboard/CoveragePanel'
import DebtCharts from './dashboard/DebtCharts'
import DebtTable from './dashboard/DebtTable'
import DriftPanel from './dashboard/DriftPanel'
import KpiCard from './dashboard/KpiCard'
import PipelinePanel from './dashboard/PipelinePanel'
import RecommendationPanel from './dashboard/RecommendationPanel'
import RiskTrendPanel from './dashboard/RiskTrendPanel'
import { EmptyPanel, Tooltip } from './dashboard/shared'
import { ANALYSIS_STATUS_META, analysisStatusClass, formatRelativeTime, severityClass } from './dashboard/utils'
import AuroraBackground from './AuroraBackground'

const STATUS_POLL_INTERVAL_MS = 4000

const GITHUB_REPO_URL_PATTERN = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/

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

const EMPTY_ANALYTICS = { scores: null, debt: null, drift: null, recommendations: [] }
const EMPTY_ANALYTICS_ERRORS = { scores: null, debt: null, drift: null, recommendations: null }

function getDocumentationCoverage(repository) {
  const files = Number(repository?.totalFiles || 0)
  if (!files) return 0
  return Math.round((Number(repository?.totalDocumentation || 0) / files) * 100)
}

function summaryToRepository(summary, repositoryId) {
  const repository = summary?.repository || {}

  return {
    id: repositoryId,
    name: repository.name || 'repository',
    fullName: repository.fullName || repository.name || 'repository',
    url: repository.url || '',
    defaultBranch: repository.defaultBranch || 'main',
    status: 'completed',
    totalFiles: summary?.totalFiles || 0,
    totalDirectories: summary?.totalDirectories || 0,
    totalDocumentation: summary?.totalDocumentation || 0,
    totalCommits: summary?.totalCommits || 0,
    totalDependencies: summary?.totalDependencies || 0,
    updatedAt: null,
  }
}

function settledValue(result, fallback = null) {
  return result.status === 'fulfilled' ? result.value : fallback
}

function settledError(result) {
  if (result.status === 'fulfilled') return null
  const reason = result.reason
  return { status: reason instanceof ApiError ? reason.status : 0, message: reason instanceof Error ? reason.message : 'Request failed.' }
}

function availabilityMessage(error, fallback) {
  if (error?.status === 404) {
    return 'This data is published by the analysis engines, which have not produced results for this repository yet.'
  }
  if (error) {
    return `Could not load this data: ${error.message}`
  }
  return fallback
}

function buildScoreKpis(scores) {
  return [
    {
      label: 'Repository health',
      value: String(scores.healthScore ?? '—'),
      unit: '/100',
      trend: `Debt grade ${scores.technicalDebt?.grade || '—'}`,
      trendTone: 'neutral',
      deltaKind: 'meta',
      icon: ShieldCheck,
      accent: 'emerald',
      sparkline: Array.isArray(scores.healthTrend) ? scores.healthTrend : null,
    },
    {
      label: 'Critical risks',
      value: String(scores.risk?.criticalModules ?? 0),
      unit: 'modules',
      trend: `${scores.drift?.critical ?? 0} critical drift`,
      trendTone: (scores.risk?.criticalModules ?? 0) > 0 ? 'bad' : 'good',
      deltaKind: 'meta',
      icon: ShieldAlert,
      accent: 'rose',
    },
    {
      label: 'Documentation drift',
      value: String(scores.drift?.total ?? 0),
      unit: 'findings',
      trend: `${scores.drift?.high ?? 0} high severity`,
      trendTone: (scores.drift?.total ?? 0) > 0 ? 'bad' : 'good',
      deltaKind: 'meta',
      icon: BookOpenCheck,
      accent: 'amber',
    },
    {
      label: 'AI actions ready',
      value: String(scores.recommendationsReady ?? 0),
      unit: 'recommendations',
      trend: 'From risk engine',
      trendTone: 'neutral',
      deltaKind: 'meta',
      icon: Sparkles,
      accent: 'cyan',
    },
  ]
}

function buildTotalKpis(repository) {
  const coverage = getDocumentationCoverage(repository)

  return [
    {
      label: 'Files indexed',
      value: String(repository.totalFiles ?? 0),
      unit: 'files',
      trend: `${repository.totalDirectories ?? 0} dirs`,
      trendTone: 'neutral',
      deltaKind: 'meta',
      icon: Code2,
      accent: 'cyan',
    },
    {
      label: 'Documentation',
      value: String(repository.totalDocumentation ?? 0),
      unit: 'docs',
      trend: `${coverage}% coverage`,
      trendTone: coverage >= 15 ? 'good' : 'bad',
      deltaKind: 'meta',
      icon: BookOpenCheck,
      accent: 'emerald',
    },
    {
      label: 'Commit history',
      value: String(repository.totalCommits ?? 0),
      unit: 'commits',
      trend: 'Latest scan',
      trendTone: 'neutral',
      deltaKind: 'meta',
      icon: GitBranch,
      accent: 'amber',
    },
    {
      label: 'Dependency edges',
      value: String(repository.totalDependencies ?? 0),
      unit: 'edges',
      trend: 'Mapped imports',
      trendTone: 'neutral',
      deltaKind: 'meta',
      icon: GitPullRequest,
      accent: 'rose',
    },
  ]
}

function buildStatusPipeline(repository, scanLoading) {
  if (scanLoading) {
    return [
      { label: 'Repository clone', status: 'Running', detail: 'Cloning public GitHub repository', progress: 35 },
      { label: 'File inventory', status: 'Queued', detail: 'Waiting for clone output', progress: 0 },
      { label: 'Commit history', status: 'Queued', detail: 'Waiting for repository metadata', progress: 0 },
      { label: 'Dependency graph', status: 'Queued', detail: 'Waiting for parsed files', progress: 0 },
    ]
  }

  if (!repository) return []

  if (repository.status === 'failed') {
    return [
      { label: 'Repository analysis', status: 'Failed', detail: 'The latest analysis run did not complete', progress: 100 },
      { label: 'Debt scoring', status: 'Queued', detail: 'Waiting for a successful analysis run', progress: 0 },
      { label: 'Drift detection', status: 'Queued', detail: 'Waiting for a successful analysis run', progress: 0 },
      { label: 'Risk intelligence', status: 'Queued', detail: 'Waiting for a successful analysis run', progress: 0 },
    ]
  }

  if (repository.status === 'running') {
    return [
      { label: 'Repository clone', status: 'Complete', detail: 'Clone workspace ready', progress: 100 },
      { label: 'Repository analysis', status: 'Running', detail: 'Extracting files, commits, documentation, and dependencies', progress: 60 },
      { label: 'Debt scoring', status: 'Queued', detail: 'Waiting for repository analysis', progress: 0 },
      { label: 'Drift detection', status: 'Queued', detail: 'Waiting for repository analysis', progress: 0 },
    ]
  }

  if (repository.status === 'queued') {
    return [
      { label: 'Repository clone', status: 'Queued', detail: 'Analysis run is queued', progress: 0 },
      { label: 'File inventory', status: 'Queued', detail: 'Waiting for clone output', progress: 0 },
      { label: 'Commit history', status: 'Queued', detail: 'Waiting for repository metadata', progress: 0 },
      { label: 'Dependency graph', status: 'Queued', detail: 'Waiting for parsed files', progress: 0 },
    ]
  }

  return [
    { label: 'Repository indexed', status: 'Complete', detail: `${repository.totalFiles ?? 0} files parsed`, progress: 100 },
    { label: 'Documentation extracted', status: 'Complete', detail: `${repository.totalDocumentation ?? 0} docs detected`, progress: 100 },
    { label: 'Commit history', status: 'Complete', detail: `${repository.totalCommits ?? 0} commits scanned`, progress: 100 },
    { label: 'Dependency graph', status: 'Complete', detail: `${repository.totalDependencies ?? 0} edges mapped`, progress: 100 },
  ]
}

function buildDebtKpis(metrics) {
  return [
    {
      label: 'Avg complexity',
      value: String(metrics.averageComplexity ?? '—'),
      unit: 'score',
      trend: `Grade ${metrics.grade || '—'}`,
      trendTone: 'neutral',
      deltaKind: 'meta',
      icon: Code2,
      accent: 'amber',
    },
    {
      label: 'Duplicated code',
      value: String(metrics.duplicationPercent ?? '—'),
      unit: '%',
      trend: 'Debt engine',
      trendTone: 'neutral',
      deltaKind: 'meta',
      icon: GitBranch,
      accent: 'cyan',
    },
    {
      label: 'Circular deps',
      value: String(metrics.circularDependencies ?? '—'),
      unit: 'loops',
      trend: 'Debt engine',
      trendTone: (metrics.circularDependencies ?? 0) > 0 ? 'bad' : 'good',
      deltaKind: 'meta',
      icon: AlertTriangle,
      accent: 'rose',
    },
  ]
}

function mapDebtModules(debt) {
  return (debt?.modules || []).map(module => ({
    module: module.path || 'unknown',
    owner: module.owner || 'Unassigned',
    complexity: Math.round(Number(module.complexity) || 0),
    churn: `${Math.round(Number(module.churnPercent) || 0)}%`,
    duplication: `${Math.round(Number(module.duplicationPercent) || 0)}%`,
    risk: module.risk || 'Low',
  }))
}

function mapDriftFindings(drift) {
  return (drift?.findings || []).map(finding => ({
    id: finding.id,
    title: finding.title || 'Documentation drift',
    file: finding.filePath || 'unknown file',
    severity: finding.severity || 'Low',
    age: finding.age || 'recently',
    evidence: finding.evidence || '',
  }))
}

function mapRecommendations(recommendations) {
  return (recommendations || []).map(item => ({
    id: item.id,
    title: item.title || 'Recommendation',
    impact: item.impact || 'Medium',
    effort: item.effort || '—',
    reason: item.reason || '',
    steps: Array.isArray(item.steps) ? item.steps : [],
  }))
}

function OverviewContent({ view, liveMode }) {
  return (
    <div className="space-y-5">
      {view.kpis.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {view.kpis.map(item => (
            <KpiCard key={item.label} item={item} />
          ))}
        </div>
      ) : (
        <EmptyPanel
          title="No repository metrics yet"
          description="Repository metrics appear here after a scan completes for the selected repository."
          icon={LayoutDashboard}
        />
      )}
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <PipelinePanel items={view.pipelineItems} />
        <RiskTrendPanel
          bars={view.riskTrend}
          title="Risk trend"
          description={liveMode ? 'Composite maintainability risk from the Risk Intelligence engine.' : 'Composite maintainability risk over the last 7 days.'}
          emptyTitle={view.riskEmptyTitle}
          emptyDescription={view.riskEmptyDescription}
        />
      </div>
      <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <DebtTable
          items={view.debtItems}
          title="Highest-risk modules"
          description="Ranked by complexity, churn, duplication, and drift adjacency."
          emptyTitle={view.debtEmptyTitle}
          emptyDescription={view.debtEmptyDescription}
        />
        <DriftPanel items={view.driftItems} emptyTitle={view.driftEmptyTitle} emptyDescription={view.driftEmptyDescription} />
      </div>
    </div>
  )
}

function MainContent({ activeTab, view, liveMode }) {
  if (activeTab === 'Technical Debt') {
    if (liveMode && view.debtUnavailable) {
      return (
        <EmptyPanel
          title="Technical debt scoring is not available yet"
          description={view.debtEmptyDescription}
          icon={Code2}
        />
      )
    }

    return (
      <div className="space-y-5">
        {view.debtKpis.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            {view.debtKpis.map(item => (
              <KpiCard key={item.label} item={item} />
            ))}
          </div>
        )}
        <DebtCharts items={view.debtItems} emptyTitle={view.debtEmptyTitle} emptyDescription={view.debtEmptyDescription} />
        <DebtTable
          items={view.debtItems}
          emptyTitle={view.debtEmptyTitle}
          emptyDescription={view.debtEmptyDescription}
        />
      </div>
    )
  }

  if (activeTab === 'Knowledge Drift') {
    return (
      <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <DriftPanel items={view.driftItems} emptyTitle={view.driftEmptyTitle} emptyDescription={view.driftEmptyDescription} />
        <CoveragePanel
          items={view.coverageItems}
          description={liveMode ? 'Measured documentation coverage for this repository.' : 'Coverage by repository area.'}
          emptyTitle={view.coverageEmptyTitle}
          emptyDescription={view.coverageEmptyDescription}
        />
      </div>
    )
  }

  if (activeTab === 'Risk & AI') {
    return (
      <div className="space-y-5">
        <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <RiskTrendPanel
            bars={view.riskTrend}
            title="Risk trend"
            description={liveMode ? 'Composite maintainability risk from the Risk Intelligence engine.' : 'Composite maintainability risk over the last 7 days.'}
            emptyTitle={view.riskEmptyTitle}
            emptyDescription={view.riskEmptyDescription}
          />
          <PipelinePanel items={view.pipelineItems} />
        </div>
        <RecommendationPanel items={view.recommendations} emptyTitle={view.recommendationsEmptyTitle} emptyDescription={view.recommendationsEmptyDescription} />
      </div>
    )
  }

  return <OverviewContent view={view} liveMode={liveMode} />
}

export default function Dashboard({ user, accessToken, onLogout }) {
  const [activeTab, setActiveTab] = useState('Overview')
  const [status, setStatus] = useState('Verifying session...')
  const [demoMode, setDemoMode] = useState(false)
  const [demoRepoName, setDemoRepoName] = useState(demoRepositories[0].name)
  const [repoUrl, setRepoUrl] = useState('')
  const [scanLoading, setScanLoading] = useState(false)
  const [scanMessage, setScanMessage] = useState('')
  const [scanError, setScanError] = useState('')
  const [scanSummary, setScanSummary] = useState(null)
  const [scannedRepositoryId, setScannedRepositoryId] = useState('')
  const [repoList, setRepoList] = useState([])
  const [repoListState, setRepoListState] = useState('loading')
  const [repoListError, setRepoListError] = useState('')
  const [selectedRepoId, setSelectedRepoId] = useState('')
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS)
  const [analyticsErrors, setAnalyticsErrors] = useState(EMPTY_ANALYTICS_ERRORS)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [dataVersion, setDataVersion] = useState(0)
  const [connectedRepos, setConnectedRepos] = useState([])
  const [repositoryPickerValue, setRepositoryPickerValue] = useState('')

  // The repositories the dropdown can offer in live mode: the API list when it
  // is available, otherwise the repository scanned in this session (the read
  // API contract is still rolling out on the backend).
  const liveRepoOptions = useMemo(() => {
    if (repoListState === 'ready') return repoList
    if (scanSummary && scannedRepositoryId) {
      return [summaryToRepository(scanSummary, scannedRepositoryId)]
    }
    return []
  }, [repoList, repoListState, scanSummary, scannedRepositoryId])

  const selectedRepo = useMemo(
    () => liveRepoOptions.find(item => item.id === selectedRepoId) || null,
    [liveRepoOptions, selectedRepoId],
  )
  const selectedRepoStatus = selectedRepo?.status || ''
  const liveMode = !demoMode

  useEffect(() => {
    if (selectedRepoId) setRepositoryPickerValue(`analyzed:${selectedRepoId}`)
  }, [selectedRepoId])

  function handleRepositoryPickerChange(event) {
    const value = event.target.value
    setRepositoryPickerValue(value)

    if (value.startsWith('analyzed:')) {
      setSelectedRepoId(value.slice('analyzed:'.length))
      return
    }

    const repository = connectedRepos.find(item => `connected:${item.id}` === value)
    if (repository) {
      setRepoUrl(repository.url)
      setSelectedRepoId('')
      setScanMessage(`Ready to scan ${repository.fullName}.`)
      setScanError('')
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadProtectedUser() {
      try {
        await apiFetch('/api/auth/me', { accessToken })

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

  // Load the user's repositories whenever live mode is active, the session
  // changes, or a scan/poll invalidates the data (dataVersion).
  useEffect(() => {
    if (demoMode || !accessToken) return

    let cancelled = false

    async function loadRepositories() {
      setRepoListState(current => (current === 'ready' ? current : 'loading'))

      try {
        const items = await listRepositories(accessToken)
        const sorted = [...items].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))

        if (cancelled) return

        setRepoList(sorted)
        setRepoListState('ready')
        setRepoListError('')
        setSelectedRepoId(current => {
          if (current && sorted.some(item => item.id === current)) return current
          return sorted[0]?.id || ''
        })
      } catch (error) {
        if (cancelled) return

        if (error instanceof ApiError && error.status === 404) {
          // Read API not implemented yet: fall back to this session's scan.
          setRepoList([])
          setRepoListState('unavailable')
          setRepoListError('')
        } else {
          setRepoList([])
          setRepoListState('error')
          setRepoListError(error instanceof Error ? error.message : 'Could not load repositories.')
        }
      }
    }

    loadRepositories()

    return () => {
      cancelled = true
    }
  }, [accessToken, demoMode, dataVersion])

  useEffect(() => {
    if (demoMode || !accessToken) return undefined
    let cancelled = false
    listConnectedRepositories(accessToken).then(items => { if (!cancelled) setConnectedRepos(items) }).catch(() => { if (!cancelled) setConnectedRepos([]) })
    return () => { cancelled = true }
  }, [accessToken, demoMode, dataVersion])

  // Fetch every analytics surface for the selected repository. Each endpoint
  // settles independently so a missing engine (404) empties only its panels.
  useEffect(() => {
    if (demoMode || !accessToken || !selectedRepoId) {
      setAnalytics(EMPTY_ANALYTICS)
      setAnalyticsErrors(EMPTY_ANALYTICS_ERRORS)
      return undefined
    }

    let cancelled = false

    async function loadAnalytics() {
      setAnalyticsLoading(true)

      const [scores, debt, drift, recommendations] = await Promise.allSettled([
        getRepositoryScores(accessToken, selectedRepoId),
        getRepositoryDebt(accessToken, selectedRepoId),
        getRepositoryDrift(accessToken, selectedRepoId),
        getRepositoryRecommendations(accessToken, selectedRepoId),
      ])

      if (cancelled) return

      setAnalytics({
        scores: settledValue(scores),
        debt: settledValue(debt),
        drift: settledValue(drift),
        recommendations: settledValue(recommendations, []),
      })
      setAnalyticsErrors({
        scores: settledError(scores),
        debt: settledError(debt),
        drift: settledError(drift),
        recommendations: settledError(recommendations),
      })
      setAnalyticsLoading(false)
    }

    loadAnalytics()

    return () => {
      cancelled = true
    }
  }, [accessToken, demoMode, selectedRepoId, dataVersion])

  // Poll the analysis status endpoint while the selected repository is queued
  // or running. This also resumes polling after a page refresh mid-scan.
  useEffect(() => {
    if (demoMode || !accessToken || !selectedRepoId) return undefined
    if (selectedRepoStatus !== 'queued' && selectedRepoStatus !== 'running') return undefined

    const intervalId = window.setInterval(async () => {
      try {
        const data = await getRepositoryStatus(accessToken, selectedRepoId)
        const nextStatus = String(data.status || '')

        setRepoList(current =>
          current.map(item =>
            item.id === selectedRepoId ? { ...item, status: nextStatus, updatedAt: data.updatedAt || item.updatedAt } : item,
          ),
        )

        if (nextStatus === 'completed' || nextStatus === 'failed') {
          if (nextStatus === 'failed') {
            setScanError(data.message || 'Repository analysis failed.')
          } else {
            setScanMessage('Repository analyzed.')
          }
          setDataVersion(version => version + 1)
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          // Status endpoint not implemented yet; stop polling quietly.
          window.clearInterval(intervalId)
        }
      }
    }, STATUS_POLL_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [accessToken, demoMode, selectedRepoId, selectedRepoStatus])

  async function handleStartScan() {
    const trimmedRepoUrl = repoUrl.trim()

    if (!trimmedRepoUrl || scanLoading) return

    if (!GITHUB_REPO_URL_PATTERN.test(trimmedRepoUrl)) {
      setScanMessage('')
      setScanError('Enter a valid public GitHub repository URL (https://github.com/owner/repository).')
      return
    }

    setScanLoading(true)
    setScanMessage('')
    setScanError('')

    try {
      const data = await analyzeRepository(accessToken, trimmedRepoUrl, 100)

      setScanSummary(data.summary || null)
      setScannedRepositoryId(data.repositoryId || '')
      setScanMessage(data.message || 'Repository analyzed.')
      setRepoUrl('')
      setDemoMode(false)

      if (data.repositoryId) {
        setSelectedRepoId(data.repositoryId)
      }

      // Refresh list + analytics from the API so the dashboard reflects the
      // persisted analysis rather than session-only state.
      setDataVersion(version => version + 1)
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Repository scan failed.')
    } finally {
      setScanLoading(false)
    }
  }

  const demoRepository = demoRepositories.find(item => item.name === demoRepoName) || demoRepositories[0]
  const displayedRepository = demoMode ? demoRepository : selectedRepo
  const hasLiveRepository = Boolean(selectedRepo)

  const view = useMemo(() => {
    if (demoMode) {
      return {
        kpis: demoKpis,
        pipelineItems: demoPipeline,
        riskTrend: demoRiskTrend,
        debtItems: demoDebtModules,
        debtKpis: demoDebtKpis,
        driftItems: demoDriftFindings,
        coverageItems: demoCoverage,
        recommendations: demoRecommendations,
      }
    }

    const scores = analytics.scores
    const debt = analytics.debt
    const drift = analytics.drift
    const debtItems = mapDebtModules(debt)
    const driftItems = mapDriftFindings(drift)
    const coverageFromApi = Array.isArray(drift?.coverage) ? drift.coverage : []

    return {
      kpis: scores ? buildScoreKpis(scores) : hasLiveRepository ? buildTotalKpis(selectedRepo) : [],
      pipelineItems: buildStatusPipeline(selectedRepo, scanLoading),
      riskTrend: Array.isArray(scores?.risk?.trend) ? scores.risk.trend : [],
      debtItems,
      debtKpis: debt?.metrics ? buildDebtKpis(debt.metrics) : [],
      driftItems,
      coverageItems:
        coverageFromApi.length > 0
          ? coverageFromApi
          : hasLiveRepository
            ? [{ label: 'Overall documentation', percent: getDocumentationCoverage(selectedRepo) }]
            : [],
      recommendations: mapRecommendations(analytics.recommendations),
      debtUnavailable: !analyticsLoading && !debt,
      debtEmptyTitle: 'No module debt data yet',
      debtEmptyDescription: availabilityMessage(
        analyticsErrors.debt,
        'Technical debt scoring runs after a repository scan completes. Module rows appear here once the debt engine has processed the repository.',
      ),
      driftEmptyTitle: 'No drift findings yet',
      driftEmptyDescription: availabilityMessage(
        analyticsErrors.drift,
        'Knowledge drift findings appear here after the drift detection engine compares documentation against the analyzed code structure.',
      ),
      coverageEmptyTitle: 'No coverage data yet',
      coverageEmptyDescription: availabilityMessage(
        analyticsErrors.drift,
        'Documentation coverage appears here after the Knowledge Debt engine measures documented versus undocumented areas of this repository.',
      ),
      riskEmptyTitle: 'No risk trend yet',
      riskEmptyDescription: availabilityMessage(
        analyticsErrors.scores,
        'Risk trend data appears here once the Risk Intelligence engine has scored this repository.',
      ),
      recommendationsEmptyTitle: 'No AI recommendations yet',
      recommendationsEmptyDescription: availabilityMessage(
        analyticsErrors.recommendations,
        'AI recommendations appear here after the Risk Intelligence and AI Explainability engines have processed this repository.',
      ),
    }
  }, [analytics, analyticsErrors, analyticsLoading, demoMode, hasLiveRepository, scanLoading, selectedRepo])

  const bannerMessage = demoMode
    ? 'Demo mode is showing sample dashboard analytics. Toggle live mode to use your analyzed repositories.'
    : repoListState === 'unavailable'
      ? 'Live mode — repository analytics APIs are still rolling out. Showing results from scans run in this session.'
      : repoListState === 'ready' && repoList.length === 0 && !scanSummary
        ? 'Live mode — no repositories yet. Analyze a GitHub repository above to see real analytics.'
        : 'Live mode is showing analytics for your analyzed repositories.'

  const showEmptyRepositoryState = liveMode && repoListState === 'ready' && repoList.length === 0 && !scanSummary

  return (
    <div className="relative min-h-screen bg-night-950 text-mist-100">
      <AuroraBackground variant="page" grid={false} className="fixed" />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/[0.07] bg-night-950/80 text-white backdrop-blur-2xl lg:flex lg:flex-col 2xl:w-72">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/[0.07] px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-400 shadow-lg shadow-violet-600/25">
            <Activity size={18} strokeWidth={2.5} className="text-white" />
          </span>
          <span className="font-display text-lg font-bold">
            Code<span className="text-gradient">Pulse</span>
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
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all duration-300 ${
                  selected
                    ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-600/25'
                    : 'text-mist-400 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <Icon size={17} />
                {item.label}
              </button>
            )
          })}

          <div className="my-4 h-px bg-white/[0.07]" />

          {accountNavItems.map(item => {
            const Icon = item.icon

            return (
              <a
                key={item.label}
                href={item.href}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-mist-400 transition-all duration-300 hover:bg-white/[0.06] hover:text-white"
              >
                <Icon size={17} />
                {item.label}
              </a>
            )
          })}
        </nav>

        <div className="border-t border-white/[0.07] p-4">
          <div className="glass-chip rounded-xl p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <LockKeyhole size={16} className="text-emerald-300" />
              Protected session
            </div>
            <div className="mt-3 flex min-w-0 items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-mist-500" title={user.email}>
                {user.email}
              </span>
              <span className="shrink-0 rounded-md border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                {status === 'Session verified' ? 'Verified' : 'Checking'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <div className="relative min-w-0 lg:pl-64 2xl:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-night-950/75 backdrop-blur-2xl">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 2xl:px-8">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-mist-500">
                <span>Workspace</span>
                <span>/</span>
                <span className="font-mono text-mist-100">{displayedRepository?.fullName || displayedRepository?.name || 'No repository selected'}</span>
                {demoMode ? (
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold capitalize ${severityClass(displayedRepository.risk)}`}>
                    {displayedRepository.risk} risk
                  </span>
                ) : (
                  selectedRepoStatus && (
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${analysisStatusClass(selectedRepoStatus)}`}>
                      {(ANALYSIS_STATUS_META[selectedRepoStatus] || ANALYSIS_STATUS_META.queued).label}
                    </span>
                  )
                )}
              </div>
              <h1 className="mt-1 font-display text-xl font-bold text-white sm:text-2xl">Engineering intelligence dashboard</h1>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="group relative inline-flex">
                <Button
                  type="button"
                  variant={demoMode ? 'default' : 'outline'}
                  size="icon"
                  aria-label={demoMode ? 'Demo mode is on' : 'Live mode is on'}
                  title={demoMode ? 'Demo mode is on' : 'Live mode is on'}
                  onClick={() => setDemoMode(value => !value)}
                >
                  <Database size={18} />
                </Button>
                <Tooltip label={demoMode ? 'Demo mode on' : 'Live mode on'} />
              </span>
              <span className="group relative inline-flex">
                <Button type="button" variant="outline" size="icon" aria-label="Notifications" title="Notifications">
                  <Bell size={18} />
                </Button>
                <Tooltip label="Notifications" />
              </span>
              <span className="group relative inline-flex">
                <Button
                  href="/settings"
                  asChild
                  variant="outline"
                  size="icon"
                  aria-label="Settings"
                  title="Settings"
                >
                  <a href="/settings">
                    <Settings size={18} />
                  </a>
                </Button>
                <Tooltip label="Settings" />
              </span>
              <span className="group relative inline-flex">
                <Button
                  href="/profile"
                  asChild
                  variant="outline"
                  size="icon"
                  aria-label="Profile"
                  title="Profile"
                >
                  <a href="/profile">
                    <User size={18} />
                  </a>
                </Button>
                <Tooltip label="Profile" />
              </span>
              <span className="group relative inline-flex">
                <Button
                  type="button"
                  onClick={onLogout}
                  variant="outline"
                  size="icon"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut size={18} />
                </Button>
                <Tooltip label="Sign out" />
              </span>
            </div>
          </div>
        </header>

        <main className="cp-dashboard-main min-w-0 py-5 sm:py-6 2xl:py-8">
          <section className="glass-panel card-hover mb-5 rounded-2xl p-4">
            <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(16rem,0.9fr)_minmax(0,1.35fr)] xl:items-end">
              <label className="block min-w-0">
                <span className="mb-2 block text-sm font-semibold text-mist-300">Repository</span>
                <span className="relative block">
                  {demoMode ? (
                    <>
                      <Select
                        value={demoRepoName}
                        onChange={event => setDemoRepoName(event.target.value)}
                        className="appearance-none pr-10"
                      >
                        {demoRepositories.map(item => (
                          <option key={item.name} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                      </Select>
                      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist-500" />
                    </>
                  ) : (
                    <>
                      <Select
                        value={repositoryPickerValue}
                        onChange={handleRepositoryPickerChange}
                        disabled={liveRepoOptions.length === 0 && connectedRepos.length === 0}
                        className="appearance-none pr-10"
                      >
                        <option value="">{repoListState === 'loading' ? 'Loading repositories...' : 'Select a repository'}</option>
                        {liveRepoOptions.length > 0 && (
                          <optgroup label="Analyzed repositories">
                            {liveRepoOptions.map(item => (
                              <option key={item.id} value={`analyzed:${item.id}`}>
                                {item.fullName || item.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {connectedRepos.length > 0 && (
                          <optgroup label="Connected sources">
                            {connectedRepos.map(item => (
                              <option key={item.id} value={`connected:${item.id}`}>
                                {item.provider === 'github' ? 'GitHub' : 'GitLab'} · {item.fullName}{item.private ? ' · Private' : ''}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </Select>
                      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist-500" />
                    </>
                  )}
                </span>
              </label>

              <label className="block min-w-0">
                <span className="mb-2 block text-sm font-semibold text-mist-300">Analyze a repository</span>
                <span className="flex flex-col gap-2 sm:flex-row">
                  <span className="relative block min-w-0 flex-1">
                    <GitPullRequest size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-500" />
                    <Input
                      value={repoUrl}
                      onChange={event => setRepoUrl(event.target.value)}
                      placeholder="https://github.com/company/repository"
                      className="h-11 px-10"
                    />
                    <Search size={17} className="absolute right-3 top-1/2 -translate-y-1/2 text-mist-500" />
                  </span>
                  <Button
                    type="button"
                    size="lg"
                    className="shrink-0"
                    onClick={handleStartScan}
                    disabled={!repoUrl.trim() || scanLoading}
                  >
                    {scanLoading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                    {scanLoading ? 'Scanning...' : 'Start scan'}
                  </Button>
                </span>
              </label>
            </div>

            {(scanMessage || scanError) && (
              <div
                className={`mt-4 flex gap-2 rounded-xl border px-4 py-3 text-sm ${
                  scanError
                    ? 'border-rose-400/25 bg-rose-400/10 text-rose-300'
                    : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
                }`}
                role="status"
              >
                {scanError ? <AlertTriangle size={17} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={17} className="mt-0.5 shrink-0" />}
                <div className="min-w-0">
                  <p className="font-semibold">{scanError || scanMessage}</p>
                  {scanSummary?.repository && !scanError && (
                    <p className="mt-1 truncate font-mono text-xs">
                      {scanSummary.repository.fullName || scanSummary.repository.name} on{' '}
                      {scanSummary.repository.defaultBranch || 'default branch'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {scanSummary && !scanError && (
              <div className="mt-4 grid gap-3 text-sm min-[420px]:grid-cols-2 lg:grid-cols-5 2xl:gap-4">
                {[
                  ['Files', scanSummary.totalFiles],
                  ['Docs', scanSummary.totalDocumentation],
                  ['Commits', scanSummary.totalCommits],
                  ['Dependencies', scanSummary.totalDependencies],
                  ['Directories', scanSummary.totalDirectories],
                ].map(([label, value]) => (
                  <div key={label} className="glass-chip rounded-xl px-3 py-2">
                    <p className="text-xs font-semibold uppercase text-mist-500">{label}</p>
                    <p className="mt-1 font-display text-lg font-bold text-white">{value ?? 0}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex min-w-0 flex-wrap gap-3 text-sm text-mist-400">
              <span className="inline-flex items-center gap-2">
                <GitBranch size={15} />
                {displayedRepository?.defaultBranch || displayedRepository?.branch || 'No branch'}
              </span>
              {demoMode ? (
                <span className="inline-flex items-center gap-2">
                  <Code2 size={15} />
                  {displayedRepository.language}
                </span>
              ) : (
                selectedRepoStatus && (
                  <span className={`inline-flex items-center gap-2 rounded-md border px-2 py-0.5 text-xs font-bold ${analysisStatusClass(selectedRepoStatus)}`}>
                    {(ANALYSIS_STATUS_META[selectedRepoStatus] || ANALYSIS_STATUS_META.queued).label}
                  </span>
                )
              )}
              <span className="inline-flex items-center gap-2">
                <Clock3 size={15} />
                Last scan {demoMode ? displayedRepository.lastScan : formatRelativeTime(displayedRepository?.updatedAt)}
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
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-300 ${
                    selected
                      ? 'border-transparent bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-600/25'
                      : 'border-white/10 bg-white/[0.04] text-mist-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          <div className="mb-5 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] px-4 py-3 text-sm text-cyan-200">
            <div className="flex gap-2">
              <CircleAlert size={17} className="mt-0.5 shrink-0" />
              <p>{bannerMessage}</p>
            </div>
          </div>

          {repoListState === 'error' && liveMode && (
            <div className="mb-5">
              <EmptyPanel
                title="Could not load your repositories"
                description={repoListError}
                icon={AlertTriangle}
                action={
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setDataVersion(version => version + 1)}>
                    <RefreshCw size={15} />
                    Retry
                  </Button>
                }
              />
            </div>
          )}

          {showEmptyRepositoryState ? (
            <EmptyPanel
              title="No repositories yet"
              description="Analyze a public GitHub repository with the scan controls above. CodePulse will extract its files, documentation, commits, and dependencies, then the analysis engines will score its health here."
              icon={GitBranch}
            />
          ) : (
            <MainContent activeTab={activeTab} view={view} liveMode={liveMode} />
          )}
        </main>
      </div>
    </div>
  )
}
