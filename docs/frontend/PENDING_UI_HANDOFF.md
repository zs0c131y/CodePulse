# Pending Product Surfaces — UX and Engineering Handoff

This handoff maps the remaining user-facing work in
[docs/implementation.md](../implementation.md) to the existing Product design
system. It covers frontend delivery only; planned analysis APIs remain honest
loading, empty, unavailable, and error states until their engines ship.

## User and context

The primary user is an engineering lead reviewing a repository after a scan.
They need to move from a health summary to inspectable evidence, understand
structural relationships, prioritize risk, and export a review artifact.
CodePulse is a responsive authenticated SPA; dense engineering data must remain
usable with keyboard navigation and on narrow screens.

## Flow: inspect evidence and create a report

**Goal:** Move from repository selection to concrete evidence and a shareable
health review without losing repository context.

**Entry points:**

- Dashboard tab strip → Repository Intelligence.
- App top bar → Reports.
- Direct `/reports` URL after authentication.

**Prerequisites:** Authenticated session and at least one analyzed repository.

```text
Select repository
      │
      ├── Repository Intelligence
      │      ├── inventory + documentation
      │      ├── dependency graph + edge table
      │      └── contributors + declared dependencies
      │
      ├── Risk surfaces
      │      ├── module risk heatmap
      │      └── evidence-backed recommendations
      │
      └── Reports
             ├── choose repository
             ├── assemble available live sections
             ├── show unavailable sections honestly
             └── browser print / Save as PDF
```

### State model

| State | Repository Intelligence | Reports |
| :--- | :--- | :--- |
| Loading | Panel skeletons preserve layout | Repository selector and report skeleton |
| Empty account | Scan-first empty state | Link back to dashboard scan console |
| Partial data | Each evidence panel settles independently | Available sections render; missing engines are labeled |
| Success | Searchable evidence, graph/table alternatives | Print-ready structured report |
| Error | Panel-local retry and error text | Page-level retry without losing selection |
| Demo | Explicit sample evidence only in Demo mode | Explicit sample preview, never mixed into live mode |

## Component briefs

### `RepositoryIntelligencePanel`

**Purpose:** Present implemented repository facts in one inspectable workspace.

**Data:** files, documentation, commits, dependency edges, contributors, and
root manifests from the existing Repository Intelligence API.

**Interaction:** A local segmented view switches between Inventory,
Dependencies, Activity, and Documentation. Search filters long evidence lists.
The selected repository remains owned by the dashboard shell.

**Responsive:** Two-column evidence grids collapse to one column below desktop.
Tables become scroll-contained or card lists; the page never gains horizontal
overflow.

**Accessibility:** Segmented views use tab semantics and arrow-key navigation.
Counts are text, not color-only. Loading and errors use live regions.

### `DependencyGraphPanel`

**Purpose:** Visualize stored import edges without inventing analysis.

**Variants:** Interactive node-link view and accessible edge table.

**States:** Empty graph, unresolved edges, dense graph (first meaningful edge
subset with a disclosed count), loading, and error.

**Accessibility:** The graph has a concise generated description; the table is
the complete keyboard and copy/paste alternative.

### `RiskHeatmapPanel`

**Purpose:** Rank module risk from debt API rows already carrying risk,
complexity, churn, and duplication.

**States:** Live data, demo data, unavailable engine, and empty result.

**Accessibility:** Every cell includes a severity label and metrics; hue is
secondary. Mobile uses stacked rows.

### `ReportsPage`

**Purpose:** Assemble a repository health review from the same live data shown
in the dashboard.

**Primary action:** `Print / Save as PDF`, implemented through the browser
print dialog and a print stylesheet. It never claims a server-generated report.

**Sections:** Identity/timestamp, repository totals, available scores, debt,
drift, recommendations, contributors, and an explicit availability ledger.

**Responsive/print:** Screen uses the Product shell and panels. Print removes
navigation/actions, uses white paper, prevents card splitting, and expands
content into a linear report.

**Accessibility:** One `h1`, ordered section headings, native tables, clear
button names, and a status message before printing.

## Design-system decisions

No new color, type, radius, elevation, or motion tokens are required. All
surfaces reuse the semantic tokens and `panel`, `panel-2`, `SeverityBadge`,
`Button`, `Select`, and chart/table conventions in
[docs/design.md](../design.md). Risk continues to use the existing severity
scale with icon and label redundancy.

## Implementation target

**Target:** React/Vite frontend in `frontend/src`.

**API boundaries:** Implemented repository read endpoints are used directly.
Planned scores, debt, drift, and recommendation endpoints keep independent
unavailable states. No scoring logic is duplicated in the client.

## Acceptance criteria

- Every remaining roadmap dashboard surface has a responsive frontend.
- Repository facts come from implemented APIs in live mode.
- Dependency graph and risk heatmap have non-visual alternatives.
- Reports can be printed or saved as PDF through a real browser action.
- Loading, empty, partial, error, and unavailable states are distinct.
- Keyboard navigation and focus indicators work across new controls.
- Demo content is explicitly labeled and never enters live mode.
- Production build, lint, and existing tests remain clean.
