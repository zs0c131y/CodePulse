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
  const action = isPasswordReset ? 'Reset password' : 'Verify email address'
  const headline = isPasswordReset ? 'Reset your password' : 'Verify your email address'
  const body = isPasswordReset
    ? 'We received a request to reset the password for your CodePulse account. Click the button below to choose a new one. This link expires in 1 hour.'
    : 'Thanks for signing up for CodePulse. Please confirm this email address to activate your account. This link expires in 24 hours.'
  const year = new Date().getFullYear()

  const escapedLink = escapeHtml(link)
  const escapedAction = escapeHtml(action)
  const escapedHeadline = escapeHtml(headline)
  const escapedBody = escapeHtml(body)
  const escapedSubject = escapeHtml(subject)

  return {
    subject,
    textBody: `${headline}\n\n${body}\n\n${link}\n\nIf you did not request this, you can safely ignore this email — your account is still secure.\n\nCodePulse`,
    htmlBody: `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapedSubject}</title>
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; background-color: #f4f4f5; }
  a { text-decoration: none; }
  @media only screen and (max-width: 620px) {
    .cp-container { width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
    .cp-px { padding-left: 28px !important; padding-right: 28px !important; }
  }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5;">
<div style="display: none; max-height: 0; overflow: hidden; opacity: 0; mso-hide: all;">
  ${escapedBody}
  &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f5;">
  <tr>
    <td align="center" style="padding: 48px 16px;">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="width: 560px; max-width: 560px; margin: 0 0 20px 0;">
        <tr>
          <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 700; color: #18181b; letter-spacing: -0.01em;">CodePulse</td>
        </tr>
      </table>
      <table role="presentation" class="cp-container" width="560" cellspacing="0" cellpadding="0" border="0" style="width: 560px; max-width: 560px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px;">
        <tr>
          <td class="cp-px" style="padding: 40px 40px 32px 40px;">
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 20px; line-height: 28px; font-weight: 600; color: #18181b; margin: 0 0 12px 0;">${escapedHeadline}</div>
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 22px; color: #52525b; margin: 0 0 28px 0;">${escapedBody}</div>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td align="center" bgcolor="#4f46e5" style="border-radius: 8px; background-color: #4f46e5;">
                  <a href="${escapedLink}" style="display: inline-block; padding: 12px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">${escapedAction}</a>
                </td>
              </tr>
            </table>
            <div style="height: 28px; line-height: 28px; font-size: 0;">&nbsp;</div>
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 13px; color: #71717a; margin: 0 0 8px 0;">Or copy and paste this link into your browser:</div>
            <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 12px; line-height: 18px; color: #52525b; background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; padding: 10px 12px; word-break: break-all;">${escapedLink}</div>
          </td>
        </tr>
        <tr>
          <td class="cp-px" style="padding: 0 40px;">
            <div style="height: 1px; line-height: 1px; font-size: 0; background-color: #e4e4e7;">&nbsp;</div>
          </td>
        </tr>
        <tr>
          <td class="cp-px" style="padding: 20px 40px 24px 40px;">
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 13px; line-height: 20px; color: #71717a;">If you did not request this, you can safely ignore this email — your account is still secure.</div>
          </td>
        </tr>
      </table>
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="width: 560px; max-width: 560px; margin: 24px 0 0 0;">
        <tr>
          <td class="cp-px" style="text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 18px; color: #a1a1aa;">This is an automated message — please don't reply to this email.<br>&copy; ${year} CodePulse</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`,
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
