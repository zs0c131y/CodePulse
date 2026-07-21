import { AlertTriangle, CheckCircle2, Clock3, RefreshCw } from 'lucide-react'
import { EmptyPanel } from './shared'

function pipelineStatusMeta(status) {
  if (status === 'Complete') {
    return { icon: CheckCircle2, badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200', track: 'bg-emerald-100', fill: 'bg-emerald-500' }
  }
  if (status === 'Running') {
    return { icon: RefreshCw, badgeClass: 'text-cyan-700 bg-cyan-50 border-cyan-200', track: 'bg-cyan-100', fill: 'bg-cyan-500', spin: true }
  }
  if (status === 'Failed') {
    return { icon: AlertTriangle, badgeClass: 'text-rose-700 bg-rose-50 border-rose-200', track: 'bg-rose-100', fill: 'bg-rose-500' }
  }
  return { icon: Clock3, badgeClass: 'text-slate-600 bg-slate-50 border-slate-200', track: 'bg-slate-100', fill: 'bg-slate-300' }
}

export default function PipelinePanel({ items = [], title = 'Analysis pipeline', description = 'Current processing state for the selected repository.' }) {
  if (items.length === 0) {
    return (
      <EmptyPanel
        title="No analysis runs yet"
        description="Start a repository scan to see the analysis pipeline in action."
        icon={RefreshCw}
      />
    )
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <RefreshCw size={18} className="text-slate-400" />
      </div>
      <div className="mt-5 space-y-4">
        {items.map(item => {
          const meta = pipelineStatusMeta(item.status)
          const StatusIcon = meta.icon

          return (
            <div key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.detail}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold ${meta.badgeClass}`}>
                  <StatusIcon size={12} className={meta.spin ? 'animate-spin' : ''} />
                  {item.status}
                </span>
              </div>
              <div className={`h-2 rounded-full ${meta.track}`}>
                <div
                  className={`h-full rounded-full ${meta.fill}`}
                  style={{ width: `${item.progress}%` }}
                  aria-label={`${item.label} ${item.progress}% complete`}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
