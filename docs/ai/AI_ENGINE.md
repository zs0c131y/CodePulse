# CodePulse — AI Explainability Engine & Prompts

This document details the configuration, workflows, and prompts for the **AI Explainability Engine** (Vertical 6) in the CodePulse platform.

> **Current implementation boundary:** the backend provides deterministic,
> evidence-based recommendations from stored Technical Debt, Knowledge Debt,
> drift, and risk findings by default — that pipeline never depends on an AI
> provider. Two separate AI capabilities are layered on top of it, each with
> its own provider and consent model:
>
> 1. **Semantic drift detection** (`backend/src/features/analysis/services/semanticDriftAnalyzer.js`,
>    `semanticEmbeddingClient.js`) — an opt-in, Sentence-Transformers-compatible
>    embedding enrichment with optional Qdrant indexing. It is disabled
>    without configuration and requires explicit provider consent before a
>    hosted provider receives compact code outlines or documentation
>    sections. This is what feeds Prompt Blueprint 1 (documentation drift
>    analysis and update suggestions) with real findings; the blueprint
>    prompt itself is not yet used to generate text — see
>    [pending.md](../pending.md) for the remaining gap.
> 2. **AI Explainability layer** (this document, Prompt Blueprints 2 & 3) —
>    on top of the LLM transport described below (`generateWithGemma()`), an
>    **opt-in** layer that turns stored risk/debt/drift evidence into
>    human-readable explanations. It is only invoked when a caller explicitly
>    requests generation — never during a scan — and repository source is
>    never sent; only the smallest relevant stored evidence (module debt
>    metrics, drift findings, scores) is assembled into the prompt.
>
> **API surface** (`backend/src/features/analysis/aiController.js`,
> `backend/src/features/analysis/services/aiExplainabilityService.js`):
> - `GET  /api/repositories/:repositoryId/ai/status`
> - `POST /api/repositories/:repositoryId/ai/risk-explanation` `{ modulePath }`
>   — generates and persists Blueprint 2 output for one module.
> - `GET  /api/repositories/:repositoryId/ai/risk-explanation?modulePath=...`
>   — reads back the latest persisted explanation without regenerating.
> - `POST /api/repositories/:repositoryId/ai/executive-summary`
>   — generates and persists Blueprint 3 output for the repository.
> - `GET  /api/repositories/:repositoryId/ai/executive-summary`
>   — reads back the latest persisted summary without regenerating.
>
> Every generated explanation is persisted to the `ai_explanations` collection
> with its prompt version and source model, so it stays traceable to the
> deterministic evidence it was built from. A provider failure (timeout,
> non-2xx, malformed output, or the home server being offline) returns `502`
> and never partially persists — the deterministic recommendations remain the
> source of truth. The frontend panel
> (`frontend/src/components/dashboard/AiExplainabilityPanel.jsx`) surfaces this
> as an on-demand "Explain with AI" / "Generate" action on the Risk & AI tab.

---

## 🔌 Current LLM Integration

A self-hosted **Gemma 4** (`gemma4:e2b`, via [Ollama](https://ollama.com)) runs
on a home server (`dauntless`), reachable from the backend through a
Cloudflare Tunnel + Access service token — not a managed cloud AI API.

```text
  backend/src/utils/gemma.js (generateWithGemma)
        │  CF-Access-Client-Id / CF-Access-Client-Secret
        ▼
  https://gemma.ardend.dev  (Cloudflare Tunnel + Access, public hostname)
        ▼
  dauntless:11434  (Ollama, self-hosted, home network)
        ▼
  gemma4:e2b
```

**Wire format** — Ollama's native `/api/generate` API, unmodified:

```
POST https://gemma.ardend.dev/api/generate
Headers: CF-Access-Client-Id, CF-Access-Client-Secret, Content-Type: application/json
Body:    { "model": "gemma4:e2b", "prompt": "<text>", "stream": false }
Response: { "response": "<generated text>", ... }
```

**From backend code**, call `generateWithGemma(prompt)` — it fills in the
URL, Access headers, and a request timeout (`GEMMA_REQUEST_TIMEOUT_MS`,
default 60s) so a caller only needs to catch and surface the error to the
user when the home server is offline:

```js
import { generateWithGemma } from '../../utils/gemma.js'

const text = await generateWithGemma(prompt)
```

Config (`backend/src/config/index.js`): `GEMMA_API_URL`, `GEMMA_MODEL`,
`GEMMA_REQUEST_TIMEOUT_MS`, `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`.
`GEMMA_API_URL` and `GEMMA_MODEL` default to the `dauntless` deployment above,
so they are effectively always "configured"; `isAiExplainabilityConfigured()`
in `aiExplainabilityService.js` is a safety net for a deployment that
explicitly overrides them, not the primary way availability is signaled — a
home server that's powered off is a `502` at call time, not a `503`.

**Availability caveat:** this is a home server, not a managed cloud service —
it can be offline (power/network/reboot). `generateWithGemma()` throws rather
than hangs when that happens; callers must catch it and return a clear
"AI service unavailable" response rather than let it bubble up as a 500. The
AI Explainability layer's `callGemma()` wrapper (in
`aiExplainabilityService.js`) does exactly this: it turns any
`generateWithGemma()` failure into an `AiProviderError`, which the controller
maps to `502`.

**Context-assembly gap:** `generateWithGemma()` itself is still a raw
prompt-in/text-out function — it does not assemble context. The AI
Explainability layer (Prompt Blueprints 2 & 3, described above) is what
closes that gap for risk explanations and executive summaries, combining a
blueprint's `[SYSTEM PROMPT]`/`[USER PROMPT]` into one string before calling
`generateWithGemma()`. Blueprint 1's context assembly (AST slices, drift
findings compiled into prompt variables for semantic doc-drift analysis)
remains unimplemented, tracked in [pending.md](../pending.md).

---

## 🤖 Engine Overview & Role

The AI Explainability Engine sits at the top of the analytics pipeline. It takes metrics gathered by the Repository Intelligence, Technical Debt, and Knowledge Drift services, compiles them into a structured context, and leverages LLMs to produce human-readable, evidence-backed explanations and refactoring checklists.

```text
  ┌────────────────────────────────────────────────────────┐
  │                   Analytical Inputs                    │
  │  - Churn logs      - Complexity scores                 │
  │  - AST exports     - Documentation drift findings      │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                  Context Assembler                     │
  │  Assemble markdown files, git diffs, and database      │
  │  metrics into structured prompt variables.             │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                 Large Language Model                   │
  │  Generates explanations, refactoring recommendations,  │
  │  and documentation updates.                            │
  └────────────────────────────────────────────────────────┘
```

---

## 🧩 Context Construction & RAG Architecture

To prevent context window bloat when working with large repositories, CodePulse uses a hybrid AST-RAG (Retrieval-Augmented Generation) lookup:

1. **Global Repository Profile**: High-level metrics, total files, module lists, and overall scores are always sent to the prompt context.
2. **Context-Targeted Slices**: When analyzing a specific high-risk module, the engine fetches:
   - The AST signature of the module (classes, methods, parameters).
   - Relevant documentation files matching the module (retrieved from the `documentation` table).
   - Recent git logs and active issues related to the module.
   - The associated drift findings (retrieved from `drift_findings`).

---

## 📝 Prompt Blueprints

These blueprints guide LLM interactions to ensure structured, parsing-friendly outputs.

### 1. Document Drift Analysis & Update Suggestions (Vertical 2)

Used by the Knowledge Drift Detection pipeline to verify if a readme is obsolete.

```text
[SYSTEM PROMPT]
You are CodePulse-Drift-Analyzer, a specialized AI coding assistant.
Your task is to compare code implementation semantics with its documentation and identify documentation drift.
Be precise, locate outdated sections, and propose exact corrections.

[USER PROMPT]
Analyze the discrepancy between the file structure and its documentation below:

--- DATABASE DRIFT FINDING ---
File Path: {{FILE_PATH}}
Drift Type: {{DRIFT_TYPE}}
Description: {{DRIFT_DESCRIPTION}}

--- CURRENT CODE INTERFACE (AST) ---
{{CODE_INTERFACE}}

--- CURRENT DOCUMENTATION CONTENT ---
{{DOCUMENTATION_CONTENT}}

Generate:
1. EXPLANATION: What specific information in the documentation is outdated, missing, or incorrect.
2. EVIDENCE: The code lines/signatures and documentation paragraphs that conflict.
3. REMEDIATION: A unified diff or replacement text block for the documentation file that resolves the drift.
```

### 2. Risk Explanation & Refactoring Recommendations (Vertical 5 & 6)

Generates high-impact refactoring priorities for modules determined to be critical or high risk.

```text
[SYSTEM PROMPT]
You are CodePulse-Refactor-Copilot, an expert software architect.
You explain complex code issues (Technical and Knowledge Debt) in simple terms and recommend actionable refactoring plans.
Ensure recommendations prioritize architectural soundness, decoupling, and maintainability.

[USER PROMPT]
The module "{{MODULE_NAME}}" is categorized as CRITICAL RISK with a score of {{RISK_SCORE}}/100.
Analyze the following metrics to generate an explanation and action plan.

--- ANALYTICAL METRICS ---
- Cyclomatic Complexity: {{CYCLOMATIC_COMPLEXITY}} (Threshold: 15)
- Code Duplication: {{DUPLICATION_PERCENT}}%
- Churn Rate: {{CHURN_RATE}} modifications in last 30 days
- Circular References: {{CIRCULAR_DEPENDENCIES}}
- Documentation Coverage: {{DOC_COVERAGE}}%
- Author Concentration: {{AUTHOR_CONCENTRATION}} (Key-person risk index)

--- CODE STRUCTURE / OUTLINE ---
{{CODE_STRUCTURE}}

Provide your findings in JSON format:
{
  "explanation": "A concise explanation of why the module has accumulated high risk.",
  "implications": ["Impact on onboarding", "Regression risks during updates", "Testing difficulty"],
  "action_plan": [
    {
      "step": 1,
      "title": "Refactoring task title",
      "description": "Step-by-step technical instructions",
      "priority": "High"
    }
  ]
}
```

### 3. Executive Health Summary Prompt

Generates high-level summaries for the repository landing card.

```text
[SYSTEM PROMPT]
You are CodePulse-Executive-Reporter. You summarize repository health, highlighting key technical debt trends and knowledge risks for engineering leadership.

[USER PROMPT]
Repository: {{REPO_NAME}}
Overall Health Score: {{HEALTH_SCORE}}/100
Technical Debt Grade: {{TECH_DEBT_GRADE}}
Knowledge Debt Score: {{KNOWLEDGE_DEBT_SCORE}}/100

Top 3 Risk Modules:
{{TOP_RISKS}}

Top 3 Documentation Drift Issues:
{{TOP_DRIFT_FINDINGS}}

Write a concise 3-paragraph executive summary detailing:
1. The current health status of the repository and its main maintainability bottleneck.
2. A summary of the key-person and documentation coverage risks.
3. The top two immediate recommendations to improve developer velocity and sustainability.
```
