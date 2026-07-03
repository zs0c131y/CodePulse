import bcrypt from 'bcryptjs'
import { IS_PRODUCTION, accessTokenTtlSeconds, resetTokenTtlMs } from '../../../config/index.js'
import {
  getUsersCollection,
  getSessionsCollection,
  getVerificationTokensCollection,
  getPasswordResetTokensCollection,
} from '../../../db/index.js'
import { hashToken, randomToken, signAccessToken } from '../../../utils/token.js'
import { clearRefreshCookie } from '../../../utils/cookie.js'
import {
  normalizeEmail,
  validateEmail,
  validatePassword,
  toPublicUser,
  cleanText,
  cleanProfile,
  cleanSettings,
} from '../../../utils/validators.js'
import { buildAppLink, deliverAuthLink } from '../../../utils/email.js'
import { createVerificationToken, createSession, getSessionFromCookie } from '../../../utils/session.js'
import { assertLoginAllowed, recordLoginFailure, clearLoginFailures } from '../../../utils/loginAttempts.js'

export async function signup(request, response, next) {
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
      ...(IS_PRODUCTION ? {} : { verificationUrl }),
    })
  } catch (error) {
    if (error.code === 11000) {
      response.status(409).json({ message: 'An account already exists for this email.' })
      return
    }

    next(error)
  }
}

export async function verifyEmail(request, response, next) {
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
}

export async function signin(request, response, next) {
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
}

export async function refresh(request, response, next) {
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
}

export async function logout(request, response, next) {
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
}

export function me(request, response) {
  response.json({ user: toPublicUser(request.user) })
}

export async function updateProfile(request, response, next) {
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
      { $set: { name, profile, updated_at: new Date() } },
    )
    const updatedUser = await users.findOne({ _id: request.user._id })

    response.json({
      message: 'Profile updated.',
      user: toPublicUser(updatedUser),
    })
  } catch (error) {
    next(error)
  }
}

export async function updateSettings(request, response, next) {
  try {
    const settings = cleanSettings(request.body.settings)
    const users = await getUsersCollection()

    await users.updateOne(
      { _id: request.user._id },
      { $set: { settings, updated_at: new Date() } },
    )
    const updatedUser = await users.findOne({ _id: request.user._id })

    response.json({
      message: 'Settings saved.',
      user: toPublicUser(updatedUser),
    })
  } catch (error) {
    next(error)
  }
}

export async function requestPasswordReset(request, response, next) {
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
        ...(IS_PRODUCTION ? {} : { resetUrl }),
      })
      return
    }

    response.json({
      message: 'If an account exists for that email, a password reset link has been sent.',
    })
  } catch (error) {
    next(error)
  }
}

export async function resetPassword(request, response, next) {
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
}
