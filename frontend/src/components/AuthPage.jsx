import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  X,
} from 'lucide-react'

const fieldBase =
  'w-full rounded-xl border px-11 py-3.5 text-sm outline-none transition-all placeholder:text-slate-400'

const insights = [
  { label: 'Drift prevented', value: '42%', tone: 'text-cyan-500' },
  { label: 'PR risk', value: 'Low', tone: 'text-emerald-500' },
  { label: 'Docs synced', value: '18', tone: 'text-violet-500' },
]

const activity = [
  { event: 'auth/README.md synced', meta: '2 min ago', accent: 'bg-emerald-400' },
  { event: 'Risk score recalculated', meta: 'main branch', accent: 'bg-cyan-400' },
  { event: 'New onboarding path ready', meta: 'platform repo', accent: 'bg-violet-400' },
]

function GitHubMark({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12 2C6.48 2 2 6.59 2 12.25c0 4.52 2.86 8.36 6.84 9.72.5.09.68-.22.68-.49 0-.24-.01-1.05-.01-1.9-2.78.62-3.37-1.22-3.37-1.22-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.36-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.98c.85 0 1.7.12 2.5.34 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.81 0 .27.18.59.69.49A10.18 10.18 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function GitLabMark({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="m23.6 9.59-.03-.09L20.3.98a.85.85 0 0 0-.34-.4.87.87 0 0 0-1.19.3l-2.2 6.75H7.43L5.23.88A.87.87 0 0 0 4.04.58a.85.85 0 0 0-.34.4L.43 9.5l-.03.09a6.07 6.07 0 0 0 2.01 7.01l.04.03 4.98 3.73 2.46 1.86 1.5 1.13a1.01 1.01 0 0 0 1.22 0l1.5-1.13 2.46-1.86 5.01-3.75.01-.01A6.07 6.07 0 0 0 23.6 9.59Z" />
    </svg>
  )
}

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark'
  const saved = window.localStorage.getItem('codepulse-auth-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function getRememberedEmail() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem('codepulse-remembered-email') || ''
}

export default function AuthPage({ mode = 'signin', token = '', oauthError = '', onAuthSuccess }) {
  const isSignup = mode === 'signup'
  const isEmailVerify = mode === 'verify-email'
  const isResetFlow = mode === 'reset-password'
  const isPasswordReset = isResetFlow && Boolean(token)
  const isResetRequest = isResetFlow && !token
  const [theme, setTheme] = useState(getInitialTheme)
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState(() => (isSignup || isPasswordReset ? '' : getRememberedEmail()))
  const [rememberMe, setRememberMe] = useState(() => !isSignup && Boolean(getRememberedEmail()))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')
  const [successDialog, setSuccessDialog] = useState(null)
  const [canResendVerification, setCanResendVerification] = useState(false)
  const [isResendingVerification, setIsResendingVerification] = useState(false)

  useEffect(() => {
    window.localStorage.setItem('codepulse-auth-theme', theme)
  }, [theme])

  useEffect(() => {
    if (isSignup || isPasswordReset || isEmailVerify) return

    if (rememberMe && email.trim()) {
      window.localStorage.setItem('codepulse-remembered-email', email.trim())
      return
    }

    if (!rememberMe) {
      window.localStorage.removeItem('codepulse-remembered-email')
    }
  }, [email, isEmailVerify, isPasswordReset, isSignup, rememberMe])

  useEffect(() => {
    setAuthError(oauthError || '')
    setAuthMessage('')
    setSuccessDialog(null)
    setCanResendVerification(false)
    setPassword('')
    setShowPassword(false)

    if (isSignup || isPasswordReset || isEmailVerify) {
      setRememberMe(false)
      return
    }

    setFullName('')
    setEmail(current => current || getRememberedEmail())
  }, [isEmailVerify, isPasswordReset, isSignup, oauthError])

  useEffect(() => {
    if (!isEmailVerify || !token) return

    let cancelled = false

    async function verifyEmail() {
      setIsSubmitting(true)
      setAuthError('')
      setAuthMessage('')

      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
        const response = await fetch(`${apiBaseUrl}/api/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token }),
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.message || 'Email verification failed.')
        }

        if (!cancelled) {
          setAuthMessage(data.message || 'Email verified. You can now sign in.')
        }
      } catch (error) {
        if (!cancelled) {
          setAuthError(error instanceof Error ? error.message : 'Email verification could not be completed.')
        }
      } finally {
        if (!cancelled) {
          setIsSubmitting(false)
        }
      }
    }

    verifyEmail()

    return () => {
      cancelled = true
    }
  }, [isEmailVerify, token])

  const copy = useMemo(
    () => {
      if (isEmailVerify) {
        return {
          eyebrow: 'Verify account',
          title: 'Confirming your email',
          subtitle: 'This verification link unlocks protected CodePulse access for your account.',
          cta: 'Verifying...',
          swapText: 'Ready to continue?',
          swapHref: '/signin',
          swapLabel: 'Sign in',
        }
      }

      if (isResetRequest) {
        return {
          eyebrow: 'Account recovery',
          title: 'Reset your password',
          subtitle: 'Enter your account email and we will send a short-lived reset link.',
          cta: 'Send reset link',
          swapText: 'Remember your password?',
          swapHref: '/signin',
          swapLabel: 'Sign in',
        }
      }

      if (isPasswordReset) {
        return {
          eyebrow: 'Account recovery',
          title: 'Create a new password',
          subtitle: 'Choose a replacement password before the reset link expires.',
          cta: 'Update password',
          swapText: 'Already reset it?',
          swapHref: '/signin',
          swapLabel: 'Sign in',
        }
      }

      return isSignup
        ? {
            eyebrow: 'Start your workspace',
            title: 'Create your CodePulse account',
            subtitle:
              'Connect your repositories, invite your team, and see the first health report in minutes.',
            cta: 'Create account',
            swapText: 'Already have an account?',
            swapHref: '/signin',
            swapLabel: 'Sign in',
          }
        : {
            eyebrow: 'Welcome back',
            title: 'Sign in to CodePulse',
            subtitle:
              'Jump back into repository health, drift alerts, and AI recommendations for your team.',
            cta: 'Sign in',
            swapText: 'New to CodePulse?',
            swapHref: '/signup',
            swapLabel: 'Create account',
          }
    },
    [isEmailVerify, isPasswordReset, isResetRequest, isSignup],
  )

  const isDark = theme === 'dark'
  const pageClass = isDark
    ? 'bg-[#030309] text-slate-100'
    : 'bg-[#f7fafc] text-slate-950'
  const panelClass = isDark
    ? 'border-white/10 bg-white/5.5 shadow-black/30'
    : 'border-slate-200 bg-white/85 shadow-slate-200/80'
  const inputClass = isDark
    ? 'border-white/10 bg-slate-950/45 text-white focus:border-cyan-400/70 focus:bg-slate-950/70 focus:ring-4 focus:ring-cyan-400/10'
    : 'border-slate-200 bg-white text-slate-950 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10'
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-600'
  const softText = isDark ? 'text-slate-500' : 'text-slate-500'
  const chipClass = isDark
    ? 'border-white/10 bg-white/4.5 text-slate-300'
    : 'border-slate-200 bg-slate-50 text-slate-600'
  const passwordRules = [
    { label: '8+ characters', valid: password.length >= 8 },
    { label: 'One number', valid: /\d/.test(password) },
    { label: 'One uppercase', valid: /[A-Z]/.test(password) },
  ]
  const showProviderButtons = !isEmailVerify && !isResetFlow
  const canSubmit = Boolean(!isSubmitting) && (
    isEmailVerify
      ? false
      : isResetRequest
        ? Boolean(email.trim())
        : isPasswordReset
          ? passwordRules.every(rule => rule.valid)
          : Boolean(
              email.trim() &&
                password &&
                (!isSignup || (fullName.trim() && passwordRules.every(rule => rule.valid))),
            )
  )

  async function handleSubmit(event) {
    event.preventDefault()
    setAuthError('')
    setAuthMessage('')
    setCanResendVerification(false)

    if (!canSubmit) {
      setAuthError(
        isResetRequest
          ? 'Enter your account email.'
          : isPasswordReset
            ? 'Enter a password that meets every rule.'
            : isSignup
              ? 'Enter your name, work email, and a password that meets every rule.'
              : 'Enter your email and password.',
      )
      return
    }

    setIsSubmitting(true)

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
      const endpoint = isResetRequest
        ? `${apiBaseUrl}/api/auth/request-password-reset`
        : isPasswordReset
          ? `${apiBaseUrl}/api/auth/reset-password`
          : `${apiBaseUrl}/api/auth/${isSignup ? 'signup' : 'signin'}`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...(isSignup ? { name: fullName.trim() } : {}),
          ...(isPasswordReset ? { token, password } : {}),
          ...(isResetRequest ? { email: email.trim() } : {}),
          ...(!isResetFlow ? { email: email.trim(), password } : {}),
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (!isSignup && response.status === 403 && data.canResendVerification) {
          setCanResendVerification(true)
        }

        throw new Error(data.message || 'Authentication request failed.')
      }

      if (!isSignup && !isResetFlow && data.user && data.accessToken) {
        onAuthSuccess?.(data)
      }

      if (isSignup) {
        setSuccessDialog({
          title: 'Check your email',
          message: `A verification link has been sent to ${email.trim()}. Complete verification before signing in.`,
          actionHref: '/signin',
          actionLabel: 'Continue to sign in',
        })
        setAuthMessage('')
      } else if (isResetRequest) {
        setSuccessDialog({
          title: 'Reset link sent',
          message:
            'Password reset instructions have been sent if an account matches that email.',
          actionHref: '/signin',
          actionLabel: 'Continue to sign in',
        })
        setAuthMessage('')
      } else if (isPasswordReset) {
        setSuccessDialog({
          title: 'Password updated',
          message: 'Your password has been updated. Sign in with your new password.',
          actionHref: '/signin',
          actionLabel: 'Sign in',
        })
        setAuthMessage('')
      } else {
        setAuthMessage(data.message || 'Signed in successfully.')
      }
      setPassword('')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication request failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResendVerification() {
    const targetEmail = email.trim()

    if (!targetEmail) {
      setAuthError('Enter the email address for the unverified account.')
      return
    }

    setIsResendingVerification(true)
    setAuthError('')
    setAuthMessage('')

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
      const response = await fetch(`${apiBaseUrl}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: targetEmail }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Verification resend failed.')
      }

      setCanResendVerification(false)
      setSuccessDialog({
        title: 'Verification email sent',
        message: `A new verification link has been sent to ${targetEmail} if the account is awaiting verification.`,
        actionHref: '/signin',
        actionLabel: 'Continue to sign in',
      })
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Verification resend failed.')
    } finally {
      setIsResendingVerification(false)
    }
  }

  return (
    <div className={`min-h-screen overflow-hidden transition-colors duration-500 ${pageClass}`}>
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={`absolute inset-0 ${
            isDark ? 'grid-bg opacity-70' : 'bg-[linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-size-[56px_56px]'
          }`}
        />
        <div className={`absolute inset-x-0 top-0 h-56 ${isDark ? 'bg-linear-to-b from-violet-950/60 to-transparent' : 'bg-linear-to-b from-cyan-100 to-transparent'}`} />
        <div className={`absolute inset-y-0 right-0 w-1/2 ${isDark ? 'bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.16),transparent_50%)]' : 'bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.14),transparent_48%)]'}`} />
      </div>

      <header className="relative z-10">
        <div className="cp-container flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-violet-600 to-cyan-400 shadow-lg shadow-violet-600/20">
              <Activity size={17} strokeWidth={2.5} className="text-white" />
            </span>
            <span className="text-lg font-bold tracking-tight">
              Code<span className="gradient-text">Pulse</span>
            </span>
          </a>

          <div className="flex items-center gap-2">
            <a
              href="/"
              className={`hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors sm:flex ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <ArrowLeft size={16} />
              Home
            </a>
            <button
              type="button"
              onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                isDark
                  ? 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:text-slate-950'
              }`}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="cp-container relative z-10 grid min-h-[calc(100vh-4rem)] grid-cols-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16 2xl:gap-14">
        <section className="relative order-2 lg:order-1">
          <div className="absolute -left-8 top-8 hidden h-40 w-40 rotate-12 rounded-4xl border border-cyan-400/20 lg:block" />
          <div className="absolute -bottom-8 right-8 hidden h-32 w-32 -rotate-12 rounded-4xl border border-violet-400/20 lg:block" />

          <div className={`relative overflow-hidden rounded-4xl border p-5 shadow-2xl backdrop-blur-2xl ${panelClass}`}>
            <div className="absolute left-0 right-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-400/70 to-transparent" />
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-current/10 pb-5">
              <div>
                <p className={`text-xs uppercase tracking-[0.22em] ${softText}`}>Live workspace</p>
                <h2 className="mt-1 text-xl font-bold tracking-tight">Pulse command center</h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-500">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Monitoring
              </span>
            </div>

            <div className="grid gap-3 py-5 min-[420px]:grid-cols-3">
              {insights.map(item => (
                <div key={item.label} className={`rounded-2xl border p-4 ${chipClass}`}>
                  <p className={`text-2xl font-bold ${item.tone}`}>{item.value}</p>
                  <p className="mt-1 text-xs">{item.label}</p>
                </div>
              ))}
            </div>

            <div className={`rounded-2xl border p-4 ${chipClass}`}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Repository health</p>
                  <p className={`text-xs ${softText}`}>acme/platform · synced now</p>
                </div>
                <ShieldCheck size={20} className="text-emerald-500" />
              </div>
              <div className="space-y-3">
                <div className="h-3 overflow-hidden rounded-full bg-current/10">
                  <div className="h-full w-[86%] rounded-full bg-linear-to-r from-violet-500 via-cyan-400 to-emerald-400" />
                </div>
                <div className="grid grid-cols-6 gap-1 sm:grid-cols-8">
                  {Array.from({ length: 24 }).map((_, index) => (
                    <span
                      key={index}
                      className={`h-10 rounded-md ${
                        index % 7 === 0
                          ? 'bg-rose-400/70'
                          : index % 5 === 0
                            ? 'bg-amber-400/70'
                            : 'bg-emerald-400/70'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {activity.map(item => (
                <div key={item.event} className={`flex items-center gap-3 rounded-2xl border p-3 ${chipClass}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${item.accent}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.event}</p>
                    <p className={`text-xs ${softText}`}>{item.meta}</p>
                  </div>
                  <Check size={16} className="text-emerald-500" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="order-1 lg:order-2">
          <div className={`rounded-4xl border p-6 shadow-2xl backdrop-blur-2xl sm:p-8 ${panelClass}`}>
            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3.5 py-1.5 text-sm font-semibold text-violet-400">
                <Sparkles size={14} />
                {copy.eyebrow}
              </div>
              <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{copy.title}</h1>
              <p className={`mt-3 text-sm leading-6 sm:text-base ${mutedText}`}>{copy.subtitle}</p>
            </div>

            {showProviderButtons && (
              <>
                <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                  <a
                    href={`${import.meta.env.VITE_API_BASE_URL || ''}/auth/github`}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                      isDark ? 'border-white/10 bg-white/4 hover:bg-white/7.5' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <GitHubMark className="h-4.5 w-4.5" />
                    GitHub
                  </a>
                  <a
                    href={`${import.meta.env.VITE_API_BASE_URL || ''}/auth/gitlab`}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                      isDark ? 'border-white/10 bg-white/4 hover:bg-white/7.5' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <GitLabMark className="h-4.5 w-4.5 text-[#fc6d26]" />
                    GitLab
                  </a>
                </div>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-current/10" />
                  <span className={`text-xs font-medium ${softText}`}>or continue with email</span>
                  <div className="h-px flex-1 bg-current/10" />
                </div>
              </>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              {isSignup && (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Full name</span>
                  <span className="relative block">
                    <User size={18} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${softText}`} />
                    <input
                      className={`${fieldBase} ${inputClass}`}
                      type="text"
                      placeholder="Ada Lovelace"
                      autoComplete="name"
                      value={fullName}
                      onChange={event => setFullName(event.target.value)}
                    />
                  </span>
                </label>
              )}

              {!isEmailVerify && !isPasswordReset && (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Work email</span>
                  <span className="relative block">
                    <Mail size={18} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${softText}`} />
                    <input
                      className={`${fieldBase} ${inputClass}`}
                      type="email"
                      placeholder="you@company.com"
                      autoComplete="email"
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                    />
                  </span>
                </label>
              )}

              {!isEmailVerify && !isResetRequest && (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    {isPasswordReset ? 'New password' : 'Password'}
                  </span>
                  <span className="relative block">
                    <Lock size={18} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${softText}`} />
                    <input
                      className={`${fieldBase} ${inputClass} pr-12`}
                      type={showPassword ? 'text' : 'password'}
                      placeholder={isSignup || isPasswordReset ? 'Create a strong password' : 'Enter your password'}
                      autoComplete={isSignup || isPasswordReset ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-colors ${softText}`}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>
              )}

              {isSignup || isPasswordReset ? (
                <div className="flex flex-wrap gap-2">
                  {passwordRules.map(rule => (
                    <span
                      key={rule.label}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all ${
                        rule.valid
                          ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-500'
                          : chipClass
                      }`}
                    >
                      <Check
                        size={12}
                        className={rule.valid ? 'text-emerald-500' : softText}
                      />
                      {rule.label}
                    </span>
                  ))}
                </div>
              ) : !isEmailVerify && !isResetRequest ? (
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={rememberMe}
                    onClick={() => setRememberMe(value => !value)}
                    className={`group inline-flex items-center gap-2 rounded-xl py-1.5 pr-2 text-sm transition-colors ${mutedText}`}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-lg border transition-all ${
                        rememberMe
                          ? 'border-emerald-400/30 bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/20'
                          : isDark
                            ? 'border-white/15 bg-white/4 group-hover:border-white/25'
                            : 'border-slate-300 bg-white group-hover:border-slate-400'
                      }`}
                    >
                      {rememberMe && <Check size={13} strokeWidth={3} />}
                    </span>
                    Remember me
                  </button>
                  <a href="/reset-password" className="text-sm font-semibold text-cyan-500 hover:text-cyan-400">
                    Forgot password?
                  </a>
                </div>
              ) : null}

              {isEmailVerify && !token && (
                <div className={`rounded-xl border px-4 py-3 text-sm ${chipClass}`} role="status">
                  This verification link is invalid or incomplete.
                </div>
              )}

              {(authError || authMessage) && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    authError
                      ? 'border-rose-400/25 bg-rose-400/10 text-rose-400'
                      : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-500'
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {authError || authMessage}
                </div>
              )}

              {canResendVerification && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    isDark
                      ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/15'
                      : 'border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
                  }`}
                >
                  <Mail size={16} />
                  {isResendingVerification ? 'Sending verification email...' : 'Resend verification email'}
                </button>
              )}

              {!isEmailVerify && (
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-cyan-500 px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-violet-600/25 transition-all hover:scale-[1.01] hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:scale-100"
                >
                  {isSubmitting ? 'Please wait...' : copy.cta}
                  <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
            </form>

            <p className={`mt-6 text-center text-sm ${mutedText}`}>
              {copy.swapText}{' '}
              <a href={copy.swapHref} className="font-bold text-violet-500 hover:text-cyan-500">
                {copy.swapLabel}
              </a>
            </p>
          </div>
        </section>
      </main>

      {successDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-success-title"
        >
          <div
            className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${
              isDark
                ? 'border-white/10 bg-[#0b1020] text-slate-100'
                : 'border-slate-200 bg-white text-slate-950'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-500">
                <ShieldCheck size={24} />
              </span>
              <button
                type="button"
                onClick={() => setSuccessDialog(null)}
                className={`rounded-xl p-2 transition-colors ${
                  isDark ? 'text-slate-400 hover:bg-white/8 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
                }`}
                aria-label="Close confirmation"
              >
                <X size={18} />
              </button>
            </div>
            <h2 id="auth-success-title" className="mt-5 text-2xl font-bold tracking-tight">
              {successDialog.title}
            </h2>
            <p className={`mt-3 text-sm leading-6 ${mutedText}`}>{successDialog.message}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={successDialog.actionHref}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-linear-to-r from-violet-600 to-cyan-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/20"
              >
                {successDialog.actionLabel}
              </a>
              <button
                type="button"
                onClick={() => setSuccessDialog(null)}
                className={`inline-flex flex-1 items-center justify-center rounded-xl border px-4 py-3 text-sm font-bold ${
                  isDark
                    ? 'border-white/10 text-slate-300 hover:bg-white/8 hover:text-white'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
