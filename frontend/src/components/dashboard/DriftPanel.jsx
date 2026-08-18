import { Clock3, FileWarning } from 'lucide-react'
import { EmptyPanel, SeverityBadge } from './shared'

export default function DriftPanel({
  items = [],
  emptyTitle = 'No drift findings yet',
  emptyDescription = 'Knowledge drift findings appear here after the drift detection engine compares documentation against the analyzed code structure.',
}) {
  if (items.length === 0) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} icon={FileWarning} />
  }

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink-1)]">Knowledge drift queue</h2>
          <p className="mt-1 text-[0.8125rem] text-[var(--ink-3)]">Documentation conflicts that need owner review.</p>
        </div>
        <FileWarning size={18} className="text-[var(--ink-4)]" aria-hidden="true" />
      </div>

      <ul className="mt-5 space-y-3">
        {items.map(item => (
          <li key={item.id || item.title}>
            <article className="panel-2 panel-interactive p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-[var(--ink-1)]">{item.title}</h3>
                  {/* Truncate from the left: the filename is the identifying part. */}
                  <p className="path-truncate mt-1 font-mono text-xs text-[var(--ink-3)]">
                    <bdi>{item.file}</bdi>
                  </p>
                </div>
                <SeverityBadge severity={item.severity} className="shrink-0" />
              </div>

              <p className="mt-3 max-w-[68ch] text-sm leading-6 text-[var(--ink-2)]">{item.evidence}</p>

              {item.semantic && (
                <p className="mt-3 text-xs leading-5 text-[var(--ink-3)]">
                  Semantic signal: {Math.round(Number(item.semantic.similarity || 0) * 100)}% similarity using {item.semantic.model}. Human review required.
                </p>
              )}

              <p className="mt-3 flex items-center gap-2 text-xs font-medium text-[var(--ink-3)]">
                <Clock3 size={13} aria-hidden="true" />
                Open for {item.age}
              </p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
