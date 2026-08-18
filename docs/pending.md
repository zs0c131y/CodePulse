# CodePulse — Pending Development Work

This file records the work that remains after the currently implemented
repository-analysis pipeline. The application already ingests repositories,
extracts structure/documentation/commits/dependencies, calculates Technical
Debt and Knowledge Debt, detects structural documentation drift, ranks risk,
creates deterministic recommendations, and exposes those results through the
dashboard APIs.

The items below are not defects in that workflow. They are the advanced
capabilities described in the original development plan that require new data
sources, additional analysis infrastructure, or a deliberate product decision.

## 1. AST-Based Static Program Analysis

**Status:** Implemented as an opt-in embedding enrichment

The current Technical Debt engine uses an explicit metadata heuristic: file
size plus resolved internal dependency fan-in and fan-out. It is fast,
reproducible from the persisted scan facts, and deliberately labelled as a
heuristic. It is not true cyclomatic complexity.

Implement language-aware parsing, initially for JavaScript/TypeScript and
Python, using Tree-sitter or an equivalent AST parser. The parser should
extract functions, methods, classes, decision points, nesting depth, and line
counts. From this information, CodePulse can calculate per-function and
per-class cyclomatic complexity rather than assigning one approximate score to
an entire file.

The work includes defining safe parser limits for large files, handling parse
errors without failing a repository scan, persisting a compact source-outline
instead of full source where possible, and rolling function-level findings up
to module and repository scores. The dashboard should then explain whether a
module is risky because of a particular method, class, or file.

**Acceptance criteria:** a scanned JS/TS or Python module reports the exact
functions/classes that exceed documented thresholds; malformed source produces
a non-fatal “analysis unavailable” signal; existing metadata scoring remains a
fallback for unsupported languages.

## 2. Code Duplication, Function/Class Size, and Dependency-Chain Metrics

**Status:** Pending

The Technical Debt response currently returns `duplicationPercent: null` so it
does not imply that duplication was measured. Add a token-, AST-, or
fingerprint-based duplicate-block detector that ignores comments and formatting
where practical. It should distinguish intentional boilerplate from meaningful
copy/paste candidates and identify the duplicate locations.

The same static-analysis stage should calculate long-function, large-class,
and deep-import/dependency-chain signals. Deep chains are important because a
small change near the bottom can affect many higher-level modules even when no
cycle exists. These metrics need thresholds, weighting rules, and evidence
messages that are visible to users.

**Acceptance criteria:** the debt API identifies duplicate groups and their
paths, reports function/class size violations, and exposes the longest resolved
internal dependency chain without treating unresolved package imports as
internal architecture.

## 3. Semantic Knowledge Drift Detection

**Status:** Pending

Structural drift is implemented: undocumented modules, stale module
documentation, and documentation references to deleted source paths are
detected. Semantic comparison now creates compact code outlines from scanned
source files, compares them to matching documentation sections through a
Sentence-Transformers-compatible endpoint, and records low-similarity results
as review leads with the model, threshold, similarity, and excerpts. Optional
Qdrant persistence is non-blocking.

The enrichment is disabled by default. A local embedding endpoint can be
enabled directly; a hosted endpoint requires explicit provider approval in
environment configuration. AST-derived source outlines and user confirmation/
dismissal workflow remain follow-up improvements.

Semantic results must be conservative: a low similarity score is a lead, not
proof of incorrect documentation. Each finding should retain the compared
sections, model/version, confidence, and an explanation of why a human review
is required. Repository content should only leave the deployment boundary when
the user has explicitly enabled a hosted provider.

**Acceptance criteria:** CodePulse can flag a documented interface or behavior
that conflicts with the current code outline, show the supporting code/doc
sections, and allow a user to mark the result confirmed or dismissed.

## 4. Test Coverage and Bug-Proneness Signals

**Status:** Pending

The development plan calls for low test coverage and bug-prone files as
repository-health inputs. The current scan classifies test files but does not
run a project’s test suite, parse coverage reports, or classify commit intent.

Add optional, sandboxed adapters for common coverage formats such as LCOV,
Cobertura, and Python coverage XML. They should read existing CI artifacts or
run only explicitly approved commands, never execute arbitrary repository code
by default. Map coverage files to production modules and clearly distinguish
“no coverage report available” from “zero coverage.”

For bug-proneness, identify likely fix commits using configurable message
patterns and optionally linked issue/PR metadata. Treat the resulting measure
as a weak risk signal with transparent confidence, rather than claiming that a
file is objectively defective.

**Acceptance criteria:** test coverage and bug-fix frequency are optional
inputs, are absent rather than fabricated when unavailable, and contribute
explainable evidence to module risk.

## 5. Contributor Concentration and Ownership Risk

**Status:** Pending

Commit history already provides a top author for a file, but risk scoring does
not yet measure whether one person owns most changes to a critical module.
Implement a contributor-concentration metric from the captured commit sample:
for example, the leading author’s percentage of changes and the number of
active contributors per module.

This must account for shallow clone history. If the sampled history is too
short, label the result as unavailable rather than reporting a misleading
key-person risk. Privacy considerations also matter: users should be able to
choose whether author names are shown or aggregated.

**Acceptance criteria:** high-risk modules can explain a supported
concentration warning, the calculation identifies its commit sample size, and
incomplete history never produces a definitive ownership conclusion.

## 6. Historical Scores, Trends, and Scan Scheduling

**Status:** Pending

Current scoring stores one replace-on-rescan snapshot per repository. The UI
therefore returns empty health/risk trend arrays. Add immutable historical
score snapshots, scan metadata, and retention rules so users can see whether
health, drift, and risk improved or regressed over time.

Introduce a job queue or scheduler for recurring scans. The repository status
endpoint already supports lifecycle states, but production scheduling needs
queued jobs, retries, cancellation, progress updates, and a clear policy for
GitHub API and clone failures. Score comparison should only compare compatible
analysis versions so a new algorithm does not appear as a false regression.

**Acceptance criteria:** a repository can be scanned repeatedly, display
timestamped trends, and safely run scheduled/background scans without blocking
HTTP requests.

## 7. External LLM/RAG Explainability Layer

**Status:** Pending; requires product, privacy, and provider decisions

Current recommendations are deterministic and grounded in stored evidence.
This is intentionally useful without an AI provider. The original plan also
describes an optional LLM layer that can turn the same evidence into richer
module explanations, documentation-update suggestions, and executive
summaries.

Before implementation, choose the provider model (hosted OpenAI/Llama/Qwen or
self-hosted), retention policy, cost controls, user consent flow, and whether
source code may be transmitted. Build a context assembler that sends only the
smallest relevant AST outlines, drift evidence, and documentation excerpts.
Validate structured model output against a schema, keep prompt/model versions,
and always show the underlying deterministic evidence alongside generated text.

**Acceptance criteria:** AI generation is opt-in, bounded by token/cost limits,
traceable to stored evidence, safe when the provider fails, and never replaces
the deterministic score calculation.

## 8. Durable Reports and Share Links

**Status:** Pending

The frontend supports browser print/PDF export, but there is no backend report
artifact, storage lifecycle, or shareable URL. Implement a report service that
captures a specific repository score snapshot, findings, recommendations, and
generation timestamp. It should render a stable HTML/PDF document using a
server-side renderer or a controlled browser worker.

If sharing is required, create expiring, revocable links scoped to a frozen
report version. Do not expose a live repository through a guessed URL. Include
authorization checks, retention/deletion rules, and an export audit trail.

**Acceptance criteria:** a user can generate a report tied to a known scan,
download it later, and optionally share a time-limited read-only artifact.

## 9. Evaluation Dataset and Quality Benchmarking

**Status:** Pending

The plan requires evaluation on varied repositories and comparison against
manual inspection/SonarQube-style findings. Create a curated test corpus of
small public or purpose-built repositories covering cycles, large modules,
stale docs, dead documentation links, missing docs, duplicate code, and known
complexity cases.

For drift detection, maintain labelled expected findings and measure precision,
recall, and F1. For debt/risk, record expected rankings or compare with trusted
static-analysis outputs while documenting that different tools use different
definitions. Run these checks in CI to prevent a scoring-rule change from
silently degrading quality.

**Acceptance criteria:** automated evaluation reports precision/recall for
labelled drift cases, regression tests cover scoring thresholds, and benchmark
results are versioned with the analysis algorithm.

## 10. Production Hardening and Scale Validation

**Status:** Pending

Repository cloning and analysis are resource-intensive. Before production use,
move scans to isolated workers with CPU, memory, disk, timeout, and network
limits. Add observability for scan duration, failures, queue depth, API rate
limits, database growth, and provider cost (if AI is enabled).

Test against large and diverse repositories while maintaining safe caps on file
count, dependency parsing, and source size. Validate authentication,
authorization, token encryption, and deletion cascades under concurrent scans.
This work ensures the current single-request workflow remains reliable as
repository size and user count grow.

**Acceptance criteria:** scans cannot exhaust the web server, operational
metrics identify failed or slow jobs, and load/security testing covers the
repository lifecycle end to end.

## Explicit Non-Tasks

The original plan mentions FastAPI, PostgreSQL, GitPython, and NetworkX. The
current project deliberately implements the product in Node.js/Express and
MongoDB, with Git CLI-based repository extraction. Replacing the stack is not
required to complete a feature unless the team makes a separate architecture
decision. New work should extend the existing documented backend boundaries
unless such a migration is approved.
