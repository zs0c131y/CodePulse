# CodePulse — Frontend Documentation

This document describes the React frontend structure, route flow, and auth API
wiring for CodePulse.

---

## 🛠️ Technology Stack & Styling

* **Framework**: React with Vite.
* **Build Config**: [frontend/vite.config.js](../../frontend/vite.config.js).
* **Styling**: Tailwind utilities and project CSS in
  [frontend/src/index.css](../../frontend/src/index.css) and
  [frontend/src/App.css](../../frontend/src/App.css).
* **Routing**: Lightweight hash routing in
  [frontend/src/App.jsx](../../frontend/src/App.jsx).

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
│   │   ├── AuthPage.jsx
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
`#signin` and `#signup` modes.

* Signup posts to `POST /api/auth/signup`.
* Sign-in posts to `POST /api/auth/signin`.
* Vite proxies `/api` requests to the backend API on `localhost:3000`.
* Successful sign-in stores the public user object in local storage.

---

## 🎨 Planned Dashboard Interface

After sign-in, users will select a repository and access four dashboard tabs:

* **Overview**: Repository health score, technical debt grade, drift count, and
  critical risk count.
* **Technical Debt**: Complexity heatmaps, duplication lists, circular
  dependencies, and churn hotspots.
* **Knowledge Drift & Debt**: Drift findings and documentation coverage.
* **Risk & AI Recommendations**: Ranked modules with AI-generated remediation
  guidance.
