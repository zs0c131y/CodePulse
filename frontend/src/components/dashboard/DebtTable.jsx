import { Code2 } from 'lucide-react'
import { EmptyPanel, SeverityBadge } from './shared'

export default function DebtTable({
  items = [],
  title = 'Highest-risk modules',
  description = 'Ranked by complexity, churn, duplication, and drift adjacency.',
  emptyTitle = 'No module debt data yet',
  emptyDescription = 'Technical debt scoring runs after a repository scan completes. Module rows appear here once the debt engine has processed the repository.',
}) {
  if (items.length === 0) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} icon={Code2} />
  }

  return (
    <section className="glass-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line-1)] p-6">
        <div>
          <h2 className="text-base font-semibold text-[var(--ink-1)]">{title}</h2>
          <p className="mt-1 text-sm text-[var(--ink-3)]">{description}</p>
        </div>
      </div>

      {/* Horizontal rules only — vertical grid lines add ink without adding
          information. */}
      <div className="hidden lg:block">
        <table className="w-full table-fixed text-left">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="overline bg-[var(--surface-2)] text-[var(--ink-3)]">
              <th scope="col" className="w-[34%] px-5 py-3 font-semibold">Module</th>
              <th scope="col" className="w-[14%] px-5 py-3 font-semibold">Owner</th>
              <th scope="col" className="w-[20%] px-5 py-3 font-semibold">Complexity</th>
              <th scope="col" className="w-[10%] px-5 py-3 font-semibold">Churn</th>
              <th scope="col" className="w-[12%] px-5 py-3 font-semibold">Duplication</th>
              <th scope="col" className="w-[10%] px-5 py-3 font-semibold">Risk</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr
                key={item.module}
                className="border-t border-[var(--line-1)] transition-colors duration-[var(--d-1)] hover:bg-[var(--surface-2)]"
              >
                <td className="min-w-0 px-5 py-4">
                  <p
                    className="path-truncate font-mono text-sm font-medium text-[var(--ink-1)]"
                    title={item.module}
                  >
                    <bdi>{item.module}</bdi>
                  </p>
                  <p className="text-xs text-[var(--ink-4)]">Last touched in recent scan window</p>
                </td>
                <td className="px-5 py-4 text-sm text-[var(--ink-2)]">
                  <span className="block truncate">{item.owner}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                      <div
                        className="h-full rounded-full bg-[var(--series-1)]"
                        style={{ width: `${item.complexity}%` }}
                      />
                    </div>
                    <span className="tnum text-sm font-semibold text-[var(--ink-1)]">{item.complexity}</span>
                  </div>
                </td>
                <td className="tnum px-5 py-4 text-sm font-medium text-[var(--ink-2)]">{item.churn}</td>
                <td className="tnum px-5 py-4 text-sm font-medium text-[var(--ink-2)]">{item.duplication}</td>
                <td className="px-5 py-4">
                  <SeverityBadge severity={item.risk} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards below lg, so the page never scrolls horizontally. */}
      <ul className="grid gap-3 p-4 lg:hidden">
        {items.map(item => (
          <li key={item.module}>
            <article className="panel-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3
                    className="path-truncate font-mono text-sm font-medium text-[var(--ink-1)]"
                    title={item.module}
                  >
                    <bdi>{item.module}</bdi>
                  </h3>
                  <p className="mt-1 text-xs text-[var(--ink-3)]">{item.owner}</p>
                </div>
                <SeverityBadge severity={item.risk} className="shrink-0" />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                {[
                  ['Complexity', item.complexity],
                  ['Churn', item.churn],
                  ['Duplication', item.duplication],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="overline text-[var(--ink-3)]">{label}</dt>
                    <dd className="tnum mt-1 text-lg font-semibold text-[var(--ink-1)]">{value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
