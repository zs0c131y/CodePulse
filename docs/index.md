# CodePulse — Project Root Context & Agent Guide

Welcome to the **CodePulse** project context. This document serves as the primary entry point for AI agents, developers, and tools working on this codebase. It provides a complete map of the documentation, codebase structure, and developer guidelines to ensure seamless collaboration.

---

## 🚀 About CodePulse
**CodePulse** is an AI-powered Engineering Intelligence Platform that continuously analyzes software repositories to evaluate their overall health. Unlike traditional static analysis tools that only check code quality, CodePulse identifies documentation drift, technical and knowledge debt, maintainability risks, and provides AI-assisted recommendations to improve software sustainability.

For details on the project pitch and architecture, refer to the [Workflow & Architecture Overview](file:///home/arden/Coding/CodePulse/docs/workflow/WORKFLOW.md).

---

## 🗺️ Documentation Sitemap
To avoid reading multiple codebase files simultaneously, refer directly to these modular documentation files based on the component you are working on:

| Section | Target File | Purpose & Contents |
| :--- | :--- | :--- |
| **Workflow & Architecture** | [docs/workflow/WORKFLOW.md](file:///home/arden/Coding/CodePulse/docs/workflow/WORKFLOW.md) | End-to-end processing pipeline, the 7 core verticals, architecture diagrams, and high-level workflows. |
| **Frontend Documentation** | [docs/frontend/FRONTEND.md](file:///home/arden/Coding/CodePulse/docs/frontend/FRONTEND.md) | UI components (existing landing page structures), planned dashboard views (tech debt, knowledge debt, risk dashboard), and styling guides. |
| **Backend Documentation** | [docs/backend/BACKEND.md](file:///home/arden/Coding/CodePulse/docs/backend/BACKEND.md) | Core backend services (Repo Intelligence, Debt Analyzers, Risk Engine), API specifications, and overall backend architecture. |
| **Database Schema** | [docs/database/DATABASE.md](file:///home/arden/Coding/CodePulse/docs/database/DATABASE.md) | Database configuration, Entity-Relationship Diagram (ERD), detailed table structures, and relationships. |
| **AI Explainability Engine** | [docs/ai/AI_ENGINE.md](file:///home/arden/Coding/CodePulse/docs/ai/AI_ENGINE.md) | AI explainability pipelines, prompt templates, context construction, and recommendation generators. |

---

## 📁 Codebase Directory Structure
The repository is structured as a monorepo containing the frontend app, docker configurations, database scripts, and project documentation:

```text
CodePulse/
├── src/                       # Frontend Source Code (React + Vite)
│   ├── assets/                # Images, fonts, and static SVGs
│   ├── components/            # Reusable UI Components (Hero, Navbar, Problems, Features, AuthPage)
│   ├── App.jsx                # Main Application Shell & Landing Page Router
│   ├── index.css              # Global Tailored CSS Variables & Reset
│   └── main.jsx               # React Application Entry Point
├── databases/                 # Database initialization and migration scripts
│   └── init/
│       └── creation.sql       # Initial database schemas and table definitions
├── dockerFiles/               # Docker configurations for development and production
│   ├── dev/                   # Development containers
│   │   ├── database/          # Custom MySQL configurations & Dockers
│   │   └── workbench/         # MySQL Workbench container configuration
│   └── production/            # Production container configuration
├── docs/                      # Technical Documentation
│   ├── database/              # Database-specific docs
│   │   └── DATABASE.md        # Database Entity-Relationship and schema details
│   ├── workflow/              # Workflow-specific docs
│   │   └── WORKFLOW.md        # Processing pipeline and architecture layout
│   ├── frontend/              # Frontend-specific docs
│   │   └── FRONTEND.md        # Component mappings and dashboard views
│   ├── backend/               # Backend-specific docs
│   │   └── BACKEND.md         # API routes and analytical engines specifications
│   ├── ai/                    # AI explainability-specific docs
│   │   └── AI_ENGINE.md       # Context builder and prompt patterns
│   └── index.md               # This entry point document
├── docker-compose.yaml        # Local development multi-container setup (MySQL + Workbench)
└── package.json               # Frontend dependencies and run scripts
```

---

## 🛠️ Instructions for AI Agents & Developers

1. **Keep Documentation Updated**: If you add a new database table, modify a frontend route, or change an API endpoint, you **must** update the corresponding documentation file under `docs/`.
2. **Modular Architecture**:
   - Keep frontend logic inside [docs/frontend/FRONTEND.md](file:///home/arden/Coding/CodePulse/docs/frontend/FRONTEND.md) and code in `src/`.
   - Keep backend logic inside [docs/backend/BACKEND.md](file:///home/arden/Coding/CodePulse/docs/backend/BACKEND.md) and database files under `databases/` and `docs/database/`.
   - Keep AI LLM prompts and explainability logic inside [docs/ai/AI_ENGINE.md](file:///home/arden/Coding/CodePulse/docs/ai/AI_ENGINE.md).
3. **Reference Links**: Always use absolute or project-relative file links (e.g. `[Hero.jsx](file:///home/arden/Coding/CodePulse/src/components/Hero.jsx)`) when referencing code elements in documentation, so other agents can navigate instantly.
4. **Environment Configuration**: Always consult `.env` (managed locally) for development credentials. MySQL runs on port `3306` inside the Docker network.
