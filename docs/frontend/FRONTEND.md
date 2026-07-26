# CodePulse — Frontend Documentation

This document describes the React frontend structure, route flow, and auth API
wiring for CodePulse.

---

## 🛠️ Technology Stack & Styling

* **Framework**: React with Vite.
* **Build Config**: [frontend/vite.config.js](../../frontend/vite.config.js).
* **Styling**: The 2026 **dual design system** — full specification in
  [docs/design.md](../design.md). One token architecture in
  [frontend/src/index.css](../../frontend/src/index.css) powers two worlds:
  **The Product** (app + auth: neutral zinc surfaces, hairline borders,
  inverted-contrast primary actions, one blue interactive accent) and **The
  Journal** (marketing: an editorial broadsheet scoped under `.mk` — warm
  paper, ink rules, one hot orange, Archivo + Instrument Serif + Geist Mono).
  Tokens are bridged into Tailwind through `@theme inline`. Local
  shadcn-style primitives are in
  [frontend/src/components/ui](../../frontend/src/components/ui), with class
  merging in [frontend/src/lib/utils.js](../../frontend/src/lib/utils.js).

  **Rule: product components use semantic tokens only** — `var(--surface-1)`,
  `var(--ink-2)`, `var(--sev-high)`, `var(--series-1)`. Never a Tailwind colour
  literal (`text-white`, `bg-violet-600`), because a literal cannot follow the
  theme and cannot be re-checked for contrast. Journal markup uses the fixed
  `--mk-*` tokens instead. Token groups:

  | Group | Tokens | Meaning |
  | :--- | :--- | :--- |
  | Surfaces | `--surface-canvas`, `--surface-1..3`, `--surface-overlay`, `--surface-sunken` | Elevation planes |
  | Ink | `--ink-1..4` | Text. `--ink-4` is below 4.5:1 in both themes — non-text only |
  | Lines | `--line-1..3` | Hairlines do layout work instead of shadows |
  | Accent | `--accent`, `--accent-ink`, `--accent-on`, `--accent-wash`, `--accent-line` | Interactive state only, never decoration |
  | Contrast | `--contrast`, `--contrast-hover`, `--contrast-on` | The primary action: an inverted surface |
  | Providers | `--provider-github`, `--provider-gitlab` | Provider identity, only beside an explicit GitHub/GitLab action |
  | Severity | `--sev-{nominal,low,medium,high,critical}` + `-ink`/`-wash`/`-line` | Always paired with an icon + label |
  | Series | `--series-1..6` | Chart identity, fixed assignment order |
  | Heat | `--heat-1..5` | Single-hue risk ramp |
  | Elevation | `--shadow-e1..e4` | Borders first; shadows only for floating layers |
  | Motion | `--d-1..5`, `--ease-out/in/inout` | One easing family |

* **Typography**: two type systems from one stylesheet in
  [frontend/index.html](../../frontend/index.html) — **Geist + Geist Mono**
  for the product (UI + data) and **Archivo + Instrument Serif** for the
  Journal (display + accent).
* **Theming**: `data-theme="light" | "dark"` on `<html>`, stamped before first
  paint by an inline script in [frontend/index.html](../../frontend/index.html)
  reading `localStorage`, then re-synced from user settings in
  [App.jsx](../../frontend/src/App.jsx). With no stamp, the OS preference wins
  via `prefers-color-scheme`. The shared `ThemeToggle` is available from
  authentication, dashboard, profile, and settings headers; it switches
  immediately, persists the device preference, and notifies the app so
  authenticated account state stays synchronized. The Journal landing has a
  fixed paper palette and intentionally ships no toggle. Density is exposed
  the same way as `data-density="comfortable" | "compact"`.
* **Charts**: recharts, themed through
  [frontend/src/lib/useChartTokens.js](../../frontend/src/lib/useChartTokens.js).
  SVG presentation attributes do not resolve `var()`, so that hook reads the
  computed custom properties and re-reads them on theme change. Re-run the
  contrast checks in [docs/design.md](../design.md) §5 before altering any
  `--series-*` or `--heat-*` value.
* **Severity in the UI**: render with `SeverityBadge` from
  [dashboard/shared.jsx](../../frontend/src/components/dashboard/shared.jsx),
  which pairs the colour with a required icon and label. Colour must never
  carry severity alone.
* **Routing**: Lightweight client-side path routing in
  [frontend/src/App.jsx](../../frontend/src/App.jsx). Legacy hash routes are
  normalized for backward compatibility. Authenticated screens (`Dashboard`,
  `AccountPage`) are lazy-loaded with `React.lazy` so the marketing bundle
  stays free of the chart stack.

---

## Responsive Layout

Shared responsive utilities live in
[frontend/src/index.css](../../frontend/src/index.css):

* `cp-marketing` (72rem) is used by landing and auth screens. Marketing copy is
  capped rather than allowed to grow with the viewport — past ~72rem a line of
  prose becomes hard to scan.
* `cp-app` (90rem) is used by authenticated workspace screens.
* `cp-wide` (120rem) is for grid-heavy surfaces, and `cp-prose` (44rem) for
  long-form documents such as reports.
* `cp-section` standardizes landing-page vertical rhythm.

On ultrawide displays the intent is to gain **columns, not width**: containers
stop growing and layouts add grid tracks instead.

Surface utilities: `panel` (elevation 1 card), `panel-2` (nested), and
`panel-interactive` (hover lift). `scrim` is the only sanctioned
`backdrop-filter` surface — glass on a large scrolling container is a reliable
way to drop below 60fps.

Landing, auth, dashboard, profile, and settings layouts are mobile-first. The
theme preference is applied as `data-theme` on the document root before paint
when possible and is synchronized from the authenticated user settings; density
is likewise exposed as `data-density` for component spacing. Dense
workspace views switch from one-column layouts to two- or multi-column grids
only after enough viewport width is available, and small-screen controls wrap
instead of forcing page-level horizontal scrolling.

---

## 📂 Frontend Directory Structure

```text
frontend/
├── public/
│   └── favicon.svg             # Pulse-mark app icon
├── src/
│   ├── api/                    # Backend API client modules
│   │   ├── client.js           # apiUrl + authenticated apiFetch (ApiError carries HTTP status)
│   │   ├── repositories.js     # Repository analyze + read/analytics endpoints
│   │   ├── integrations.js     # Connected GitHub/GitLab source APIs
│   │   └── usage.js            # Account usage snapshot endpoint
│   ├── components/
│   │   ├── dashboard/          # Dashboard panels (presentational)
│   │   │   ├── CoveragePanel.jsx    # recharts horizontal documentation-coverage bars
│   │   │   ├── DebtCharts.jsx       # recharts complexity + churn/duplication charts
│   │   │   ├── DebtTable.jsx        # Ranked module debt table (cards on small screens)
│   │   │   ├── DriftPanel.jsx       # Knowledge drift findings queue
│   │   │   ├── MetricStrip.jsx      # KPI strip: borderless cells, hairline dividers
│   │   │   ├── PipelinePanel.jsx    # Analysis pipeline status list
│   │   │   ├── RecommendationPanel.jsx # AI recommendation cards
│   │   │   ├── RiskTrendPanel.jsx   # recharts risk-trend area chart + table toggle
│   │   │   ├── shared.jsx           # Tooltip, Sparkline, EmptyPanel components
│   │   │   └── utils.js             # severity/status classes, clamp, formatRelativeTime
│   │   ├── ui/
│   │   │   ├── badge.jsx
│   │   │   ├── button.jsx
│   │   │   ├── card.jsx
│   │   │   ├── combobox.jsx     # Searchable, grouped repository picker
│   │   │   ├── input.jsx
│   │   │   ├── pulse-mark.jsx   # The CodePulse mark (product + journal variants)
│   │   │   ├── select.jsx
│   │   │   └── theme-toggle.jsx # Shared light/dark mode control
│   │   ├── AppChrome.jsx        # Shared authenticated top bar
│   │   ├── AuthPage.jsx
│   │   ├── AccountPage.jsx
│   │   ├── Dashboard.jsx        # Dashboard shell + data orchestration
│   │   ├── MarketingPage.jsx    # The Journal marketing broadsheet
│   │   └── Reveal.jsx           # Scroll-reveal wrapper (Journal)
│   ├── demo/
│   │   └── dashboardDemoData.js  # Demo-mode fallback data (never used in live mode)
│   ├── lib/
│   │   ├── useChartTokens.js    # Token bridge for recharts SVG attributes
│   │   ├── useReveal.js         # IntersectionObserver scroll reveal
│   │   └── utils.js
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── index.html
└── vite.config.js
```

---

## 🏛️ Landing Page Flow

The landing page is composed by
[MarketingPage.jsx](../../frontend/src/components/MarketingPage.jsx) as an
editorial broadsheet ("The Journal", spec: [docs/design.md](../design.md) §2):
sticky ruled navigation, a giant Archivo/serif hero with an animated
ECG-trace instrument preview clearly marked as illustrative, an ink marquee
band, numbered ledger sections (`01 / Signals` with hover inversion,
`02 / Workflow`, `03 / Evidence` on an inverted ink band), a final CTA, and a
broadsheet footer. The palette is fixed paper — the Journal does not follow
the app theme and ships no theme toggle.

---

## 🔐 Auth Page Wiring

[AuthPage.jsx](../../frontend/src/components/AuthPage.jsx) handles both
`/signin` and `/signup` modes, plus account recovery and email verification
routes.

* Signup posts to `POST /api/auth/signup`.
* Signup requires email verification before sign-in.
* Signup and password reset request success states are shown in modal dialogs.
  Tokenized verification and reset links are never rendered in the browser.
* Sign-in posts to `POST /api/auth/signin`.
* If sign-in credentials are valid but the account is unverified, the form shows
  a **Resend verification email** action and posts to
  `POST /api/auth/resend-verification`.
* Password reset starts at `/reset-password` and posts to
  `POST /api/auth/request-password-reset`.
* Reset links use `/reset-password?token=...` and post to
  `POST /api/auth/reset-password`.
* Verification links use `/verify-email?token=...` and post to
  `POST /api/auth/verify-email`.
* The GitHub and GitLab buttons are plain links to `GET /auth/github` and
  `GET /auth/gitlab` on the backend (full-page navigation, not `fetch`, so the
  browser follows the provider's OAuth consent redirect).
* Vite proxies `/api` and `/auth` requests to the backend API on
  `localhost:3000` during development.
* Successful sign-in stores the short-lived access token in React state only.
  The refresh token is held by the backend as a MongoDB session and sent to the
  browser as an `HttpOnly` cookie.
* [frontend/src/App.jsx](../../frontend/src/App.jsx) refreshes the session on
  load with `POST /api/auth/refresh`, gates `/dashboard`, `/profile`, and
  `/settings`, checks
  `GET /api/auth/me` with a bearer token, and calls `POST /api/auth/logout` to
  revoke the refresh session. After a GitHub/GitLab login the backend redirects
  the browser straight to `#dashboard`; the refresh-on-load call picks up the
  session cookie the OAuth callback already set. On OAuth failure the backend
  redirects to `#signin?error=<message>`, which
  [AuthPage.jsx](../../frontend/src/components/AuthPage.jsx) surfaces as the
  sign-in form's error banner.

---

## 🎨 Dashboard Interface

After sign-in, `/dashboard` renders
[Dashboard.jsx](../../frontend/src/components/Dashboard.jsx). The dashboard
preserves the protected-session check against `GET /api/auth/me`, supports
sign-out, and runs in **live mode** by default with a **demo mode** toggle as a
fallback.

### Live mode (default)

Live mode is wired entirely to backend APIs — it never fabricates analytics.
All repository reads go through
[frontend/src/api/repositories.js](../../frontend/src/api/repositories.js),
which implements the contract documented in
[docs/backend/BACKEND.md](../backend/BACKEND.md) ("Repository Read & Analytics
API"):

* On load, the dashboard fetches `GET /api/repositories`, selects the most
  recently updated repository, and renders its persisted totals — so the
  last-scan view survives page refreshes (nothing is session-only).
* The repository dropdown lists the user's real repositories from the API.
* Each tab fetches its own analytics endpoint for the selected repository
  (`GET /api/repositories/:id/scores`, `/debt`, `/drift`,
  `/recommendations`). Every request settles independently: an endpoint that
  returns `404` (engine not rolled out yet) empties only its own panels, which
  render honest "not available yet" empty states instead of sample data.
* While the selected repository's analysis `status` is `queued` or `running`,
  the dashboard polls `GET /api/repositories/:id/status` every 4 seconds and
  refreshes data when the run reaches `completed` or `failed`. Polling resumes
  automatically after a page refresh mid-scan.
* The scan form validates the GitHub URL client-side before posting to
  `POST /api/repositories/analyze`. Choosing an analyzed GitHub repository in
  the picker pre-fills its scan URL for a direct re-scan; choosing a connected
  repository does the same when its provider URL is supported. A successful
  scan switches the dashboard to live mode, selects the new repository, and
  reloads list + analytics.
* Until the read API ships on the backend, live mode degrades gracefully: it
  shows the current session's scan summary and marks the remaining panels as
  unavailable.

Four dashboard tabs:

* **Overview**: Score KPIs (health, critical risks, drift findings, AI
  actions) when the scores engine responds, otherwise real scan totals (files,
  docs, commits, dependency edges); analysis pipeline driven by the real
  analysis status; risk-trend area chart; top debt modules and drift findings.
* **Technical Debt**: Debt-metric KPIs, recharts complexity and
  churn/duplication bar charts, and the ranked module table from
  `GET /api/repositories/:id/debt`.
* **Knowledge Drift & Debt**: Drift findings queue and recharts documentation
  coverage bars from `GET /api/repositories/:id/drift`.
* **Risk & AI Recommendations**: Risk trend, pipeline state, and AI
  recommendation cards from `GET /api/repositories/:id/recommendations`.

Repositories with no completed analysis render a dedicated empty state
prompting the user to start a scan.

### Demo mode (toggle fallback)

The header demo toggle switches the whole dashboard to the sample data in
[frontend/src/demo/dashboardDemoData.js](../../frontend/src/demo/dashboardDemoData.js)
(repositories, KPIs, pipeline, debt modules, drift findings, coverage,
recommendations, risk trend). Demo data never leaves this module, and live
mode never reads it.

Authenticated screens share the [AppChrome.jsx](../../frontend/src/components/AppChrome.jsx)
top bar (brand, workspace navigation, screen actions, theme toggle, avatar,
sign-out). The dashboard adds a sticky underline tab strip (repository
identity + analysis status on the right) and a terminal-framed **repository
console** holding the picker, scan controls, scan output, and meta row. KPIs
render as borderless [MetricStrip.jsx](../../frontend/src/components/dashboard/MetricStrip.jsx)
cells separated by hairlines. Dashboard grids use single-column layouts until
enough viewport width is available, and the highest-risk module table
switches to compact cards on smaller screens to avoid page-level horizontal
scrolling.

---

## 👤 Profile & Settings

`/profile` and `/settings` render
[AccountPage.jsx](../../frontend/src/components/AccountPage.jsx). Both routes
reuse the protected-session flow and shared account layout.

* **Profile**: Edits display name and profile metadata, then persists through
  `PATCH /api/auth/profile`. The "Usage snapshot" card fetches
  `GET /api/auth/usage` (planned contract) and shows placeholder dashes until
  the endpoint is available.
* **Settings**: Uses clustered Interface, Notifications, Connected code hosts,
  and Security cards. Theme, density, scan cadence, AI summary detail, and
  notification preferences persist through `PATCH /api/auth/settings`.
* **Connected code hosts**: GitHub and GitLab cards start OAuth with expanded
  repository-read scopes. The backend retains an encrypted provider token and
  the dashboard fetches available provider repositories into its “Connected
  repository” dropdown. Choosing one fills the scan URL; the existing analyzer
  still accepts public GitHub URLs.
* The dashboard links to both routes from the sidebar and header controls.
* Password changes continue to use the reset-email flow at `/reset-password`.
