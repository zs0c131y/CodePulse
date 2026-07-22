import { CheckCircle2, Sparkles } from 'lucide-react'
import { EmptyPanel } from './shared'
import { severityClass } from './utils'

export default function RecommendationPanel({ items = [], emptyTitle = 'No AI recommendations yet', emptyDescription = 'AI recommendations appear here after the Risk Intelligence and AI Explainability engines have processed this repository.' }) {
  if (items.length === 0) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} icon={Sparkles} />
  }

  return (
    <section className="glass-panel card-hover rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-white">AI recommendations</h2>
          <p className="mt-1 text-sm text-mist-500">Prioritized remediation work with explainable evidence.</p>
        </div>
        <Sparkles size={18} className="text-cyan-300" />
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {items.map(item => (
          <article key={item.id || item.title} className="glass-chip rounded-xl p-4 transition-all duration-300 hover:border-white/[0.14]">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display font-bold text-white">{item.title}</h3>
              <span className={`shrink-0 rounded-lg border px-2 py-1 text-xs font-bold ${severityClass(item.impact)}`}>
                {item.impact}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-mist-400">{item.reason}</p>
            <p className="mt-3 text-xs font-bold text-mist-500">Estimated effort: {item.effort}</p>
            <ul className="mt-3 space-y-2">
              {(item.steps || []).map(step => (
                <li key={step} className="flex gap-2 text-sm text-mist-300">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-300" />
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
