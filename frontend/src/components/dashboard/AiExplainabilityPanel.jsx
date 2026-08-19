import { useEffect, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { EmptyPanel } from './shared'
import {
  getAiStatus,
  generateRiskExplanation,
  getRiskExplanation,
  generateExecutiveSummary,
  getExecutiveSummary,
} from '../../api/ai'

function ExecutiveSummaryCard({ accessToken, repositoryId }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setSummary(null)
    setError('')
    getExecutiveSummary(accessToken, repositoryId)
      .then(explanation => { if (!cancelled) setSummary(explanation) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [accessToken, repositoryId])

  async function handleGenerate() {
    setLoading(true)
    setError('')
    try {
      const explanation = await generateExecutiveSummary(accessToken, repositoryId)
      setSummary(explanation)
    } catch (requestError) {
      setError(requestError.message || 'Could not generate the executive summary.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <article className="panel-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[var(--ink-1)]">Executive health summary</h3>
          <p className="mt-1 text-[0.8125rem] text-[var(--ink-3)]">
            A leadership-readable summary generated from the stored health, risk, and drift evidence.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={handleGenerate} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {summary ? 'Regenerate' : 'Generate'}
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-[var(--sev-critical-ink)]">{error}</p>}

      {summary ? (
        <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--ink-2)]">
          {String(summary.output?.summary || '').split(/\n{2,}/).filter(Boolean).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          <p className="text-xs text-[var(--ink-4)]">Generated {new Date(summary.generatedAt).toLocaleString()}</p>
        </div>
      ) : (
        !loading && <p className="mt-3 text-sm text-[var(--ink-3)]">No executive summary generated yet.</p>
      )}
    </article>
  )
}

function RiskExplanationCard({ accessToken, repositoryId, module }) {
  const [explanation, setExplanation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setExplanation(null)
    setError('')
    getRiskExplanation(accessToken, repositoryId, module.path)
      .then(result => { if (!cancelled) setExplanation(result) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [accessToken, repositoryId, module.path])

  async function handleGenerate() {
    setLoading(true)
    setError('')
    try {
      const result = await generateRiskExplanation(accessToken, repositoryId, module.path)
      setExplanation(result)
    } catch (requestError) {
      setError(requestError.message || 'Could not generate an explanation for this module.')
    } finally {
      setLoading(false)
    }
  }

  const output = explanation?.output

  return (
    <article className="panel-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate font-mono text-xs font-medium text-[var(--ink-1)]" title={module.path}>{module.path}</p>
        <Button type="button" variant="ghost" size="sm" onClick={handleGenerate} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {output ? 'Regenerate' : 'Explain with AI'}
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-[var(--sev-critical-ink)]">{error}</p>}

      {output && (
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-6 text-[var(--ink-2)]">{output.explanation}</p>
          {output.implications?.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--ink-2)]">
              {output.implications.map(item => <li key={item}>{item}</li>)}
            </ul>
          )}
          {output.actionPlan?.length > 0 && (
            <ol className="space-y-2 text-sm text-[var(--ink-2)]">
              {output.actionPlan.map(step => (
                <li key={step.step}>
                  <span className="font-semibold text-[var(--ink-1)]">{step.step}. {step.title}</span>
                  {' — '}{step.description}
                  <span className="ml-1 text-xs text-[var(--ink-4)]">({step.priority})</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </article>
  )
}

/**
 * Opt-in AI Explainability panel (docs/ai/AI_ENGINE.md, Vertical 6). Nothing
 * here is generated automatically — every explanation is requested on demand
 * and stays traceable to the deterministic evidence it was built from.
 */
export default function AiExplainabilityPanel({ accessToken, repositoryId, topRiskModules = [] }) {
  const [configured, setConfigured] = useState(null)

  useEffect(() => {
    if (!repositoryId) return
    let cancelled = false
    getAiStatus(accessToken, repositoryId)
      .then(value => { if (!cancelled) setConfigured(value) })
      .catch(() => { if (!cancelled) setConfigured(false) })
    return () => { cancelled = true }
  }, [accessToken, repositoryId])

  if (!repositoryId) return null

  if (configured === false) {
    return (
      <EmptyPanel
        title="AI explanations are not configured"
        description="This deployment has not configured a Gemma model, so AI explanations are unavailable. The deterministic risk scores and recommendations above are unaffected."
        icon={Sparkles}
      />
    )
  }

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink-1)]">AI Explainability</h2>
          <p className="mt-1 text-[0.8125rem] text-[var(--ink-3)]">
            Optional, on-demand explanations generated from the stored evidence above. Nothing here runs automatically.
          </p>
        </div>
        <Sparkles size={18} className="text-[var(--ink-4)]" aria-hidden="true" />
      </div>

      <div className="mt-5 space-y-4">
        <ExecutiveSummaryCard accessToken={accessToken} repositoryId={repositoryId} />
        {topRiskModules.slice(0, 3).map(module => (
          <RiskExplanationCard key={module.path} accessToken={accessToken} repositoryId={repositoryId} module={module} />
        ))}
      </div>
    </section>
  )
}
