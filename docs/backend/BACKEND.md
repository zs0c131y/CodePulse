# CodePulse — Backend Documentation

This document describes the current backend structure, API routes, and planned
service boundaries for CodePulse.

---

## 🏛️ Backend Structure

```text
backend/
├── schema/
│   └── db_schema.js          # Draft MongoDB collection setup
└── src/
    ├── db.js                 # MongoDB connection and index setup
    └── index.js              # Express app and API routes
```

The backend uses Express and MongoDB. Runtime configuration is read from
`MONGO_URI`, with `mongodb://127.0.0.1:27017/codepulse` as the local fallback.

---

## 🔌 Local Development

* Run the frontend with `npm run dev`.
* Run the backend API with `npm run dev:backend`.
* The API listens on `http://localhost:3000`.
* The Vite dev server proxies `/api` requests to the backend.

---

## 🔐 Authentication API

Implemented in [backend/src/index.js](../../backend/src/index.js).

### `GET /api/health`

Returns API health and local user-store metadata.
Returns API health and MongoDB user-count metadata.

```json
{
  "status": "ok",
  "store": "mongodb",
  "users": 0
}
```

### `POST /api/auth/signup`

Creates a CodePulse account. Passwords are hashed with bcrypt before storage.

Request:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "Strongpass1"
}
```

Response:

```json
{
  "message": "Account created.",
  "user": {
    "id": "uuid",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "created_at": "2026-07-01T07:30:00.000Z"
  }
}
```

### `POST /api/auth/signin`

Validates email/password credentials.

Request:

```json
{
  "email": "ada@example.com",
  "password": "Strongpass1"
}
```

Response:

```json
{
  "message": "Signed in.",
  "user": {
    "id": "uuid",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "created_at": "2026-07-01T07:30:00.000Z"
  }
}
```

---

## ⚙️ Planned Analytical Services

The following services are still planned and should remain behind backend API
boundaries when implemented:

* **Repository Intelligence Service**: Clone repositories and extract file,
  commit, dependency, and documentation metadata.
* **Knowledge Drift Detection Engine**: Compare documentation against current
  source structure and flag drift findings.
* **Technical Debt Analyzer**: Compute complexity, churn, duplication, and
  circular dependency signals.
* **Knowledge Debt Analyzer**: Measure documentation coverage and onboarding
  completeness.
* **Risk Intelligence Engine**: Combine debt, drift, and activity signals into
  module-level risk scores.
