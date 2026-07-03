export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /\d/.test(password) &&
    /[A-Z]/.test(password)
  )
}

export function toPublicUser(row) {
  return {
    id: row._id.toString(),
    name: row.name,
    email: row.email,
    email_verified: Boolean(row.email_verified),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  }
}
