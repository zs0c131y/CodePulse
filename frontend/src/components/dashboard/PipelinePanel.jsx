import { AlertTriangle, CheckCircle2, Clock3, Pause, PauseCircle, Play, RefreshCw, X, XCircle } from 'lucide-react'
import { EmptyPanel } from './shared'
import { Button } from '../ui/button'

/**
 * Analysis pipeline. The stage list mirrors the seven verticals in
 * docs/workflow/WORKFLOW.md — showing the machinery is what makes a
 * multi-minute scan feel like progress instead of a hang.
 */
function pipelineStatusMeta(status) {
  if (status === 'Complete') {
    return {
      icon: CheckCircle2,
      badgeClass: 'border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] text-[var(--sev-nominal-ink)]',
      fill: 'var(--sev-nominal)',
    }
  }
  if (status === 'Running') {
    return {
      icon: RefreshCw,
      badgeClass: 'border-[var(--accent-line)] bg-[var(--accent-wash)] text-[var(--accent-ink)]',
      fill: 'var(--accent)',
      spin: true,
    }
  }
  if (status === 'Failed') {
    return {
      icon: AlertTriangle,
      badgeClass: 'border-[var(--sev-critical-line)] bg-[var(--sev-critical-wash)] text-[var(--sev-critical-ink)]',
      fill: 'var(--sev-critical)',
    }
  }
  if (status === 'Paused') {
    return {
      icon: PauseCircle,
      badgeClass: 'border-[var(--sev-medium-line)] bg-[var(--sev-medium-wash)] text-[var(--sev-medium-ink)]',
      fill: 'var(--sev-medium)',
    }
  }
  if (status === 'Cancelled') {
    return {
      icon: XCircle,
      badgeClass: 'border-[var(--line-2)] bg-[var(--surface-3)] text-[var(--ink-3)]',
      fill: 'var(--ink-4)',
    }
  }
  return {
    icon: Clock3,
    badgeClass: 'border-[var(--line-2)] bg-[var(--surface-3)] text-[var(--ink-3)]',
    fill: 'var(--ink-4)',
  }
}

export default function PipelinePanel({
  items = [],
  title = 'Analysis pipeline',
  description = 'Current processing state for the selected repository.',
  taskStatus = null,
  controlLoading = null,
  onPause,
  onResume,
  onCancel,
}) {
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
    <section className="panel p-5 sm:p-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink-1)]">{title}</h2>
          <p className="mt-1 text-[0.8125rem] text-[var(--ink-3)]">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {['queued', 'running'].includes(taskStatus) && onPause && (
            <Button type="button" variant="outline" size="sm" onClick={onPause} disabled={Boolean(controlLoading)}>
              {controlLoading === 'pause' ? <RefreshCw size={14} className="motion-safe-loop animate-spin" /> : <Pause size={14} />}
              Pause
            </Button>
          )}
          {taskStatus === 'paused' && onResume && (
            <Button type="button" variant="outline" size="sm" onClick={onResume} disabled={Boolean(controlLoading)}>
              {controlLoading === 'resume' ? <RefreshCw size={14} className="motion-safe-loop animate-spin" /> : <Play size={14} />}
              Resume
            </Button>
          )}
          {['queued', 'running', 'paused'].includes(taskStatus) && onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={Boolean(controlLoading)}>
              {controlLoading === 'cancel' ? <RefreshCw size={14} className="motion-safe-loop animate-spin" /> : <X size={14} />}
              Cancel
            </Button>
          )}
          {!['queued', 'running', 'paused'].includes(taskStatus) && (
            <RefreshCw size={16} className="text-[var(--ink-4)]" aria-hidden="true" />
          )}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {items.find(item => ['Running', 'Paused', 'Failed', 'Cancelled'].includes(item.status))?.detail || ''}
      </p>

      <ol className="mt-5 space-y-4">
        {items.map(item => {
          const meta = pipelineStatusMeta(item.status)
          const StatusIcon = meta.icon
          const progress = Math.min(100, Math.max(0, Number(item.progress) || 0))

          return (
            <li key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--ink-1)]">{item.label}</p>
                  <p className="text-xs text-[var(--ink-3)]">{item.detail}</p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-[var(--r-xs)] border px-2 py-1 text-xs font-semibold ${meta.badgeClass}`}
                >
                  <StatusIcon
                    size={12}
                    aria-hidden="true"
                    className={meta.spin ? 'motion-safe-loop animate-spin' : ''}
                  />
                  {item.status}
                </span>
              </div>

              <div
                className="h-1 overflow-hidden rounded-full bg-[var(--surface-3)]"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.label} ${progress}% complete`}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out)]"
                  style={{ width: `${progress}%`, background: meta.fill }}
                />
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
