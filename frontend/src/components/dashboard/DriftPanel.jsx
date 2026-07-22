import { Clock3, FileWarning } from 'lucide-react'
import { EmptyPanel } from './shared'
import { severityClass } from './utils'

export default function DriftPanel({ items = [], emptyTitle = 'No drift findings yet', emptyDescription = 'Knowledge drift findings appear here after the drift detection engine compares documentation against the analyzed code structure.' }) {
  if (items.length === 0) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} icon={FileWarning} />
  }

  return (
    <section className="glass-panel card-hover rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-white">Knowledge drift queue</h2>
          <p className="mt-1 text-sm text-mist-500">Documentation conflicts that need owner review.</p>
        </div>
        <FileWarning size={18} className="text-amber-300" />
      </div>
      <div className="mt-5 space-y-3">
        {items.map(item => (
          <article key={item.id || item.title} className="glass-chip rounded-xl p-4 transition-colors hover:border-white/[0.14]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-1 font-mono text-xs text-mist-500">{item.file}</p>
              </div>
              <span className={`inline-flex rounded-lg border px-2 py-1 text-xs font-bold ${severityClass(item.severity)}`}>
                {item.severity}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-mist-400">{item.evidence}</p>
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-mist-500">
              <Clock3 size={13} />
              Open for {item.age}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
