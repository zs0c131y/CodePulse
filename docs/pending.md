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

**Status:** Implemented as an opt-in embedding enrichment; feeding its
findings into an AI-generated explanation (Prompt Blueprint 1) is the only
remaining gap.

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

**Remaining gap:** semantic findings are not yet fed into **Prompt Blueprint
1** (documentation drift explanation and update suggestions) in
[docs/ai/AI_ENGINE.md](ai/AI_ENGINE.md) — the AI Explainability layer
implements Blueprints 2 and 3 (see item 6 below) and can now be pointed at
real semantic findings, but nothing calls Blueprint 1 yet.

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

**Status:** Partially implemented — trend storage done, scheduling pending

Historical score storage is implemented: every scan appends an immutable
`repository_score_history` record
(`backend/src/features/analysis/services/analysisStoreCore.js`,
`scoreHistoryRecord`/`persistAnalysisResultsWithCollections`), not a
replace-on-rescan snapshot, and `getRepositoryScore` reads the trend back
sorted by `analyzed_at`. The dashboard's health/risk trend arrays are
populated from real history, not empty placeholders.

Scan scheduling is not implemented. Repository scans run in isolated worker
threads (`backend/src/features/repositories/services/repositoryAnalysisWorker.js`,
`analysisQueue.js`, bounded by `ANALYSIS_MAX_CONCURRENCY` and a
per-worker `maxOldGenerationSizeMb` memory cap) for concurrency and isolation,
but nothing re-triggers a scan on a schedule — every scan is still initiated
by a single API call. Add a job queue or scheduler for recurring scans, with
retries, cancellation, progress updates, and a clear policy for GitHub API and
clone failures. Score comparison should only compare compatible analysis
versions so a new algorithm does not appear as a false regression.

**Acceptance criteria:** a repository can be scanned repeatedly on a schedule
without a manual trigger, and safely runs scheduled/background scans without
blocking HTTP requests.

## 4. Evaluation Dataset and Quality Benchmarking

**Status:** Pending

The plan requires evaluation on varied repositories and comparison against
manual inspection/SonarQube-style findings. No labelled test corpus,
precision/recall scoring, or benchmark comparison exists anywhere in the
repository today — the existing `backend/test/*.test.js` suite validates unit
and integration behavior, not analysis quality against ground truth.

Create a curated test corpus of small public or purpose-built repositories
covering cycles, large modules, stale docs, dead documentation links, missing
docs, duplicate code, and known complexity cases. For drift detection,
maintain labelled expected findings and measure precision, recall, and F1.
For debt/risk, record expected rankings or compare with trusted
static-analysis outputs while documenting that different tools use different
definitions. Run these checks in CI to prevent a scoring-rule change from
silently degrading quality.

**Acceptance criteria:** automated evaluation reports precision/recall for
labelled drift cases, regression tests cover scoring thresholds, and benchmark
results are versioned with the analysis algorithm.

## 5. Production Hardening and Scale Validation

**Status:** Partially implemented

Implemented: repository scans run in isolated `worker_threads`
(`repositoryAnalysisWorker.js`) with a configured old-generation memory cap
and bounded concurrency (`ANALYSIS_MAX_CONCURRENCY`,
`ANALYSIS_MAX_ACTIVE_PER_USER`, a bounded queue via
`ANALYSIS_MAX_QUEUE_SIZE`); an HTTP rate limiter is wired into
`backend/src/app.js`; repository size, file count, dependency edges, and
documentation totals all have configured caps
(`REPOSITORY_MAX_SIZE_KB`, `REPOSITORY_MAX_FILES`,
`REPOSITORY_MAX_DEPENDENCY_EDGES`, etc.).

Not implemented: CPU/disk/network resource limits on the worker itself (only
memory is capped), and no observability layer — there is no Prometheus,
StatsD, or metrics endpoint exporting scan duration, failure rate, queue
depth, API rate-limit consumption, database growth, or AI provider cost. No
load or security testing has been run against large or diverse repositories
under concurrent scans.

**Acceptance criteria:** scans cannot exhaust the web server (bounded
concurrency and memory caps address this), operational metrics identify
failed or slow jobs (not yet built), and load/security testing covers the
repository lifecycle end to end (not yet run).

## 6. External LLM/RAG Explainability Layer

**Status:** Implemented for risk explanations and executive summaries
(Prompt Blueprints 2 & 3); documentation-update suggestions (Blueprint 1)
remain pending — the semantic drift findings that would feed it are now
implemented (see item 1), but nothing generates Blueprint 1 text from them yet.

Current recommendations are deterministic and grounded in stored evidence and
remain fully functional without an AI provider. On top of that, an opt-in AI
Explainability layer calls a self-hosted Gemma model (Ollama-compatible
`/api/chat`, behind Cloudflare Access) to turn the same stored evidence into
richer module risk explanations and executive summaries. See
[docs/ai/AI_ENGINE.md](ai/AI_ENGINE.md) for configuration, the API surface,
and the implementation boundary.

**Acceptance criteria:** AI generation is opt-in (implemented — every
generation is a caller-initiated POST, never triggered by a scan), bounded by
a request timeout (implemented via `AI_REQUEST_TIMEOUT_MS`), traceable to
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
