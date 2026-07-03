# 🤖 CodePulse — AI Agent Instructions & Guidelines

Welcome, AI Agent! To understand, edit, or extend this codebase, you must follow the documentation index and rules defined below.

---

## 🗺️ Documentation Entry Point

Do NOT scan the entire repository or read multiple files to discover the structure. All technical specifications, architectures, component layouts, and database configurations are mapped out in:

👉 **[docs/index.md](docs/index.md)** 👈

Open and read the [docs/index.md](docs/index.md) file first before writing code or suggesting changes. It provides a complete map of:

- **Project Workflows & Verticals** -> [docs/workflow/WORKFLOW.md](docs/workflow/WORKFLOW.md)
- **Frontend Architecture & Components** -> [docs/frontend/FRONTEND.md](docs/frontend/FRONTEND.md)
- **Backend Services & APIs** -> [docs/backend/BACKEND.md](docs/backend/BACKEND.md)
- **Data Model & Schema** -> [docs/database/DATABASE.md](docs/database/DATABASE.md)
- **AI Explainability Engine & Prompts** -> [docs/ai/AI_ENGINE.md](docs/ai/AI_ENGINE.md)

---

## 📜 Agent Guidelines & Rules

1. **Read Before Writing**: Always read the relevant `.md` file for the component you are modifying.
2. **Synchronized Changes**: If you modify any code structure, database tables, or APIs, you must update the corresponding documentation files in the `docs/` folder.
3. **No Code Pollution**: Keep files clean. Preserve existing comments and docstrings unless explicitly asked to modify them.
4. **Link references**: When citing code elements in your outputs or files, use project-relative file paths in standard Markdown format (e.g. `[App.jsx](frontend/src/App.jsx)`) so agents and developers can click them.
