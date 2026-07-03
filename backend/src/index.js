import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import express from 'express'
import { ObjectId } from 'mongodb'
import {
  ensureIndexes,
  getAuthAttemptsCollection,
  getPasswordResetTokensCollection,
  getSessionsCollection,
  getUsersCollection,
  getVerificationTokensCollection,
  pingDatabase,
} from './db.js'

const app = express()
const port = Number(process.env.API_PORT || process.env.PORT || 3000)
const isProduction = process.env.NODE_ENV === 'production'
const refreshCookieName = 'codepulse_refresh'
const accessTokenTtlSeconds = 15 * 60
const refreshTokenTtlMs = 7 * 24 * 60 * 60 * 1000
const verificationTokenTtlMs = 24 * 60 * 60 * 1000
const resetTokenTtlMs = 60 * 60 * 1000
const loginLockTtlMs = 15 * 60 * 1000
const maxLoginFailures = 5
const authSecret = getAuthSecret()
const appUrl = process.env.AUTH_APP_URL || 'http://localhost:5173'
const smtp2goApiUrl = 'https://api.smtp2go.com/v3/email/send'
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
)

app.set('trust proxy', isProduction ? 1 : 0)
app.use(securityHeaders)
app.use(cors)
app.use(express.json({ limit: '1mb' }))
app.use(createRateLimiter({ windowMs: 15 * 60 * 1000, max: 300 }))

function getAuthSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET

  if (isProduction) {
    throw new Error('JWT_SECRET is required in production.')
  }

  return 'dev-only-codepulse-jwt-secret-change-me'
}

function securityHeaders(request, response, next) {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  if (isProduction || request.secure) {
    response.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
  }

  next()
}

function cors(request, response, next) {
  const origin = request.headers.origin

  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
    response.setHeader('Access-Control-Allow-Credentials', 'true')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  }

  if (request.method === 'OPTIONS') {
    response.sendStatus(204)
    return
  }

  next()
}

function createRateLimiter({ windowMs, max, key = request => request.ip }) {
  const hits = new Map()

  return (request, response, next) => {
    const now = Date.now()
    const bucketKey = key(request)
    const bucket = hits.get(bucketKey)

    if (!bucket || bucket.resetAt <= now) {
      hits.set(bucketKey, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    bucket.count += 1
    response.setHeader('X-RateLimit-Limit', String(max))
    response.setHeader('X-RateLimit-Remaining', String(Math.max(max - bucket.count, 0)))
    response.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)))

    if (bucket.count > max) {
      response.status(429).json({ message: 'Too many requests. Try again later.' })
      return
    }

    next()
  }
}

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  key: request => `${request.ip}:${request.path}`,
})

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /\d/.test(password) &&
    /[A-Z]/.test(password)
  )
}

const defaultAccountSettings = {
  theme: 'system',
  density: 'comfortable',
  scan_frequency: 'daily',
  ai_summary_level: 'balanced',
  email_notifications: true,
  weekly_digest: true,
  risk_alerts: true,
  drift_alerts: true,
}

function cleanText(value, maxLength = 120) {
  return String(value || '').trim().slice(0, maxLength)
}

function cleanProfile(profile = {}) {
  return {
    title: cleanText(profile.title),
    company: cleanText(profile.company),
    timezone: cleanText(profile.timezone || 'UTC', 80),
    location: cleanText(profile.location),
    bio: cleanText(profile.bio, 320),
  }
}

function cleanSettings(settings = {}) {
  const option = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback)

  return {
    theme: option(settings.theme, ['system', 'light', 'dark'], defaultAccountSettings.theme),
    density: option(
      settings.density,
      ['compact', 'comfortable', 'spacious'],
      defaultAccountSettings.density,
    ),
    scan_frequency: option(
      settings.scan_frequency,
      ['manual', 'daily', 'weekly'],
      defaultAccountSettings.scan_frequency,
    ),
    ai_summary_level: option(
      settings.ai_summary_level,
      ['concise', 'balanced', 'detailed'],
      defaultAccountSettings.ai_summary_level,
    ),
    email_notifications:
      typeof settings.email_notifications === 'boolean'
        ? settings.email_notifications
        : defaultAccountSettings.email_notifications,
    weekly_digest:
      typeof settings.weekly_digest === 'boolean'
        ? settings.weekly_digest
        : defaultAccountSettings.weekly_digest,
    risk_alerts:
      typeof settings.risk_alerts === 'boolean'
        ? settings.risk_alerts
        : defaultAccountSettings.risk_alerts,
    drift_alerts:
      typeof settings.drift_alerts === 'boolean'
        ? settings.drift_alerts
        : defaultAccountSettings.drift_alerts,
  }
}

function toPublicUser(row) {
  return {
    id: row._id.toString(),
    name: row.name,
    email: row.email,
    email_verified: Boolean(row.email_verified),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    profile: cleanProfile(row.profile),
    settings: cleanSettings({ ...defaultAccountSettings, ...row.settings }),
  }
}

function base64Url(value) {
  return Buffer.from(value).toString('base64url')
}

function signAccessToken(user) {
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64Url(
    JSON.stringify({
      sub: user._id.toString(),
      email: user.email,
      typ: 'access',
      iat: now,
      exp: now + accessTokenTtlSeconds,
    }),
  )
  const signature = crypto
    .createHmac('sha256', authSecret)
    .update(`${header}.${payload}`)
    .digest('base64url')

  return `${header}.${payload}.${signature}`
}

function verifyAccessToken(token) {
  const parts = String(token || '').split('.')

  if (parts.length !== 3) {
    throw new Error('Malformed token.')
  }

  const [header, payload, signature] = parts
  const expected = crypto
    .createHmac('sha256', authSecret)
    .update(`${header}.${payload}`)
    .digest('base64url')

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    throw new Error('Invalid token signature.')
  }

  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  const now = Math.floor(Date.now() / 1000)

  if (claims.typ !== 'access' || !claims.sub || claims.exp <= now) {
    throw new Error('Expired or invalid token.')
  }

  return claims
}

function randomToken() {
  return crypto.randomBytes(32).toString('base64url')
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map(cookie => cookie.trim())
      .filter(Boolean)
      .map(cookie => {
        const index = cookie.indexOf('=')
        return [cookie.slice(0, index), decodeURIComponent(cookie.slice(index + 1))]
      }),
  )
}

function setRefreshCookie(response, token) {
  const parts = [
    `${refreshCookieName}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/api/auth',
    `Max-Age=${Math.floor(refreshTokenTtlMs / 1000)}`,
  ]

  if (isProduction) {
    parts.push('Secure')
  }

  response.setHeader('Set-Cookie', parts.join('; '))
}

function clearRefreshCookie(response) {
  const parts = [
    `${refreshCookieName}=`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/api/auth',
    'Max-Age=0',
  ]

  if (isProduction) {
    parts.push('Secure')
  }

  response.setHeader('Set-Cookie', parts.join('; '))
}

function buildAppLink(hashPath, token) {
  const base = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl
  return `${base}/#${hashPath}?token=${encodeURIComponent(token)}`
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getAuthEmailContent(kind, link) {
  const isPasswordReset = kind === 'password reset'
  const subject = isPasswordReset ? 'Reset your CodePulse password' : 'Verify your CodePulse email'
  const action = isPasswordReset ? 'Reset password' : 'Verify email'
  const body = isPasswordReset
    ? 'Use this link to reset your CodePulse password. The link expires in 1 hour.'
    : 'Use this link to verify your CodePulse account. The link expires in 24 hours.'
  const escapedLink = escapeHtml(link)

  return {
    subject,
    textBody: `${body}\n\n${link}\n\nIf you did not request this, you can ignore this email.`,
    htmlBody: [
      '<!doctype html>',
      '<html>',
      '<body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">',
      `<p>${escapeHtml(body)}</p>`,
      `<p><a href="${escapedLink}">${escapeHtml(action)}</a></p>`,
      `<p>If the button does not work, paste this link into your browser:<br>${escapedLink}</p>`,
      '<p>If you did not request this, you can ignore this email.</p>',
      '</body>',
      '</html>',
    ].join(''),
  }
}

async function readJsonResponse(response) {
  const text = await response.text()

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

function getAuthSenderEmail(kind) {
  if (kind === 'email verification') {
    return process.env.VERIFICATION_EMAIL
  }

  if (kind === 'password reset') {
    return process.env.PASSWORD_RESET_EMAIL || process.env.VERIFICATION_EMAIL
  }

  return process.env.VERIFICATION_EMAIL
}

function hasAuthSenderConfig() {
  return Boolean(process.env.VERIFICATION_EMAIL || process.env.PASSWORD_RESET_EMAIL)
}

function getSmtp2goConfig(kind) {
  const apiKey = process.env.EMAIL_KEY
  const sender = getAuthSenderEmail(kind)

  if (!apiKey && !hasAuthSenderConfig()) {
    return null
  }

  if (!apiKey || !sender) {
    throw new Error(
      'EMAIL_KEY and the context sender email are required for SMTP2GO auth emails.',
    )
  }

  return { apiKey, sender }
}

function formatSmtp2goError(payload) {
  const error = payload?.data?.error || payload?.data?.error_code || payload?.raw
  return error ? ` ${error}` : ''
}

async function deliverSmtp2goAuthLink(kind, email, link, config) {
  const { subject, textBody, htmlBody } = getAuthEmailContent(kind, link)
  const response = await fetch(smtp2goApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Smtp2go-Api-Key': config.apiKey,
    },
    body: JSON.stringify({
      sender: config.sender,
      to: [email],
      subject,
      text_body: textBody,
      html_body: htmlBody,
    }),
  })
  const payload = await readJsonResponse(response)

  if (!response.ok) {
    throw new Error(
      `SMTP2GO auth email failed with status ${response.status}.${formatSmtp2goError(payload)}`,
    )
  }

  if (payload?.data?.failed > 0 || payload?.data?.error) {
    throw new Error(`SMTP2GO auth email was rejected.${formatSmtp2goError(payload)}`)
  }
}

async function deliverAuthLink(kind, email, link) {
  const smtp2goConfig = getSmtp2goConfig(kind)

  if (smtp2goConfig) {
    await deliverSmtp2goAuthLink(kind, email, link, smtp2goConfig)
    return
  }

  if (process.env.AUTH_EMAIL_WEBHOOK_URL) {
    const response = await fetch(process.env.AUTH_EMAIL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.AUTH_EMAIL_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.AUTH_EMAIL_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ kind, email, link }),
    })

    if (!response.ok) {
      throw new Error(`Auth email webhook failed with status ${response.status}.`)
    }

    return
  }

  if (!isProduction) {
    console.log(`CodePulse ${kind} link for ${email}: ${link}`)
    return
  }

  throw new Error('EMAIL_KEY and VERIFICATION_EMAIL are required for production auth emails.')
}

async function createVerificationToken(userId, email) {
  const token = randomToken()
  const verificationTokens = await getVerificationTokensCollection()

  await verificationTokens.deleteMany({ user_id: userId })
  await verificationTokens.insertOne({
    user_id: userId,
    email,
    token_hash: hashToken(token),
    created_at: new Date(),
    expires_at: new Date(Date.now() + verificationTokenTtlMs),
  })

  return token
}

async function createSession(response, request, user) {
  const token = randomToken()
  const sessions = await getSessionsCollection()

  await sessions.insertOne({
    user_id: user._id,
    token_hash: hashToken(token),
    user_agent: request.headers['user-agent'] || '',
    ip: request.ip,
    created_at: new Date(),
    expires_at: new Date(Date.now() + refreshTokenTtlMs),
    revoked_at: null,
  })

  setRefreshCookie(response, token)

  return {
    accessToken: signAccessToken(user),
    expiresIn: accessTokenTtlSeconds,
  }
}

async function getSessionFromCookie(request) {
  const cookies = parseCookies(request.headers.cookie)
  const refreshToken = cookies[refreshCookieName]

  if (!refreshToken) {
    return null
  }

  const sessions = await getSessionsCollection()
  const session = await sessions.findOne({
    token_hash: hashToken(refreshToken),
    revoked_at: null,
    expires_at: { $gt: new Date() },
  })

  return session ? { session, refreshToken } : null
}

async function requireAccessToken(request, response, next) {
  try {
    const header = request.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    const claims = verifyAccessToken(token)
    const users = await getUsersCollection()
    const user = await users.findOne({ _id: new ObjectId(claims.sub), email_verified: true })

    if (!user) {
      response.status(401).json({ message: 'Authentication is required.' })
      return
    }

    request.user = user
    next()
  } catch {
    response.status(401).json({ message: 'Authentication is required.' })
  }
}

async function assertLoginAllowed(email, ip) {
  const attempts = await getAuthAttemptsCollection()
  const key = `${email}:${ip}`
  const record = await attempts.findOne({ key })

  if (record?.locked_until && record.locked_until > new Date()) {
    return false
  }

  return true
}

async function recordLoginFailure(email, ip) {
  const attempts = await getAuthAttemptsCollection()
  const key = `${email}:${ip}`
  const now = new Date()
  const record = await attempts.findOneAndUpdate(
    { key },
    {
      $inc: { failures: 1 },
      $set: { email, ip, updated_at: now },
      $setOnInsert: { created_at: now },
    },
    { upsert: true, returnDocument: 'after' },
  )

  if (record.failures >= maxLoginFailures) {
    await attempts.updateOne(
      { key },
      { $set: { locked_until: new Date(Date.now() + loginLockTtlMs), updated_at: now } },
    )
  }
}

async function clearLoginFailures(email, ip) {
  const attempts = await getAuthAttemptsCollection()
  await attempts.deleteOne({ key: `${email}:${ip}` })
}

app.get('/api/health', async (_request, response, next) => {
  try {
    await pingDatabase()
    const users = await getUsersCollection()
    response.json({
      status: 'ok',
      store: 'mongodb',
      users: await users.estimatedDocumentCount(),
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/signup', authRateLimiter, async (request, response, next) => {
  try {
    const name = String(request.body.name || '').trim()
    const email = normalizeEmail(request.body.email)
    const password = request.body.password

    if (!name || !validateEmail(email) || !validatePassword(password)) {
      response.status(400).json({
        message:
          'Name, valid email, and a password with 8+ characters, one number, and one uppercase letter are required.',
      })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const users = await getUsersCollection()
    const createdAt = new Date()
    const result = await users.insertOne({
      name,
      email,
      password_hash: passwordHash,
      email_verified: false,
      created_at: createdAt,
      updated_at: createdAt,
    })
    const userId = result.insertedId
    const verificationToken = await createVerificationToken(userId, email)
    const verificationUrl = buildAppLink('verify-email', verificationToken)

    try {
      await deliverAuthLink('email verification', email, verificationUrl)
    } catch (error) {
      await (await getVerificationTokensCollection()).deleteMany({ user_id: userId })
      await users.deleteOne({ _id: userId })
      throw error
    }

    response.status(201).json({
      message: 'Account created. Check your email to verify your account before signing in.',
      user: toPublicUser({
        _id: userId,
        name,
        email,
        email_verified: false,
        created_at: createdAt,
      }),
      ...(isProduction ? {} : { verificationUrl }),
    })
  } catch (error) {
    if (error.code === 11000) {
      response.status(409).json({ message: 'An account already exists for this email.' })
      return
    }

    next(error)
  }
})

app.post('/api/auth/verify-email', authRateLimiter, async (request, response, next) => {
  try {
    const token = String(request.body.token || '')

    if (!token) {
      response.status(400).json({ message: 'Verification token is required.' })
      return
    }

    const verificationTokens = await getVerificationTokensCollection()
    const record = await verificationTokens.findOne({
      token_hash: hashToken(token),
      expires_at: { $gt: new Date() },
    })

    if (!record) {
      response.status(400).json({ message: 'Verification link is invalid or expired.' })
      return
    }

    const users = await getUsersCollection()
    await users.updateOne(
      { _id: record.user_id },
      { $set: { email_verified: true, updated_at: new Date() } },
    )
    await verificationTokens.deleteMany({ user_id: record.user_id })

    response.json({ message: 'Email verified. You can now sign in.' })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/signin', authRateLimiter, async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email)
    const password = request.body.password

    if (!validateEmail(email) || typeof password !== 'string') {
      response.status(400).json({ message: 'Email and password are required.' })
      return
    }

    if (!(await assertLoginAllowed(email, request.ip))) {
      response.status(429).json({ message: 'Too many failed sign-in attempts. Try again later.' })
      return
    }

    const users = await getUsersCollection()
    const user = await users.findOne({ email })

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      await recordLoginFailure(email, request.ip)
      response.status(401).json({ message: 'Invalid email or password.' })
      return
    }

    if (!user.email_verified) {
      response.status(403).json({ message: 'Verify your email before signing in.' })
      return
    }

    await clearLoginFailures(email, request.ip)
    const session = await createSession(response, request, user)

    response.json({
      message: 'Signed in.',
      user: toPublicUser(user),
      ...session,
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/refresh', authRateLimiter, async (request, response, next) => {
  try {
    const activeSession = await getSessionFromCookie(request)

    if (!activeSession) {
      clearRefreshCookie(response)
      response.status(401).json({ message: 'Refresh session is invalid or expired.' })
      return
    }

    const users = await getUsersCollection()
    const user = await users.findOne({ _id: activeSession.session.user_id, email_verified: true })

    if (!user) {
      clearRefreshCookie(response)
      response.status(401).json({ message: 'Refresh session is invalid or expired.' })
      return
    }

    response.json({
      message: 'Session refreshed.',
      user: toPublicUser(user),
      accessToken: signAccessToken(user),
      expiresIn: accessTokenTtlSeconds,
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/logout', async (request, response, next) => {
  try {
    const activeSession = await getSessionFromCookie(request)

    if (activeSession) {
      const sessions = await getSessionsCollection()
      await sessions.updateOne(
        { _id: activeSession.session._id },
        { $set: { revoked_at: new Date() } },
      )
    }

    clearRefreshCookie(response)
    response.json({ message: 'Signed out.' })
  } catch (error) {
    next(error)
  }
})

app.get('/api/auth/me', requireAccessToken, (request, response) => {
  response.json({ user: toPublicUser(request.user) })
})

app.patch('/api/auth/profile', requireAccessToken, async (request, response, next) => {
  try {
    const name = cleanText(request.body.name)
    const profile = cleanProfile(request.body.profile)

    if (!name) {
      response.status(400).json({ message: 'Display name is required.' })
      return
    }

    const users = await getUsersCollection()
    await users.updateOne(
      { _id: request.user._id },
      {
        $set: {
          name,
          profile,
          updated_at: new Date(),
        },
      },
    )
    const updatedUser = await users.findOne({ _id: request.user._id })

    response.json({
      message: 'Profile updated.',
      user: toPublicUser(updatedUser),
    })
  } catch (error) {
    next(error)
  }
})

app.patch('/api/auth/settings', requireAccessToken, async (request, response, next) => {
  try {
    const settings = cleanSettings(request.body.settings)
    const users = await getUsersCollection()

    await users.updateOne(
      { _id: request.user._id },
      {
        $set: {
          settings,
          updated_at: new Date(),
        },
      },
    )
    const updatedUser = await users.findOne({ _id: request.user._id })

    response.json({
      message: 'Settings saved.',
      user: toPublicUser(updatedUser),
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/request-password-reset', authRateLimiter, async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email)

    if (!validateEmail(email)) {
      response.status(400).json({ message: 'A valid email is required.' })
      return
    }

    const users = await getUsersCollection()
    const user = await users.findOne({ email })

    if (user) {
      const token = randomToken()
      const resetTokens = await getPasswordResetTokensCollection()
      const resetUrl = buildAppLink('reset-password', token)

      await resetTokens.deleteMany({ user_id: user._id })
      await resetTokens.insertOne({
        user_id: user._id,
        email,
        token_hash: hashToken(token),
        created_at: new Date(),
        expires_at: new Date(Date.now() + resetTokenTtlMs),
        used_at: null,
      })
      try {
        await deliverAuthLink('password reset', email, resetUrl)
      } catch (error) {
        await resetTokens.deleteMany({ user_id: user._id })
        throw error
      }

      response.json({
        message: 'If an account exists for that email, a password reset link has been sent.',
        ...(isProduction ? {} : { resetUrl }),
      })
      return
    }

    response.json({
      message: 'If an account exists for that email, a password reset link has been sent.',
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/reset-password', authRateLimiter, async (request, response, next) => {
  try {
    const token = String(request.body.token || '')
    const password = request.body.password

    if (!token || !validatePassword(password)) {
      response.status(400).json({
        message: 'A valid reset token and password with 8+ characters, one number, and one uppercase letter are required.',
      })
      return
    }

    const resetTokens = await getPasswordResetTokensCollection()
    const record = await resetTokens.findOne({
      token_hash: hashToken(token),
      used_at: null,
      expires_at: { $gt: new Date() },
    })

    if (!record) {
      response.status(400).json({ message: 'Password reset link is invalid or expired.' })
      return
    }

    const users = await getUsersCollection()
    const passwordHash = await bcrypt.hash(password, 12)

    await users.updateOne(
      { _id: record.user_id },
      { $set: { password_hash: passwordHash, updated_at: new Date() } },
    )
    await resetTokens.updateOne({ _id: record._id }, { $set: { used_at: new Date() } })
    await (await getSessionsCollection()).updateMany(
      { user_id: record.user_id, revoked_at: null },
      { $set: { revoked_at: new Date() } },
    )

    response.json({ message: 'Password updated. Sign in with your new password.' })
  } catch (error) {
    next(error)
  }
})

app.use((_request, response) => {
  response.status(404).json({ message: 'Route not found.' })
})

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ message: 'Unexpected server error.' })
})

async function start() {
  await ensureIndexes()
  app.listen(port, () => {
    console.log(`CodePulse API listening on http://localhost:${port}`)
  })
}

start().catch(error => {
  console.error('CodePulse API startup failed:', error.message)
  process.exit(1)
})
