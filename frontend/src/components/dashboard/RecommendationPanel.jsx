import { CheckCircle2, Sparkles } from 'lucide-react'
import { EmptyPanel, SeverityBadge } from './shared'

export default function RecommendationPanel({
  items = [],
  emptyTitle = 'No AI recommendations yet',
  emptyDescription = 'AI recommendations appear here after the Risk Intelligence and AI Explainability engines have processed this repository.',
}) {
  if (items.length === 0) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} icon={Sparkles} />
  }

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink-1)]">AI recommendations</h2>
          <p className="mt-1 text-[0.8125rem] text-[var(--ink-3)]">
            Prioritized remediation work with explainable evidence.
          </p>
        </div>
        <Sparkles size={18} className="text-[var(--ink-4)]" aria-hidden="true" />
      </div>

      <ul className="mt-5 grid gap-4 xl:grid-cols-3">
        {items.map(item => (
          <li key={item.id || item.title}>
            <article className="panel-2 panel-interactive h-full p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-[var(--ink-1)]">{item.title}</h3>
                {/* Impact reuses the severity scale: it grades consequence. */}
                <SeverityBadge severity={item.impact} className="shrink-0" />
              </div>

              <p className="mt-3 text-sm leading-6 text-[var(--ink-2)]">{item.reason}</p>

              <p className="mt-3 text-xs font-semibold text-[var(--ink-3)]">
                Estimated effort: <span className="tnum">{item.effort}</span>
              </p>

              <ul className="mt-3 space-y-2">
                {(item.steps || []).map(step => (
                  <li key={step} className="flex gap-2 text-sm text-[var(--ink-2)]">
                    <CheckCircle2
                      size={15}
                      className="mt-0.5 shrink-0 text-[var(--sev-nominal-ink)]"
                      aria-hidden="true"
                    />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
