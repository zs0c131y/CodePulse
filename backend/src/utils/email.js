import { isProduction } from '../config/index.js'
import { buildFrontendLink } from './urls.js'

export function buildAppLink(hashPath, token) {
  return buildFrontendLink(hashPath, token)
}

export async function deliverAuthLink(kind, email, link) {
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

  throw new Error('AUTH_EMAIL_WEBHOOK_URL is required for production auth emails.')
}
