import { Clock3, FileWarning } from 'lucide-react'
import { EmptyPanel } from './shared'
import { severityClass } from './utils'

export default function DriftPanel({ items = [], emptyTitle = 'No drift findings yet', emptyDescription = 'Knowledge drift findings appear here after the drift detection engine compares documentation against the analyzed code structure.' }) {
  if (items.length === 0) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} icon={FileWarning} />
  }

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
        {items.map(item => (
          <article key={item.id || item.title} className="rounded-lg border border-slate-200 p-4">
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
