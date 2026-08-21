# CodePulse — Design System Specification

This document specifies the 2026 design system. It replaces the previous
"Signal / Calm Intelligence" system in full — no tokens, components, or
patterns carry over.

---

## 1. One coherent product system

The marketing landing page and authenticated workspace use the same semantic
token architecture in [frontend/src/index.css](../frontend/src/index.css).
Both follow the saved light/dark preference, use Geist and Geist Mono, and
share the product's neutral surfaces, blue interaction accent, hairline
borders, restrained radii, and accessible focus states. Marketing can use
larger spacing and type, but it must still look like the product it introduces.

---

## 2. Product landing (`/`)

### 2.1 User and flow

**Primary users:** engineering leads, platform teams, and maintainers evaluating
whether CodePulse can make repository risk easier to understand and prioritize.

**Goal:** communicate the product outcome quickly, show a credible product
preview, explain the workflow and trust boundary, then lead to account creation
or sign-in.

```text
Direct visit → Understand the outcome → Explore the product preview
             → Review capabilities/workflow/trust → Create account or sign in
```

The route has no loading or network-dependent state. Local interaction states
are the closed/open mobile menu and the selected product-preview tab. Anchor
navigation must work with browser back/forward behavior and retain visible
focus. The primary success exit is `/signup`; returning users exit through
`/signin`.

### 2.2 Component handoff

| Component | Purpose | Important states and behavior |
| :--- | :--- | :--- |
| `LandingNav` | Brand, section anchors, theme, and account actions | Opaque sticky surface; desktop links; mobile menu button exposes `aria-expanded` and collapses after navigation. |
| `Hero` | Outcome-led positioning and primary CTA | Two-column desktop and stacked mobile layout; product preview is labelled illustrative. |
| `ProductPreview` | Lets visitors inspect risk, drift, and recommendations without pretending to be live data | Native tab semantics, arrow-key navigation, visible selected state, one panel rendered at a time. |
| `CapabilityGrid` | Four concise product benefits | One column on mobile, two on tablet/desktop; no hover-only information. |
| `Workflow` | Connect, analyze, act journey | Ordered steps with plain-language security and evidence context. |
| `TrustSection` | Explains deterministic evidence, opt-in AI, and shareable snapshots | Claims must match implemented product boundaries; no invented customer proof or usage statistics. |
| `LandingCta` / `LandingFooter` | Final decision point and account/product links | Primary signup action, secondary sign-in action, compact responsive footer. |

### 2.3 Tokens and visual rules

- Reuse `--surface-*`, `--ink-*`, `--line-*`, `--accent-*`, `--contrast-*`,
  severity, radius, elevation, and motion tokens. No landing-only colour system.
- Geist is the only prose/display family and Geist Mono is reserved for compact
  product metadata. No serif type, uppercase broadsheet headlines, or issue
  numbering.
- Use a 76rem marketing container, 64–112px section spacing, readable body copy
  capped near 65 characters, and a hero heading capped near 64px.
- Panels remain flat with hairline borders. Shadows are limited to the product
  preview's floating shell; there are no hard offset shadows or texture overlays.
- Motion is limited to existing scroll reveals and short interaction
  transitions. `prefers-reduced-motion` removes decorative movement.

### 2.4 Responsive and accessibility acceptance

- At widths below 768px, navigation becomes a labelled menu button, CTA groups
  stack or wrap, preview content remains horizontally safe, and all sections
  retain a logical reading order.
- Headings follow one `h1` and sequential `h2`/`h3` structure; feature lists and
  workflow steps use semantic list markup.
- Product-preview tabs use `role="tablist"`, `role="tab"`, `aria-selected`,
  `aria-controls`, roving `tabIndex`, and Left/Right/Home/End navigation.
- All interactive targets are at least 40px tall, color is never the only state
  indicator, and focus rings use the shared accent token.
- Implementation target: React/Vite in
  [MarketingPage.jsx](../frontend/src/components/MarketingPage.jsx), with no API
  changes. Acceptance requires production build, lint, mobile/desktop layouts,
  keyboard operation, and light/dark theme support.

---

## 3. The Product (app)

### 3.1 Tokens (theme-aware, `data-theme="light" | "dark"`)

Token *names* are the public contract — components use semantic tokens only,
never colour literals:

| Group | Tokens | Notes |
| :--- | :--- | :--- |
| Surfaces | `--surface-canvas`, `--surface-1..3`, `--surface-overlay`, `--surface-sunken`, `--surface-wash` | Dark: `#0a0a0a` → `#1f1f1f`. Light: `#fafafa` → `#e7e7ea` |
| Ink | `--ink-1..4` | `--ink-4` is below 4.5:1 — icons/placeholders only |
| Lines | `--line-1..3` | Hairlines do layout work instead of shadows |
| Accent | `--accent`, `--accent-hover`, `--accent-ink`, `--accent-on`, `--accent-wash`, `--accent-line` | One blue (dark `#3b82f6`, light `#0070f3`), interactive state only |
| Contrast | `--contrast`, `--contrast-hover`, `--contrast-on` | The primary action: an inverted surface (ink button on canvas), never a coloured button |
| Providers | `--provider-github`, `--provider-gitlab` | Only beside explicit provider actions |
| Severity | `--sev-{nominal,low,medium,high,critical}` + `-ink` / `-wash` / `-line` | Always rendered as icon + label via `SeverityBadge`, never colour alone |
| Deltas | `--delta-up/down/flat` | Direction-of-change indicators |
| Series | `--series-1..6` | Chart identity, fixed assignment order |
| Heat | `--heat-1..5` | Single-hue risk ramp |
| Elevation | `--shadow-e1..e4` | Borders first; shadows only for floating layers (dropdowns, dialogs) |
| Radius | `--r-xs..xl` (4–16px) | Small and sharp; cards use `--r-lg` (12px) |
| Motion | `--d-1..5`, `--ease-out/in/inout` | One easing family |

Density is exposed as `data-density` via `--pad-card` / `--pad-row`.

### 3.2 Components

- **Buttons** ([ui/button.jsx](../frontend/src/components/ui/button.jsx)):
  `default` = contrast (inverted surface), `outline` / `secondary` =
  hairline surfaces, `ghost`, `link`, `destructive`. Height 40px (`sm` 32px),
  radius `--r-md`, no lift shadows on hover — colour shifts only.
- **Inputs / selects**: 40px, `--r-md`, `surface-1`, `--line-2` border,
  hover `--line-3`, focus = accent border + 3px `--accent-wash` ring.
- **Panels**: `.panel` (surface-1, `--line-1`, `--r-lg`, flat), `.panel-2`
  (nested), `.panel-interactive` (border/background hover — no translate).
- **Scrim**: `.scrim` is the only `backdrop-filter` surface and is reserved
  for floating overlays and dialogs; navigation surfaces remain opaque.
- **The mark**: [ui/pulse-mark.jsx](../frontend/src/components/ui/pulse-mark.jsx)
  — one theme-aware ECG trace in a rounded contrast chip across landing,
  authentication, shared reports, and the authenticated app.

### 3.3 App shell

- **Top bar** ([AppChrome.jsx](../frontend/src/components/AppChrome.jsx),
  sticky, opaque `--surface-1`, 56px): brand + workspace navigation (Dashboard, Profile,
  Settings) left; screen-specific actions, theme toggle, avatar, sign-out
  right. Shared by every authenticated screen.
- **Section tabs** (dashboard, sticky under the top bar on opaque
  `--surface-1`): text tabs with a 2px contrast underline for the active section; repository identity +
  analysis-status badge on the right.
- **Repository console**: the dashboard's control room — a terminal-framed
  panel (overline labels, live pulse dot while a scan is queued/running)
  holding the repository picker, scan input, scan output, and meta row.
- **Metric strips**: KPIs render as one continuous strip of borderless cells
  separated by hairlines ([MetricStrip.jsx](../frontend/src/components/dashboard/MetricStrip.jsx)),
  not boxed cards.
- **Settings/profile**: single-column `max-w-3xl` cards under the same top
  bar; cards may carry a footer strip (hint left, action right).

---

## 4. Charts

Recharts, themed through
[frontend/src/lib/useChartTokens.js](../frontend/src/lib/useChartTokens.js)
(SVG attributes cannot resolve `var()`, so the hook reads computed tokens and
re-reads on theme change). Rules unchanged: one nominal series per chart
unless comparing measures; series slots assigned in fixed order; every chart
has a table alternative.

---

## 5. Accessibility invariants

- Severity is always icon + text label (`SeverityBadge`); hue never carries
  meaning alone.
- `--ink-4` never renders text.
- Focus-visible: 2px accent outline across marketing and product surfaces.
- Meaningful loops (spinners, live dots) survive `prefers-reduced-motion`;
  decorative reveal motion does not.
- Contrast pairs to re-verify after any token edit: `--ink-2/3` on
  `--surface-1/canvas`, `--accent-ink` on canvas, `--contrast-on` on
  `--contrast`, and severity inks on their washes.
