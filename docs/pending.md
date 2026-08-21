# CodePulse — Pending Development Work

This file records the work that remains after the currently implemented
repository-analysis pipeline. The application already ingests repositories,
extracts structure/documentation/commits/dependencies, calculates Technical
Debt and Knowledge Debt (including real per-function/class AST complexity,
duplicate-block detection, dependency-chain depth, bug-proneness, and
contributor concentration), detects structural documentation drift, ranks
risk, creates deterministic recommendations, generates opt-in AI explanations
and executive summaries, stores historical score trends, and exposes all of
it through the dashboard and reports APIs.

This file previously understated what had shipped — several items below were
marked "Pending" after the underlying engine had already been built. Each
entry now reflects a direct read of the current code, not the original
development plan's assumptions. The items that remain are the advanced
capabilities that genuinely require new data sources, additional analysis
infrastructure, or a deliberate product decision.

## 1. Semantic Knowledge Drift Detection

**Status:** Implemented, including the AI-generated explanation (Prompt
Blueprint 1).

Structural drift is implemented: undocumented modules, stale module
documentation, and documentation references to deleted source paths are
detected (`backend/src/features/analysis/services/knowledgeDriftAnalyzer.js`).
Semantic comparison is also implemented as an opt-in enrichment
(`semanticDriftAnalyzer.js`, `semanticEmbeddingClient.js`,
`codeOutlineExtractor.js`): it creates compact code outlines from scanned
source files, compares them to matching documentation sections through a
Sentence-Transformers-compatible embedding endpoint, and records
low-similarity results as review leads (`type: 'semantic_mismatch'`) carrying
the model, threshold, similarity score, confidence, and the compared
code/documentation excerpts — this is what now lets CodePulse flag
"documentation says JWT, code uses OAuth"-style mismatches instead of only
structural gaps. Optional Qdrant persistence of the embedding vectors is
non-blocking (a persistence failure never drops the findings).

The enrichment is disabled unless `SEMANTIC_DRIFT_ENABLED=true`. A local
embedding endpoint (`SEMANTIC_EMBEDDING_URL`) can be enabled directly; a
hosted provider additionally requires `SEMANTIC_DRIFT_ALLOW_HOSTED=true`
before code outlines or documentation sections leave the deployment boundary.
Semantic findings can be confirmed or dismissed in the dashboard
(`PATCH /api/repositories/:id/drift/:findingId/review`) and retain that
review state until the next scan replaces the repository snapshot.
AST-derived source outlines (rather than the current heuristic outline
extraction) remain a follow-up improvement.

**Acceptance criteria:** CodePulse can flag a documented interface or behavior
that conflicts with the current code outline (done), show the supporting
code/doc sections (done), and allow a user to mark the result confirmed or
dismissed (done).

Prompt Blueprint 1 (documentation drift explanation and update suggestions,
[docs/ai/AI_ENGINE.md](ai/AI_ENGINE.md)) is implemented end to end: given a
drift finding, `aiExplainabilityService.js` builds the blueprint prompt from
the finding's stored code interface and documentation excerpt (populated for
`semantic_mismatch` findings by the embedding enrichment above), calls the
same self-hosted Gemma model used by Blueprints 2 and 3, and persists a
structured `{ explanation, evidence, remediation }` result to
`ai_explanations` via `POST /api/repositories/:id/ai/drift-explanation`
(`{ findingId }`) / `GET .../ai/drift-explanation?findingId=...`. The
dashboard's Knowledge Drift queue surfaces this as an "Explain with AI"
action on semantic findings
(`frontend/src/components/dashboard/DriftPanel.jsx`). Structural (non-semantic)
findings can also be sent through the same endpoint but degrade gracefully —
the prompt notes the code interface / documentation content as "not captured
for this finding type" since only semantic findings currently carry both.

## 2. Test Coverage and Bug-Proneness Signals

**Status:** Implemented

Bug-proneness is implemented: `technicalDebtAnalyzer.js` classifies commits as
likely fixes using a configurable message pattern
(`bugFixCommitPattern`), tracks `bugFixCount`/`bugFixPercent` per module, and
surfaces "bug-fix hotspot" evidence once a module has at least 2 captured
fixes making up 50%+ of its sampled changes — a weak, transparently-labelled
signal rather than a claim of an objectively defective file.

Test coverage ingestion is implemented for the LCOV format
(`backend/src/features/repositories/services/coverageParser.js`). It reads
whatever coverage report already exists in the cloned repository at scan time
— `coverage/lcov.info`, `coverage/lcov-report/lcov.info`, `.nyc_output/lcov.info`,
or `lcov.info`, checked in that priority order — and never runs a project's
test suite or any other repository command; a missing, empty, oversized
(>8 MB), or unparseable report produces `coverageAvailable: false`, never a
fabricated `0%`. Per-file line coverage feeds `technicalDebtAnalyzer.js` as
`coveragePercent`/`coverageAvailable`, contributes a small debt-score
increment and a `"Low test coverage (N%)"` evidence reason once a module
drops below 40% covered, and rolls up into repository-level
`averageCoveragePercent`/`coverageSampleSize`/`lowCoverageModules` metrics.
Cobertura and Python coverage-XML formats are not implemented — only LCOV,
which covers the common Istanbul/nyc/Jest toolchain output locations.

**Acceptance criteria:** test coverage is an optional input, absent rather
than fabricated when unavailable, and contributes explainable evidence to
module risk alongside the existing bug-fix frequency signal.

## 3. Historical Score Trends and Scan Scheduling

**Status:** Implemented

Historical score storage is implemented: every scan appends an immutable
`repository_score_history` record
(`backend/src/features/analysis/services/analysisStoreCore.js`,
`scoreHistoryRecord`/`persistAnalysisResultsWithCollections`), not a
replace-on-rescan snapshot, and `getRepositoryScore` reads the trend back
sorted by `analyzed_at`. The dashboard's health/risk trend arrays are
populated from real history, not empty placeholders.

Scan scheduling is implemented (`backend/src/features/repositories/services/scanScheduler.js`).
A repository's owner sets a recurring interval via
`PATCH /api/repositories/:repositoryId/schedule` (`{ intervalHours }`, an
integer between `MIN_SCAN_INTERVAL_HOURS` (default 1) and
`MAX_SCAN_INTERVAL_HOURS` (default 720/30 days), or `null` to disable it) —
surfaced in the dashboard as an "Auto re-scan" control next to the repository
console. A background timer (`startScanScheduler()`, started from
`backend/index.js` when `SCAN_SCHEDULER_ENABLED`, ticking every
`SCAN_SCHEDULER_INTERVAL_MS`, default 5 minutes) polls for repositories whose
`next_scan_at` has passed and are not already `queued`/`running`, enqueues
them through the same worker-thread `analysisQueue.js` used by manual scans
(so scheduled scans never block HTTP requests and share the same concurrency
caps), and advances `next_scan_at` regardless of outcome — that is the
scheduler's retry policy: a repository whose scheduled scan fails (dead URL,
GitHub API error, clone failure) is retried at its next normal interval
rather than immediately, so one bad repository can never spin the queue.
Clearing the schedule (`intervalHours: null`) is how a not-yet-started
scheduled scan is cancelled; an in-flight worker cannot be cancelled
mid-scan, matching the existing manual-scan limitation.

**Acceptance criteria:** a repository can be scanned repeatedly on a schedule
without a manual trigger (done), and safely runs scheduled/background scans
without blocking HTTP requests (done — the scheduler only enqueues onto the
existing bounded worker-thread queue).

## 4. Evaluation Dataset and Quality Benchmarking

**Status:** Implemented

A small, purpose-built fixture repository
(`backend/test/fixtures/evaluationCorpus.js`) with a closed, hand-labelled
set of expected findings is built via real `git` commands (not a mocked
analysis input) and run through the actual deterministic pipeline —
`analyzeTechnicalDebt`, `analyzeKnowledgeDebt`, `analyzeKnowledgeDrift`, the
same functions a live scan calls. It deliberately contains a circular
dependency, an oversized file, a high-cyclomatic-complexity function,
duplicated code, a stale module, an undocumented module, a dead
documentation reference, a bug-fix hotspot, and a low-test-coverage file
(via a committed `lcov.info`) — the categories docs/pending.md originally
asked for (cycles, large modules, stale modules, dead documentation links,
missing docs, duplicate code, known complexity cases), plus bug-proneness
and coverage since those signals now exist too (see item 2).
`backend/test/evaluationBenchmark.test.js` computes precision/recall/F1 for
every signal against the labelled ground truth, asserts a debt-score
ranking regression (the deliberately worse modules must outrank a plain
undocumented baseline), and prints a report on every run, tagged with
`CODE_ANALYSIS_VERSION` for traceability. It runs as part of `npm test`, so
CI fails the same way any other regression would if a scoring-rule change
silently stops detecting (or starts over-reporting) one of these categories.

This is a regression benchmark against a documented, versioned ground truth,
not an accuracy claim against an external tool — no SonarQube-equivalent
integration exists, and the harness says so in its own file header rather
than implying a comparison that isn't there.

**Acceptance criteria:** automated evaluation reports precision/recall for
labelled drift cases, regression tests cover scoring thresholds, and benchmark
results are versioned with the analysis algorithm.

## 5. Production Hardening and Scale Validation

**Status:** Partially implemented — observability, wall-clock/network limits,
a Railway container-level resource cap, and a load-testing tool are now in
place; actually running that tool against a live deployment, and Fly-side
container limits, remain open (see below).

Implemented:

* **Bounded concurrency and memory.** Repository scans run in isolated
  `worker_threads` (`repositoryAnalysisWorker.js`) with a configured
  old-generation memory cap and bounded concurrency
  (`ANALYSIS_MAX_CONCURRENCY`, `ANALYSIS_MAX_ACTIVE_PER_USER`, and a bounded
  queue via `ANALYSIS_MAX_QUEUE_SIZE`). Remote repositories use partial,
  no-checkout clones: every tracked path is inventoried while only the files
  selected for content analysis are materialized. Repository size and tracked
  file count are unlimited by default (`REPOSITORY_MAX_SIZE_KB=0` and
  `REPOSITORY_MAX_FILES=0`); deeper dependency and documentation analysis
  retains its evidence caps.
* **Wall-clock scan timeout.** `analysisQueue.js` now terminates any worker
  that exceeds `ANALYSIS_MAX_SCAN_DURATION_MS` (default 2 hours) and
  records it as a normal failure — a stalled clone or a hung network call
  can no longer hold a worker slot indefinitely.
* **Network timeout on outbound manifest fetches.** `manifestFetcher.js`'s
  calls to `raw.githubusercontent.com` now carry an
  `AbortSignal.timeout(MANIFEST_FETCH_TIMEOUT_MS)` (default 10s), matching
  the timeout already present on the GitHub repository-metadata call and the
  git clone itself.
* **An HTTP rate limiter** is wired into `backend/src/app.js`.
* **Observability.** A hand-rolled, dependency-free Prometheus text-format
  registry (`backend/src/observability/metrics.js`) is exposed at
  `GET /api/metrics` (optionally gated by `METRICS_TOKEN`, since scan
  volume/failure data can hint at what an attacker is probing). It reports:
  scan count and duration by outcome (`codepulse_scans_total`,
  `codepulse_scan_duration_seconds` — recorded in the *main* thread from a
  `postMessage` the worker sends back, since `worker_threads` do not share
  module state and metrics recorded inside the worker would otherwise be
  silently discarded when it exits); scheduled-scan outcomes
  (`codepulse_scheduled_scans_total`); AI Explainability call count/duration
  (`codepulse_ai_requests_total`, `codepulse_ai_request_duration_seconds`);
  HTTP requests by status class and rate-limit rejections
  (`codepulse_http_requests_total`, `codepulse_rate_limited_requests_total`);
  analysis queue depth (`codepulse_analysis_queue_*`, sourced from the
  existing `getAnalysisQueueSnapshot()`); and approximate database growth
  per collection (`codepulse_db_collection_documents`).

* **Container-level CPU/memory/disk cap (Railway).** `railway.json`
  (`deploy.limitOverride.containers`) caps the deployed container at 2 vCPU /
  2 GB RAM / 4 GB disk — verified against Railway's actual `railway.json`
  schema (`cpu` in vCPUs, `memoryBytes`/`diskBytes` in bytes) before writing
  it, and deliberately conservative relative to the Hobby plan's per-replica
  ceiling (8 vCPU/8 GB) so it acts as a runaway-usage guard, not a throttle
  on normal operation. Node's `worker_threads` API only bounds memory
  (`ANALYSIS_WORKER_MAX_OLD_GENERATION_MB`), not CPU time or network
  bandwidth for an individual worker — this is the actual mechanism that
  bounds the whole process (main thread + all workers together), since true
  per-worker CPU isolation needs an OS/cgroup primitive `worker_threads`
  doesn't expose. Fly (`fly.toml`) already had an equivalent VM-level cap
  (`memory = "512mb"`, `size = "shared-cpu-2x"`) before this work.
* **A load-testing tool.** `backend/scripts/loadTest.mjs` (`npm run
  load-test`, no new dependency) drives sustained concurrent HTTP load
  against any endpoint and reports requests/sec, status-code breakdown, and
  latency percentiles (p50/p95/p99). Defaults to `localhost`; targeting
  anything else requires an explicit `--url` and prints a warning first,
  since it will genuinely overwhelm whatever it's pointed at. Verified
  against a throwaway local server, not just syntax-checked.

Not implemented: AI provider cost tracking beyond request count/duration (no
per-token or dollar-cost accounting, since the self-hosted Gemma deployment
has no metered billing API to read from). Nobody has actually run
`loadTest.mjs` against a real deployment yet — the tool now exists, but
executing a load/security test and interpreting its results against
production is a decision and an action for whoever owns that deployment, not
something a further code change can do on its own.

**Acceptance criteria:** scans cannot exhaust the web server (bounded
concurrency, memory caps, and the new wall-clock timeout address this),
operational metrics identify failed or slow jobs (done — `/api/metrics`),
and load/security testing covers the repository lifecycle end to end (the
tool to run this exists now; running it against a live deployment and acting
on the results is still open).

## 6. External LLM/RAG Explainability Layer

**Status:** Implemented — all three prompt blueprints (documentation drift
explanation, risk explanation, executive summary) are wired to the
self-hosted Gemma model. See item 1 for Blueprint 1's details.

Current recommendations are deterministic and grounded in stored evidence and
remain fully functional without an AI provider. On top of that, an opt-in AI
Explainability layer calls a self-hosted Gemma model (Ollama-compatible
`/api/generate` via `backend/src/utils/gemma.js`, behind Cloudflare Access)
to turn the same stored evidence into drift explanations, module risk
explanations, and executive summaries. See
[docs/ai/AI_ENGINE.md](ai/AI_ENGINE.md) for configuration, the API surface,
and the implementation boundary.

**Acceptance criteria:** AI generation is opt-in (implemented — every
generation is a caller-initiated POST, never triggered by a scan), bounded by
a request timeout (implemented via `GEMMA_REQUEST_TIMEOUT_MS`), traceable to
stored evidence (implemented — every explanation is persisted with its prompt
version, source model, and generation timestamp in `ai_explanations`), safe
when the provider fails (implemented — provider errors return `502` and never
partially persist a record), and never replaces the deterministic score
calculation (implemented — the technical/knowledge debt, drift, and risk
scores are computed and stored independently of AI availability).

## Implemented (kept here only as a record of prior "Pending" mislabeling)

The following were previously listed as "Pending" in this file. They are
implemented; no further work is tracked for them unless a regression is
found.

* **AST-based static program analysis** — `backend/src/features/repositories/services/astParser.js`
  uses `@babel/parser` (JS/TS/JSX) and `@lezer/python` to extract real
  per-function/per-class decision points and roll them up into complexity
  scores (`complexityMethod: 'source-heuristic'`). Malformed source falls
  back to the metadata heuristic (`'metadata-heuristic'`) rather than failing
  the scan; unsupported languages use the same fallback.
* **Code duplication detection** — `backend/src/features/repositories/services/codeAnalyzer.js`
  (`applyDuplicationMetrics`) hashes 6-line source blocks (SHA-256) to find
  real duplicate blocks and reports `duplicationPercent` per file; it is not
  a `null` stub.
* **Function/class size and dependency-chain-depth metrics** — `technicalDebtAnalyzer.js`
  tracks `longFunctionCount` per module and computes real dependency-chain
  depth from the resolved internal dependency graph, surfaced as
  `dependencyDepth`/`longestDependencyChain`.
* **Contributor concentration and ownership risk** — `technicalDebtAnalyzer.js`
  computes `contributorConcentrationPercent` per module and only reports a
  concentration warning once the sampled commit history has at least 3
  changes, avoiding a misleading conclusion from a shallow clone.
* **Durable reports and share links** — `backend/src/features/reports/*` persists
  immutable report snapshots, supports enabling/disabling share links, and
  enforces real TTL expiry (`share_expires_at` checked against the current
  time in `reportStoreCore.js`, driven by `REPORT_SHARE_TTL_DAYS`) — not just
  a configured constant that goes unused.

## Explicit Non-Tasks

The original plan mentions FastAPI, PostgreSQL, GitPython, and NetworkX. The
current project deliberately implements the product in Node.js/Express and
MongoDB, with Git CLI-based repository extraction. Replacing the stack is not
required to complete a feature unless the team makes a separate architecture
decision. New work should extend the existing documented backend boundaries
unless such a migration is approved.
