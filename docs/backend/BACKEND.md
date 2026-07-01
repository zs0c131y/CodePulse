# CodePulse — Backend Documentation

This document describes the planned architecture, microservices, analytical algorithms, and API specifications for the CodePulse backend.

---

## 🏛️ Backend System Architecture

The backend of CodePulse is designed around a modular service architecture. Each module handles a specific vertical within the repository intelligence flow:

```text
       [ Clients: Dashboard / API ]
                   │
                   ▼
       [ Express API Gateway / Router ]
                   │
  ┌────────────────┼───────────────────┐
  ▼                ▼                   ▼
[Repo Intel]   [Drift Engine]    [Metrics Engines]
  (V1)             (V2)              (V3 & V4)
  │                │                   │
  └────────┬───────┴───────────────────┘
           ▼
     [Risk Intelligence Engine] (V5)
           │
           ▼
     [AI Explainability Engine] (V6)
           │
           ▼
    [MySQL Database] & [Vector DB / RAG]
```

---

## ⚙️ Analytical Services & Logic

### 1. Repository Intelligence Service (Vertical 1)

* **Responsibility**: Clones user repositories, reads the file hierarchy, and populates the DB tables.
* **Process**:
  1. Clones a repository locally using a secure Git runner.
  2. Runs a Tree Parser to classify all files inside the repo (saved to `repo_files`).
  3. Uses an AST (Abstract Syntax Tree) Parser (such as `babel-parser` for JS/TS or `tree-sitter` for general languages) to map imports and exports, building the `dependencies` graph.
  4. Parses git histories via `simple-git` or similar to log commits (saved to `commits`).

### 2. Knowledge Drift Detection Engine (Vertical 2)

* **Responsibility**: Identifies outdated or missing documentation.
* **Process**:
  1. Extracts all `.md` and `.txt` files (saved to `documentation`).
  2. Creates embeddings of code blocks (classes/methods) and docs using a Sentence Transformer model.
  3. Runs cosine similarity comparison to check if documentation updates align with structural changes in the code.
  4. Flagged anomalies are cataloged inside the `drift_findings` table.

### 3. Technical Debt Analyzer (Vertical 3)

* **Responsibility**: Analyzes code files to calculate complexity and maintainability indices.
* **Metrics & Formulas**:
  * **Cyclomatic Complexity**: Measures control flow branches (if-else, loops). Scores > 15 in methods flag refactoring recommendations.
  * **Code Churn**: Tracks modification frequency. Files changed in > 40% of commits over a 30-day window are highlighted.
  * **Circular Dependencies**: Traverses the `dependencies` graph using depth-first search (DFS) to identify dependency cycles.
  * **Maintainability Index**: Combines Halstead Volume, Cyclomatic Complexity, and lines of code (LOC) to yield a scale from 0 to 100.

### 4. Knowledge Debt Analyzer (Vertical 4)

* **Responsibility**: Measures the gap between codebase size and available developer guides.
* **Metrics**:
  * **Documentation Coverage**: `(Count of Documented Functions / Total Functions) * 100`.
  * **Onboarding Score**: Combines README completeness metrics, architecture diagrams checks, and API docs verification.

### 5. Risk Intelligence Engine (Vertical 5)

* **Responsibility**: Synthesizes debt scores, history activity, and drift reports to calculate modular risks.
* **Risk Score Calculation**:
  For each module, Risk Score `R` is calculated on a scale of `0` to `100`:
  $$R = (0.4 \times TechDebt) + (0.3 \times KnowledgeDebt) + (0.3 \times ChurnActivity)$$
  * **TechDebt Factor**: Normalized value of complexity, duplication, and circular references.
  * **KnowledgeDebt Factor**: Outdated document drift, missing API docs.
  * **ChurnActivity Factor**: Total commits + number of unique authors (high author concentration vs. key-person risk).

---

## 🔌 API Gateway Specifications (Draft)

All requests expect JSON request payloads and return standard REST JSON responses.

### 📂 Repository Management

* **`POST /api/repositories/scan`**: Add repository URL and trigger scanning pipeline.
  * *Request Body*:

    ```json
    {
      "repo_url": "https://github.com/user/project.git",
      "branch": "main"
    }
    ```

  * *Response*:

    ```json
    {
      "repository_id": 102,
      "status": "queued",
      "message": "Scanning pipeline initiated successfully"
    }
    ```

* **`GET /api/repositories/:id/status`**: Check progress status of active scanning pipeline.

### 📊 Health Metrics & Insights

* **`GET /api/repositories/:id/summary`**: Retrieve repository aggregate grades (health score, debt level, overall risks).
* **`GET /api/repositories/:id/tech-debt`**: Retrieve cyclomatic complexity distributions, code duplication, and churn lists.
* **`GET /api/repositories/:id/drift`**: Retrieve drift findings, outdated text sections, and missing document markers.
* **`GET /api/repositories/:id/risk`**: Retrieve prioritized lists of modules sorted by Risk Score.
