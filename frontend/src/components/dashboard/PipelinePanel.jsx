import { AlertTriangle, CheckCircle2, Clock3, RefreshCw } from 'lucide-react'
import { EmptyPanel } from './shared'

function pipelineStatusMeta(status) {
  if (status === 'Complete') {
    return { icon: CheckCircle2, badgeClass: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20', track: 'bg-emerald-400/15', fill: 'bg-emerald-400' }
  }
  if (status === 'Running') {
    return { icon: RefreshCw, badgeClass: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/20', track: 'bg-cyan-400/15', fill: 'bg-cyan-400', spin: true }
  }
  if (status === 'Failed') {
    return { icon: AlertTriangle, badgeClass: 'text-rose-300 bg-rose-400/10 border-rose-400/20', track: 'bg-rose-400/15', fill: 'bg-rose-400' }
  }
  return { icon: Clock3, badgeClass: 'text-mist-400 bg-white/[0.05] border-white/[0.08]', track: 'bg-white/[0.07]', fill: 'bg-white/25' }
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
    <section className="glass-panel card-hover rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm text-mist-500">{description}</p>
        </div>
        <RefreshCw size={18} className="text-mist-600" />
      </div>
      <div className="mt-5 space-y-4">
        {items.map(item => {
          const meta = pipelineStatusMeta(item.status)
          const StatusIcon = meta.icon

          return (
            <div key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-mist-100">{item.label}</p>
                  <p className="text-xs text-mist-500">{item.detail}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold ${meta.badgeClass}`}>
                  <StatusIcon size={12} className={meta.spin ? 'animate-spin' : ''} />
                  {item.status}
                </span>
              </div>
              <div className={`h-2 rounded-full ${meta.track}`}>
                <div
                  className={`h-full rounded-full transition-all duration-700 ${meta.fill}`}
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
