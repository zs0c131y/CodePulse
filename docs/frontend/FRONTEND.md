# CodePulse — Frontend Documentation

This document describes the design system, components, and layout architecture of the CodePulse web interface.

---

## 🛠️ Technology Stack & Styling

* **Framework**: React 18+ (bootstrapped with Vite)
* **Build System**: Vite (configured in [vite.config.js](file:///home/arden/Coding/CodePulse/vite.config.js))
* **Styling**: Vanilla CSS (global configurations in [src/index.css](file:///home/arden/Coding/CodePulse/src/index.css) and component styles in [src/App.css](file:///home/arden/Coding/CodePulse/src/App.css)).
* **Design Principles**: Dark mode UI, sleek glassmorphism, responsive grids, rich visual elements, and smooth CSS micro-animations.

---

## 📂 Current Frontend Directory Structure

```text
src/
├── App.css                    # Main application styling (gradients, hero grids, layout utilities)
├── App.jsx                    # Application entry controller displaying the landing pages
├── assets/                    # Assets and logos
├── components/                # Modular layout components
│   ├── AuthPage.jsx           # User Authentication component (Sign In / Register tab views)
│   ├── Features.jsx           # Feature highlight grid (continuous scan, AI explainability, risk score)
│   ├── FinalCTA.jsx           # Conversion CTA section at the bottom of the landing page
│   ├── Footer.jsx             # Footer with product navigation and social links
│   ├── Hero.jsx               # Interactive header with gradient text, visuals, and animations
│   ├── HowItWorks.jsx         # Step-by-step workflow visualizer
│   ├── LogoBar.jsx            # Trust section representing mock client logos
│   ├── Navbar.jsx             # Navigation header with scroll triggers and routing triggers
│   ├── Problems.jsx           # Core challenges section (technical debt, knowledge drift)
│   ├── Stats.jsx              # Platform performance showcase counter cards
│   └── Testimonials.jsx       # Customer quotes carousel/grid
├── index.css                  # Typography imports, custom CSS variables, and resets
└── main.jsx                   # React mounting script
```

---

## 🏛️ Landing Page Flow & Components

The landing page displays in [App.jsx](file:///home/arden/Coding/CodePulse/src/App.jsx). It walks the user through the value proposition:

1. **[Navbar](file:///home/arden/Coding/CodePulse/src/components/Navbar.jsx)**: Header controls. Routes to login page or sections.
2. **[Hero](file:///home/arden/Coding/CodePulse/src/components/Hero.jsx)**: Visual hook with primary action (Analyze Repository).
3. **[LogoBar](file:///home/arden/Coding/CodePulse/src/components/LogoBar.jsx)**: Mock integrations.
4. **[Stats](file:///home/arden/Coding/CodePulse/src/components/Stats.jsx)**: Quick impact figures.
5. **[Problems](file:///home/arden/Coding/CodePulse/src/components/Problems.jsx)**: Code decay and outdated docs.
6. **[HowItWorks](file:///home/arden/Coding/CodePulse/src/components/HowItWorks.jsx)**: Steps from URL input to AI suggestions.
7. **[Features](file:///home/arden/Coding/CodePulse/src/components/Features.jsx)**: Highlights core technical features.
8. **[Testimonials](file:///home/arden/Coding/CodePulse/src/components/Testimonials.jsx)**: Social proof.
9. **[FinalCTA](file:///home/arden/Coding/CodePulse/src/components/FinalCTA.jsx)**: Bottom action trigger.
10. **[Footer](file:///home/arden/Coding/CodePulse/src/components/Footer.jsx)**: Standard site links.

---

## 🎨 Planned Dashboard Interface (Vertical 7)

When users log in via the **[AuthPage](file:///home/arden/Coding/CodePulse/src/components/AuthPage.jsx)** and select a repository, they will access the CodePulse Dashboard. This dashboard will be organized into four tabs:

```text
┌────────────────────────────────────────────────────────────────────────┐
│  CodePulse  |  [Dashboard] [Tech Debt] [Knowledge Drift] [Risk & AI]   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [ Repository Health Score: 78/100 ]     [ Technical Debt Score: A- ]  │
│  [ Knowledge Drift Findings: 12 ]        [ Overall Risk: Medium ]      │
│                                                                        │
│  ┌──────────────────────────────┐    ┌──────────────────────────────┐  │
│  │    Risk Heatmap Graph        │    │    Drift Breakdown Details   │  │
│  │                              │    │                              │  │
│  └──────────────────────────────┘    └──────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Dashboard Overview Tab

* **Repository Health Score Card**: Large radial progress gauge displaying overall score (combining debt, documentation quality, and repository risk).
* **Summary Cards**:
  * **Technical Debt Score**: Letter grade (A-F) based on cyclomatic complexity and code quality.
  * **Knowledge Coverage**: Percentage of codebase covered by up-to-date documentation.
  * **Drift Count**: Total number of documented components that no longer match the code.
  * **Critical Risks**: Number of modules requiring immediate action.
* **Scan History**: A time-series line chart tracking repository health trends over the last 30 days.

### 2. Technical Debt Tab

* **Complexity Heatmap**: An interactive tree-map of repository folders. Larger, redder boxes represent large classes/methods with high cyclomatic complexity.
* **Metric Lists**:
  * Code duplication percentages per file.
  * Circular dependency paths visualized as interactive nodes.
  * High-churn list showing files modified most frequently in commit logs.

### 3. Knowledge Drift & Debt Tab

* **Drift List**: Table highlighting documentation anomalies:
  * Outdated sections showing code signature diffs next to documentation statements.
  * Deleted files that are still referenced in README files.
* **Documentation Coverage Breakdown**: Visual progress bars representing documentation coverage for each codebase subdirectory.

### 4. Risk & AI Recommendations Tab

* **Module Risk Table**: Sortable table ranking files/modules by risk (combining churn, complexity, and missing documentation).
* **AI Recommendation Drawer**: An interactive sidebar display triggered when clicking a risk card. It renders:
  * A clear explanation of the module's risks.
  * Step-by-step refactoring guidelines.
  * Code suggestions with copyable diffs.
