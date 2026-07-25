import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
  GitFork,
  Boxes,
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
import { listIntegrations } from '../api/integrations'
import AuroraBackground from './AuroraBackground'
import { cn } from '../lib/utils'
import { ThemeToggle } from './ui/theme-toggle'

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
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--ink-2)]">
        {Icon && <Icon size={15} className="text-[var(--ink-3)]" />}
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
  return (
    <span className="relative block">
      <Select
        {...props}
        className={cn('appearance-none pr-10', className)}
      />
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
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
      className="panel-2 flex w-full items-center justify-between gap-4 rounded-[var(--r-sm)] p-4 text-left transition-all duration-300 hover:border-[var(--line-2)] hover:bg-[var(--surface-3)]"
    >
      <span className="flex min-w-0 gap-3">
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[var(--surface-2)] text-[var(--ink-2)]">
            <Icon size={18} />
          </span>
        )}
        <span>
          <span className="block text-sm font-bold text-[var(--ink-1)]">{title}</span>
          <span className="mt-1 block text-sm leading-5 text-[var(--ink-3)]">{description}</span>
        </span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-all duration-300 ${
          checked ? 'bg-[var(--surface-2)] shadow-[var(--shadow-e2)] shadow-[var(--shadow-e2)]' : 'bg-[var(--surface-3)]'
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-[var(--surface-1)] shadow-sm transition-all duration-300 ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </span>
    </button>
  )
}

function AccountShell({ mode, user, onLogout, children }) {
  const isProfile = mode === 'profile'

  return (
    <div className="relative min-h-screen bg-[var(--surface-canvas)] text-[var(--ink-1)]">
      <AuroraBackground variant="page" grid={false} className="fixed" />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-16 border-r border-[var(--line-1)] bg-[var(--surface-canvas)]/90 text-[var(--ink-1)] backdrop-blur-xl lg:flex lg:flex-col">
        <div className="flex h-16 items-center justify-center border-b border-[var(--line-1)]">
          <span className="flex h-9 w-9 items-center justify-center rounded-[var(--r-sm)] bg-[var(--surface-2)] shadow-[var(--shadow-e2)] shadow-[var(--shadow-e2)]">
            <Activity size={18} strokeWidth={2.5} className="text-[var(--ink-1)]" />
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-5" aria-label="Account navigation">
          {navItems.map(item => {
            const Icon = item.icon
            const selected =
              (mode === 'profile' && item.label === 'Profile') ||
              (mode === 'settings' && item.label === 'Settings')

            return (
              <Link
                key={item.label}
                to={item.href}
                aria-label={item.label}
                title={item.label}
                className={`flex w-full items-center justify-center rounded-[var(--r-sm)] px-3 py-2.5 text-left text-sm font-semibold transition-all duration-300 ${
                  selected
                    ? 'bg-[var(--surface-2)] text-[var(--ink-1)] shadow-[var(--shadow-e2)] shadow-[var(--shadow-e2)]'
                    : 'text-[var(--ink-3)] hover:bg-[var(--surface-3)] hover:text-[var(--ink-1)]'
                }`}
              >
                <Icon size={18} />
                <span className="sr-only">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[var(--line-1)] p-2">
          <Link to="/profile" aria-label="Profile" title={user.name || user.email} className="grid h-11 w-11 place-items-center rounded-[var(--r-sm)] bg-[var(--surface-2)] text-sm font-semibold text-[var(--ink-1)] hover:bg-[var(--surface-3)]">
            {initials(user.name, user.email)}
          </Link>
        </div>
      </aside>

      <div className="relative min-w-0 lg:pl-16">
        <header className="sticky top-0 z-40 border-b border-[var(--line-1)] bg-[var(--surface-canvas)]/95 backdrop-blur-xl">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 2xl:px-8">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-3)]">
                <Link to="/dashboard" className="inline-flex items-center gap-1 transition-colors hover:text-[var(--ink-1)]">
                  <ArrowLeft size={14} />
                  Dashboard
                </Link>
                <ChevronRight size={13} />
                <span className="text-[var(--ink-1)]">{isProfile ? 'Profile' : 'Settings'}</span>
              </div>
              <h1 className="mt-1 text-xl font-bold text-[var(--ink-1)] sm:text-2xl">
                {isProfile ? 'Profile' : 'Settings'}
              </h1>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <ThemeToggle />
              <Button
                asChild
                variant="outline"
                className="hidden sm:inline-flex"
              >
                <Link to="/profile">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--surface-2)] text-xs font-bold text-[var(--ink-1)]">
                    {initials(user.name, user.email)}
                  </span>
                  <span className="max-w-32 truncate">{user.name}</span>
                </Link>
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

        <main className="cp-app min-w-0 py-5 sm:py-6 2xl:py-8">{children}</main>
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
      <section className="glass-panel overflow-hidden">
        <div className="relative bg-[var(--surface-2)] px-5 py-8 text-[var(--ink-1)] sm:px-7">
          <div className="pointer-events-none absolute inset-0 dot-bg opacity-20" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-3)] bg-[var(--surface-2)] text-2xl font-black text-[var(--ink-1)] shadow-[var(--shadow-e2)] shadow-[var(--shadow-e2)]">
                {initials(name, user.email)}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--accent-ink)]">CodePulse account</p>
                <h2 className="mt-1 text-3xl font-bold tracking-tight">{name || user.email}</h2>
                <p className="mt-1 text-sm text-[var(--ink-3)]">{user.email}</p>
              </div>
            </div>
            <div className="rounded-[var(--r-sm)] border border-white/15 bg-[var(--surface-2)] p-4 backdrop-blur">
              <p className="text-sm font-semibold text-[var(--ink-2)]">Profile completion</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 w-36 rounded-full bg-[var(--surface-3)]">
                  <div className="h-full rounded-full bg-[var(--surface-2)]" style={{ width: `${completion}%` }} />
                </div>
                <span className="text-sm font-bold">{completion}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr] 2xl:grid-cols-[1.15fr_0.85fr] 2xl:gap-6">
        <form className="glass-panel p-6" onSubmit={onSave}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line-1)] pb-4">
            <div>
              <h2 className="text-base font-bold text-[var(--ink-1)]">Personal details</h2>
              <p className="mt-1 text-sm text-[var(--ink-3)]">Keep your workspace identity clear for reports and ownership views.</p>
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
              className="min-h-28 w-full rounded-[var(--r-sm)] border border-[var(--line-2)] bg-[var(--surface-canvas)]/60 px-3 py-3 text-sm leading-6 text-[var(--ink-1)] outline-none transition placeholder:text-[var(--ink-4)] focus:border-[var(--accent-line)] focus:ring-4 focus:ring-[var(--accent)]"
            />
          </Field>

          {(message || error) && (
            <p
              className={`mt-4 flex items-start gap-2 rounded-[var(--r-sm)] border px-3 py-2 text-sm font-semibold ${
                error ? 'border-[var(--sev-critical-line)] bg-[var(--sev-critical-wash)] text-[var(--sev-critical-ink)]' : 'border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] text-[var(--sev-nominal-ink)]'
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
          <section className="glass-panel p-6">
            <h2 className="text-base font-bold text-[var(--ink-1)]">Account posture</h2>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Email verified', value: user.email_verified ? 'Complete' : 'Pending', icon: ShieldCheck, ok: user.email_verified },
                { label: 'Session storage', value: 'Secure workspace session', icon: LockKeyhole, ok: true },
                { label: 'Workspace access', value: 'Verified account session', icon: KeyRound, ok: true },
              ].map(item => (
                <div key={item.label} className="panel-2 flex items-center gap-3 rounded-[var(--r-sm)] p-3">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-[var(--r-sm)] ${
                      item.ok ? 'bg-[var(--sev-nominal-wash)] text-[var(--sev-nominal-ink)]' : 'bg-[var(--sev-medium-wash)] text-[var(--sev-medium-ink)]'
                    }`}
                  >
                    <item.icon size={17} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-[var(--ink-1)]">{item.label}</span>
                    <span className="block text-xs text-[var(--ink-3)]">{item.value}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-panel p-6">
            <h2 className="text-base font-bold text-[var(--ink-1)]">Usage snapshot</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              {[
                [usage?.repositories, 'Repositories'],
                [usage?.aiActions, 'AI actions'],
                [usage?.driftFindings, 'Drift findings'],
                [usage?.averageHealthScore, 'Health score'],
              ].map(([value, label]) => (
                <div key={label} className="panel-2 rounded-[var(--r-sm)] p-4">
                  <p className="text-2xl font-black text-[var(--ink-1)]">{value ?? '—'}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--ink-3)]">{label}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function SettingsPage({ settings, setSettings, onSave, saving, message, error, integrations, integrationsLoading }) {
  return (
    <div className="mx-auto max-w-[112rem] space-y-5">
      <section className="glass-panel p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--accent-ink)]">Workspace preferences</p>
            <h2 className="mt-1 text-2xl font-bold text-[var(--ink-1)]">Tune CodePulse for your review flow</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-3)]">
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
        <section className="glass-panel p-6">
          <h2 className="text-base font-bold text-[var(--ink-1)]">Interface</h2>
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
                      className={`flex h-20 flex-col items-center justify-center gap-2 rounded-[var(--r-sm)] border text-sm font-bold transition-all duration-300 ${
                        selected
                          ? 'border-transparent bg-[var(--surface-2)] text-[var(--ink-1)] shadow-[var(--shadow-e2)] shadow-[var(--shadow-e2)]'
                          : 'border-[var(--line-2)] bg-[var(--surface-2)] text-[var(--ink-3)] hover:bg-[var(--surface-3)] hover:text-[var(--ink-1)]'
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

        <section className="glass-panel p-6">
          <h2 className="text-base font-bold text-[var(--ink-1)]">Notifications</h2>
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

      <section className="glass-panel overflow-hidden">
        <div className="border-b border-[var(--line-1)] bg-[var(--surface-2)] px-5 py-5">
          <p className="text-sm font-semibold text-[var(--accent-ink)]">Repository sources</p>
          <h2 className="mt-1 text-xl font-bold text-[var(--ink-1)]">Connected code hosts</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-3)]">Connect a provider once, then choose its repositories from the dashboard picker.</p>
        </div>
        <div className="grid gap-3 p-5 md:grid-cols-2">
          {[{ provider: 'github', label: 'GitHub', icon: GitFork, href: '/auth/github', tone: ' ' }, { provider: 'gitlab', label: 'GitLab', icon: Boxes, href: '/auth/gitlab', tone: ' ' }].map(item => {
            const integration = integrations.find(value => value.provider === item.provider)
            const connected = Boolean(integration?.connected)
            const Icon = item.icon
            return <div key={item.provider} className="group relative overflow-hidden rounded-[var(--r-md)] border border-[var(--line-1)] bg-[var(--surface-2)] p-4 transition hover:border-[var(--line-2)] hover:bg-[var(--surface-3)]">
              <div className={`absolute inset-x-0 top-0 h-px  ${item.tone} opacity-80`} />
              <div className="flex items-start justify-between gap-4">
                <span className={`flex h-11 w-11 items-center justify-center rounded-[var(--r-sm)]  ${item.tone} text-[var(--ink-1)] shadow-[var(--shadow-e2)]`}><Icon size={21} /></span>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${connected ? 'border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] text-[var(--sev-nominal-ink)]' : 'border-[var(--line-2)] bg-[var(--surface-2)] text-[var(--ink-3)]'}`}>{integrationsLoading ? 'Checking' : connected ? 'Connected' : 'Not connected'}</span>
              </div>
              <h3 className="mt-4 font-bold text-[var(--ink-1)]">{item.label}</h3>
              <p className="mt-1 min-h-10 text-sm text-[var(--ink-3)]">{connected ? `Connected as ${integration.accountName || item.label}.` : `Bring your ${item.label} repositories into CodePulse.`}</p>
              <Button href={item.href} asChild variant={connected ? 'outline' : 'default'} className="mt-4 w-full"><a href={item.href}>{connected ? 'Reconnect' : `Connect ${item.label}`}</a></Button>
            </div>
          })}
        </div>
      </section>

      <section className="glass-panel p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--ink-1)]">Security</h2>
            <p className="mt-1 text-sm text-[var(--ink-3)]">
              Reset your password through a verified email flow.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
          >
            <Link to="/reset-password">
              <KeyRound size={16} />
              Reset password
            </Link>
          </Button>
        </div>
      </section>

      {(message || error) && (
        <p
          className={`rounded-[var(--r-sm)] border px-3 py-2 text-sm font-semibold ${
            error ? 'border-[var(--sev-critical-line)] bg-[var(--sev-critical-wash)] text-[var(--sev-critical-ink)]' : 'border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] text-[var(--sev-nominal-ink)]'
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
  const [, setStatus] = useState('Verifying session...')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [usage, setUsage] = useState(null)
  const [integrations, setIntegrations] = useState([])
  const [integrationsLoading, setIntegrationsLoading] = useState(mode === 'settings')

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

  return (
    <AccountShell mode={mode} user={user} onLogout={onLogout}>
      {mode === 'settings' ? (
        <SettingsPage
          settings={settings}
          setSettings={setSettings}
          onSave={handleSettingsSave}
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
  )
}
