import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Link } from '../lib/router'
import { useLocation } from '../lib/router-context'
import {
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Code2,
  Database,
  Gauge,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  User,
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select } from './ui/select'
import { GitHubMark, GitLabMark } from './ui/provider-marks'
import { getUsageSnapshot } from '../api/usage'
import { listIntegrations } from '../api/integrations'
import { cn } from '../lib/utils'
import { AppTopBar } from './AppChrome'

function apiUrl(path) {
  return `${import.meta.env.VITE_API_BASE_URL || ''}${path}`
}

const defaultProfile = {
  title: '',
  company: '',
  timezone: 'UTC',
  location: '',
  bio: '',
}

const defaultSettings = {
  theme: 'system',
  density: 'comfortable',
  scan_frequency: 'daily',
  ai_summary_level: 'balanced',
  email_notifications: true,
  weekly_digest: true,
  risk_alerts: true,
  drift_alerts: true,
}

const timezones = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Calcutta']

function initials(name, email) {
  const source = name || email || 'CodePulse'
  return source
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')
}

function mergeProfile(user) {
  return { ...defaultProfile, ...(user.profile || {}) }
}

function mergeSettings(user) {
  return { ...defaultSettings, ...(user.settings || {}) }
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--ink-2)]">
        {Icon && <Icon size={14} className="text-[var(--ink-4)]" />}
        {label}
      </span>
      {children}
    </label>
  )
}

function TextInput({ className, ...props }) {
  return <Input {...props} className={cn(className)} />
}

function SelectInput({ className, ...props }) {
  return <Select {...props} className={className} />
}

function Card({ id, title, description, children, footer = null }) {
  return (
    <section id={id} tabIndex={id ? -1 : undefined} className="panel scroll-mt-20 overflow-hidden">
      <div className="p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-[var(--ink-1)]">{title}</h2>
        {description && <p className="mt-1 text-[0.8125rem] leading-6 text-[var(--ink-3)]">{description}</p>}
        <div className="mt-5">{children}</div>
      </div>
      {footer && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line-1)] bg-[var(--surface-2)] px-5 py-3 sm:px-6">
          {footer}
        </div>
      )}
    </section>
  )
}

function Toggle({ checked, onChange, title, description, icon: Icon, disabled = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${disabled ? 'opacity-50' : ''}`}>
      <span className="flex min-w-0 gap-3">
        {Icon && <Icon size={16} className="mt-0.5 shrink-0 text-[var(--ink-4)]" />}
        <span>
          <span className="block text-sm font-medium text-[var(--ink-1)]">{title}</span>
          <span className="mt-0.5 block text-[0.8125rem] leading-5 text-[var(--ink-3)]">{description}</span>
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative h-10 w-11 shrink-0 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--accent-wash)] disabled:cursor-not-allowed"
      >
        <span
          className={`absolute inset-x-0 top-2 h-6 rounded-full border transition-colors duration-[var(--d-2)] ${
            checked
              ? 'border-[var(--accent)] bg-[var(--accent)]'
              : 'border-[var(--line-2)] bg-[var(--surface-3)]'
          }`}
          aria-hidden="true"
        />
        <span
          className="absolute top-2.5 h-5 w-5 rounded-full bg-[var(--accent-on)] shadow-[var(--shadow-e1)] transition-[left] duration-[var(--d-2)]"
          style={{ left: checked ? 'calc(100% - 1.375rem)' : '0.125rem' }}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}

function StatusNote({ message, error }) {
  if (!message && !error) return null

  return (
    <p
      className={`flex items-start gap-2 rounded-[var(--r-md)] border px-3.5 py-3 text-sm ${
        error
          ? 'border-[var(--sev-critical-line)] bg-[var(--sev-critical-wash)] text-[var(--sev-critical-ink)]'
          : 'border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] text-[var(--sev-nominal-ink)]'
      }`}
      role="status"
    >
      {error ? (
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      ) : (
        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
      )}
      <span>{error || message}</span>
    </p>
  )
}

function AccountShell({ mode, user, onLogout, children }) {
  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--ink-1)]">
      <AppTopBar user={user} onLogout={onLogout} active={mode} />
      <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  )
}

function ProfilePage({ user, profile, setProfile, name, setName, onSave, saving, message, error, usage }) {
  const completion = useMemo(() => {
    const values = [name, profile.title, profile.company, profile.timezone, profile.location, profile.bio]
    return Math.round((values.filter(Boolean).length / values.length) * 100)
  }, [name, profile])

  return (
    <div className="space-y-5">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ink-1)]">Profile</h1>
        <p className="mt-1 text-sm text-[var(--ink-3)]">Your workspace identity, used in reports and ownership views.</p>
      </div>

      <section className="panel p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-[var(--line-2)] bg-[var(--surface-2)] text-xl font-semibold text-[var(--ink-1)]">
              {initials(name, user.email)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-[-0.02em] text-[var(--ink-1)]">{name || user.email}</h2>
              <p className="truncate text-sm text-[var(--ink-3)]">{user.email}</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-[0.8125rem] font-medium text-[var(--ink-2)]">Profile completion</p>
            <div className="mt-2 flex items-center gap-3 sm:justify-end">
              <div className="h-1 w-32 overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-[var(--d-3)]" style={{ width: `${completion}%` }} />
              </div>
              <span className="tnum text-sm font-medium text-[var(--ink-1)]">{completion}%</span>
            </div>
          </div>
        </div>
      </section>

      <form
        onSubmit={onSave}
      >
        <Card
          title="Personal details"
          description="Keep your identity clear for reports and ownership views."
          footer={(
            <>
              <p className="text-xs text-[var(--ink-4)]">Saved to your CodePulse account.</p>
              <Button type="submit" size="sm" disabled={saving}>
                <Save size={14} />
                {saving ? 'Saving…' : 'Save profile'}
              </Button>
            </>
          )}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Display name" icon={User}>
              <TextInput value={name} onChange={event => setName(event.target.value)} placeholder="Ada Lovelace" />
            </Field>
            <Field label="Role" icon={BriefcaseBusiness}>
              <TextInput
                value={profile.title}
                onChange={event => setProfile(current => ({ ...current, title: event.target.value }))}
                placeholder="Engineering Manager"
              />
            </Field>
            <Field label="Company" icon={Database}>
              <TextInput
                value={profile.company}
                onChange={event => setProfile(current => ({ ...current, company: event.target.value }))}
                placeholder="Acme Inc."
              />
            </Field>
            <Field label="Timezone" icon={Clock3}>
              <SelectInput
                value={profile.timezone}
                onChange={value => setProfile(current => ({ ...current, timezone: value }))}
                options={timezones.map(zone => ({ value: zone, label: zone }))}
                ariaLabel="Timezone"
              />
            </Field>
            <Field label="Location" icon={MapPin}>
              <TextInput
                value={profile.location}
                onChange={event => setProfile(current => ({ ...current, location: event.target.value }))}
                placeholder="Bengaluru, India"
              />
            </Field>
            <Field label="Email" icon={Mail}>
              <TextInput value={user.email} disabled />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Bio" icon={Sparkles}>
              <textarea
                value={profile.bio}
                onChange={event => setProfile(current => ({ ...current, bio: event.target.value }))}
                placeholder="Tell teammates what systems you own and how CodePulse should support your review flow."
                className="min-h-24 w-full rounded-[var(--r-md)] border border-[var(--line-2)] bg-[var(--surface-1)] px-3 py-2.5 text-sm leading-6 text-[var(--ink-1)] outline-none transition-colors duration-[var(--d-2)] placeholder:text-[var(--ink-4)] hover:border-[var(--line-3)] focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-wash)]"
              />
            </Field>
          </div>
        </Card>
      </form>

      <StatusNote message={message} error={error} />

      <Card title="Account posture" description="The state of your sign-in and verification.">
        <div className="divide-y divide-[var(--line-1)]">
          {[
            { label: 'Email verified', value: user.email_verified ? 'Complete' : 'Pending verification', icon: ShieldCheck, ok: user.email_verified },
            { label: 'Session storage', value: 'Secure workspace session', icon: LockKeyhole, ok: true },
            { label: 'Workspace access', value: 'Verified account session', icon: KeyRound, ok: true },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  item.ok ? 'bg-[var(--sev-nominal-wash)] text-[var(--sev-nominal-ink)]' : 'bg-[var(--sev-medium-wash)] text-[var(--sev-medium-ink)]'
                }`}
              >
                <item.icon size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-[var(--ink-1)]">{item.label}</span>
                <span className="block text-xs text-[var(--ink-3)]">{item.value}</span>
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Usage snapshot" description="Across the repositories analyzed by your account.">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            [usage?.repositories, 'Repositories'],
            [usage?.aiActions, 'AI actions'],
            [usage?.driftFindings, 'Drift findings'],
            [usage?.averageHealthScore, 'Health score'],
          ].map(([value, label]) => (
            <div key={label} className="panel-2 p-3.5">
              <p className="tnum text-xl font-semibold text-[var(--ink-1)]">{value ?? '—'}</p>
              <p className="mt-1 text-xs text-[var(--ink-3)]">{label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function SettingsPage({
  settings,
  setSettings,
  onSave,
  onDiscard,
  dirty,
  saving,
  message,
  error,
  integrations,
  integrationsLoading,
}) {
  return (
    <div className="space-y-5">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ink-1)]">Settings</h1>
          <p className="mt-1 text-sm text-[var(--ink-3)]">Density, scan cadence, AI answer shape, and notifications.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={onDiscard} disabled={saving || !dirty} variant="outline" size="sm">
            Discard changes
          </Button>
          <Button type="button" onClick={onSave} disabled={saving || !dirty} size="sm">
            <Save size={14} />
            {saving ? 'Saving…' : dirty ? 'Save settings' : 'Settings saved'}
          </Button>
        </div>
      </div>

      <Card title="Interface" description="How the workspace looks and feels on this account.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Theme" icon={Monitor}>
            <div className="grid grid-cols-3 gap-1 rounded-[var(--r-md)] border border-[var(--line-1)] bg-[var(--surface-2)] p-1">
              {[
                ['system', Monitor, 'System'],
                ['light', Sun, 'Light'],
                ['dark', Moon, 'Dark'],
              ].map(([value, Icon, label]) => {
                const selected = settings.theme === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSettings(current => ({ ...current, theme: value }))}
                    className={`flex h-9 items-center justify-center gap-1.5 rounded-[var(--r-sm)] text-[0.8125rem] transition-colors duration-[var(--d-2)] ${
                      selected
                        ? 'bg-[var(--surface-1)] font-medium text-[var(--ink-1)] shadow-[var(--shadow-e1)]'
                        : 'text-[var(--ink-3)] hover:text-[var(--ink-1)]'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Dashboard density" icon={SlidersHorizontal}>
            <SelectInput
              value={settings.density}
              onChange={value => setSettings(current => ({ ...current, density: value }))}
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'comfortable', label: 'Comfortable' },
                { value: 'spacious', label: 'Spacious' },
              ]}
              ariaLabel="Dashboard density"
            />
          </Field>

          <Field label="Default scan frequency" icon={Gauge}>
            <SelectInput
              value={settings.scan_frequency}
              onChange={value => setSettings(current => ({ ...current, scan_frequency: value }))}
              options={[
                { value: 'manual', label: 'Manual only' },
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
              ]}
              ariaLabel="Default scan frequency"
            />
          </Field>

          <Field label="AI summary detail" icon={Sparkles}>
            <SelectInput
              value={settings.ai_summary_level}
              onChange={value => setSettings(current => ({ ...current, ai_summary_level: value }))}
              options={[
                { value: 'concise', label: 'Concise' },
                { value: 'balanced', label: 'Balanced' },
                { value: 'detailed', label: 'Detailed' },
              ]}
              ariaLabel="AI summary detail"
            />
          </Field>
        </div>
      </Card>

      <Card id="notifications" title="Notifications" description="What CodePulse emails you about.">
        <div className="divide-y divide-[var(--line-1)]">
          <Toggle
            checked={settings.email_notifications}
            onChange={value => setSettings(current => ({ ...current, email_notifications: value }))}
            title="Email notifications"
            description="Important account, repository, and analysis updates."
            icon={Mail}
          />
          <Toggle
            checked={settings.weekly_digest}
            onChange={value => setSettings(current => ({ ...current, weekly_digest: value }))}
            title="Weekly engineering digest"
            description="Repository health movement, ownership risk, and drift closures."
            icon={Bell}
            disabled={!settings.email_notifications}
          />
          <Toggle
            checked={settings.risk_alerts}
            onChange={value => setSettings(current => ({ ...current, risk_alerts: value }))}
            title="Risk threshold alerts"
            description="Modules crossing high or critical maintainability thresholds."
            icon={ShieldCheck}
            disabled={!settings.email_notifications}
          />
          <Toggle
            checked={settings.drift_alerts}
            onChange={value => setSettings(current => ({ ...current, drift_alerts: value }))}
            title="Documentation drift alerts"
            description="Implementation changes that invalidate important docs or runbooks."
            icon={Code2}
            disabled={!settings.email_notifications}
          />
        </div>
      </Card>

      <Card title="Connected code hosts" description="Connect a provider once, then pick its repositories from the dashboard.">
        <div className="grid gap-3 md:grid-cols-2">
          {[{ provider: 'github', label: 'GitHub', icon: GitHubMark, href: '/auth/github' }, { provider: 'gitlab', label: 'GitLab', icon: GitLabMark, href: '/auth/gitlab' }].map(item => {
            const integration = integrations.find(value => value.provider === item.provider)
            const connected = Boolean(integration?.connected)
            const Icon = item.icon
            return (
              <div key={item.provider} className="panel-2 p-4">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-1)] bg-[var(--surface-1)] text-[var(--ink-1)]">
                    <Icon className={`h-[1.125rem] w-[1.125rem] ${item.provider === 'github' ? 'text-[var(--provider-github)]' : 'text-[var(--provider-gitlab)]'}`} />
                  </span>
                  <span className={`rounded-[var(--r-xs)] border px-1.5 py-0.5 text-[0.6875rem] font-medium ${connected ? 'border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] text-[var(--sev-nominal-ink)]' : 'border-[var(--line-2)] bg-[var(--surface-1)] text-[var(--ink-3)]'}`}>
                    {integrationsLoading ? 'Checking…' : connected ? 'Connected' : 'Not connected'}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-medium text-[var(--ink-1)]">{item.label}</h3>
                <p className="mt-1 min-h-10 text-[0.8125rem] leading-5 text-[var(--ink-3)]">
                  {connected ? `Connected as ${integration.accountName || item.label}.` : `Bring your ${item.label} repositories into CodePulse.`}
                </p>
                <Button asChild variant={connected ? 'outline' : 'default'} size="sm" className="mt-3 w-full">
                  <a href={apiUrl(item.href)}>{connected ? 'Reconnect' : `Connect ${item.label}`}</a>
                </Button>
              </div>
            )
          })}
        </div>
      </Card>

      <Card title="Security" description="Reset your password through a verified email flow.">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.8125rem] text-[var(--ink-3)]">We email a short-lived reset link to {''}
            <span className="font-medium text-[var(--ink-2)]">your account address</span>.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/reset-password">
              <KeyRound size={14} />
              Reset password
            </Link>
          </Button>
        </div>
      </Card>

      <StatusNote message={message} error={error} />
    </div>
  )
}

export default function AccountPage({ mode, user, accessToken, onLogout, onUserUpdate }) {
  const location = useLocation()
  const [name, setName] = useState(user.name || '')
  const [profile, setProfile] = useState(() => mergeProfile(user))
  const [settings, setSettings] = useState(() => mergeSettings(user))
  const [, setStatus] = useState('Verifying session...')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [usage, setUsage] = useState(null)
  const [integrations, setIntegrations] = useState([])
  const [integrationsLoading, setIntegrationsLoading] = useState(mode === 'settings')
  const savedSettings = useMemo(() => mergeSettings(user), [user])
  const settingsDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [savedSettings, settings],
  )

  useEffect(() => {
    setName(user.name || '')
    setProfile(mergeProfile(user))
    setSettings(mergeSettings(user))
  }, [user])

  useLayoutEffect(() => {
    if (mode !== 'settings') return undefined

    const root = document.documentElement
    const colorScheme = window.matchMedia('(prefers-color-scheme: light)')
    const apply = preference => {
      root.dataset.theme = preference.theme === 'system'
        ? (colorScheme.matches ? 'light' : 'dark')
        : preference.theme
      root.dataset.density = preference.density
    }
    const followSystemTheme = () => {
      if (settings.theme === 'system') apply(settings)
    }

    apply(settings)
    colorScheme.addEventListener('change', followSystemTheme)
    return () => {
      colorScheme.removeEventListener('change', followSystemTheme)
      apply(savedSettings)
    }
  }, [mode, savedSettings, settings])

  useEffect(() => {
    if (mode !== 'settings') return

    const params = new URLSearchParams(location.search)
    const providerError = params.get('error')
    const connectedProvider = params.get('connected')

    if (providerError) {
      setMessage('')
      setError(providerError)
    } else if (connectedProvider === 'github' || connectedProvider === 'gitlab') {
      setError('')
      setMessage(`${connectedProvider === 'github' ? 'GitHub' : 'GitLab'} connected successfully.`)
    }

    if (location.hash === '#notifications') {
      requestAnimationFrame(() => {
        const section = document.getElementById('notifications')
        section?.scrollIntoView({ block: 'start' })
        section?.focus({ preventScroll: true })
      })
    }
  }, [location.hash, location.search, mode])

  useEffect(() => {
    let cancelled = false

    async function verifySession() {
      try {
        const response = await fetch(apiUrl('/api/auth/me'), {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.message || 'Session verification failed.')
        }

        if (!cancelled) {
          setStatus('Session verified')
        }
      } catch (sessionError) {
        if (!cancelled) {
          setStatus(sessionError instanceof Error ? sessionError.message : 'Session verification failed.')
        }
      }
    }

    verifySession()

    return () => {
      cancelled = true
    }
  }, [accessToken])

  useEffect(() => {
    if (mode !== 'profile' || !accessToken) return undefined

    let cancelled = false

    async function loadUsage() {
      try {
        const snapshot = await getUsageSnapshot(accessToken)

        if (!cancelled) {
          setUsage(snapshot)
        }
      } catch {
        // Usage endpoint is part of the analytics rollout; show placeholders
        // until it is available.
        if (!cancelled) {
          setUsage(null)
        }
      }
    }

    loadUsage()

    return () => {
      cancelled = true
    }
  }, [accessToken, mode])

  useEffect(() => {
    if (mode !== 'settings' || !accessToken) return undefined
    let cancelled = false
    listIntegrations(accessToken).then(items => { if (!cancelled) setIntegrations(items) }).catch(() => { if (!cancelled) setIntegrations([]) }).finally(() => { if (!cancelled) setIntegrationsLoading(false) })
    return () => { cancelled = true }
  }, [accessToken, mode])

  async function submitUpdate(endpoint, body, successMessage) {
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch(apiUrl(endpoint), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Save failed.')
      }

      onUserUpdate?.(data.user)
      setMessage(data.message || successMessage)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  function handleProfileSave(event) {
    event.preventDefault()
    submitUpdate('/api/auth/profile', { name, profile }, 'Profile updated.')
  }

  function handleSettingsSave() {
    submitUpdate('/api/auth/settings', { settings }, 'Settings saved.')
  }

  function handleSettingsChange(updater) {
    setSettings(current => typeof updater === 'function' ? updater(current) : updater)
    setMessage('')
    setError('')
  }

  function handleSettingsDiscard() {
    setSettings(savedSettings)
    setMessage('Unsaved changes discarded.')
    setError('')
  }

  return (
    <div className="density-surface">
      <AccountShell mode={mode} user={user} onLogout={onLogout}>
      {mode === 'settings' ? (
        <SettingsPage
          settings={settings}
          setSettings={handleSettingsChange}
          onSave={handleSettingsSave}
          onDiscard={handleSettingsDiscard}
          dirty={settingsDirty}
          saving={saving}
          message={message}
          error={error}
          integrations={integrations}
          integrationsLoading={integrationsLoading}
        />
      ) : (
        <ProfilePage
          user={user}
          profile={profile}
          setProfile={setProfile}
          name={name}
          setName={setName}
          onSave={handleProfileSave}
          saving={saving}
          message={message}
          error={error}
          usage={usage}
        />
      )}
      </AccountShell>
    </div>
  )
}
