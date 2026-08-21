import { useEffect, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Select } from '../ui/select'
import { EmptyPanel } from './shared'
import {
  getAiStatus,
  generateRiskExplanation,
  getRiskExplanation,
  generateExecutiveSummary,
  getExecutiveSummary,
} from '../../api/ai'

function friendlyAiError(error, fallback) {
  if (error?.status === 502) return 'The AI service is temporarily offline. Your saved risk scores and recommendations are still available.'
  if (error?.status === 503) return 'AI explanations are not enabled for this deployment.'
  if (error?.status === 429) return 'The AI service is busy right now. Please try again in a moment.'
  return error?.message || fallback
}

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
      setError(friendlyAiError(requestError, 'The summary could not be generated. Please try again.'))
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
            A plain-language overview for leads, based only on the stored health, risk, and drift evidence.
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
        !loading && <p className="mt-3 text-sm text-[var(--ink-3)]">Generate a summary when you need a quick repository health briefing.</p>
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
      setError(friendlyAiError(requestError, 'This file could not be explained right now. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const output = explanation?.output

  return (
    <article className="panel-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-all font-mono text-xs font-medium text-[var(--ink-1)]">{module.path}</p>
          <p className="mt-1 text-xs text-[var(--ink-3)]">{module.risk} risk · explanation uses this file’s saved flag triggers</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={handleGenerate} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {output ? 'Regenerate' : 'Explain with AI'}
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-[var(--sev-critical-ink)]">{error}</p>}

      {output && (
        <div className="mt-3 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-3)]">What this means</h4>
          <p className="text-sm leading-6 text-[var(--ink-2)]">{output.explanation}</p>
          {output.implications?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-3)]">Possible impact</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--ink-2)]">
                {output.implications.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
          {output.actionPlan?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-3)]">Recommended plan</h4>
              <ol className="mt-2 space-y-2 text-sm text-[var(--ink-2)]">
                {output.actionPlan.map(step => (
                  <li key={step.step}>
                    <span className="font-semibold text-[var(--ink-1)]">{step.step}. {step.title}</span>
                    {' — '}{step.description}
                    <span className="ml-1 text-xs text-[var(--ink-3)]">({step.priority})</span>
                  </li>
                ))}
              </ol>
            </div>
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
  const [selectedModulePath, setSelectedModulePath] = useState('')

  useEffect(() => {
    if (!repositoryId) return
    let cancelled = false
    setConfigured(null)
    getAiStatus(accessToken, repositoryId)
      .then(value => { if (!cancelled) setConfigured(value) })
      .catch(() => { if (!cancelled) setConfigured(false) })
    return () => { cancelled = true }
  }, [accessToken, repositoryId])

  useEffect(() => {
    setSelectedModulePath(current => (
      topRiskModules.some(module => module.path === current) ? current : topRiskModules[0]?.path || ''
    ))
  }, [topRiskModules])

  if (!repositoryId) return null

  if (configured === false) {
    return (
      <EmptyPanel
        title="AI explanations are not configured"
        description="AI explanations are not enabled here. You can still use the risk scores, flag evidence, and recommended changes above."
        icon={Sparkles}
      />
    )
  }

  const selectedModule = topRiskModules.find(module => module.path === selectedModulePath) || null
  const moduleOptions = topRiskModules.map(module => ({
    value: module.path,
    label: `${module.path} · ${module.risk} risk`,
  }))

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink-1)]">AI explanations</h2>
          <p className="mt-1 max-w-2xl text-[0.8125rem] leading-5 text-[var(--ink-3)]">
            Ask for a plain-language explanation when you need one. AI runs only after you select Generate or Explain with AI, and it uses saved evidence rather than repository source.
          </p>
        </div>
        <Sparkles size={18} className="text-[var(--ink-4)]" aria-hidden="true" />
      </div>

      <div className="mt-5 space-y-4">
        <ExecutiveSummaryCard accessToken={accessToken} repositoryId={repositoryId} />
        {topRiskModules.length > 0 ? (
          <div className="panel-2 p-4">
            <div className="max-w-xl">
              <span className="overline mb-1.5 block text-[var(--ink-3)]">File to explain</span>
              <Select
                value={selectedModulePath}
                onChange={setSelectedModulePath}
                options={moduleOptions}
                ariaLabel="High-risk file to explain"
              />
            </div>
            <div className="mt-3">
              {selectedModule && (
                <RiskExplanationCard
                  key={selectedModule.path}
                  accessToken={accessToken}
                  repositoryId={repositoryId}
                  module={selectedModule}
                />
              )}
            </div>
          </div>
        ) : (
          <p className="rounded-[var(--r-md)] border border-[var(--line-1)] bg-[var(--surface-2)] p-4 text-sm text-[var(--ink-3)]">
            No high-risk files need an AI explanation right now.
          </p>
        )}
      </div>
    </section>
  )
}
