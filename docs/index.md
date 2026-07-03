# CodePulse — Project Root Context & Agent Guide

Welcome to the **CodePulse** project context. This is the documentation entry
point for agents, developers, and tools working on this repository.

---

## 🚀 About CodePulse

**CodePulse** is an AI-powered Engineering Intelligence Platform that analyzes
software repositories for documentation drift, technical debt, knowledge debt,
maintainability risks, and AI-assisted remediation opportunities.

---

## 🗺️ Documentation Sitemap

Use these focused documentation files instead of scanning the repository:

| Section | Target File | Purpose |
| :--- | :--- | :--- |
| **Workflow & Architecture** | [docs/workflow/WORKFLOW.md](workflow/WORKFLOW.md) | End-to-end processing pipeline and core verticals. |
| **Frontend** | [docs/frontend/FRONTEND.md](frontend/FRONTEND.md) | React app structure, routes, and UI component layout. |
| **Backend** | [docs/backend/BACKEND.md](backend/BACKEND.md) | Express API, auth routes, and backend service boundaries. |
| **Data Model** | [docs/database/DATABASE.md](database/DATABASE.md) | Runtime data store and domain schema overview. |
| **MongoDB Schema Reference** | [docs/database/MONGODB_SCHEMA.md](database/MONGODB_SCHEMA.md) | Collection-level schema converted from the draft schema script. |
| **AI Engine** | [docs/ai/AI_ENGINE.md](ai/AI_ENGINE.md) | AI explainability pipelines, prompt templates, and context construction. |

---

## 📁 Codebase Directory Structure

The repository is organized as a small monorepo with separated frontend,
backend, schema, and documentation areas:

```text
CodePulse/
├── frontend/                  # React + Vite frontend application
│   ├── public/                # Static browser assets
│   ├── src/                   # Frontend source code
│   │   ├── assets/            # Images, fonts, and static SVGs
│   │   ├── components/        # Reusable UI components
│   │   ├── App.jsx            # Client-side route controller
│   │   ├── App.css            # Component and layout styling
│   │   ├── index.css          # Global CSS and Tailwind imports
│   │   └── main.jsx           # React entry point
│   ├── index.html             # Vite HTML shell
│   └── vite.config.js         # Frontend build and dev proxy config
├── backend/                   # Express API backend
│   ├── schema/                # Draft database schema scripts
│   │   └── db_schema.js       # MongoDB collection setup draft
│   └── src/                   # Backend source code
│       ├── db.js              # MongoDB connection and indexes
│       └── index.js           # API route definitions
├── docs/                      # Technical documentation
│   ├── ai/
│   ├── backend/
│   ├── database/
│   ├── frontend/
│   ├── workflow/
│   └── index.md
├── package.json               # Root scripts and shared dependencies
├── package-lock.json          # Root lockfile
└── README.md                  # Project overview
```

---

## 🛠️ Instructions for Agents & Developers

1. **Read Before Writing**: Start here, then read the relevant doc for the
   folder you are changing.
2. **Synchronized Changes**: Update the matching file under `docs/` whenever
   code structure, APIs, routes, or the data model changes.
3. **Folder Ownership**: Keep UI code under `frontend/`, API code under
   `backend/`, and technical docs under `docs/`.
4. **Reference Links**: Use project-relative Markdown links such as
   `[AuthPage.jsx](../../frontend/src/components/AuthPage.jsx)`.
