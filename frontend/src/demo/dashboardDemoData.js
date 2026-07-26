/**
 * Demo-mode fallback data for the dashboard.
 *
 * This data is only rendered when the user explicitly toggles demo mode on.
 * Live mode never reads from this module — it fetches the Repository Read &
 * Analytics API (docs/backend/BACKEND.md) and shows empty states instead.
 */
import {
  AlertTriangle,
  BookOpenCheck,
  Code2,
  GitBranch,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

export const demoRepositories = [
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

export const demoKpis = [
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

export const demoPipeline = [
  { label: 'Repository indexed', status: 'Complete', detail: '14,286 files parsed', progress: 100 },
  { label: 'Dependency graph', status: 'Complete', detail: '812 edges mapped', progress: 100 },
  { label: 'Debt analysis', status: 'Running', detail: 'Complexity and churn scan', progress: 76 },
  { label: 'AI explanations', status: 'Queued', detail: 'Waiting on risk scoring', progress: 28 },
]

export const demoDebtModules = [
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

export const demoDebtKpis = [
  {
    label: 'Avg complexity',
    value: '41',
    unit: 'score',
    trend: '+3',
    trendTone: 'bad',
    icon: Code2,
    accent: 'amber',
    sparkline: [35, 36, 36, 37, 38, 38, 39, 40, 40, 41, 41, 41],
  },
  {
    label: 'Duplicated code',
    value: '8.7',
    unit: '%',
    trend: '-1.1%',
    trendTone: 'good',
    icon: GitBranch,
    accent: 'cyan',
    sparkline: [11, 10.8, 10.5, 10.2, 10, 9.7, 9.5, 9.3, 9.1, 9, 8.8, 8.7],
  },
  {
    label: 'Circular deps',
    value: '5',
    unit: 'loops',
    trend: '2 new',
    trendTone: 'bad',
    icon: AlertTriangle,
    accent: 'rose',
    sparkline: [2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5],
  },
]

export const demoDriftFindings = [
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

export const demoCoverage = [
  { label: 'API routes', percent: 84 },
  { label: 'Domain modules', percent: 63 },
  { label: 'Architecture docs', percent: 71 },
  { label: 'Runbooks', percent: 48 },
]

export const demoRecommendations = [
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

export const demoRiskTrend = [
  { label: 'Mon', value: 62 },
  { label: 'Tue', value: 58 },
  { label: 'Wed', value: 64 },
  { label: 'Thu', value: 71 },
  { label: 'Fri', value: 67 },
  { label: 'Sat', value: 54 },
  { label: 'Sun', value: 49 },
]

export const demoRepositoryIntelligence = {
  files: {
    total: 14286,
    items: [
      { path: 'src/billing/InvoicePipeline.ts', name: 'InvoicePipeline.ts', extension: '.ts', fileType: 'code', language: 'TypeScript', size: 18420, depth: 3 },
      { path: 'src/auth/sessionStore.ts', name: 'sessionStore.ts', extension: '.ts', fileType: 'code', language: 'TypeScript', size: 9860, depth: 3 },
      { path: 'src/api/reportRoutes.ts', name: 'reportRoutes.ts', extension: '.ts', fileType: 'code', language: 'TypeScript', size: 7340, depth: 3 },
      { path: 'docs/architecture/system.md', name: 'system.md', extension: '.md', fileType: 'documentation', language: 'Markdown', size: 12100, depth: 3 },
      { path: 'package.json', name: 'package.json', extension: '.json', fileType: 'config', language: 'JSON', size: 2650, depth: 1 },
    ],
  },
  dependencies: {
    total: 812,
    items: [
      { sourceFile: 'src/billing/InvoicePipeline.ts', targetFile: 'src/billing/tax.ts', type: 'import', importPath: './tax', resolved: true },
      { sourceFile: 'src/billing/InvoicePipeline.ts', targetFile: 'src/queue/retryPolicy.ts', type: 'import', importPath: '../queue/retryPolicy', resolved: true },
      { sourceFile: 'src/auth/sessionStore.ts', targetFile: 'src/db/redis.ts', type: 'import', importPath: '../db/redis', resolved: true },
      { sourceFile: 'src/api/reportRoutes.ts', targetFile: 'src/reports/generator.ts', type: 'import', importPath: '../reports/generator', resolved: true },
      { sourceFile: 'src/reports/generator.ts', targetFile: 'src/billing/InvoicePipeline.ts', type: 'import', importPath: '../billing/InvoicePipeline', resolved: true },
    ],
  },
  commits: {
    total: 100,
    items: [
      { hash: 'b91a4f2', author: 'Maya Chen', message: 'Remove legacy webhook orchestration', date: '2026-07-25T10:30:00.000Z', changedFiles: ['src/billing/InvoicePipeline.ts'] },
      { hash: '8c4d129', author: 'Noah Williams', message: 'Add repository health report route', date: '2026-07-24T08:10:00.000Z', changedFiles: ['src/api/reportRoutes.ts'] },
      { hash: '72f1ea0', author: 'Maya Chen', message: 'Harden session refresh handling', date: '2026-07-22T14:45:00.000Z', changedFiles: ['src/auth/sessionStore.ts'] },
    ],
  },
  documentation: {
    total: 94,
    items: [
      { path: 'README.md', fileName: 'README.md', type: 'readme', summary: 'Platform setup, local development, and service overview.', size: 8400 },
      { path: 'docs/architecture/system.md', fileName: 'system.md', type: 'architecture', summary: 'Core services and data movement across the platform.', size: 12100 },
      { path: 'docs/api/authentication.md', fileName: 'authentication.md', type: 'api', summary: 'Authentication endpoints and session lifecycle.', size: 6700 },
    ],
  },
  contributors: [
    { name: 'Maya Chen', email: 'maya@acme.dev', commitCount: 42, firstCommitAt: '2025-10-05T00:00:00.000Z', lastCommitAt: '2026-07-25T10:30:00.000Z' },
    { name: 'Noah Williams', email: 'noah@acme.dev', commitCount: 31, firstCommitAt: '2025-11-18T00:00:00.000Z', lastCommitAt: '2026-07-24T08:10:00.000Z' },
    { name: 'Priya Shah', email: 'priya@acme.dev', commitCount: 19, firstCommitAt: '2026-01-09T00:00:00.000Z', lastCommitAt: '2026-07-19T16:20:00.000Z' },
  ],
  manifests: [
    {
      path: 'package.json',
      type: 'npm',
      name: '@acme/platform',
      version: '4.8.0',
      dependencies: [
        { name: 'react', version: '^19.2.0', kind: 'dependency' },
        { name: 'express', version: '^5.2.0', kind: 'dependency' },
        { name: 'vite', version: '^8.1.0', kind: 'devDependency' },
      ],
    },
  ],
}
