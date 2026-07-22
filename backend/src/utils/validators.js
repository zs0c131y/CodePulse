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

export const defaultAccountSettings = {
  theme: 'system',
  density: 'comfortable',
  scan_frequency: 'daily',
  ai_summary_level: 'balanced',
  email_notifications: true,
  weekly_digest: true,
  risk_alerts: true,
  drift_alerts: true,
}

export function cleanText(value, maxLength = 120) {
  return String(value || '').trim().slice(0, maxLength)
}

export function cleanProfile(profile = {}) {
  return {
    title: cleanText(profile.title),
    company: cleanText(profile.company),
    timezone: cleanText(profile.timezone || 'UTC', 80),
    location: cleanText(profile.location),
    bio: cleanText(profile.bio, 320),
  }
}

export function cleanSettings(settings = {}) {
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

export function toPublicUser(row) {
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
