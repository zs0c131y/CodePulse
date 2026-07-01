# Repository Intelligence Engine Implementation Plan

This plan breaks the Repository Intelligence Engine into modules that should be
implemented and tested one at a time. Each module has a gate: move to the next
module only after the current module works and its tests pass.

Dashboard and authentication work are intentionally outside this plan.

---

## Module 0: Baseline Audit

### Goal

Confirm what is already implemented before adding new code.

### Scope

- Inspect backend structure, existing routes, packages, schema files, and any
  repository-intelligence code.
- Identify the current storage layer: MongoDB, local JSON, or partial
  implementation.
- Run existing backend tests or build scripts if available.

### Test Gate

- The current implementation state is documented.
- Missing and partial Repository Intelligence features are identified.
- The storage approach for the next modules is clear.

---

## Module 1: Repository Clone Module

### Covers

- Clone a public GitHub repository.

### Scope

- Create a backend service that accepts a public GitHub repository URL.
- Validate the repository URL.
- Clone the repository into a controlled temporary workspace.
- Prevent unsafe paths and duplicate workspace collisions.
- Return basic repository metadata:
  - repository name
  - repository URL
  - local clone path
  - default branch, if available

### Testing

- Unit test GitHub URL validation.
- Integration test cloning with a small local fixture Git repository.
- Manual test with one public GitHub repository when network access is
  available.

### Test Gate

- A repository can be cloned reliably.
- Clone output is predictable.
- Workspace handling does not affect the main project files.

---

## Module 2: File Structure and File Type Parser

### Covers

- Parse folder structure.
- Extract files by type.

### Scope

- Walk the cloned repository tree.
- Ignore folders such as `.git`, `node_modules`, build outputs, caches, and
  binary-heavy directories.
- Produce normalized file records:
  - path
  - name
  - extension
  - file type
  - language
  - size
  - directory depth

### Testing

- Use a fixture repository with mixed source, config, documentation, asset, and
  test files.
- Assert ignored directories are skipped.
- Assert file classification is correct.

### Test Gate

- The system can produce a stable repository file inventory.
- File classification is accurate enough for downstream modules.

---

## Module 3: Documentation Extraction Module

### Covers

- Read README and documentation files.
- Prepare documentation metadata for later knowledge drift work.

### Scope

- Detect root README files.
- Detect nested README files.
- Detect markdown files under documentation folders.
- Detect common documentation files such as changelogs and API docs.
- Extract raw content and useful metadata.
- Link documentation records to repository-relative file paths.

### Testing

- Use a fixture repository with:
  - root README
  - nested README
  - `docs/` folder
  - changelog
  - non-documentation markdown, if needed
- Assert documentation files are detected.
- Assert non-documentation files are ignored.

### Test Gate

- Documentation inventory is accurate.
- Extracted documentation content is available as structured metadata.

---

## Module 4: Commit History Module

### Covers

- Extract commit history.

### Scope

- Read Git history from the cloned repository.
- Extract:
  - commit hash
  - author
  - email, if needed
  - message
  - commit date
  - changed files, if practical
- Add a configurable limit for large repositories, such as the latest 100
  commits initially.

### Testing

- Use a fixture Git repository with known commits.
- Assert commit count, hashes, authors, messages, and dates parse correctly.

### Test Gate

- Commit metadata is reproducible.
- Output can support future churn and ownership analysis.

---

## Module 5: Basic Dependency Graph Module

### Covers

- Generate a basic dependency graph.

### Scope

- Parse common import formats first:
  - JavaScript and TypeScript `import`
  - JavaScript and TypeScript `require`
  - Python `import`
  - Python `from ... import`
- Resolve simple relative imports.
- Produce dependency edges:
  - source file
  - target file or module
  - dependency type
  - resolved or unresolved flag

### Testing

- Use a fixture repository with JavaScript, TypeScript, or Python relative
  imports.
- Assert expected dependency edges exist.
- Assert unresolved external dependencies do not break parsing.

### Test Gate

- A basic internal dependency graph is generated.
- The parser works without requiring full AST analysis.

---

## Module 6: Repository Metadata Persistence Module

### Covers

- Store parsed metadata in the database.

### Scope

- Persist repository records.
- Persist file records.
- Persist documentation records.
- Persist commit records.
- Persist dependency records.
- Match the documented MongoDB-style entities where possible.
- If the backend still uses local JSON only, introduce a repository metadata
  store abstraction so MongoDB can be added cleanly later.
- Make writes idempotent enough to avoid duplicate records for repeated scans
  of the same repository.

### Testing

- Store fixture analysis output.
- Read it back and verify counts and relationships.
- Test duplicate scan behavior.

### Test Gate

- Parsed metadata survives beyond the request.
- Stored data can be queried by future API and dashboard work.

---

## Module 7: Orchestration API

### Covers

- Connect all Repository Intelligence modules into one API flow.

### Scope

- Add an endpoint such as `POST /api/repositories/analyze`.
- Accept a repository URL in the request body.
- Run the full flow:
  1. clone repository
  2. parse files
  3. extract documentation
  4. extract commits
  5. build dependency graph
  6. persist metadata
  7. return scan summary
- Add clear status and error handling.

### Testing

- End-to-end test with a fixture repository.
- Manual test with one public GitHub repository when network access is
  available.
- Verify persisted records and response summary.

### Test Gate

- One API call completes the Repository Intelligence Engine flow.
- The response is stable enough for dashboard consumption later.

---

## Module 8: Documentation Sync

### Covers

- Keep project documentation aligned with implementation.

### Scope

- Update backend documentation for new services and routes.
- Update database documentation if storage shape changes.
- Update workflow documentation if pipeline behavior changes.

### Test Gate

- Documentation matches the implemented behavior.
- Future agents can continue from the docs without rediscovering the system.

---

## Recommended Order

```text
Module 0 -> Module 1 -> Module 2 -> Module 3 -> Module 4 -> Module 5 -> Module 6 -> Module 7 -> Module 8
```

