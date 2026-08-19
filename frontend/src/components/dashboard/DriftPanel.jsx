import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, FileWarning, Loader2, Sparkles, XCircle } from 'lucide-react'
import { EmptyPanel, SeverityBadge } from './shared'
import { generateDriftExplanation, getDriftExplanation } from '../../api/ai'

function DriftAiExplanation({ accessToken, repositoryId, findingId }) {
  const [explanation, setExplanation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setExplanation(null)
    setError('')
    getDriftExplanation(accessToken, repositoryId, findingId)
      .then(result => { if (!cancelled) setExplanation(result) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [accessToken, repositoryId, findingId])

  async function handleGenerate() {
    setLoading(true)
    setError('')
    try {
      const result = await generateDriftExplanation(accessToken, repositoryId, findingId)
      setExplanation(result)
    } catch (requestError) {
      setError(requestError.message || 'Could not generate an explanation for this finding.')
    } finally {
      setLoading(false)
    }
  }

  const output = explanation?.output

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-[var(--r-xs)] border border-[var(--line-2)] px-2 py-1 text-xs font-medium text-[var(--ink-2)] disabled:opacity-50"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
        {output ? 'Regenerate explanation' : 'Explain with AI'}
      </button>

      {error && <p className="mt-2 text-xs text-[var(--sev-critical-ink)]">{error}</p>}

      {output && (
        <div className="mt-3 space-y-2 rounded-[var(--r-sm)] border border-[var(--line-2)] bg-[var(--surface-2)] p-3 text-sm leading-6 text-[var(--ink-2)]">
          <p><span className="font-semibold text-[var(--ink-1)]">Explanation: </span>{output.explanation}</p>
          <p><span className="font-semibold text-[var(--ink-1)]">Evidence: </span>{output.evidence}</p>
          <div>
            <span className="font-semibold text-[var(--ink-1)]">Suggested update:</span>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded-[var(--r-xs)] bg-[var(--surface-1)] p-2 font-mono text-xs text-[var(--ink-2)]">{output.remediation}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DriftPanel({
  items = [],
  emptyTitle = 'No drift findings yet',
  emptyDescription = 'Knowledge drift findings appear here after the drift detection engine compares documentation against the analyzed code structure.',
  onReview,
  reviewingId = null,
  accessToken,
  repositoryId,
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
                <div className="mt-3">
                  <p className="text-xs leading-5 text-[var(--ink-3)]">Semantic signal: {Math.round(Number(item.semantic.similarity || 0) * 100)}% similarity using {item.semantic.model}. Human review required.</p>
                  {item.reviewStatus ? <p className="mt-2 text-xs font-medium capitalize text-[var(--sev-nominal-ink)]">Review {item.reviewStatus}</p> : onReview && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => onReview(item, 'confirmed')} disabled={reviewingId === item.id} className="inline-flex items-center gap-1.5 rounded-[var(--r-xs)] border border-[var(--sev-nominal-line)] px-2 py-1 text-xs font-medium text-[var(--sev-nominal-ink)] disabled:opacity-50"><CheckCircle2 size={13} />Confirm</button>
                      <button type="button" onClick={() => onReview(item, 'dismissed')} disabled={reviewingId === item.id} className="inline-flex items-center gap-1.5 rounded-[var(--r-xs)] border border-[var(--line-2)] px-2 py-1 text-xs font-medium text-[var(--ink-2)] disabled:opacity-50"><XCircle size={13} />Dismiss</button>
                    </div>
                  )}
                </div>
              )}

              {item.semantic && accessToken && repositoryId && item.id && (
                <DriftAiExplanation accessToken={accessToken} repositoryId={repositoryId} findingId={item.id} />
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
