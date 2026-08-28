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

[scanControlController.js](../../backend/src/features/repositories/scanControlController.js)
owns the protected pause/resume/cancel transitions and signals the in-process
worker queue after each durable state change.

Durable report generation and revocable sharing are implemented under
[backend/src/features/reports](../../backend/src/features/reports). Reports
store versioned, immutable JSON snapshots; browser rendering remains the PDF
export path.

Repository analysis shells out to the `git` executable for cloning and commit
history extraction. Local development requires Git on `PATH`; the production
Docker image installs Git in the runtime layer. The production image uses the
Node 24 Alpine image family and installs only backend production dependencies
in the runtime stage.

Remote scans use a shallow, blob-filtered, no-checkout clone. The complete
tracked tree is inventoried from Git metadata with no file-count ceiling, then
only documentation and supported source files selected by the bounded content
analyzers are materialized. This lets very large repositories expose every
tracked path without writing their entire working tree to Fly's ephemeral disk.

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
* `AUTH_APP_URL`: public frontend URL used to build verification/reset email
  links and OAuth redirect targets (`http://localhost:5173` local fallback).
  `FRONTEND_URL` is accepted as a fallback alias if `AUTH_APP_URL` is unset.
* `BACKEND_URL`: public backend URL used to build OAuth callback URLs
  (`http://localhost:3000` local fallback). See
  [backend/src/utils/urls.js](../../backend/src/utils/urls.js) for the derived
  callback/link builders.
* `GITHUB_WEBHOOK_SECRET`: long random secret used to sign and verify GitHub
  push webhook deliveries. GitHub push scan mode also requires `BACKEND_URL`
  to be a public HTTPS URL.
* `EMAIL_KEY`: SMTP2GO API key used to send verification and password reset
  emails through `POST https://api.smtp2go.com/v3/email/send`.
* `VERIFICATION_EMAIL`: verified SMTP2GO sender address used for email
  verification messages. SMTP2GO requires the sender domain or address to be
  verified. Emails are sent with the display name `CodePulse Team`.
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

The AI Explainability Engine (see [docs/ai/AI_ENGINE.md](../ai/AI_ENGINE.md))
reads:

* `GEMMA_API_URL`: base URL of the self-hosted Gemma model's Ollama-compatible
  API (e.g. `https://gemma.example.dev`). The backend calls
  `POST {GEMMA_API_URL}/api/chat`.
* `GEMMA_MODEL`: model name passed to the chat endpoint (e.g. `gemma4:e2b`).
* `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET`: optional Cloudflare
  Access service token headers, sent as `CF-Access-Client-Id` /
  `CF-Access-Client-Secret` when the Gemma endpoint sits behind Cloudflare
  Access.
* `AI_REQUEST_TIMEOUT_MS`: request timeout in milliseconds for calls to
  Gemma. Defaults to `30000`.

AI generation endpoints report `503` when `GEMMA_API_URL` or `GEMMA_MODEL` is
unset (`GET /api/repositories/:id/ai/status` reports `{ configured: false }`
in that case); the deterministic scores, technical/knowledge debt, drift, and
recommendation endpoints never depend on this configuration.

Repository Intelligence also reads:

* `REPOSITORY_CLONE_TIMEOUT_MS`: git operation timeout in milliseconds.
  Defaults to `3600000` (60 minutes).
* `REPOSITORY_CLONE_DEPTH`: shallow clone depth. Defaults to `5`, the minimum
  history window used before commit churn and stale-module signals are scored.
* `REPOSITORY_MAX_SIZE_KB`: maximum GitHub repository size allowed for
  interactive analysis. Defaults to `0`, where `0` means unlimited.
* `REPOSITORY_MAX_FILES`: maximum inventoried file count. Defaults to `0`,
  meaning unlimited. Set a positive value only when a deployment deliberately
  wants a hard inventory ceiling.
* `REPOSITORY_MAX_DEPENDENCY_SOURCE_FILES`: maximum source files read for
  dependency extraction. Defaults to `2000`.
* `REPOSITORY_MAX_DEPENDENCY_FILE_BYTES`: maximum individual source-file size
  read for dependency extraction. Defaults to `1048576`.
* `ANALYSIS_MAX_SCAN_DURATION_MS`: whole-scan worker timeout. Defaults to
  `7200000` (2 hours), leaving room after the separate 60-minute Git timeout.
* `ANALYSIS_WORKER_MAX_OLD_GENERATION_MB`: worker-thread V8 old-generation
  limit. Defaults to `2048` MB for complete very-large-repository inventories.

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
* The Vite dev server uses a strict `5173` port. If that port is already in
  use, Vite exits instead of silently switching to another port.

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
2. Start the backend with `NODE_ENV=production npm start` from the repository
   root (or `npm start` inside `backend/`).
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

## 🧪 Controlled Load Testing

`DISABLE_SEC=true` disables the application-level traffic-shaping and
abuse-prevention that would otherwise distort a controlled load test whose
traffic originates from one or a few IPs (see
[backend/scripts/loadTest.mjs](../../backend/scripts/loadTest.mjs)). It is
parsed once into `SECURITY_DISABLED` in
[backend/src/config/index.js](../../backend/src/config/index.js) — only the
exact string `"true"` enables it; `"false"`, empty, `"0"`, or unset all leave
security fully enabled. Every other file checks the parsed
`SECURITY_DISABLED` constant, never `process.env.DISABLE_SEC` directly.

**What it disables** (traffic-shaping only, gated centrally inside
`createRateLimiter()` in
[backend/src/middleware/rateLimiter.js](../../backend/src/middleware/rateLimiter.js)
so callers never branch on the flag themselves):

* The general per-IP HTTP rate limiter (`backend/src/app.js`, 300
  requests/15 min).
* `authRateLimiter`, applied to the auth routes in
  [backend/src/features/auth/router.js](../../backend/src/features/auth/router.js)
  (30 requests/15 min per IP+path) — becomes a pass-through automatically
  since it's built from the same `createRateLimiter()` factory.
* The failed-sign-in lockout (`assertLoginAllowed` in
  [backend/src/utils/loginAttempts.js](../../backend/src/utils/loginAttempts.js))
  — an anti-brute-force cooldown keyed by email+IP, not credential
  verification itself. `recordLoginFailure`/`clearLoginFailures` keep
  running either way, so the `auth_attempts` audit trail is unaffected.

**What it does NOT disable** — authentication (JWT verification, password
comparison), authorization/ownership checks, input/schema validation, CORS,
security headers, CSRF-relevant behavior, or any database integrity
constraint. Every request still runs through real handlers with real
business logic; only the "reject before it gets there" traffic-shaping is
removed.

**Production safety**: if `NODE_ENV=production` and `DISABLE_SEC=true`, the
backend throws a loud, multi-line `FATAL` error from `config/index.js` at
import time and refuses to start — there is no code path where this flag can
run against a production deployment. A one-time (not per-request) warning
banner is also printed to the console whenever the bypass is active.

**Observability stays on regardless** — `/api/metrics` (see "Observability
API" above), request logging, and error logging are unaffected by
`DISABLE_SEC`, so a load
test run with it enabled can still distinguish real application/database/
infrastructure saturation (5xx rate, latency percentiles, queue depth,
connection behavior) from security middleware that would otherwise have
rejected the traffic outright.

**What this cannot touch**: any rate limiting, WAF rules, or DDoS protection
enforced by the hosting platform or a CDN in front of it (Railway, Fly,
Cloudflare, etc.) — those live outside this repository. A `429` that
persists with `DISABLE_SEC=true` set and the warning banner printed at
startup is coming from outside this application, not from anything covered
above.

---

## 🔐 Authentication API

Implemented in [backend/src/features/auth/controler/credentials.controller.js](../../backend/src/features/auth/controler/credentials.controller.js).

The backend applies security headers, credentialed CORS for configured origins
(`GET`, `POST`, `PATCH`, `DELETE`, and preflight requests), global request rate
limiting, auth-route rate limiting, and Mongo-backed
brute-force lockouts for repeated failed sign-in attempts. The API binds to its
port before MongoDB index initialization begins, allowing platform liveness
checks to connect during a cold start. It exits if the required index setup
fails. Database-backed readiness remains available through `GET /api/health`.

Verification and password reset emails are delivered by SMTP2GO when
`EMAIL_KEY` and the context sender email are present. Each email uses the
SMTP2GO standard email API with `sender`, a single-recipient `to` array,
`subject`, `text_body`, and `html_body`. The HTML bodies use branded
responsive, table-based templates with inline CSS for broad email-client
compatibility. Plain-text fallbacks are always sent.

OAuth-only accounts deliberately follow the same bcrypt-cost credential
failure path as unknown users and return the generic `401` response; a missing
password hash is never passed to bcrypt. Password-reset tokens are claimed in
one atomic MongoDB update before a password is changed, so concurrent replay
attempts cannot both succeed. A successful reset still revokes every active
refresh session for the account.

### `GET /api/health/live`

Fast liveness probe that does not contact MongoDB. Fly.io uses this endpoint
for service checks so the Machine is reachable while database indexes are
initializing.

```json
{
  "status": "ok"
}
```

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

Redirects the browser to GitHub's OAuth consent screen. Creates a short-lived,
hashed server-side OAuth state and sets its raw value in an `HttpOnly` CSRF
cookie scoped to `/auth/github`. The callback atomically consumes the state,
so it cannot be replayed. Returns `503` when `GITHUB_ID`/`GITHUB_SECRET` are
not configured.

### `GET /auth/github/callback`

Handles GitHub's redirect back to the backend. Validates the CSRF state,
exchanges the authorization code for an access token, and fetches the GitHub
profile and primary verified email. Finds or creates a matching CodePulse
user (auto-verified, no password), links the account in `oauth_accounts`,
starts a session, and redirects to `FRONTEND_URL/#dashboard`. On failure it
redirects to `FRONTEND_URL/#signin?error=<message>`.

### `GET /auth/gitlab`

Redirects the browser to GitLab's OAuth consent screen. It uses the same
hashed, one-time server-side state contract as GitHub plus an `HttpOnly`
callback cookie. Returns `503` when `GITLAB_ID`/`GITLAB_SECRET` are not
configured.

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

`commitLimit` is optional, defaults to `100`, and must be an integer from
`1` through `500`. Invalid values are rejected with `400` before a scan is
queued.

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
  reads README, docs, changelog, contributing, license, and API docs. Files
  discovered through documentation directories are restricted to recognized
  text-document extensions; binary assets are never decoded as documentation.
* [commitExtractor.js](../../backend/src/features/repositories/services/commitExtractor.js):
  extracts recent Git commit metadata and changed files.
* [dependencyGraph.js](../../backend/src/features/repositories/services/dependencyGraph.js):
  builds a basic JavaScript/TypeScript/Python dependency edge list.
* [repositoryStore.js](../../backend/src/features/repositories/services/repositoryStore.js):
  persists repository, file, documentation, commit, and dependency records in
  MongoDB.
* [repositoryAnalyzer.js](../../backend/src/features/repositories/services/repositoryAnalyzer.js):
  orchestrates the full scan pipeline, persists raw facts, triggers scoring,
  and cleans up temporary clone folders.
* [analysisScorer.js](../../backend/src/features/analysis/services/analysisScorer.js):
  runs the Technical and Knowledge Debt engines after a successful raw scan.
* [analysisStore.js](../../backend/src/features/analysis/services/analysisStore.js):
  maintains score snapshots and per-module evidence collections.

The public API validates `https://github.com/...` URLs only. Local fixture
repositories are supported only in tests through an internal option, not
through the public API.

### `GET /api/repositories`

Lists the signed-in user's repositories, most recently updated first.

```json
{
  "repositories": [
    {
      "id": "mongodb-object-id",
      "name": "repository",
      "fullName": "owner/repository",
      "url": "https://github.com/owner/repository",
      "defaultBranch": "main",
      "status": "completed",
      "totalFiles": 80,
      "totalCommits": 100,
      "totalDependencies": 43,
      "totalDocumentation": 5,
      "scanIntervalHours": 24,
      "scanTrigger": "interval",
      "nextScanAt": "2026-07-22T09:15:00.000Z",
      "createdAt": "2026-07-01T07:30:00.000Z",
      "updatedAt": "2026-07-21T09:15:00.000Z"
    }
  ]
}
```

`scanIntervalHours`/`nextScanAt` are `null` when the repository has no
time-based schedule. `scanTrigger` is `interval`, `github_push`, or `null`.

### `GET /api/repositories/:repositoryId`

Returns a single repository owned by the signed-in user, in the same shape
as a list item, under a `repository` key. Returns `400` for a malformed id
and `404` when the repository does not exist or belongs to another user.

### `DELETE /api/repositories/:repositoryId`

Deletes a repository owned by the signed-in user and cascades the delete to
its `repo_files`, `commits`, `dependencies`, `documentation`,
`repository_scores`, `repository_score_history`, `technical_debt_metrics`,
`knowledge_debt_metrics`, `drift_findings`, and `recommendations` records.
Previously generated report snapshots intentionally remain available to their
owner and through any active share link.
Returns `404` when the repository does not exist or belongs to another user.

### `PATCH /api/repositories/:repositoryId/schedule`

Sets or clears a repository's auto-scan schedule. Time-based bodies use
`{ "intervalHours": 24 }` — an integer between `MIN_SCAN_INTERVAL_HOURS`
(default `1`) and `MAX_SCAN_INTERVAL_HOURS` (default `720`, 30 days) — or
`{ "intervalHours": null }` to disable it. `{ "trigger": "github_push" }`
enables a signed GitHub `push` webhook instead: it requires a connected GitHub
account with webhook-management permission, `GITHUB_WEBHOOK_SECRET`, and a
public HTTPS `BACKEND_URL`. Push deliveries queue a scan only when they target
the repository's default branch. Returns `200` with
`{ "repository": { ... } }` (the same shape as `GET /api/repositories/:repositoryId`).
`400` for an invalid body, `403` when GitHub denies webhook management, `503`
when GitHub push delivery is not configured, and `404` when the repository does
not exist or belongs to another user.

A background scheduler (`backend/src/features/repositories/services/scanScheduler.js`,
started from `backend/index.js` when `SCAN_SCHEDULER_ENABLED` is not `false`)
polls every `SCAN_SCHEDULER_INTERVAL_MS` (default 5 minutes, capped at
`SCAN_SCHEDULER_BATCH_SIZE` repositories per tick, default 20) for
repositories whose `nextScanAt` has passed and enqueues them onto the same
worker-thread `analysisQueue.js` a manual `POST /api/repositories/analyze`
uses — scheduled scans never block HTTP requests and share the same
concurrency caps. `nextScanAt` advances on every tick regardless of outcome,
so a failing scheduled scan retries at its normal interval, not immediately.

### `POST /api/webhooks/github`

Unauthenticated GitHub webhook receiver. GitHub must provide a valid
`X-Hub-Signature-256` HMAC using `GITHUB_WEBHOOK_SECRET`; invalid deliveries
receive `401`. `ping` events verify the hook and `push` events return `202`
after enqueuing any matching default-branch scans through the standard analysis
queue. Other GitHub event types are acknowledged but ignored.

### `GET /api/repositories/:repositoryId/files`

### `GET /api/repositories/:repositoryId/commits`

### `GET /api/repositories/:repositoryId/dependencies`

### `GET /api/repositories/:repositoryId/documentation`

List the stored records for an owned repository. Each accepts optional
`limit` (default `50`, max `200`) and `skip` query parameters, and responds
with:

```json
{
  "items": ["..."],
  "total": 80,
  "limit": 50,
  "skip": 0
}
```

Files are sorted by path, commits by date (newest first), dependencies by
source file, and documentation by path. Sorting, offsetting, limiting, and the
total count are executed by MongoDB so these endpoints do not materialize the
repository's entire evidence collection in application memory.

### `GET /api/repositories/:repositoryId/code-analysis`

Returns the structured raw code evidence from the latest scan in one response:
the paginated production-code file inventory, paginated dependency edges, and
derived counts for modules, languages, tests, and resolved imports. It accepts
the same `limit` and `skip` parameters as the raw list endpoints. This is an
evidence endpoint; it does not calculate a second Technical Debt score.

### `GET /api/repositories/:repositoryId/documentation-analysis`

Returns the paginated documentation corpus with document-type and truncation
counts from the latest scan. It accepts the same `limit` and `skip` parameters
as the raw list endpoints. Documentation content remains bounded by the
scan-time extraction limit.

### `GET /api/repositories/:repositoryId/knowledge-debt`

Returns the latest Knowledge Debt metrics and per-module evidence, including
module documentation coverage, documented API-route coverage, module
explainability, onboarding difficulty, and metadata complexity context.

### `PATCH /api/repositories/:repositoryId/drift/:findingId/review`

Records a human review of an owned semantic drift finding. The request body is
`{ "reviewStatus": "confirmed" | "dismissed" }`. Structural findings cannot
be reviewed through this endpoint. Review state is replaced on a re-scan with
the rest of the current drift snapshot.

### `GET /api/repositories/:repositoryId/contributors`

Aggregates the repository's full commit history by author (grouped by
email, falling back to author name when no email is recorded).

```json
{
  "contributors": [
    {
      "name": "Ada Lovelace",
      "email": "ada@example.com",
      "commitCount": 42,
      "firstCommitAt": "2026-01-05T00:00:00.000Z",
      "lastCommitAt": "2026-07-20T00:00:00.000Z"
    }
  ]
}
```

### `GET /api/repositories/:repositoryId/manifest`

Parses the repository's root-level dependency manifests. Fetches
`package.json` and `requirements.txt` from
`raw.githubusercontent.com/<fullName>/<defaultBranch>/...` (each file is
optional and skipped on a non-2xx response) and returns their declared
dependencies — distinct from the import-graph edges in `dependencies`,
which only capture dependencies actually referenced by source code.

```json
{
  "manifests": [
    {
      "path": "package.json",
      "type": "npm",
      "name": "demo",
      "version": "1.0.0",
      "dependencies": [
        { "name": "express", "version": "^5.2.1", "kind": "dependency" },
        { "name": "nodemon", "version": "^3.1.14", "kind": "devDependency" }
      ]
    },
    {
      "path": "requirements.txt",
      "type": "pip",
      "name": null,
      "version": null,
      "dependencies": [
        { "name": "flask", "version": ">=2.0,<3.0", "kind": "dependency" }
      ]
    }
  ]
}
```

Only implemented for repositories cloned from GitHub (`repo_full_name`
containing an `owner/name`); returns an empty `manifests` list otherwise.

Implementation modules:

* [services/repositoryQueriesCore.js](../../backend/src/features/repositories/services/repositoryQueriesCore.js):
  pure, collection-injectable read/serialize/paginate logic for the above
  endpoints, unit-tested against fake collections.
* [services/repositoryQueries.js](../../backend/src/features/repositories/services/repositoryQueries.js):
  thin MongoDB-backed wrappers around the core functions.
* [services/contributorAggregator.js](../../backend/src/features/repositories/services/contributorAggregator.js):
  pure commit-to-contributor aggregation.
* [services/manifestParser.js](../../backend/src/features/repositories/services/manifestParser.js):
  pure `package.json`/`requirements.txt` dependency parsing.
* [services/manifestFetcher.js](../../backend/src/features/repositories/services/manifestFetcher.js):
  fetches known manifest files from GitHub raw content (injectable
  `fetchImpl` for tests) and parses each with `manifestParser.js`.
* [readController.js](../../backend/src/features/repositories/readController.js):
  exposes a `createReadController(deps)` factory so route handlers can be
  unit-tested with fake dependencies instead of a live database.

Large repositories are bounded before and during content analysis:

* GitHub repository size is checked before cloning when public metadata is
  available. Repositories above `REPOSITORY_MAX_SIZE_KB` return `413`. A value
  of `0` disables this size check, which is the production/cloud default.
* Remote clones are shallow (`REPOSITORY_CLONE_DEPTH=5`), skip tags and blobs,
  and do not check out the full working tree.
* Every tracked path is inventoried from `git ls-tree`; the default
  `REPOSITORY_MAX_FILES=0` does not impose a file-count ceiling.
* Blob sizes are populated for materialized content-analysis files. Requesting
  every missing blob's size would defeat partial-clone disk guarantees, so
  inventory-only paths may expose `size: null`.
* Dependency extraction skips oversized files and only scans up to
  `REPOSITORY_MAX_DEPENDENCY_SOURCE_FILES` source files.
* Temporary clone cleanup is best-effort with retries. On Windows, locked git
  pack files can briefly survive cleanup; those failures are logged without
  crashing an otherwise completed analysis.

---

## Analysis Engines (Implemented)

Every successful `POST /api/repositories/analyze` scan persists raw repository
facts first, then runs the scoring engines. The current snapshot is stored in
`repository_scores`; per-file Technical Debt evidence in
`technical_debt_metrics`; per-source-directory Knowledge Debt evidence in
`knowledge_debt_metrics`; drift findings in `drift_findings`; and
ranked remediation actions in `recommendations`. A re-scan replaces these
current snapshots.

### Technical Debt

[technicalDebtAnalyzer.js](../../backend/src/features/analysis/services/technicalDebtAnalyzer.js)
scores code files from normalized scan facts:

* Files of at least 50 KiB are large-file signals.
* Complexity is an explicit metadata heuristic: `1 + ceil(sizeKiB) +
  2 × resolved outbound edges + resolved inbound edges`, capped at 100. It is
  deliberately not AST/cyclomatic complexity.
* Churn is the percentage of captured commits touching a file. It is scored
  only with at least five captured commits; otherwise `observedChurnPercent`
  is informational and `churnAvailable` is `false`.
* Circular dependencies use strongly connected groups of resolved internal
  edges, including resolved self-imports.
* Orphans are supported JavaScript/TypeScript/Python code files actually
  scanned for dependencies, with no resolved internal edge and no conventional
  entry-point name such as `index.*` or `main.*`. Files skipped by dependency
  file-size or count limits are never marked orphaned.
* A stale module has a captured last change older than 180 days while the
  repository has a recent captured commit; it uses the same five-commit
  minimum.

The module debt score combines these signals into a 0–100 score where higher
is worse. Repository grades are `A` (0–20), `B` (21–40), `C` (41–60), `D`
(61–80), and `F` (81–100). Source duplication is not yet analyzed and is
represented as `null`, not a misleading zero.

### Knowledge Debt

[knowledgeDebtAnalyzer.js](../../backend/src/features/analysis/services/knowledgeDebtAnalyzer.js)
groups production code by source directory. A module is covered when it has
adjacent or module-named documentation. A root README covers only root code,
not all nested modules. The score combines module documentation, setup and
architecture guidance, detected HTTP API-route coverage, and per-module
explainability (including a bounded metadata-complexity penalty); it returns
onboarding difficulty and module-level evidence.

### Knowledge Drift, Risk, and Recommendations

[knowledgeDriftAnalyzer.js](../../backend/src/features/analysis/services/knowledgeDriftAnalyzer.js)
compares stored source, documentation, and commit facts. It finds undocumented
modules, undocumented detected HTTP endpoints, module documentation older than
its associated source changes, and backticked source-file references that no
longer resolve. Optional semantic
enrichment builds compact, ephemeral code outlines, compares them with relevant
documentation sections through a Sentence-Transformers-compatible embedding
endpoint, and stores low-similarity results as human-review leads. Findings
retain model, similarity, threshold, and compared excerpts; full source is not
persisted or sent to the provider. Optional Qdrant writes are a non-blocking
vector index/cache, not a scan dependency.

Semantic analysis is disabled by default. Set `SEMANTIC_DRIFT_ENABLED=true`
and a local `SEMANTIC_EMBEDDING_URL` to enable it. A hosted endpoint also
requires `SEMANTIC_DRIFT_PROVIDER=hosted` and
`SEMANTIC_DRIFT_ALLOW_HOSTED=true`, making the content-boundary choice explicit.
`SEMANTIC_EMBEDDING_MODEL`, `SEMANTIC_DRIFT_SIMILARITY_THRESHOLD`,
`SEMANTIC_DRIFT_MAX_CODE_FILES`, and `SEMANTIC_DRIFT_MAX_SOURCE_BYTES` bound
the service and comparison workload. `QDRANT_URL` and `QDRANT_COLLECTION` are
optional.

[riskIntelligenceEngine.js](../../backend/src/features/analysis/services/riskIntelligenceEngine.js)
combines file debt (60%), absent module documentation (20%), highest related
drift severity (15%), and available churn (5%) into an explainable module
risk. Repository risk combines the average and maximum module risk.

[recommendationEngine.js](../../backend/src/features/analysis/services/recommendationEngine.js)
turns high-risk debt and drift evidence into ranked remediation actions. This
is a local deterministic fallback, not an external LLM call; no repository
content is sent outside the configured database and scan sources.

### `GET /api/repositories/:repositoryId/scores`

Returns the latest score snapshot for an owned repository. It returns `400`
for an invalid id and `404` when the repository is unavailable to the caller
or has not completed scoring yet.

```json
{
  "scores": {
    "healthScore": 72,
    "healthTrend": [],
    "technicalDebt": { "score": 36, "grade": "B" },
    "knowledgeDebt": {
      "score": 20,
      "documentationCoverage": 80,
      "onboardingDifficulty": 12,
      "onboardingDifficultyScore": 12
    },
    "drift": { "total": 3, "critical": 0, "high": 1, "medium": 1, "low": 1 },
    "risk": { "score": 30, "criticalModules": 1, "trend": [] },
    "recommendationsReady": 2,
    "generatedAt": "2026-07-25T00:00:00.000Z"
  }
}
```

Completed rescans append compact score points to `repository_score_history`.
The scores endpoint returns up to the latest 30 health values and matching
risk trend points in chronological order.

### `GET /api/repositories/:repositoryId/debt`

Returns the latest Technical Debt aggregate and ordered per-file evidence for
an owned scored repository. It uses the same `400`/`404` behavior as the
scores endpoint.

```json
{
  "metrics": {
    "technicalDebtScore": 36,
    "grade": "B",
    "averageComplexity": 8.2,
    "duplicationPercent": 4.5,
    "circularDependencies": 1,
    "largeFiles": 2,
    "orphanModules": 1,
    "staleModules": 0,
    "churnSampleSize": 5,
    "churnAvailable": true,
    "coverageAvailable": true,
    "averageCoveragePercent": 61.4,
    "coverageSampleSize": 18,
    "lowCoverageModules": 3
  },
  "modules": [
    {
      "path": "src/billing/invoice.js",
      "owner": "Ada Lovelace",
      "complexity": 22,
      "churnPercent": 60,
      "observedChurnPercent": 60,
      "churnAvailable": true,
      "duplicationPercent": 12.5,
      "coverageAvailable": true,
      "coveragePercent": 28.6,
      "isLargeFile": true,
      "inCircularDependency": true,
      "isOrphan": false,
      "isStale": false,
      "debtScore": 74,
      "risk": "High",
      "reasons": ["Large source file (65536 bytes)", "Low test coverage (28.6%)"]
    }
  ],
  "generatedAt": "2026-07-25T00:00:00.000Z"
}
```

`coverageAvailable`/`coveragePercent` come from an LCOV report already present in the
cloned repository at scan time (`coverage/lcov.info`, `coverage/lcov-report/lcov.info`,
`.nyc_output/lcov.info`, or `lcov.info`, checked in that order) —
`backend/src/features/repositories/services/coverageParser.js`. CodePulse never runs a
project's test suite or any other repository command to produce this file; when no
report is found, `coverageAvailable` is `false` and `coveragePercent` is `null`
(never `0`, which would misrepresent "not measured" as "measured and empty").

---

## 📡 Analysis Status, Drift, and Recommendation API

All of the following endpoints require `Authorization: Bearer <accessToken>`
and only return repositories owned by the signed-in user. They return `400`
for malformed repository IDs and `404` for unavailable repositories; drift
and recommendation reads also return `404` until a completed scan has
persisted a score snapshot.

### `GET /api/repositories/:repositoryId/status`

Lightweight analysis-status endpoint used by the frontend to poll while a
scan is `queued` or `running` (including resuming polling after a page
refresh mid-scan).

Response:

```json
{
  "repositoryId": "mongodb-object-id",
  "status": "running",
  "message": null,
  "progress": {
    "phase": "inventory",
    "label": "File inventory",
    "phaseProgress": 42,
    "overallProgress": 36,
    "processed": 211584,
    "total": 503772,
    "message": "211,584 tracked files inventoried.",
    "updatedAt": "2026-08-22T09:15:00.000Z"
  },
  "updatedAt": "2026-07-21T09:15:00.000Z"
}
```

Lifecycle states are `queued`, `running`, `paused`, `cancelled`, `completed`,
and `failed`. Progress is durable, so polling resumes accurately after a page
refresh or backend restart.

### Scan controls

All scan controls require repository ownership and return `202` with the
updated serialized repository:

* `POST /api/repositories/:repositoryId/pause` moves a queued/running scan to
  `paused` and cooperatively aborts the worker and Git child process.
* `POST /api/repositories/:repositoryId/resume` moves a paused scan to `queued`
  with a new scan token and restarts from the beginning. Partial workspaces are
  intentionally not treated as durable checkpoints on ephemeral machines.
* `POST /api/repositories/:repositoryId/cancel` moves a queued, running, or
  paused scan to terminal state `cancelled` and stops active work.

### `GET /api/repositories/:repositoryId/drift`

Knowledge drift findings and documentation coverage breakdown.

Response:

```json
{
  "findings": [
    {
      "id": "finding-id",
      "title": "Module is undocumented",
      "filePath": "src/auth",
      "severity": "High",
      "age": null,
      "evidence": "No adjacent or module-named documentation was found."
    }
  ],
  "coverage": [
    { "label": "Module documentation", "percent": 63 },
    { "label": "Setup documentation", "percent": 100 },
    { "label": "Architecture documentation", "percent": 0 }
  ]
}
```

### `GET /api/repositories/:repositoryId/recommendations`

Evidence-backed remediation recommendations generated from the local risk and
drift analysis; they do not require an external LLM provider.

Response:

```json
{
  "recommendations": [
    {
      "id": "recommendation-id",
      "category": "Dependency health",
      "title": "Break the circular dependency around src/billing/invoice.js",
      "impact": "High",
      "effort": "Medium",
      "reason": "A resolved internal dependency cycle increases change risk.",
      "steps": ["Choose one dependency direction", "Extract shared contracts if needed"]
    }
  ]
}
```

`category` is a stable, user-facing grouping such as `Dependency health`,
`Documentation`, `Change stability`, or `Maintainability`. Older stored
recommendations without the field are serialized into a safe fallback group.

## AI Explainability API (opt-in)

Requires `Authorization: Bearer <accessToken>` and enforces repository
ownership like the endpoints above. See
[docs/ai/AI_ENGINE.md](../ai/AI_ENGINE.md) for prompt blueprints and the
provider contract.

### `GET /api/repositories/:repositoryId/ai/status`

`{ "configured": true }` when `GEMMA_API_URL` and `GEMMA_MODEL` are both set;
`false` otherwise. The frontend uses this to decide whether to show AI actions.

### `POST /api/repositories/:repositoryId/ai/drift-explanation`

Body: `{ "findingId": "<drift finding id>" }`. Generates a documentation-drift
explanation (what's outdated, the conflicting evidence, and a suggested
remediation) for one persisted drift finding, and persists the result.
Returns `201` with `{ "explanation": { ... } }`. `404` when no drift finding
with that id exists for the repository; `503` when AI is not configured;
`502` when the model call fails. Best-suited to `semantic_mismatch` findings,
which carry the compared code interface and documentation excerpt; other
finding types still generate but with those sections noted as not captured.

### `GET /api/repositories/:repositoryId/ai/drift-explanation?findingId=...`

Reads back the most recently generated explanation for a drift finding
without calling the model. `404` when none has been generated yet.

### `POST /api/repositories/:repositoryId/ai/risk-explanation`

Body: `{ "modulePath": "src/billing/invoice.js" }`. Generates a risk
explanation and refactor action plan for one module from its persisted
Technical Debt metrics, and persists the result. Returns `201` with
`{ "explanation": { ... } }`. `404` when the module has no stored debt
metrics; `503` when AI is not configured; `502` when the model call fails.

### `GET /api/repositories/:repositoryId/ai/risk-explanation?modulePath=...`

Reads back the most recently generated explanation for a module without
calling the model. `404` when none has been generated yet.

### `POST /api/repositories/:repositoryId/ai/executive-summary`

Generates a leadership-readable 3-paragraph summary from the repository's
scores, top risk modules, and top drift findings, and persists the result.
Returns `201` with `{ "explanation": { ... } }`. `409` when the repository has
no completed analysis; `503` when AI is not configured; `502` when the model
call fails.

### `GET /api/repositories/:repositoryId/ai/executive-summary`

Reads back the most recently generated executive summary without calling the
model. `404` when none has been generated yet.

An `explanation` object always has the shape:

```json
{
  "id": "explanation-id",
  "kind": "drift",
  "key": "<drift finding id, module path, or 'executive-summary'>",
  "model": "gemma4:e2b",
  "promptVersion": 1,
  "output": { "...": "drift-, risk-, or summary-shaped payload" },
  "generatedAt": "2026-08-19T00:00:00.000Z"
}
```

`kind` is `"drift"` (`output: { explanation, evidence, remediation }`),
`"risk"` (`output: { explanation, implications, actionPlan }`), or
`"summary"` (`output: { summary }`), matching which endpoint generated it.

---

### `GET /api/auth/usage`

Account-level usage snapshot shown on the profile page. `aiActions` is the
number of currently available evidence-based recommendation actions; it is
kept under that name for the existing frontend contract.

Response:

```json
{
  "usage": {
    "repositories": 3,
    "aiActions": 12,
    "driftFindings": 19,
    "averageHealthScore": 86
  }
}
```

---

## Durable Reports API

The reports feature persists immutable `codepulse.report.snapshot` version 1
JSON artifacts. Evidence arrays are bounded and expose total/included counts
plus a `truncated` flag. Private routes require
`Authorization: Bearer <accessToken>` and enforce report ownership.

### `POST /api/repositories/:repositoryId/reports`

Generates a report from the latest completed, scored analysis and returns
`201` with `{ "report": { ... } }`. Returns `409` while analysis or scoring is
incomplete.

### `GET /api/reports?repositoryId=<optional-id>&limit=50&skip=0`

Lists the signed-in user's report metadata, newest first. Section evidence is
omitted from list items. `repositoryId` remains optional; `limit` defaults to
`50` and is capped at `200`, while `skip` defaults to `0`. The response keeps
the `reports` array and adds the bounded-page metadata used by other list APIs:

```json
{
  "reports": ["..."],
  "total": 12,
  "limit": 50,
  "skip": 0
}
```

### `GET /api/reports/:reportId`

Returns one owned report including its immutable evidence sections.

### `POST /api/reports/:reportId/share`

Creates or rotates a 256-bit opaque share token. Only its SHA-256 hash is
stored. The response contains the token once under `share.token` and the API
path under `share.path`.

### `DELETE /api/reports/:reportId/share`

Revokes the active public link while retaining the private report.

### `GET /api/reports/shared/:shareToken`

Publicly returns a shared report snapshot while its token remains active.
Malformed, unknown, and revoked tokens all return `404`. Shared responses use
`Cache-Control: no-store`.

---

## 🔌 Connected Repository Sources

Authenticated users can connect GitHub or GitLab from Settings using the
protected `POST /api/integrations/:provider/authorize` route. It returns a
provider authorization URL whose one-time Mongo-backed state stores the
initiating CodePulse user ID. The callback consumes that state atomically and
links the provider to exactly that user. A dedicated short-lived state cookie
binds the same handoff to the initiating browser; the flow does not depend on
the refresh cookie being visible under `/auth/*`. Ordinary unauthenticated OAuth sign-in
continues to use `GET /auth/github` and `GET /auth/gitlab` plus an `HttpOnly`
state cookie. Provider identities are never reassigned from another user,
including during concurrent callbacks. Provider access tokens are AES-256-GCM encrypted by
[oauthToken.js](../../backend/src/utils/oauthToken.js) before storage in
`oauth_accounts`; they are only decrypted server-side when listing sources.

* `POST /api/integrations/:provider/authorize` returns
  `{ "authorizationUrl": "..." }` for `github` or `gitlab`.
* `GET /api/integrations` returns each provider's connection status and account
  name.
* `GET /api/integrations/repositories` returns repositories accessible through
  connected GitHub/GitLab accounts for the dashboard source picker.

OAuth requests include repository-read scopes (`repo` on GitHub and
`read_api` on GitLab); GitHub's `repo` scope includes repository webhook
management for users with sufficient repository access. The provider calls
never send access tokens to the frontend.

## 📈 Observability API

### `GET /api/metrics`

Prometheus text-exposition format (`backend/src/observability/metrics.js`, a
small dependency-free registry — Counter/Gauge/Histogram). No
`Authorization: Bearer` requirement by default; if `METRICS_TOKEN` is set in
the environment, requests must present it as `Authorization: Bearer <token>`
or an `X-Metrics-Token` header, or the endpoint returns `401`. Reports:

* `codepulse_scans_total{status="completed|failed|paused|cancelled|crashed|timeout|lease_lost"}`
  and `codepulse_scan_duration_seconds` — recorded in the main process from a
  `postMessage` the worker thread sends back on exit, since metrics recorded
  inside a `worker_threads` worker live in that worker's own isolated module
  state and would otherwise vanish when it exits.
* `codepulse_scheduled_scans_total{outcome="started|skipped|error|unparseable_url"}`
  — from `scanScheduler.js`.
* `codepulse_ai_requests_total{outcome="success|failure"}` and
  `codepulse_ai_request_duration_seconds` — from the AI Explainability
  layer's calls to Gemma.
* `codepulse_http_requests_total{status_class="2xx|3xx|4xx|5xx"}` and
  `codepulse_rate_limited_requests_total` — no path or user label on either,
  to avoid unbounded label cardinality from attacker-controlled input.
* `codepulse_analysis_queue_active_workers` /
  `codepulse_analysis_queue_pending_jobs` /
  `codepulse_analysis_queue_scheduled_jobs` — read from the existing
  `getAnalysisQueueSnapshot()` at scrape time.
* `codepulse_db_collection_documents{collection="repositories|users|reports"}`
  — `estimatedDocumentCount()` at scrape time (fast; does not scan).

## ⚙️ Current Analysis Boundaries

The implemented engines operate on repository facts gathered during a scan.
AST-level cyclomatic complexity, source-duplication detection,
contributor-concentration risk, score history, and an opt-in AI
Explainability layer (risk explanations and executive summaries via a
self-hosted Gemma model — see [docs/ai/AI_ENGINE.md](../ai/AI_ENGINE.md)) are
all implemented. Semantic documentation drift is available as an opt-in
embedding enrichment with explicit provider consent (see
[docs/pending.md](../pending.md) for what it does and does not yet cover).
Test coverage/bug-proneness ingestion, recurring scan scheduling, the
evaluation/benchmarking harness, and a Prometheus metrics endpoint are all
implemented too. What remains open is narrower: OS-level CPU/network
resource isolation for scan workers and load/security testing under
concurrent scans — see [docs/pending.md](../pending.md) for the current
list.
