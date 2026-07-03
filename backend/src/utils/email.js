import {
  IS_PRODUCTION,
  EMAIL_KEY,
  VERIFICATION_EMAIL,
  PASSWORD_RESET_EMAIL,
  AUTH_EMAIL_WEBHOOK_URL,
  AUTH_EMAIL_WEBHOOK_TOKEN,
} from '../config/index.js'
import { buildFrontendLink } from './urls.js'

const SMTP2GO_API_URL = 'https://api.smtp2go.com/v3/email/send'

export function buildAppLink(hashPath, token) {
  return buildFrontendLink(hashPath, token)
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
  if (kind === 'password reset') {
    return PASSWORD_RESET_EMAIL || VERIFICATION_EMAIL
  }

  return VERIFICATION_EMAIL
}

function hasAuthSenderConfig() {
  return Boolean(VERIFICATION_EMAIL || PASSWORD_RESET_EMAIL)
}

function getSmtp2goConfig(kind) {
  const sender = getAuthSenderEmail(kind)

  if (!EMAIL_KEY && !hasAuthSenderConfig()) {
    return null
  }

  if (!EMAIL_KEY || !sender) {
    throw new Error(
      'EMAIL_KEY and the context sender email are required for SMTP2GO auth emails.',
    )
  }

  return { apiKey: EMAIL_KEY, sender }
}

function formatSmtp2goError(payload) {
  const error = payload?.data?.error || payload?.data?.error_code || payload?.raw
  return error ? ` ${error}` : ''
}

async function deliverSmtp2goAuthLink(kind, email, link, config) {
  const { subject, textBody, htmlBody } = getAuthEmailContent(kind, link)
  const response = await fetch(SMTP2GO_API_URL, {
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

export async function deliverAuthLink(kind, email, link) {
  const smtp2goConfig = getSmtp2goConfig(kind)

  if (smtp2goConfig) {
    await deliverSmtp2goAuthLink(kind, email, link, smtp2goConfig)
    return
  }

  if (AUTH_EMAIL_WEBHOOK_URL) {
    const response = await fetch(AUTH_EMAIL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_EMAIL_WEBHOOK_TOKEN ? { Authorization: `Bearer ${AUTH_EMAIL_WEBHOOK_TOKEN}` } : {}),
      },
      body: JSON.stringify({ kind, email, link }),
    })

    if (!response.ok) {
      throw new Error(`Auth email webhook failed with status ${response.status}.`)
    }

    return
  }

  if (!IS_PRODUCTION) {
    console.log(`CodePulse ${kind} link for ${email}: ${link}`)
    return
  }

  throw new Error('EMAIL_KEY and VERIFICATION_EMAIL are required for production auth emails.')
}
