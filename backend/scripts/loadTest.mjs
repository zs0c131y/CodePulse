#!/usr/bin/env node
/**
 * Minimal, dependency-free HTTP load-testing tool (docs/pending.md item 5).
 * This is the practical half of "load/security testing" that a script can
 * actually do unattended: sustained concurrent request load against a
 * running deployment, reporting latency percentiles and error rates. It
 * does not replace a real security review, and it will happily overwhelm
 * whatever URL you point it at — default target is localhost, and hitting
 * anything else requires an explicit --url flag plus a printed warning.
 *
 * Usage:
 *   node backend/scripts/loadTest.mjs [options]
 *
 * Options:
 *   --url <base>          Base URL to test (default: http://localhost:3000)
 *   --path <path>         Request path (default: /api/health)
 *   --concurrency <n>     Concurrent in-flight requests (default: 10)
 *   --duration <seconds>  How long to run (default: 30)
 *   --method <verb>       HTTP method (default: GET)
 *   --token <bearer>      Optional Authorization: Bearer <token> header
 *   --body <json>         Optional JSON request body (implies method POST
 *                          unless --method is set explicitly)
 *
 * Example — sustained load against the health endpoint:
 *   node backend/scripts/loadTest.mjs --url https://staging.example.com --concurrency 25 --duration 60
 *
 * Example — a repository scan endpoint (needs a real access token):
 *   node backend/scripts/loadTest.mjs --path /api/repositories/analyze \
 *     --method POST --token "$ACCESS_TOKEN" \
 *     --body '{"repoUrl":"https://github.com/octocat/Hello-World"}' \
 *     --concurrency 3 --duration 20
 *
 * Git Bash / MSYS on Windows rewrites a leading "/" in a shell argument into
 * a Windows filesystem path (e.g. "/api/health" -> "C:/Program Files/api/health"),
 * which silently breaks --path. If you're on Git Bash, prefix the command
 * with MSYS_NO_PATHCONV=1, or run it from PowerShell/cmd instead.
 */

function parseArgs(argv) {
  const args = { url: 'https://codepulse.fly.dev', path: '/api/health', concurrency: 10000, duration: 600, method: null, token: null, body: null }
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]
    const value = argv[index + 1]
    if (flag === '--url') { args.url = value; index += 1 }
    else if (flag === '--path') { args.path = value; index += 1 }
    else if (flag === '--concurrency') { args.concurrency = Number(value); index += 1 }
    else if (flag === '--duration') { args.duration = Number(value); index += 1 }
    else if (flag === '--method') { args.method = value; index += 1 }
    else if (flag === '--token') { args.token = value; index += 1 }
    else if (flag === '--body') { args.body = value; index += 1 }
    else if (flag === '--help' || flag === '-h') { args.help = true }
  }
  args.method = args.method || (args.body ? 'POST' : 'GET')
  return args
}

function percentile(sortedValues, fraction) {
  if (sortedValues.length === 0) return 0
  const index = Math.min(sortedValues.length - 1, Math.floor(fraction * sortedValues.length))
  return sortedValues[index]
}

async function runLoadTest({ url, path, concurrency, duration, method, token, body }) {
  const target = new URL(path, url)
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }
  const deadline = Date.now() + duration * 1000

  const latenciesMs = []
  const statusCounts = new Map()
  let networkErrors = 0
  let totalRequests = 0

  async function worker() {
    while (Date.now() < deadline) {
      const startedAt = performance.now()
      try {
        const response = await fetch(target, { method, headers, body })
        await response.arrayBuffer() // drain the body so the connection is freed
        latenciesMs.push(performance.now() - startedAt)
        statusCounts.set(response.status, (statusCounts.get(response.status) || 0) + 1)
      } catch {
        latenciesMs.push(performance.now() - startedAt)
        networkErrors += 1
      }
      totalRequests += 1
    }
  }

  const startedAt = Date.now()
  await Promise.all(Array.from({ length: concurrency }, worker))
  const wallSeconds = (Date.now() - startedAt) / 1000

  latenciesMs.sort((left, right) => left - right)

  return {
    totalRequests,
    wallSeconds,
    requestsPerSecond: Math.round((totalRequests / wallSeconds) * 10) / 10,
    networkErrors,
    statusCounts: Object.fromEntries(statusCounts),
    latency: {
      minMs: Math.round(latenciesMs[0] || 0),
      p50Ms: Math.round(percentile(latenciesMs, 0.5)),
      p95Ms: Math.round(percentile(latenciesMs, 0.95)),
      p99Ms: Math.round(percentile(latenciesMs, 0.99)),
      maxMs: Math.round(latenciesMs.at(-1) || 0),
    },
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    console.log('See the header comment in this file for usage and examples.')
    return
  }

  const isLocal = /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])/i.test(args.url)
  if (!isLocal) {
    console.log(`⚠ Targeting a non-local URL: ${args.url}`)
    console.log('  This will generate sustained concurrent load. Only run this against')
    console.log('  a deployment you own and expect to load-test.')
  }

  console.log(`Load testing ${args.method} ${new URL(args.path, args.url)}`)
  console.log(`  concurrency=${args.concurrency} duration=${args.duration}s`)

  const result = await runLoadTest(args)

  console.log('\nResults:')
  console.log(`  total requests   : ${result.totalRequests}`)
  console.log(`  wall time        : ${result.wallSeconds.toFixed(1)}s`)
  console.log(`  requests/sec     : ${result.requestsPerSecond}`)
  console.log(`  network errors   : ${result.networkErrors}`)
  console.log(`  status counts    : ${JSON.stringify(result.statusCounts)}`)
  console.log(`  latency (ms)     : min=${result.latency.minMs} p50=${result.latency.p50Ms} p95=${result.latency.p95Ms} p99=${result.latency.p99Ms} max=${result.latency.maxMs}`)

  const successCount = Object.entries(result.statusCounts)
    .filter(([status]) => Number(status) < 500)
    .reduce((sum, [, count]) => sum + count, 0)
  const errorRate = result.totalRequests === 0 ? 0 : 1 - (successCount / result.totalRequests)
  console.log(`  error rate       : ${(errorRate * 100).toFixed(1)}%`)
}

main().catch(error => {
  console.error('Load test failed:', error)
  process.exitCode = 1
})
