import { useEffect, useMemo, useState } from 'react'
import { Link } from '../lib/router'
import {
  AlertTriangle,
  Bell,
  BookOpenCheck,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Code2,
  Database,
  GitBranch,
  GitPullRequest,
  LayoutDashboard,
  Play,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select } from './ui/select'
import { Combobox } from './ui/combobox'
import { ApiError, apiFetch } from '../api/client'
import {
  analyzeRepository,
  getRepositoryCommits,
  getRepositoryContributors,
  getRepositoryDebt,
  getRepositoryDependencies,
  getRepositoryDocumentation,
  getRepositoryDrift,
  getRepositoryFiles,
  getRepositoryManifest,
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
  demoRepositoryIntelligence,
  demoRepositories,
  demoRiskTrend,
} from '../demo/dashboardDemoData'
import { AppTopBar } from './AppChrome'
import CoveragePanel from './dashboard/CoveragePanel'
import DebtCharts from './dashboard/DebtCharts'
import DebtTable from './dashboard/DebtTable'
import DriftPanel from './dashboard/DriftPanel'
import MetricStrip from './dashboard/MetricStrip'
import PipelinePanel from './dashboard/PipelinePanel'
import RecommendationPanel from './dashboard/RecommendationPanel'
import AiExplainabilityPanel from './dashboard/AiExplainabilityPanel'
import RepositoryIntelligencePanel from './dashboard/RepositoryIntelligencePanel'
import RiskHeatmapPanel from './dashboard/RiskHeatmapPanel'
import RiskTrendPanel from './dashboard/RiskTrendPanel'
import { EmptyPanel, Tooltip } from './dashboard/shared'
import { ANALYSIS_STATUS_META, analysisStatusClass, formatRelativeTime, severityClass } from './dashboard/utils'

const STATUS_POLL_INTERVAL_MS = 4000

const GITHUB_REPO_URL_PATTERN = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/

const navItems = [
  { label: 'Overview' },
  { label: 'Repository Intelligence' },
  { label: 'Technical Debt' },
  { label: 'Knowledge Drift' },
  { label: 'Risk & AI' },
]

const EMPTY_ANALYTICS = { scores: null, debt: null, drift: null, recommendations: [] }
const EMPTY_ANALYTICS_ERRORS = { scores: null, debt: null, drift: null, recommendations: null }
const EMPTY_PAGE = { items: [], total: 0 }

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

function publicGithubUrl(repository) {
  const candidate = String(repository?.url || '').trim()
  if (GITHUB_REPO_URL_PATTERN.test(candidate)) return candidate

  const fullName = String(repository?.fullName || repository?.name || '').trim()
  const inferred = `https://github.com/${fullName}`
  return GITHUB_REPO_URL_PATTERN.test(inferred) ? inferred : ''
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
        <MetricStrip items={view.kpis} />
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

function MainContent({ activeTab, view, liveMode, accessToken, repositoryId }) {
  if (activeTab === 'Repository Intelligence') {
    return (
      <RepositoryIntelligencePanel
        data={view.intelligence}
        loading={view.intelligenceLoading}
        error={view.intelligenceError}
      />
    )
  }

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
        {view.debtKpis.length > 0 && <MetricStrip items={view.debtKpis} />}
        <DebtCharts items={view.debtItems} emptyTitle={view.debtEmptyTitle} emptyDescription={view.debtEmptyDescription} />
        <RiskHeatmapPanel items={view.debtItems} />
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
        <RiskHeatmapPanel items={view.debtItems} description="Prioritized module risk combining the available debt evidence." />
        <RecommendationPanel items={view.recommendations} emptyTitle={view.recommendationsEmptyTitle} emptyDescription={view.recommendationsEmptyDescription} />
        {liveMode && repositoryId && (
          <AiExplainabilityPanel
            accessToken={accessToken}
            repositoryId={repositoryId}
            topRiskModules={view.debtItems
              .filter(item => ['High', 'Critical'].includes(item.risk))
              .map(item => ({ path: item.module, risk: item.risk }))}
          />
        )}
      </div>
    )
  }

  return <OverviewContent view={view} liveMode={liveMode} />
}

export default function Dashboard({ user, accessToken, onLogout }) {
  const [activeTab, setActiveTab] = useState('Overview')
  const [, setStatus] = useState('Verifying session...')
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
  const [intelligence, setIntelligence] = useState(null)
  const [intelligenceLoading, setIntelligenceLoading] = useState(false)
  const [intelligenceError, setIntelligenceError] = useState('')
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
  const repositoryPickerOptions = useMemo(() => [
    ...liveRepoOptions.map(item => ({ value: `analyzed:${item.id}`, label: item.fullName || item.name, description: item.defaultBranch ? `Analyzed · ${item.defaultBranch}` : 'Analyzed repository', group: 'Analyzed repositories', tone: 'bg-[var(--sev-nominal)]' })),
    ...connectedRepos.map(item => ({ value: `connected:${item.id}`, label: item.fullName, description: item.private ? 'Private repository' : 'Connected source', meta: item.provider === 'github' ? 'GitHub' : 'GitLab', group: 'Connected sources', tone: item.provider === 'github' ? 'bg-[var(--series-1)]' : 'bg-[var(--series-6)]' })),
  ], [connectedRepos, liveRepoOptions])

  useEffect(() => {
    if (selectedRepoId) setRepositoryPickerValue(`analyzed:${selectedRepoId}`)
  }, [selectedRepoId])

  function handleRepositoryPickerChange(event) {
    const value = event.target.value
    setRepositoryPickerValue(value)

    if (value.startsWith('analyzed:')) {
      const repositoryId = value.slice('analyzed:'.length)
      const repository = liveRepoOptions.find(item => item.id === repositoryId)
      setSelectedRepoId(repositoryId)
      const scanUrl = publicGithubUrl(repository)
      if (scanUrl) {
        setRepoUrl(scanUrl)
        setScanMessage(`Ready to re-scan ${repository.fullName || repository.name}.`)
        setScanError('')
      }
      return
    }

    const repository = connectedRepos.find(item => `connected:${item.id}` === value)
    if (repository) {
      setRepoUrl(publicGithubUrl(repository))
      setSelectedRepoId('')
      if (publicGithubUrl(repository)) {
        setScanMessage(`Ready to scan ${repository.fullName}.`)
        setScanError('')
      } else {
        setScanMessage('')
        setScanError('This scan endpoint currently accepts public GitHub repository URLs only.')
      }
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

  useEffect(() => {
    if (demoMode || activeTab !== 'Repository Intelligence') return undefined
    if (!accessToken || !selectedRepoId) {
      setIntelligence(null)
      setIntelligenceError('')
      return undefined
    }

    let cancelled = false

    async function loadIntelligence() {
      setIntelligenceLoading(true)
      setIntelligenceError('')
      const results = await Promise.allSettled([
        getRepositoryFiles(accessToken, selectedRepoId),
        getRepositoryDependencies(accessToken, selectedRepoId),
        getRepositoryCommits(accessToken, selectedRepoId),
        getRepositoryDocumentation(accessToken, selectedRepoId),
        getRepositoryContributors(accessToken, selectedRepoId),
        getRepositoryManifest(accessToken, selectedRepoId),
      ])
      if (cancelled) return

      const [files, dependencies, commits, documentation, contributors, manifests] = results
      const failures = results.filter(result => result.status === 'rejected')
      setIntelligence({
        files: settledValue(files, EMPTY_PAGE),
        dependencies: settledValue(dependencies, EMPTY_PAGE),
        commits: settledValue(commits, EMPTY_PAGE),
        documentation: settledValue(documentation, EMPTY_PAGE),
        contributors: settledValue(contributors, []),
        manifests: settledValue(manifests, []),
      })
      setIntelligenceError(failures.length === results.length
        ? (failures[0].reason instanceof Error ? failures[0].reason.message : 'Repository evidence could not be loaded.')
        : '')
      setIntelligenceLoading(false)
    }

    loadIntelligence()
    return () => { cancelled = true }
  }, [accessToken, activeTab, dataVersion, demoMode, selectedRepoId])

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

    if (scanLoading) return

    if (!trimmedRepoUrl) {
      setScanMessage('')
      setScanError('Paste a public GitHub repository URL to start a scan.')
      return
    }

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

  function handleTabKeyDown(event, index) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return

    event.preventDefault()
    const lastIndex = navItems.length - 1
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? lastIndex
        : event.key === 'ArrowRight'
          ? (index + 1) % navItems.length
          : (index - 1 + navItems.length) % navItems.length
    setActiveTab(navItems[nextIndex].label)
    event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')[nextIndex]?.focus()
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
        intelligence: demoRepositoryIntelligence,
        intelligenceLoading: false,
        intelligenceError: '',
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
      intelligence,
      intelligenceLoading,
      intelligenceError,
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
  }, [analytics, analyticsErrors, analyticsLoading, demoMode, hasLiveRepository, intelligence, intelligenceError, intelligenceLoading, scanLoading, selectedRepo])

  const bannerMessage = demoMode
    ? 'Demo mode — sample analytics. Toggle live mode to use your analyzed repositories.'
    : repoListState === 'unavailable'
      ? 'Live mode — analytics APIs are still rolling out. Showing this session’s scan results.'
      : repoListState === 'ready' && repoList.length === 0 && !scanSummary
        ? 'Live mode — no repositories yet. Scan a GitHub repository to see real analytics.'
        : 'Live mode — analytics for your analyzed repositories.'

  const showEmptyRepositoryState = liveMode && repoListState === 'ready' && repoList.length === 0 && !scanSummary
  const scanActive = selectedRepoStatus === 'queued' || selectedRepoStatus === 'running' || scanLoading

  return (
    <div className="density-surface min-h-screen bg-[var(--surface-canvas)] text-[var(--ink-1)]">
      <AppTopBar
        user={user}
        onLogout={onLogout}
        active="dashboard"
        endContent={(
          <>
            <span className="group relative inline-flex">
              <Button
                type="button"
                variant={demoMode ? 'secondary' : 'ghost'}
                size="sm"
                aria-label={demoMode ? 'Demo mode is on — switch to live mode' : 'Live mode is on — switch to demo mode'}
                title={demoMode ? 'Demo mode is on' : 'Live mode is on'}
                onClick={() => setDemoMode(value => !value)}
                className={demoMode ? 'text-[var(--accent-ink)]' : ''}
              >
                <Database size={14} />
                {demoMode ? 'Demo' : 'Live'}
              </Button>
              <Tooltip label={demoMode ? 'Demo data — click for live' : 'Live data — click for demo'} />
            </span>
            <span className="group relative inline-flex">
              <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                <Link to="/settings#notifications" aria-label="Notification settings" title="Notification settings">
                  <Bell size={15} />
                </Link>
              </Button>
              <Tooltip label="Notification settings" />
            </span>
          </>
        )}
      />

      {/* -- Section tabs + repository identity ------------------------------ */}
      <div className="scrim sticky top-14 z-30 border-b border-[var(--line-1)]">
        <div className="flex h-12 items-center justify-between gap-3 px-4 sm:px-6 2xl:px-8">
          <nav className="flex h-full items-center gap-0.5 overflow-x-auto" role="tablist" aria-label="Dashboard sections">
            {navItems.map(item => {
              const selected = activeTab === item.label
              return (
                <button
                  key={item.label}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="dashboard-tab-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(item.label)}
                  onKeyDown={event => handleTabKeyDown(event, navItems.indexOf(item))}
                  className={`relative h-full whitespace-nowrap px-3 text-sm transition-colors duration-[var(--d-2)] ${
                    selected
                      ? 'font-medium text-[var(--ink-1)] after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-[var(--contrast)]'
                      : 'text-[var(--ink-3)] hover:text-[var(--ink-1)]'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
          <div className="hidden shrink-0 items-center gap-2.5 md:flex">
            <span className="max-w-64 truncate font-mono text-xs text-[var(--ink-3)]">
              {displayedRepository?.fullName || displayedRepository?.name || 'No repository selected'}
            </span>
            {demoMode ? (
              <span className={`inline-flex items-center rounded-[var(--r-xs)] border px-1.5 py-0.5 text-[0.6875rem] font-medium capitalize ${severityClass(displayedRepository.risk)}`}>
                {displayedRepository.risk} risk
              </span>
            ) : (
              selectedRepoStatus && (
                <span className={`inline-flex items-center rounded-[var(--r-xs)] border px-1.5 py-0.5 text-[0.6875rem] font-medium ${analysisStatusClass(selectedRepoStatus)}`}>
                  {(ANALYSIS_STATUS_META[selectedRepoStatus] || ANALYSIS_STATUS_META.queued).label}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      <main className="cp-app min-w-0 py-6 sm:py-8">
        {/* -- Repository console -------------------------------------------- */}
        <section className="panel overflow-hidden" aria-label="Repository console">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--line-1)] px-4 py-2.5 sm:px-5">
            <p className="overline flex min-w-0 items-center gap-2 text-[var(--ink-3)]">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  scanActive
                    ? 'motion-safe-loop animate-pulse bg-[var(--accent)]'
                    : displayedRepository
                      ? 'bg-[var(--sev-nominal)]'
                      : 'bg-[var(--ink-4)]'
                }`}
                aria-hidden="true"
              />
              <span className="truncate">
                Console{displayedRepository ? ` — ${displayedRepository.fullName || displayedRepository.name}` : ''}
              </span>
            </p>
            <span className="hidden shrink-0 font-mono text-[0.6875rem] text-[var(--ink-4)] sm:block">
              {demoMode ? 'sample data' : `last scan ${formatRelativeTime(displayedRepository?.updatedAt)}`}
            </span>
          </div>

          <div className="grid min-w-0 gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(16rem,0.85fr)_minmax(0,1.35fr)] xl:items-end">
            <label className="block min-w-0">
              <span className="overline mb-1.5 block text-[var(--ink-4)]">Target</span>
              <span className="relative block">
                {demoMode ? (
                  <Select
                    value={demoRepoName}
                    onChange={setDemoRepoName}
                    options={demoRepositories.map(item => ({ value: item.name, label: item.name }))}
                    ariaLabel="Choose a demo repository"
                  />
                ) : (
                  <Combobox
                    value={repositoryPickerValue}
                    onChange={value => handleRepositoryPickerChange({ target: { value } })}
                    options={repositoryPickerOptions}
                    disabled={repositoryPickerOptions.length === 0}
                    placeholder={repoListState === 'loading' ? 'Loading repositories…' : 'Select a repository'}
                    ariaLabel="Choose a repository"
                  />
                )}
              </span>
            </label>

            <label className="block min-w-0">
              <span className="overline mb-1.5 block text-[var(--ink-4)]">Scan</span>
              <span className="flex flex-col gap-2 sm:flex-row">
                <span className="relative block min-w-0 flex-1">
                  <ScanSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-4)]" />
                  <Input
                    value={repoUrl}
                    onChange={event => setRepoUrl(event.target.value)}
                    placeholder="https://github.com/company/repository"
                    className="pl-9 font-mono text-[0.8125rem]"
                  />
                </span>
                <Button
                  type="button"
                  className="shrink-0"
                  onClick={handleStartScan}
                  disabled={scanLoading}
                >
                  {scanLoading ? <RefreshCw size={15} className="motion-safe-loop animate-spin" /> : <Play size={15} />}
                  {scanLoading ? 'Scanning…' : 'Run scan'}
                </Button>
              </span>
            </label>
          </div>

          {(scanMessage || scanError) && (
            <div
              className={`mx-4 mb-4 flex gap-2.5 rounded-[var(--r-md)] border px-3.5 py-3 text-sm sm:mx-5 ${
                scanError
                  ? 'border-[var(--sev-critical-line)] bg-[var(--sev-critical-wash)] text-[var(--sev-critical-ink)]'
                  : 'border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] text-[var(--sev-nominal-ink)]'
              }`}
              role="status"
            >
              {scanError ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
              <div className="min-w-0">
                <p className="font-medium">{scanError || scanMessage}</p>
                {scanSummary?.repository && !scanError && (
                  <p className="mt-0.5 truncate font-mono text-xs opacity-80">
                    {scanSummary.repository.fullName || scanSummary.repository.name} on{' '}
                    {scanSummary.repository.defaultBranch || 'default branch'}
                  </p>
                )}
              </div>
            </div>
          )}

          {scanSummary && !scanError && (
            <div className="grid gap-2 px-4 pb-4 min-[420px]:grid-cols-2 sm:px-5 lg:grid-cols-5">
              {[
                ['Files', scanSummary.totalFiles],
                ['Docs', scanSummary.totalDocumentation],
                ['Commits', scanSummary.totalCommits],
                ['Dependencies', scanSummary.totalDependencies],
                ['Directories', scanSummary.totalDirectories],
              ].map(([label, value]) => (
                <div key={label} className="panel-2 px-3 py-2.5">
                  <p className="overline text-[var(--ink-4)]">{label}</p>
                  <p className="tnum mt-1 text-lg font-semibold text-[var(--ink-1)]">{value ?? 0}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex min-w-0 flex-wrap gap-x-5 gap-y-2 border-t border-[var(--line-1)] px-4 py-3 text-[0.8125rem] text-[var(--ink-3)] sm:px-5">
            <span className="inline-flex items-center gap-1.5">
              <GitBranch size={14} />
              {displayedRepository?.defaultBranch || displayedRepository?.branch || 'No branch'}
            </span>
            {demoMode && (
              <span className="inline-flex items-center gap-1.5">
                <Code2 size={14} />
                {displayedRepository.language}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={14} />
              Last scan {demoMode ? displayedRepository.lastScan : formatRelativeTime(displayedRepository?.updatedAt)}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Users size={14} />
              <span className="truncate">Signed in as {user.email}</span>
            </span>
          </div>
        </section>

        {/* -- Mode microline -------------------------------------------------- */}
        <p className="my-5 flex items-center gap-2 font-mono text-[0.75rem] leading-5 text-[var(--ink-3)]">
          <CircleAlert size={13} className="shrink-0 text-[var(--accent-ink)]" />
          {bannerMessage}
        </p>

        {repoListState === 'error' && liveMode && (
          <div className="mb-5">
            <EmptyPanel
              title="Could not load your repositories"
              description={repoListError}
              icon={AlertTriangle}
              action={
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setDataVersion(version => version + 1)}>
                  <RefreshCw size={14} />
                  Retry
                </Button>
              }
            />
          </div>
        )}

        {showEmptyRepositoryState ? (
          <EmptyPanel
            title="No repositories yet"
            description="Analyze a public GitHub repository with the console above. CodePulse will extract its files, documentation, commits, and dependencies, then the analysis engines will score its health here."
            icon={GitBranch}
          />
        ) : (
          <div id="dashboard-tab-panel" role="tabpanel" tabIndex={0}>
            <MainContent
              activeTab={activeTab}
              view={view}
              liveMode={liveMode}
              accessToken={accessToken}
              repositoryId={selectedRepo?.id || ''}
            />
          </div>
        )}
      </main>
    </div>
  )
}
