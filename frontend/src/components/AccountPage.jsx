import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Code2,
  Database,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  User,
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select } from './ui/select'
import { getUsageSnapshot } from '../api/usage'
import { cn } from '../lib/utils'

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

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Profile', href: '/profile', icon: User },
  { label: 'Settings', href: '/settings', icon: Settings },
]

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
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        {Icon && <Icon size={15} className="text-slate-400" />}
        {label}
      </span>
      {children}
    </label>
  )
}

function TextInput({ className, ...props }) {
  return (
    <Input
      {...props}
      className={cn(
        'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-100',
        className,
      )}
    />
  )
}

function SelectInput({ className, ...props }) {
  return (
    <span className="relative block">
      <Select
        {...props}
        className={cn(
          'appearance-none border-slate-200 bg-white pr-10 text-slate-900 focus:border-cyan-400 focus:ring-cyan-100',
          className,
        )}
      />
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
    </span>
  )
}

function Toggle({ checked, onChange, title, description, icon: Icon }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
    >
      <span className="flex min-w-0 gap-3">
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Icon size={18} />
          </span>
        )}
        <span>
          <span className="block text-sm font-bold text-slate-950">{title}</span>
          <span className="mt-1 block text-sm leading-5 text-slate-500">{description}</span>
        </span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-slate-950' : 'bg-slate-200'
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </span>
    </button>
  )
}

function AccountShell({ mode, user, status, onLogout, children }) {
  const isProfile = mode === 'profile'

  return (
    <div className="product-shell min-h-screen bg-[#030309] text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-[#10131a] text-white lg:flex lg:flex-col 2xl:w-72">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500 text-slate-950">
            <Activity size={18} strokeWidth={2.5} />
          </span>
          <span className="text-lg font-bold">
            Code<span className="text-cyan-300">Pulse</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Account navigation">
          {navItems.map(item => {
            const Icon = item.icon
            const selected =
              (mode === 'profile' && item.label === 'Profile') ||
              (mode === 'settings' && item.label === 'Settings')

            return (
              <a
                key={item.label}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                  selected ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                <Icon size={17} />
                {item.label}
              </a>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <LockKeyhole size={16} className="text-emerald-300" />
              Protected session
            </div>
            <div className="mt-3 flex min-w-0 items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-slate-400" title={user.email}>
                {user.email}
              </span>
              <span className="shrink-0 rounded-md border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-[11px] font-bold text-emerald-200">
                {status === 'Session verified' ? 'Verified' : 'Checking'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-64 2xl:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 2xl:px-8">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <a href="/dashboard" className="inline-flex items-center gap-1 hover:text-slate-950">
                  <ArrowLeft size={14} />
                  Dashboard
                </a>
                <ChevronRight size={13} />
                <span className="text-slate-950">{isProfile ? 'Profile' : 'Settings'}</span>
              </div>
              <h1 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">
                {isProfile ? 'Profile' : 'Settings'}
              </h1>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                href="/profile"
                asChild
                variant="outline"
                className="hidden sm:inline-flex"
              >
                <a href="/profile">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-400 text-xs font-bold text-slate-950">
                    {initials(user.name, user.email)}
                  </span>
                  <span className="max-w-32 truncate">{user.name}</span>
                </a>
              </Button>
              <Button
                type="button"
                onClick={onLogout}
                variant="outline"
              >
                <LogOut size={16} />
                Sign out
              </Button>
            </div>
          </div>
        </header>

        <main className="cp-dashboard-main min-w-0 py-5 sm:py-6 2xl:py-8">{children}</main>
      </div>
    </div>
  )
}

function ProfilePage({ user, profile, setProfile, name, setName, onSave, saving, message, error, usage }) {
  const completion = useMemo(() => {
    const values = [name, profile.title, profile.company, profile.timezone, profile.location, profile.bio]
    return Math.round((values.filter(Boolean).length / values.length) * 100)
  }, [name, profile])

  return (
    <div className="mx-auto max-w-[112rem] space-y-5">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        <div className="bg-linear-to-r from-slate-950 via-slate-900 to-cyan-950 px-5 py-8 text-white sm:px-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white text-2xl font-black text-slate-950 shadow-xl">
                {initials(name, user.email)}
              </div>
              <div>
                <p className="text-sm font-semibold text-cyan-200">CodePulse account</p>
                <h2 className="mt-1 text-3xl font-bold tracking-tight">{name || user.email}</h2>
                <p className="mt-1 text-sm text-slate-300">{user.email}</p>
              </div>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-sm font-semibold text-slate-200">Profile completion</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 w-36 rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-cyan-300" style={{ width: `${completion}%` }} />
                </div>
                <span className="text-sm font-bold">{completion}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr] 2xl:grid-cols-[1.15fr_0.85fr] 2xl:gap-6">
        <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md" onSubmit={onSave}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-950">Personal details</h2>
              <p className="mt-1 text-sm text-slate-500">Keep your workspace identity clear for reports and ownership views.</p>
            </div>
            <Button
              type="submit"
              disabled={saving}
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save profile'}
            </Button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
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
                onChange={event => setProfile(current => ({ ...current, timezone: event.target.value }))}
              >
                {timezones.map(zone => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </SelectInput>
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

          <Field label="Bio" icon={Sparkles}>
            <textarea
              value={profile.bio}
              onChange={event => setProfile(current => ({ ...current, bio: event.target.value }))}
              placeholder="Tell teammates what systems you own and how CodePulse should support your review flow."
              className="min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            />
          </Field>

          {(message || error) && (
            <p
              className={`mt-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
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
          )}
        </form>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <h2 className="text-base font-bold text-slate-950">Account posture</h2>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Email verified', value: user.email_verified ? 'Complete' : 'Pending', icon: ShieldCheck, ok: user.email_verified },
                { label: 'Session storage', value: 'Secure workspace session', icon: LockKeyhole, ok: true },
                { label: 'Workspace access', value: 'Verified account session', icon: KeyRound, ok: true },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      item.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <item.icon size={17} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-slate-950">{item.label}</span>
                    <span className="block text-xs text-slate-500">{item.value}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <h2 className="text-base font-bold text-slate-950">Usage snapshot</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              {[
                [usage?.repositories, 'Repositories'],
                [usage?.aiActions, 'AI actions'],
                [usage?.driftFindings, 'Drift findings'],
                [usage?.averageHealthScore, 'Health score'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-2xl font-black text-slate-950">{value ?? '—'}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function SettingsPage({ settings, setSettings, onSave, saving, message, error }) {
  return (
    <div className="mx-auto max-w-[112rem] space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-cyan-700">Workspace preferences</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">Tune CodePulse for your review flow</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              These settings control dashboard density, repository scan cadence, AI answer shape, and notification
              delivery for your signed-in account.
            </p>
          </div>
          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            size="lg"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save settings'}
          </Button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] 2xl:grid-cols-[0.8fr_1.2fr] 2xl:gap-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-950">Interface</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <Field label="Theme" icon={Monitor}>
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
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
                      onClick={() => setSettings(current => ({ ...current, theme: value }))}
                      className={`flex h-20 flex-col items-center justify-center gap-2 rounded-lg border text-sm font-bold ${
                        selected
                          ? 'border-slate-950 bg-slate-950 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  )
                })}
              </div>
            </Field>

            <Field label="Dashboard density" icon={SlidersHorizontal}>
              <SelectInput
                value={settings.density}
                onChange={event => setSettings(current => ({ ...current, density: event.target.value }))}
              >
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="spacious">Spacious</option>
              </SelectInput>
            </Field>

            <Field label="Default scan frequency" icon={Gauge}>
              <SelectInput
                value={settings.scan_frequency}
                onChange={event => setSettings(current => ({ ...current, scan_frequency: event.target.value }))}
              >
                <option value="manual">Manual only</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </SelectInput>
            </Field>

            <Field label="AI summary detail" icon={Sparkles}>
              <SelectInput
                value={settings.ai_summary_level}
                onChange={event => setSettings(current => ({ ...current, ai_summary_level: event.target.value }))}
              >
                <option value="concise">Concise</option>
                <option value="balanced">Balanced</option>
                <option value="detailed">Detailed</option>
              </SelectInput>
            </Field>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-950">Notifications</h2>
          <div className="mt-5 grid gap-3">
            <Toggle
              checked={settings.email_notifications}
              onChange={value => setSettings(current => ({ ...current, email_notifications: value }))}
              title="Email notifications"
              description="Receive important account, repository, and analysis updates by email."
              icon={Mail}
            />
            <Toggle
              checked={settings.weekly_digest}
              onChange={value => setSettings(current => ({ ...current, weekly_digest: value }))}
              title="Weekly engineering digest"
              description="Summarize repository health movement, ownership risk, and drift closures."
              icon={Bell}
            />
            <Toggle
              checked={settings.risk_alerts}
              onChange={value => setSettings(current => ({ ...current, risk_alerts: value }))}
              title="Risk threshold alerts"
              description="Notify when modules cross high or critical maintainability thresholds."
              icon={ShieldCheck}
            />
            <Toggle
              checked={settings.drift_alerts}
              onChange={value => setSettings(current => ({ ...current, drift_alerts: value }))}
              title="Documentation drift alerts"
              description="Notify when implementation changes invalidate important docs or runbooks."
              icon={Code2}
            />
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Security</h2>
            <p className="mt-1 text-sm text-slate-500">
              Reset your password through a verified email flow.
            </p>
          </div>
          <Button
            href="/reset-password"
            asChild
            variant="outline"
          >
            <a href="/reset-password">
              <KeyRound size={16} />
              Reset password
            </a>
          </Button>
        </div>
      </section>

      {(message || error) && (
        <p
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
            error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
          role="status"
        >
          {error || message}
        </p>
      )}
    </div>
  )
}

export default function AccountPage({ mode, user, accessToken, onLogout, onUserUpdate }) {
  const [name, setName] = useState(user.name || '')
  const [profile, setProfile] = useState(() => mergeProfile(user))
  const [settings, setSettings] = useState(() => mergeSettings(user))
  const [status, setStatus] = useState('Verifying session...')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [usage, setUsage] = useState(null)

  useEffect(() => {
    setName(user.name || '')
    setProfile(mergeProfile(user))
    setSettings(mergeSettings(user))
  }, [user])

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

  return (
    <AccountShell mode={mode} user={user} status={status} onLogout={onLogout}>
      {mode === 'settings' ? (
        <SettingsPage
          settings={settings}
          setSettings={setSettings}
          onSave={handleSettingsSave}
          saving={saving}
          message={message}
          error={error}
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
  )
}
