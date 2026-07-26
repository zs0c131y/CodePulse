# CodePulse — Design System Specification

This document specifies the 2026 design system. It replaces the previous
"Signal / Calm Intelligence" system in full — no tokens, components, or
patterns carry over.

---

## 1. One product, two worlds

The system is deliberately split into two visual worlds that share one token
architecture in [frontend/src/index.css](../frontend/src/index.css):

| World | Scope | Character |
| :--- | :--- | :--- |
| **The Product** | `/dashboard`, `/profile`, `/settings`, auth routes | A precision instrument. Neutral zinc surfaces, hairline borders, small radii, inverted-contrast primary actions, one blue accent for interactive state. Reference class: Vercel / Linear. |
| **The Journal** | `/` (marketing landing) | An editorial broadsheet. Warm paper, ink-black rules, one hot orange, oversized grotesk cut with italic serif, mono metadata, hard offset shadows, film grain. Fixed palette — it does **not** follow the app theme. |

The Journal is scoped under the `.mk` class
([MarketingPage.jsx](../frontend/src/components/MarketingPage.jsx) root). All
Journal tokens are `--mk-*` and are defined only inside `.mk`, so the app
theme can never leak into the broadsheet, and vice versa.

---

## 2. The Journal (marketing)

### 2.1 Palette (fixed, theme-independent)

| Token | Value | Use |
| :--- | :--- | :--- |
| `--mk-paper` / `--mk-paper-2` / `--mk-card` | `#f3efe4` / `#eae5d3` / `#faf7ec` | Paper planes |
| `--mk-ink` | `#17130c` | Headlines, rules, inverted bands |
| `--mk-ink-2` / `--mk-ink-3` | `#55503f` / `#8b8471` | Body / metadata |
| `--mk-line` / `--mk-line-soft` | `#17130c` / 16% alpha | 1.5px solid rules / hairlines |
| `--mk-accent` | `#ff4d00` | The one hot signal. Buttons, ECG trace, marquee dots, serif accents |
| `--mk-accent-strong` | `#c73e00` | Small text on paper (contrast-safe) |

### 2.2 Type

Three families, loaded in [frontend/index.html](../frontend/index.html):

- **Archivo** (500–900) — display headlines, always uppercase, weight 800+,
  line-height ~0.94, via `.mk-h`.
- **Instrument Serif** (400 italic) — the counter-voice: single accent words
  inside headlines, pull-quotes, oversized stat numerals, via `.mk-serif`.
- **Geist Mono** — metadata, tags, buttons, eyebrows: uppercase, ~0.69rem,
  0.13em tracking, via `.mk-mono`.

Body copy uses Geist at 1.125rem/1.75.

### 2.3 Signature moves

- **Solid 1.5px ink rules** structure every section; no soft grey dividers.
- **Hard offset shadow** (`8px 8px 0 ink`) on `.mk-card` — the only shadow.
- **Hover inversion**: ledger rows flip to ink background / paper text.
- **The ECG trace** (`.mk-ecg`): the product namesake, an animated
  stroke-dashoffset draw on the hero instrument (Fig. 01).
- **Marquee band** (`.mk-marquee-track`): ink strip with scrolling mono
  signal names.
- **Film grain** (`.mk-grain`): fixed feTurbulence noise at 5% multiply over
  the whole page; `pointer-events: none`.
- Sections are numbered `01 / Signals`, `02 / Workflow`, `03 / Evidence`,
  `04 / Begin` — the broadsheet's table of contents.
- Reduced motion: marquee, ECG, and reveals stop; layout is unaffected.

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
- **Scrim**: `.scrim` is the only `backdrop-filter` surface (sticky bars,
  dialogs).
- **The mark**: [ui/pulse-mark.jsx](../frontend/src/components/ui/pulse-mark.jsx)
  — ECG trace in a chip; `product` variant (ink chip + blue trace) in the
  app, `journal` variant (square ink chip + orange trace) in marketing.

### 3.3 App shell

- **Top bar** ([AppChrome.jsx](../frontend/src/components/AppChrome.jsx),
  sticky, `.scrim`, 56px): brand + workspace navigation (Dashboard, Profile,
  Settings) left; screen-specific actions, theme toggle, avatar, sign-out
  right. Shared by every authenticated screen.
- **Section tabs** (dashboard, sticky under the top bar): text tabs with a
  2px contrast underline for the active section; repository identity +
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
- Focus-visible: 2px accent outline (Journal: `--mk-accent-strong`).
- Meaningful loops (spinners, live dots) survive `prefers-reduced-motion`;
  decorative motion (marquee, ECG, reveal) does not.
- Contrast pairs to re-verify after any token edit: `--ink-2/3` on
  `--surface-1/canvas`, `--accent-ink` on canvas, `--mk-ink-2/3` on
  `--mk-paper`, `--mk-accent-strong` on `--mk-paper`, severity inks on their
  washes.
