# CodePulse — AI Explainability Engine & Prompts

This document details the configuration, workflows, and prompts for the **AI Explainability Engine** (Vertical 6) in the CodePulse platform.

> **Current implementation boundary:** the live backend still generates its
> deterministic, evidence-based recommendations from stored Technical Debt,
> Knowledge Debt, drift, and risk findings — none of the analysis pipeline
> calls an LLM yet. What *has* changed: an LLM is now reachable from the
> backend (see **Current LLM Integration** below), but nothing in this
> document's prompt blueprints, context assembler, or RAG architecture is
> wired up to it yet. `generateWithGemma()` is a raw prompt-in/text-out
> function; no repository contents are assembled into context or sent to it
> by any existing code path. Everything below this point is still the planned
> design, not the current behavior.

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

**Availability caveat:** this is a home server, not a managed cloud service —
it can be offline (power/network/reboot). `generateWithGemma()` throws rather
than hangs when that happens; callers must catch it and return a clear
"AI service unavailable" response rather than let it bubble up as a 500.

**Gap to close before the prompt blueprints below are usable:** none of the
context-assembly logic they assume (AST slices, drift findings, churn
metrics compiled into prompt variables) exists yet — `generateWithGemma`
only accepts a plain string.

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
