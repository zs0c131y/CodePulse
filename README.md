# CodePulse

CodePulse is an engineering intelligence prototype for analyzing repository
health, documentation drift, technical debt, knowledge debt, and AI-assisted
recommendations.

## Project Layout

```text
frontend/   React + Vite application
backend/    Express API and local development data store
docs/       Architecture, frontend, backend, and data model docs
```

## Development

Install dependencies from the repository root:

```powershell
npm install
```

Run the frontend:

```powershell
npm run dev
```

Run the backend API:

```powershell
npm run dev:backend
```

Run both together from the repository root:

```powershell
npm run dev
```

The frontend runs through Vite and proxies `/api` and `/auth` calls to the
backend API on `http://localhost:3000`.

## Documentation

Start with [docs/index.md](docs/index.md), then open the focused document for
the area you are changing.
