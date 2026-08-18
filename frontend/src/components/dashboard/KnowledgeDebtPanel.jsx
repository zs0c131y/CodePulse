import { BookOpenCheck } from 'lucide-react'
import { EmptyPanel } from './shared'

function Metric({ label, value, detail }) {
  return (
    <div className="panel-2 p-3">
      <p className="tnum text-lg font-semibold text-[var(--ink-1)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--ink-3)]">{label}</p>
      {detail && <p className="mt-1 text-xs text-[var(--ink-4)]">{detail}</p>}
    </div>
  )
}

export default function KnowledgeDebtPanel({ data }) {
  if (!data) return <EmptyPanel title="No Knowledge Debt evidence yet" description="Module explainability and API documentation evidence appear after a completed scan." icon={BookOpenCheck} />

  const metrics = data.metrics || {}
  const modules = data.modules || []
  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <BookOpenCheck size={18} className="mt-0.5 shrink-0 text-[var(--ink-4)]" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink-1)]">Knowledge Debt evidence</h2>
          <p className="mt-1 text-[0.8125rem] text-[var(--ink-3)]">Documentation coverage, API coverage, and onboarding explainability from the latest scan.</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric label="Knowledge Debt" value={`${metrics.knowledgeDebtScore ?? 0}/100`} />
        <Metric label="Onboarding difficulty" value={`${metrics.onboardingDifficultyScore ?? 0}/100`} />
        <Metric label="API coverage" value={`${metrics.apiDocumentationCoverage ?? 100}%`} detail={`${metrics.undocumentedApiRoutes ?? 0} undocumented`} />
        <Metric label="Module explainability" value={`${metrics.averageModuleExplainability ?? 100}%`} />
        <Metric label="Unexplained modules" value={metrics.unexplainedModules ?? 0} />
        <Metric label="Setup / architecture" value={`${metrics.hasSetupDocumentation ? 'Setup' : 'No setup'} · ${metrics.hasArchitectureDocumentation ? 'Architecture' : 'No architecture'}`} />
      </div>
      <ul className="mt-5 divide-y divide-[var(--line-1)]">
        {modules.slice(0, 6).map(module => (
          <li key={module.path} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0"><p className="truncate font-mono text-xs text-[var(--ink-2)]">{module.path}</p><p className="mt-1 text-xs text-[var(--ink-3)]">{module.undocumentedApiRoutes || 0} undocumented APIs · {module.documented ? 'documented' : 'no module docs'}</p></div>
            <span className="tnum shrink-0 text-sm font-semibold text-[var(--ink-1)]">{module.explainabilityScore}%</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
