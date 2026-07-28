# CodePulse - Feature-Based Implementation Roadmap

<!-- markdownlint-configure-file {"MD013": {"tables": false}} -->
<!-- markdownlint-configure-file {"MD024": {"siblings_only": true}} -->

This document defines the implementation roadmap for CodePulse by product
feature area. It is intended to guide backend, frontend, database, and AI
engine work without mixing implementation details into a single large task.

---

## Roadmap Overview

| Phase | Feature Area | Primary Outcome |
| :--- | :--- | :--- |
| 1 | Authentication | Secure user access and ownership boundaries |
| 2 | Repository Onboarding | User-submitted repositories enter the analysis pipeline |
| 3 | Repository Intelligence | Repository structure is extracted and persisted |
| 4 | Code Analysis | Internal code structure and dependencies are understood |
| 5 | Documentation Analysis | Existing project knowledge is parsed and scored |
| 6 | Knowledge Drift Detection | Documentation/code mismatches are detected |
| 7 | Technical Debt Analysis | Maintainability risks are quantified |
| 8 | Knowledge Debt Analysis | Missing or weak engineering knowledge is measured |
| 9 | Risk Intelligence | Repository health and module risk are calculated |
| 10 | AI Recommendations | Findings are explained with evidence-backed actions |
| 11 | Dashboard | Analysis results are visualized for users |
| 12 | Reports | Shareable repository health reports are generated |

---

## Frontend Delivery Status

The frontend now provides a complete, production-bundled surface for every
roadmap phase. Data-backed phases render persisted results when their endpoint
is available and an explicit unavailable or empty state when the corresponding
backend engine has not shipped or has not run.

| Roadmap Area | Frontend Surface | Status |
| :--- | :--- | :--- |
| Authentication and onboarding | Auth flows, repository picker, scan console | Implemented |
| Repository Intelligence | Inventory, dependency graph/table, activity, documentation, manifests | Implemented |
| Code/documentation/debt/drift/risk engines | Charts, findings, heatmap, score and pipeline panels | Implemented; live content depends on phases 4–9 APIs |
| AI Recommendations | Evidence-aware recommendation cards and report section | Implemented; live content depends on phase 10 API |
| Dashboard | Five responsive, keyboard-accessible analysis workspaces | Implemented |
| Reports | Protected, print-ready report with browser PDF export | Implemented; stored/share-link report service remains backend work |

Interaction and visual acceptance criteria for the newly completed surfaces
are recorded in
[docs/frontend/PENDING_UI_HANDOFF.md](frontend/PENDING_UI_HANDOFF.md).

---

## 1. Authentication

Allows users to securely access the platform and own their repository data.

### Features

* Register and log in.
* Issue and validate JWT access tokens.
* Protect authenticated routes.
* Associate repositories with the signed-in user.
* Manage user profile data.

### Implementation Notes

* Keep auth route behavior documented in
  [docs/backend/BACKEND.md](backend/BACKEND.md).
* Keep protected frontend route behavior documented in
  [docs/frontend/FRONTEND.md](frontend/FRONTEND.md).

---

## 2. Repository Onboarding

Lets users submit repositories for analysis.

### Features

* Add a GitHub repository URL.
* Validate repository URLs before analysis.
* Clone repositories into a controlled temporary workspace.
* Store repository metadata.
* Track analysis status through the pipeline.

### Implementation Notes

* Repository records must remain user-owned.
* Analysis state should support queued, running, completed, and failed states.

---

## 3. Repository Intelligence

Builds a structured understanding of the repository.

### Features

* Extract folders and files.
* Detect primary languages.
* Detect README and documentation files.
* Extract commit history.
* Analyze contributors.
* Map dependencies.

### Implementation Notes

* Persist normalized repository data in MongoDB collections documented under
  [docs/database/DATABASE.md](database/DATABASE.md).
* Keep extraction services inside backend feature boundaries.

---

## 4. Code Analysis

Understands internal code structure beyond raw file extraction.

### Features

* Parse imports.
* Detect functions, classes, and modules.
* Detect APIs and routes.
* Identify orphan files.
* Generate a dependency graph.

### Implementation Notes

* Prefer language-aware parsers where practical.
* Store code facts separately from raw repository metadata so later scoring
  systems can consume stable analysis outputs.

---

## 5. Documentation Analysis

Analyzes available project knowledge.

### Features

* Parse README and documentation files.
* Extract setup steps.
* Extract API information.
* Detect architecture notes.
* Measure documentation coverage.

### Implementation Notes

* Documentation analysis should produce structured facts, not only free-form
  summaries.
* Extracted facts should support later drift and knowledge debt scoring.

---

## 6. Knowledge Drift Detection

Finds mismatches between documentation and code.

### Features

* Detect missing modules in documentation.
* Detect documentation references to deleted files.
* Detect undocumented APIs.
* Detect outdated setup instructions.
* Score drift severity.

### Implementation Notes

* Drift findings should include evidence, affected files, severity, and a
  recommended owner action.
* Findings should be reproducible from stored repository, code, and
  documentation facts.

---

## 7. Technical Debt Analysis

Measures code maintainability issues.

### Features

* Detect large files and functions.
* Detect circular dependencies.
* Detect high-complexity files.
* Measure code churn.
* Detect stale modules.
* Calculate a technical debt score.

### Implementation Notes

* Separate raw metrics from final scoring.
* Keep scoring rules documented so dashboard values can be explained.
* Implemented in [technicalDebtAnalyzer.js](../backend/src/features/analysis/services/technicalDebtAnalyzer.js).
  Every completed repository scan now stores a current score, per-file
  evidence, circular dependency groups, and resolved internal graph signals.
  The first complexity value is an explainable metadata heuristic; AST-level
  cyclomatic complexity and source duplication remain follow-up work.
* Churn and stale scoring require at least five captured commits so shallow
  history does not produce a misleading signal.

---

## 8. Knowledge Debt Analysis

Measures missing or outdated engineering knowledge.

### Features

* Detect undocumented modules.
* Measure poor documentation coverage.
* Detect missing architecture explanations.
* Calculate an onboarding difficulty score.
* Calculate a knowledge debt score.

### Implementation Notes

* Knowledge debt should combine documentation coverage, architecture clarity,
  setup completeness, and module understandability.
* Scores should link back to concrete missing or outdated documentation.
* Implemented in [knowledgeDebtAnalyzer.js](../backend/src/features/analysis/services/knowledgeDebtAnalyzer.js).
  It scores source-directory coverage and stores document/absence evidence per
  module, along with architecture and setup-document checks used by the
  onboarding difficulty score.

---

## 9. Risk Intelligence

Combines all scores into repository health.

### Features

* Calculate repository health score.
* Rank high-risk modules.
* Group risk categories.
* Prioritize refactoring work.
* Calculate maintainability risk score.

### Implementation Notes

* Risk scoring should combine technical debt, knowledge debt, drift findings,
  code churn, and contributor concentration.
* Every risk score should preserve evidence for dashboard and AI explanation
  flows.

---

## 10. AI Recommendations

Explains findings in human-readable form.

### Features

* Explain risky modules.
* Suggest refactoring actions.
* Suggest documentation updates.
* Generate repository summaries.
* Provide evidence-backed reasoning.

### Implementation Notes

* AI output must be grounded in stored analysis facts.
* Recommendation prompts and context construction should stay documented in
  [docs/ai/AI_ENGINE.md](ai/AI_ENGINE.md).

---

## 11. Dashboard

Visualizes all analysis results.

### Features

* Health score cards.
* Debt charts.
* Drift findings.
* Dependency graph.
* Risk heatmap.
* Recommendations page.
* Repository intelligence workspace.

### Implementation Notes

* Dashboard surfaces should consume API data rather than duplicating scoring
  logic in the frontend.
* Route, layout, and component changes should stay documented in
  [docs/frontend/FRONTEND.md](frontend/FRONTEND.md).

---

## 12. Reports

Creates final shareable output.

### Features

* Generate PDF reports.
* Include repository health summary.
* Include technical debt report.
* Include knowledge drift report.
* Include AI recommendations in generated documentation.

### Implementation Notes

* Reports should reuse the same persisted findings shown in the dashboard.
* Generated report content should include timestamps, repository identity,
  scoring summaries, evidence, and recommendations.
* The current frontend supports browser-native print/PDF export. Durable report
  artifacts and share links require a future backend report-generation API.

---

## Delivery Guidance

1. Build features in dependency order: authentication, onboarding,
   repository intelligence, analysis engines, scoring, AI explanations,
   dashboard, then reports.
2. Keep each feature behind clear backend API boundaries.
3. Persist structured facts before adding derived scores or AI explanations.
4. Update the matching documentation file whenever routes, schema, prompts,
   frontend routes, or analysis behavior changes.
5. Add tests around parsing, scoring, drift detection, and report generation
   before wiring those results into the dashboard.
