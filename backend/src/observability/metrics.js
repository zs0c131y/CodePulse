/**
 * Minimal, dependency-free Prometheus text-exposition-format registry
 * (docs/pending.md item 5 — observability). Deliberately hand-rolled rather
 * than adding a client library: the surface needed here is three metric
 * types and one render function, and the project otherwise keeps its
 * dependency list to what each feature strictly requires.
 *
 * https://prometheus.io/docs/instrumenting/exposition_formats/
 */

function labelString(labels) {
  const entries = Object.entries(labels || {}).filter(([, value]) => value !== undefined && value !== null)
  if (entries.length === 0) return ''
  return `{${entries.map(([key, value]) => `${key}="${String(value).replace(/"/g, '\\"')}"`).join(',')}}`
}

class Counter {
  constructor(name, help) {
    this.name = name
    this.help = help
    this.type = 'counter'
    this.values = new Map()
  }

  inc(labels = {}, value = 1) {
    const key = labelString(labels)
    this.values.set(key, (this.values.get(key) || 0) + value)
  }

  render() {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} ${this.type}`]
    for (const [key, value] of this.values) lines.push(`${this.name}${key} ${value}`)
    return lines
  }
}

class Gauge {
  constructor(name, help) {
    this.name = name
    this.help = help
    this.type = 'gauge'
    this.values = new Map()
  }

  set(labels, value) {
    this.values.set(labelString(labels), value)
  }

  render() {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} ${this.type}`]
    for (const [key, value] of this.values) lines.push(`${this.name}${key} ${value}`)
    return lines
  }
}

const DEFAULT_BUCKETS_SECONDS = [0.1, 0.5, 1, 5, 15, 30, 60, 120, 300, 600, 1800, 3600]

class Histogram {
  constructor(name, help, buckets = DEFAULT_BUCKETS_SECONDS) {
    this.name = name
    this.help = help
    this.type = 'histogram'
    this.buckets = buckets
    this.perLabel = new Map()
  }

  observe(labels = {}, valueSeconds) {
    const key = labelString(labels)
    const entry = this.perLabel.get(key) || {
      counts: new Array(this.buckets.length).fill(0),
      sum: 0,
      count: 0,
    }
    for (let index = 0; index < this.buckets.length; index += 1) {
      if (valueSeconds <= this.buckets[index]) entry.counts[index] += 1
    }
    entry.sum += valueSeconds
    entry.count += 1
    this.perLabel.set(key, entry)
  }

  render() {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} ${this.type}`]
    for (const [key, entry] of this.perLabel) {
      const baseLabels = key.slice(1, -1)
      for (let index = 0; index < this.buckets.length; index += 1) {
        const labelPart = baseLabels ? `${baseLabels},le="${this.buckets[index]}"` : `le="${this.buckets[index]}"`
        lines.push(`${this.name}_bucket{${labelPart}} ${entry.counts[index]}`)
      }
      const infLabelPart = baseLabels ? `${baseLabels},le="+Inf"` : 'le="+Inf"'
      lines.push(`${this.name}_bucket{${infLabelPart}} ${entry.count}`)
      lines.push(`${this.name}_sum${key} ${entry.sum}`)
      lines.push(`${this.name}_count${key} ${entry.count}`)
    }
    return lines
  }
}

export const scansTotal = new Counter('codepulse_scans_total', 'Repository scans completed, by outcome')
export const scanDurationSeconds = new Histogram('codepulse_scan_duration_seconds', 'Repository scan duration in seconds')
export const scheduledScansTotal = new Counter('codepulse_scheduled_scans_total', 'Scheduler ticks that started or skipped a scan')
export const aiRequestsTotal = new Counter('codepulse_ai_requests_total', 'AI Explainability generation calls, by outcome')
export const aiRequestDurationSeconds = new Histogram('codepulse_ai_request_duration_seconds', 'AI Explainability generation call duration in seconds')
export const httpRequestsTotal = new Counter('codepulse_http_requests_total', 'HTTP requests handled, by status class')
export const rateLimitedRequestsTotal = new Counter('codepulse_rate_limited_requests_total', 'Requests rejected with 429 by the rate limiter')

export const analysisQueueActiveWorkers = new Gauge('codepulse_analysis_queue_active_workers', 'Currently running repository analysis workers')
export const analysisQueuePendingJobs = new Gauge('codepulse_analysis_queue_pending_jobs', 'Repository analysis jobs waiting for a free worker')
export const analysisQueueScheduledJobs = new Gauge('codepulse_analysis_queue_scheduled_jobs', 'Repository analysis jobs tracked as scheduled (active + pending)')
export const dbCollectionDocuments = new Gauge('codepulse_db_collection_documents', 'Approximate document count per collection')

const registry = [
  scansTotal,
  scanDurationSeconds,
  scheduledScansTotal,
  aiRequestsTotal,
  aiRequestDurationSeconds,
  httpRequestsTotal,
  rateLimitedRequestsTotal,
  analysisQueueActiveWorkers,
  analysisQueuePendingJobs,
  analysisQueueScheduledJobs,
  dbCollectionDocuments,
]

export function renderMetrics() {
  return `${registry.flatMap(metric => metric.render()).join('\n')}\n`
}

/** Test-only: resets every metric's recorded values without re-creating the module. */
export function resetMetricsForTesting() {
  for (const metric of registry) {
    if (metric.values) metric.values.clear()
    if (metric.perLabel) metric.perLabel.clear()
  }
}
