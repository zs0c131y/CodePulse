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
Authentication also reads:

* `JWT_SECRET`: required in production for signed access tokens.
* `AUTH_APP_URL`: public frontend URL used to build verification and reset
  links.
* `EMAIL_KEY`: SMTP2GO API key used to send verification and password reset
  emails through `POST https://api.smtp2go.com/v3/email/send`.
* `VERIFICATION_EMAIL`: verified SMTP2GO sender address used for email
  verification messages. SMTP2GO requires the sender domain or address to be
  verified.
* `PASSWORD_RESET_EMAIL`: optional verified SMTP2GO sender address used for
  password reset messages. If omitted, password reset emails use
  `VERIFICATION_EMAIL`.
* `AUTH_EMAIL_WEBHOOK_URL`: optional fallback delivery webhook when SMTP2GO is
  not configured. The backend posts `{ kind, email, link }`.
* `AUTH_EMAIL_WEBHOOK_TOKEN`: optional bearer token for the fallback email
  webhook.
* `ALLOWED_ORIGINS`: comma-separated browser origins allowed to send
  credentialed API requests.

If `EMAIL_KEY` or any context sender email is set, the matching sender email is
also required. In production, auth email delivery requires SMTP2GO configuration
unless the fallback webhook is configured.

---

## 🔌 Local Development

* Run the frontend with `npm run dev`.
* Run the backend API with `npm run dev:backend`.
* The API listens on `http://localhost:3000`.
* The Vite dev server proxies `/api` requests to the backend.
* In local development, verification and reset links are logged to the backend
  console and returned in the API response for convenience.

---

## 🔐 Authentication API

Implemented in [backend/src/index.js](../../backend/src/index.js).

The backend applies security headers, credentialed CORS for configured origins,
global request rate limiting, auth-route rate limiting, and Mongo-backed
brute-force lockouts for repeated failed sign-in attempts. Startup fails before
`app.listen()` if MongoDB indexes cannot be created, including the unique email
index and auth token indexes.

Verification and password reset emails are delivered by SMTP2GO when
`EMAIL_KEY` and the context sender email are present. Each email uses the
SMTP2GO standard email API with `sender`, a single-recipient `to` array,
`subject`, `text_body`, and `html_body`.

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
