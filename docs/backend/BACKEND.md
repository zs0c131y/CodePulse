# CodePulse — Backend Documentation

This document describes the current backend structure, API routes, and planned
service boundaries for CodePulse.

---

## 🏛️ Backend Structure

```text
backend/
├── .env                                 # Environment variables (not committed)
├── index.js                             # Server entry point (backend project root)
├── schema/
│   └── db_schema.js                    # Draft MongoDB collection setup
└── src/
    ├── config/
    │   └── index.js                    # Single source of truth for env vars (UPPER_CASE exports) + app constants
    ├── db/
    │   └── index.js                    # MongoDB connection and index setup
    ├── features/
    │   ├── auth/
    │   │   ├── controler/
    │   │   │   ├── credentials.controller.js # Email/password auth logic (signup, signin, etc.)
    │   │   │   ├── github.controller.js       # GitHub OAuth login/callback
    │   │   │   └── gitlab.controller.js       # GitLab OAuth login/callback
    │   │   └── router.js               # Auth route definitions
    │   └── health/
    │       ├── controller.js           # Health check handler
    │       └── router.js               # Health route definition
    ├── middleware/
    │   ├── cors.js                     # CORS middleware
    │   ├── rateLimiter.js              # Rate limiting middleware
    │   ├── requireAccessToken.js       # JWT access token guard
    │   └── securityHeaders.js          # Security response headers
    ├── utils/
    │   ├── cookie.js                   # Cookie parsing and management
    │   ├── email.js                    # Auth email delivery and link builder
    │   ├── env.js                      # Loads backend/.env via dotenv (imported first by index.js)
    │   ├── loginAttempts.js            # Brute-force login protection
    │   ├── network.js                  # Forces fetch() to IPv4-only (works around undici Happy-Eyeballs bug)
    │   ├── session.js                  # Session and verification token logic
    │   ├── token.js                    # JWT signing, verification, crypto
    │   ├── urls.js                     # OAuth callback + frontend link builders (derived from config)
    │   └── validators.js              # Input validation and user serialization
    └── app.js                          # Express app setup and middleware wiring
```

`dist/` (project root, alongside `backend/` and `frontend/`) is the built
frontend (Vite `outDir`, see
[frontend/vite.config.js](../../frontend/vite.config.js)). It is
git-ignored and only produced by `npm run build`; it does not exist in a
fresh checkout and is never required for local development.

Repository Intelligence is implemented under
[backend/src/features/repositories](../../backend/src/features/repositories).
The feature contains a protected router, a request controller, and service
modules for cloning repositories, parsing files, extracting documentation,
reading commit history, building a basic dependency graph, orchestrating scans,
and persisting metadata.

[backend/src/utils/env.js](../../backend/src/utils/env.js) loads `backend/.env`
via `dotenv`, resolving the path relative to its own file location (not
`process.cwd()`, which would break when launched from a different working
directory). [backend/src/utils/network.js](../../backend/src/utils/network.js)
forces `fetch()` to use IPv4-only connections, working around an `undici` bug
where a non-internet-routable IPv6 interface (e.g. a VPN) makes `fetch()` fail
outbound calls to GitHub/GitLab/SMTP2GO even though the network is otherwise
fine. Both are the first two imports in
[backend/index.js](../../backend/index.js), before any other module runs, so
env vars and the fetch dispatcher are ready before anything can need them.
Every environment variable is then read exactly once, in
[backend/src/config/index.js](../../backend/src/config/index.js), and
re-exported under the same `UPPER_CASE` name as the variable itself (e.g.
`process.env.MONGO_URI` → `export const MONGO_URI`). No other module reads
`process.env` directly — they import the named constant from `config/index.js`
instead, so a reader can always tell an env-sourced value from an internal
constant by its casing.

The backend uses Express and MongoDB. Runtime configuration is read from:

* `MONGO_URI`: MongoDB connection string, with
  `mongodb://127.0.0.1:27017/codepulse` as the local fallback.
* `MONGO_DB_NAME`: optional database-name override. When omitted, the backend
  uses the database name from the `MONGO_URI` path.
* `MONGO_LOCAL_HOST`: optional local-development hostname override for MongoDB.
  On Windows local runs, a `MONGO_URI` host of `mongo` is automatically mapped
  to `127.0.0.1` because `mongo` is a Docker-network hostname.
* `MONGO_DNS_SERVERS`: optional comma-separated DNS server list for local
  `mongodb+srv://` Atlas connections. Defaults to `1.1.1.1,8.8.8.8` outside
  production because Node's SRV resolver can fail when a local network resolver
  refuses MongoDB Atlas SRV lookups.

Authentication also reads:

* `JWT_SECRET`: required in production for signed access tokens.
* `FRONTEND_URL`: public frontend URL used to build verification/reset links
  and OAuth redirect targets (`http://localhost:5173` local fallback).
* `BACKEND_URL`: public backend URL used to build OAuth callback URLs
  (`http://localhost:3000` local fallback). See
  [backend/src/utils/urls.js](../../backend/src/utils/urls.js) for the derived
  callback/link builders.
* `EMAIL_KEY`: SMTP2GO API key used to send verification and password reset
  emails through `POST https://api.smtp2go.com/v3/email/send`.
* `VERIFICATION_EMAIL`: verified SMTP2GO sender address used for email
  verification messages. SMTP2GO requires the sender domain or address to be
  verified. Emails are sent with the display name `CodePulse Account Team`.
* `PASSWORD_RESET_EMAIL`: optional verified SMTP2GO sender address used for
  password reset messages. If omitted, password reset emails use
  `VERIFICATION_EMAIL`.
* `AUTH_EMAIL_WEBHOOK_URL`: optional fallback delivery webhook used when
  SMTP2GO is not configured. The backend posts `{ kind, email, link }`.
* `AUTH_EMAIL_WEBHOOK_TOKEN`: optional bearer token for the fallback email
  webhook.
* `ALLOWED_ORIGINS`: comma-separated browser origins allowed to send
  credentialed API requests (`http://localhost:5173,http://127.0.0.1:5173`
  local fallback).
* `GITHUB_ID` / `GITHUB_SECRET`: GitHub OAuth App credentials. GitHub login is
  disabled (`503`) when unset.
* `GITLAB_ID` / `GITLAB_SECRET`: GitLab OAuth Application credentials. GitLab
  login is disabled (`503`) when unset.

If `EMAIL_KEY` or any context sender email is set, the matching sender email is
also required. In production, auth email delivery requires SMTP2GO configuration
unless the fallback webhook is configured.

---

## 🔌 Local Development

* Run the full local stack with `npm run dev` from the repository root. This
  starts the Vite frontend and Express backend concurrently.
* Run the frontend only with `npm run dev:frontend`.
* Run the backend API only with `npm run dev:backend`.
* Run backend Repository Intelligence fixture tests with `npm test` from the
  repository root, or `npm test` from `backend/`.
* The API listens on `http://localhost:3000` (`API_PORT` / `PORT` override).
* The Vite dev server proxies `/api` and `/auth` requests to the backend.
* If `MONGO_URI` uses a Docker hostname such as `mongo`, either set
  `MONGO_LOCAL_HOST` (defaults to `127.0.0.1` on Windows) or make sure the
  MongoDB container publishes port `27017` to the host when running the
  backend through local `npm` scripts.
* If `MONGO_URI` uses a MongoDB Atlas `mongodb+srv://` URI, local development
  sets Node's DNS servers to `1.1.1.1,8.8.8.8` by default. Override with
  `MONGO_DNS_SERVERS` if your network requires different resolvers.
* In local development, verification and reset links are logged to the backend
  console only. Tokenized links are never returned in API responses.

---

## 🚀 Production

`NODE_ENV=production` (`IS_PRODUCTION` in
[backend/src/config/index.js](../../backend/src/config/index.js)) switches the
backend from an API-only server into one that also serves the built frontend:

1. Build the frontend from the repo root: `npm run build`. This runs
   `vite build` with `outDir: '../dist'`
   (see [frontend/vite.config.js](../../frontend/vite.config.js)), so the
   compiled HTML/JS/CSS land in `dist/` at the project root, alongside
   `backend/` and `frontend/`.
2. Start the backend with `NODE_ENV=production node backend/index.js`.
   [backend/src/app.js](../../backend/src/app.js) then:
   * Serves static files (JS, CSS, images) from `dist/` via
     `express.static`.
   * Falls back to `dist/index.html` for any unmatched **GET**
     request whose path does not start with `/api` or `/auth` — this lets
     the client-side router handle deep links (e.g. a browser refresh on
     `/dashboard`) instead of 404ing.
   * Unmatched `/api/*` and `/auth/*` requests still fall through to the
     JSON `404` handler, so a bad API call never gets the HTML shell back.

This behavior is entirely gated on `IS_PRODUCTION` — in local development
(`npm run dev`), the Vite dev server on `:5173` serves the frontend and
proxies `/api`/`/auth` to the backend instead, and `dist/` is never
read (it doesn't need to exist).

`dist/` is git-ignored; each deploy must run `npm run build` before
starting the backend in production.

---

## 🔐 Authentication API

Implemented in [backend/src/features/auth/controler/credentials.controller.js](../../backend/src/features/auth/controler/credentials.controller.js).

The backend applies security headers, credentialed CORS for configured origins,
global request rate limiting, auth-route rate limiting, and Mongo-backed
brute-force lockouts for repeated failed sign-in attempts. In production,
startup fails before `app.listen()` if MongoDB indexes cannot be created,
including the unique email index and auth token indexes. In local development,
the API still listens on port `3000` in degraded mode and auth routes return
`503` until MongoDB connectivity is fixed.

Verification and password reset emails are delivered by SMTP2GO when
`EMAIL_KEY` and the context sender email are present. Each email uses the
SMTP2GO standard email API with `sender`, a single-recipient `to` array,
`subject`, `text_body`, and `html_body`. The HTML bodies use branded
responsive, table-based templates with inline CSS for broad email-client
compatibility. Plain-text fallbacks are always sent.

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

When local MongoDB startup fails, the same endpoint returns `503`:

```json
{
  "status": "degraded",
  "store": "mongodb",
  "message": "Database is unavailable.",
  "error": "connection error details"
}
```

### `POST /api/auth/signup`

Creates an unverified CodePulse account. Passwords are hashed with bcrypt before
storage, and an email verification link is sent before the account can sign in.

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
  "message": "Account created. Check your email to verify your account before signing in.",
  "user": {
    "id": "uuid",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "email_verified": false,
    "created_at": "2026-07-01T07:30:00.000Z"
  }
}
```

### `POST /api/auth/resend-verification`

Sends a fresh verification link for an unverified account. The response is
generic to avoid exposing whether an arbitrary email belongs to an unverified
account.

Request:

```json
{
  "email": "ada@example.com"
}
```

Response:

```json
{
  "message": "If an unverified account exists for that email, a new verification link has been sent."
}
```

### `POST /api/auth/verify-email`

Verifies an account using the token from the email verification link.

Request:

```json
{
  "token": "verification-token"
}
```

Response:

```json
{
  "message": "Email verified. You can now sign in."
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
    "email_verified": true,
    "created_at": "2026-07-01T07:30:00.000Z"
  },
  "accessToken": "signed-short-lived-token",
  "expiresIn": 900
}
```

The response sets an `HttpOnly`, `SameSite=Lax` refresh cookie scoped to
`/api/auth`. In production the cookie is also marked `Secure`.

If the credentials are valid but the account has not verified its email, the
backend returns `403` with:

```json
{
  "message": "Verify your email before signing in.",
  "canResendVerification": true
}
```

### `POST /api/auth/refresh`

Uses the refresh cookie to mint a new short-lived access token.

Response:

```json
{
  "message": "Session refreshed.",
  "user": {
    "id": "uuid",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "email_verified": true,
    "created_at": "2026-07-01T07:30:00.000Z"
  },
  "accessToken": "signed-short-lived-token",
  "expiresIn": 900
}
```

### `POST /api/auth/logout`

Revokes the active refresh session and clears the refresh cookie.

Response:

```json
{
  "message": "Signed out."
}
```

### `GET /api/auth/me`

Protected endpoint requiring `Authorization: Bearer <accessToken>`.

Response:

```json
{
  "user": {
    "id": "uuid",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "email_verified": true,
    "created_at": "2026-07-01T07:30:00.000Z",
    "profile": {
      "title": "Engineering Manager",
      "company": "Acme Inc.",
      "timezone": "UTC",
      "location": "Bengaluru, India",
      "bio": "Owns platform engineering health."
    },
    "settings": {
      "theme": "system",
      "density": "comfortable",
      "scan_frequency": "daily",
      "ai_summary_level": "balanced",
      "email_notifications": true,
      "weekly_digest": true,
      "risk_alerts": true,
      "drift_alerts": true
    }
  }
}
```

### `PATCH /api/auth/profile`

Protected endpoint requiring `Authorization: Bearer <accessToken>`. Updates the
signed-in user's display name and optional profile metadata.

Request:

```json
{
  "name": "Ada Lovelace",
  "profile": {
    "title": "Engineering Manager",
    "company": "Acme Inc.",
    "timezone": "Asia/Calcutta",
    "location": "Bengaluru, India",
    "bio": "Owns platform engineering health."
  }
}
```

Response:

```json
{
  "message": "Profile updated.",
  "user": {
    "id": "uuid",
    "name": "Ada Lovelace"
  }
}
```

### `PATCH /api/auth/settings`

Protected endpoint requiring `Authorization: Bearer <accessToken>`. Updates the
signed-in user's dashboard, scan, AI, and notification preferences.

Request:

```json
{
  "settings": {
    "theme": "system",
    "density": "comfortable",
    "scan_frequency": "daily",
    "ai_summary_level": "balanced",
    "email_notifications": true,
    "weekly_digest": true,
    "risk_alerts": true,
    "drift_alerts": true
  }
}
```

Response:

```json
{
  "message": "Settings saved.",
  "user": {
    "id": "uuid",
    "settings": {
      "theme": "system"
    }
  }
}
```

### `POST /api/auth/request-password-reset`

Sends a short-lived password reset link when the account exists. The response is
generic to avoid account enumeration.

Request:

```json
{
  "email": "ada@example.com"
}
```

Response:

```json
{
  "message": "If an account exists for that email, a password reset link has been sent."
}
```

### `POST /api/auth/reset-password`

Updates the password from a valid reset token and revokes active refresh
sessions for that user.

Request:

```json
{
  "token": "reset-token",
  "password": "NewStrongpass1"
}
```

Response:

```json
{
  "message": "Password updated. Sign in with your new password."
}
```

### `GET /auth/github`

Redirects the browser to GitHub's OAuth consent screen. Sets a short-lived,
`HttpOnly` CSRF state cookie scoped to `/auth/github`. Returns `503` when
`GITHUB_ID`/`GITHUB_SECRET` are not configured.

### `GET /auth/github/callback`

Handles GitHub's redirect back to the backend. Validates the CSRF state,
exchanges the authorization code for an access token, and fetches the GitHub
profile and primary verified email. Finds or creates a matching CodePulse
user (auto-verified, no password), links the account in `oauth_accounts`,
starts a session, and redirects to `FRONTEND_URL/#dashboard`. On failure it
redirects to `FRONTEND_URL/#signin?error=<message>`.

### `GET /auth/gitlab`

Redirects the browser to GitLab's OAuth consent screen. Sets a short-lived,
`HttpOnly` CSRF state cookie scoped to `/auth/gitlab`. Returns `503` when
`GITLAB_ID`/`GITLAB_SECRET` are not configured.

### `GET /auth/gitlab/callback`

Handles GitLab's redirect back to the backend. Validates the CSRF state,
exchanges the authorization code for an access token, and fetches the GitLab
profile. Finds or creates a matching CodePulse user (auto-verified, no
password), links the account in `oauth_accounts`, starts a session, and
redirects to `FRONTEND_URL/#dashboard`. On failure it redirects to
`FRONTEND_URL/#signin?error=<message>`.

Both OAuth flows reuse the same refresh-cookie session mechanism as
credential sign-in (see [utils/session.js](../../backend/src/utils/session.js)),
so the frontend picks up the new session via `POST /api/auth/refresh` after
landing on `#dashboard`.

---

## Repository Intelligence API

Implemented in [backend/src/features/repositories](../../backend/src/features/repositories).

The Repository Intelligence feature is the first analytical backend vertical.
It is exposed through a protected route and requires
`Authorization: Bearer <accessToken>`.

### `POST /api/repositories/analyze`

Clones a public GitHub repository, parses repository structure, extracts
documentation, reads recent commit history, builds a basic dependency graph,
persists metadata in MongoDB, and returns a scan summary.

Request:

```json
{
  "repoUrl": "https://github.com/owner/repository",
  "commitLimit": 100
}
```

Response:

```json
{
  "message": "Repository analyzed.",
  "repositoryId": "mongodb-object-id",
  "summary": {
    "repository": {
      "id": "mongodb-object-id",
      "name": "repository",
      "fullName": "owner/repository",
      "url": "https://github.com/owner/repository",
      "defaultBranch": "main"
    },
    "totalDirectories": 12,
    "totalFiles": 80,
    "totalDocumentation": 5,
    "totalCommits": 100,
    "totalDependencies": 43,
    "filesByType": {
      "code": 50,
      "documentation": 5,
      "config": 10,
      "asset": 15
    }
  }
}
```

Implementation modules:

* [gitClient.js](../../backend/src/features/repositories/services/gitClient.js):
  validates public GitHub URLs, clones repositories, detects the current
  branch, and removes clone workspaces after analysis.
* [fileParser.js](../../backend/src/features/repositories/services/fileParser.js):
  walks the repository tree, skips ignored directories, and classifies files.
* [documentationExtractor.js](../../backend/src/features/repositories/services/documentationExtractor.js):
  reads README, docs, changelog, contributing, license, and API docs.
* [commitExtractor.js](../../backend/src/features/repositories/services/commitExtractor.js):
  extracts recent Git commit metadata and changed files.
* [dependencyGraph.js](../../backend/src/features/repositories/services/dependencyGraph.js):
  builds a basic JavaScript/TypeScript/Python dependency edge list.
* [repositoryStore.js](../../backend/src/features/repositories/services/repositoryStore.js):
  persists repository, file, documentation, commit, and dependency records in
  MongoDB.
* [repositoryAnalyzer.js](../../backend/src/features/repositories/services/repositoryAnalyzer.js):
  orchestrates the full scan pipeline and cleans up temporary clone folders.

The public API validates `https://github.com/...` URLs only. Local fixture
repositories are supported only in tests through an internal option, not
through the public API.

---

## ⚙️ Planned Analytical Services

Repository Intelligence is implemented. The following services are still
planned and should remain behind backend API boundaries when implemented:
* **Knowledge Drift Detection Engine**: Compare documentation against current
  source structure and flag drift findings.
* **Technical Debt Analyzer**: Compute complexity, churn, duplication, and
  circular dependency signals.
* **Knowledge Debt Analyzer**: Measure documentation coverage and onboarding
  completeness.
* **Risk Intelligence Engine**: Combine debt, drift, and activity signals into
  module-level risk scores.
