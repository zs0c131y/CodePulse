import test from 'node:test'
import assert from 'node:assert/strict'
import {
  scansTotal,
  scanDurationSeconds,
  analysisQueueActiveWorkers,
  renderMetrics,
  resetMetricsForTesting,
} from '../src/observability/metrics.js'

test.beforeEach(() => {
  resetMetricsForTesting()
})

test('renderMetrics emits well-formed Prometheus counter and gauge exposition lines', () => {
  scansTotal.inc({ status: 'completed' })
  scansTotal.inc({ status: 'completed' })
  scansTotal.inc({ status: 'failed' })
  analysisQueueActiveWorkers.set({}, 3)

  const output = renderMetrics()

  assert.match(output, /# HELP codepulse_scans_total /)
  assert.match(output, /# TYPE codepulse_scans_total counter/)
  assert.match(output, /codepulse_scans_total\{status="completed"\} 2/)
  assert.match(output, /codepulse_scans_total\{status="failed"\} 1/)
  assert.match(output, /# TYPE codepulse_analysis_queue_active_workers gauge/)
  assert.match(output, /codepulse_analysis_queue_active_workers 3/)
})

test('histogram buckets are cumulative and record sum/count', () => {
  scanDurationSeconds.observe({}, 0.4)
  scanDurationSeconds.observe({}, 45)
  scanDurationSeconds.observe({}, 700)

  const output = renderMetrics()

  assert.match(output, /codepulse_scan_duration_seconds_bucket\{le="0\.5"\} 1/)
  assert.match(output, /codepulse_scan_duration_seconds_bucket\{le="60"\} 2/)
  assert.match(output, /codepulse_scan_duration_seconds_bucket\{le="\+Inf"\} 3/)
  assert.match(output, /codepulse_scan_duration_seconds_sum 745\.4/)
  assert.match(output, /codepulse_scan_duration_seconds_count 3/)
})

test('labels with different values are tracked as distinct series', () => {
  scansTotal.inc({ status: 'completed' }, 5)
  scansTotal.inc({ status: 'failed' }, 2)

  const output = renderMetrics()
  const completedLine = output.split('\n').find(line => line.includes('status="completed"'))
  const failedLine = output.split('\n').find(line => line.includes('status="failed"'))

  assert.match(completedLine, /5$/)
  assert.match(failedLine, /2$/)
})

test('resetMetricsForTesting clears recorded values without breaking future renders', () => {
  scansTotal.inc({ status: 'completed' })
  resetMetricsForTesting()

  const output = renderMetrics()
  assert.doesNotMatch(output, /codepulse_scans_total\{/)

  scansTotal.inc({ status: 'completed' })
  assert.match(renderMetrics(), /codepulse_scans_total\{status="completed"\} 1/)
})
