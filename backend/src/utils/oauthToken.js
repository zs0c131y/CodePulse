import crypto from 'node:crypto'
import { JWT_SECRET } from '../config/index.js'

// Provider tokens never leave the backend. Deriving a stable 256-bit key from
// the server secret keeps connection records encrypted at rest without adding
// a second required development secret.
const encryptionKey = crypto.createHash('sha256').update(JWT_SECRET).digest()

export function encryptOAuthToken(value) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`
}

export function decryptOAuthToken(value) {
  const [ivValue, tagValue, payload] = String(value || '').split('.')
  if (!ivValue || !tagValue || !payload) return null
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, Buffer.from(ivValue, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(payload, 'base64url')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
