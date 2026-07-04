# CodePulse — Frontend Documentation

This document describes the React frontend structure, route flow, and auth API
wiring for CodePulse.

---

## 🛠️ Technology Stack & Styling

* **Framework**: React with Vite.
* **Build Config**: [frontend/vite.config.js](../../frontend/vite.config.js).
* **Styling**: Tailwind utilities, local shadcn-style primitives in
  [frontend/src/components/ui](../../frontend/src/components/ui), shared class
  merging in [frontend/src/lib/utils.js](../../frontend/src/lib/utils.js), and
  project CSS in [frontend/src/index.css](../../frontend/src/index.css) and
  [frontend/src/App.css](../../frontend/src/App.css).
* **Routing**: Lightweight client-side path routing in
  [frontend/src/App.jsx](../../frontend/src/App.jsx). Legacy hash routes are
  normalized for backward compatibility.

---

## 📂 Frontend Directory Structure

```text
frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/
│   │   └── hero.png
│   ├── components/
│   │   ├── ui/
│   │   │   ├── badge.jsx
│   │   │   ├── button.jsx
│   │   │   ├── card.jsx
│   │   │   ├── input.jsx
│   │   │   └── select.jsx
│   │   ├── AuthPage.jsx
│   │   ├── AccountPage.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Features.jsx
│   │   ├── FinalCTA.jsx
│   │   ├── Footer.jsx
│   │   ├── Hero.jsx
│   │   ├── HowItWorks.jsx
│   │   ├── LogoBar.jsx
│   │   ├── Navbar.jsx
│   │   ├── Problems.jsx
│   │   ├── Stats.jsx
│   │   └── Testimonials.jsx
│   ├── lib/
│   │   └── utils.js
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── index.html
└── vite.config.js
```

---

## 🏛️ Landing Page Flow

The landing page is composed in [frontend/src/App.jsx](../../frontend/src/App.jsx):

1. [Navbar](../../frontend/src/components/Navbar.jsx)
2. [Hero](../../frontend/src/components/Hero.jsx)
3. [LogoBar](../../frontend/src/components/LogoBar.jsx)
4. [Problems](../../frontend/src/components/Problems.jsx)
5. [Features](../../frontend/src/components/Features.jsx)
6. [HowItWorks](../../frontend/src/components/HowItWorks.jsx)
7. [Stats](../../frontend/src/components/Stats.jsx)
8. [Testimonials](../../frontend/src/components/Testimonials.jsx)
9. [FinalCTA](../../frontend/src/components/FinalCTA.jsx)
10. [Footer](../../frontend/src/components/Footer.jsx)

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
sign-out, and shows sample report data until repository-analysis APIs are
implemented.

Users can select a repository, enter a public GitHub repository URL, and start
a Repository Intelligence scan through `POST /api/repositories/analyze`. The
scan action sends the current bearer access token, shows loading/error/success
states, and renders the returned file, documentation, commit, dependency, and
directory counts. The dashboard header includes a demo/live mode toggle: demo
mode keeps the sample analytics visible, while live mode replaces the
hardcoded analytics with the latest scan summary available in the current
session. Header notification, settings, profile, and sign-out actions are
icon-only controls with hover tooltips. Users can also access four dashboard
tabs:

* **Overview**: Repository health score, technical debt grade, drift count, and
  critical risk count, plus analysis pipeline and risk trend panels.
* **Technical Debt**: Complexity heatmaps, duplication lists, circular
  dependencies, and churn hotspots in a ranked module table.
* **Knowledge Drift & Debt**: Drift findings and documentation coverage.
* **Risk & AI Recommendations**: Ranked modules with AI-generated remediation
  guidance.

Authenticated screens share a fixed sidebar, sticky header, responsive content
width, and shadcn-style buttons, badges, inputs, and selects. Dashboard grids use
single-column layouts until enough viewport width is available, and the
highest-risk module table switches to compact cards on smaller screens to avoid
page-level horizontal scrolling.

---

## 👤 Profile & Settings

`/profile` and `/settings` render
[AccountPage.jsx](../../frontend/src/components/AccountPage.jsx). Both routes
reuse the protected-session flow and shared account layout.

* **Profile**: Edits display name and profile metadata, then persists through
  `PATCH /api/auth/profile`.
* **Settings**: Edits theme, density, scan cadence, AI summary detail, and
  notification preferences, then persists through `PATCH /api/auth/settings`.
* The dashboard links to both routes from the sidebar and header controls.
* Password changes continue to use the reset-email flow at `/reset-password`.
