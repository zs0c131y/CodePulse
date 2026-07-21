import { Code2 } from 'lucide-react'
import { EmptyPanel } from './shared'
import { severityClass } from './utils'

export default function DebtTable({ items = [], title = 'Highest-risk modules', description = 'Ranked by complexity, churn, duplication, and drift adjacency.', emptyTitle = 'No module debt data yet', emptyDescription = 'Technical debt scoring runs after a repository scan completes. Module rows appear here once the debt engine has processed the repository.' }) {
  if (items.length === 0) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} icon={Code2} />
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
        <div>
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="hidden lg:block">
        <table className="w-full table-fixed text-left">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="w-[34%] px-5 py-3">Module</th>
              <th className="w-[14%] px-5 py-3">Owner</th>
              <th className="w-[20%] px-5 py-3">Complexity</th>
              <th className="w-[10%] px-5 py-3">Churn</th>
              <th className="w-[12%] px-5 py-3">Duplication</th>
              <th className="w-[10%] px-5 py-3">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(item => (
              <tr key={item.module} className="hover:bg-slate-50/80">
                <td className="min-w-0 px-5 py-4">
                  <p className="truncate font-semibold text-slate-900" title={item.module}>
                    {item.module}
                  </p>
                  <p className="text-xs text-slate-500">Last touched in recent scan window</p>
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">
                  <span className="block truncate">{item.owner}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-2 min-w-0 flex-1 rounded-full bg-cyan-100">
                      <div className="h-full rounded-full bg-cyan-500" style={{ width: `${item.complexity}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{item.complexity}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-700">{item.churn}</td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-700">{item.duplication}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${severityClass(item.risk)}`}>
                    {item.risk}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 p-4 lg:hidden">
        {items.map(item => (
          <article key={item.module} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-slate-900" title={item.module}>
                  {item.module}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{item.owner}</p>
              </div>
              <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-bold ${severityClass(item.risk)}`}>
                {item.risk}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Complexity</p>
                <p className="mt-1 font-bold text-slate-950">{item.complexity}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Churn</p>
                <p className="mt-1 font-bold text-slate-950">{item.churn}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Duplication</p>
                <p className="mt-1 font-bold text-slate-950">{item.duplication}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
