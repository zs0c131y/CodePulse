import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  User,
  X,
} from 'lucide-react'
import { ThemeToggle } from './ui/theme-toggle'
import { PulseMark } from './ui/pulse-mark'

/*
 * Product authentication — the quiet product aesthetic: one centered column,
 * a flat panel, inverted primary action. All flows (signin, signup, email
 * verification, password reset, resend) post to the same backend contract as
 * before; only the presentation changed.
 */

const fieldBase =
  'w-full rounded-[var(--r-md)] border py-2.5 pl-10 pr-3 text-sm outline-none transition-colors duration-[var(--d-2)] placeholder:text-[var(--ink-4)] disabled:cursor-not-allowed disabled:opacity-50'

const inputClass =
  'border-[var(--line-2)] bg-[var(--surface-1)] text-[var(--ink-1)] hover:border-[var(--line-3)] focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-wash)]'

const chipClass = 'border-[var(--line-2)] bg-[var(--surface-2)] text-[var(--ink-3)]'

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
          title: 'Confirming your email',
          subtitle: 'This verification link unlocks protected CodePulse access for your account.',
          cta: 'Verifying…',
          swapText: 'Ready to continue?',
          swapHref: '/signin',
          swapLabel: 'Sign in',
        }
      }

      if (isResetRequest) {
        return {
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
            title: 'Create your account',
            subtitle: 'Connect a repository and see its first health report in minutes.',
            cta: 'Create account',
            swapText: 'Already have an account?',
            swapHref: '/signin',
            swapLabel: 'Sign in',
          }
        : {
            title: 'Sign in to CodePulse',
            subtitle: 'Repository health, drift alerts, and AI recommendations for your team.',
            cta: 'Sign in',
            swapText: 'New to CodePulse?',
            swapHref: '/signup',
            swapLabel: 'Create account',
          }
    },
    [isEmailVerify, isPasswordReset, isResetRequest, isSignup],
  )

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
    <div className="relative min-h-screen bg-[var(--surface-canvas)] text-[var(--ink-1)]">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />

      <header className="relative z-10">
        <div className="cp-marketing flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" aria-label="CodePulse home">
            <PulseMark size={26} />
            <span className="text-[0.9375rem] font-semibold tracking-[-0.02em] text-[var(--ink-1)]">CodePulse</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/"
              className="hidden items-center gap-1.5 rounded-[var(--r-md)] px-3 py-2 text-sm text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-wash)] hover:text-[var(--ink-1)] sm:flex"
            >
              <ArrowLeft size={15} />
              Home
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-[24.5rem]">
          <div className="panel p-6 sm:p-7">
            <div className="mb-7">
              <h1 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ink-1)]">{copy.title}</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-3)]">{copy.subtitle}</p>
            </div>

            {isEmailVerify && isSubmitting && (
              <div className="mb-5 flex items-center gap-2.5 text-sm text-[var(--ink-3)]" role="status">
                <Loader2 size={16} className="motion-safe-loop animate-spin text-[var(--accent-ink)]" />
                Verifying your email…
              </div>
            )}

            {showProviderButtons && (
              <>
                <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
                  <a
                    href={`${import.meta.env.VITE_API_BASE_URL || ''}/auth/github`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--r-md)] border border-[var(--line-2)] bg-[var(--surface-1)] px-4 text-sm font-medium text-[var(--ink-1)] transition-colors duration-[var(--d-2)] hover:border-[var(--line-3)] hover:bg-[var(--surface-2)]"
                  >
                    <GitHubMark className="h-4 w-4 text-[var(--provider-github)]" />
                    GitHub
                  </a>
                  <a
                    href={`${import.meta.env.VITE_API_BASE_URL || ''}/auth/gitlab`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--r-md)] border border-[var(--line-2)] bg-[var(--surface-1)] px-4 text-sm font-medium text-[var(--ink-1)] transition-colors duration-[var(--d-2)] hover:border-[var(--line-3)] hover:bg-[var(--surface-2)]"
                  >
                    <GitLabMark className="h-4 w-4 text-[var(--provider-gitlab)]" />
                    GitLab
                  </a>
                </div>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[var(--line-1)]" />
                  <span className="text-xs text-[var(--ink-4)]">or continue with email</span>
                  <div className="h-px flex-1 bg-[var(--line-1)]" />
                </div>
              </>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              {isSignup && (
                <label className="block">
                  <span className="mb-1.5 block text-[0.8125rem] font-medium text-[var(--ink-2)]">Full name</span>
                  <span className="relative block">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-4)]" />
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
                  <span className="mb-1.5 block text-[0.8125rem] font-medium text-[var(--ink-2)]">Work email</span>
                  <span className="relative block">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-4)]" />
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
                  <span className="mb-1.5 block text-[0.8125rem] font-medium text-[var(--ink-2)]">
                    {isPasswordReset ? 'New password' : 'Password'}
                  </span>
                  <span className="relative block">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-4)]" />
                    <input
                      className={`${fieldBase} ${inputClass} pr-11`}
                      type={showPassword ? 'text' : 'password'}
                      placeholder={isSignup || isPasswordReset ? 'Create a strong password' : 'Enter your password'}
                      autoComplete={isSignup || isPasswordReset ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[var(--r-sm)] p-1.5 text-[var(--ink-4)] transition-colors hover:bg-[var(--surface-wash)] hover:text-[var(--ink-1)]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </label>
              )}

              {isSignup || isPasswordReset ? (
                <div className="flex flex-wrap gap-1.5">
                  {passwordRules.map(rule => (
                    <span
                      key={rule.label}
                      className={`inline-flex items-center gap-1.5 rounded-[var(--r-xs)] border px-2 py-1 text-xs transition-colors ${
                        rule.valid
                          ? 'border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] text-[var(--sev-nominal-ink)]'
                          : chipClass
                      }`}
                    >
                      <Check size={11} strokeWidth={3} />
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
                    className="group inline-flex items-center gap-2 py-1 text-sm text-[var(--ink-3)] transition-colors hover:text-[var(--ink-1)]"
                  >
                    <span
                      className={`inline-flex h-4.5 w-4.5 items-center justify-center rounded-[var(--r-xs)] border transition-colors ${
                        rememberMe
                          ? 'border-[var(--accent-line)] bg-[var(--accent)] text-[var(--accent-on)]'
                          : 'border-[var(--line-2)] bg-[var(--surface-1)] group-hover:border-[var(--line-3)]'
                      }`}
                    >
                      {rememberMe && <Check size={12} strokeWidth={3} />}
                    </span>
                    Remember me
                  </button>
                  <Link to="/reset-password" className="text-sm text-[var(--accent-ink)] hover:underline">
                    Forgot password?
                  </Link>
                </div>
              ) : null}

              {isEmailVerify && !token && (
                <div className={`rounded-[var(--r-md)] border px-3.5 py-3 text-sm ${chipClass}`} role="status">
                  This verification link is invalid or incomplete.
                </div>
              )}

              {(authError || authMessage) && (
                <div
                  className={`rounded-[var(--r-md)] border px-3.5 py-3 text-sm ${
                    authError
                      ? 'border-[var(--sev-critical-line)] bg-[var(--sev-critical-wash)] text-[var(--sev-critical-ink)]'
                      : 'border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] text-[var(--sev-nominal-ink)]'
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
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--r-md)] border border-[var(--line-2)] bg-[var(--surface-1)] px-4 text-sm font-medium text-[var(--ink-1)] transition-colors hover:border-[var(--line-3)] hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Mail size={15} />
                  {isResendingVerification ? 'Sending verification email…' : 'Resend verification email'}
                </button>
              )}

              {!isEmailVerify && (
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--r-md)] bg-[var(--contrast)] px-4 text-sm font-medium text-[var(--contrast-on)] transition-colors duration-[var(--d-2)] hover:bg-[var(--contrast-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Please wait…' : copy.cta}
                  <ArrowRight size={15} className="transition-transform duration-[var(--d-2)] group-hover:translate-x-0.5" />
                </button>
              )}
            </form>
          </div>

          <p className="mt-5 text-center text-sm text-[var(--ink-3)]">
            {copy.swapText}{' '}
            <a href={copy.swapHref} className="font-medium text-[var(--accent-ink)] hover:underline">
              {copy.swapLabel}
            </a>
          </p>
        </div>
      </main>

      {successDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)] p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-success-title"
          style={{ animation: 'cp-fade-in var(--d-2) var(--ease-out)' }}
        >
          <div
            className="panel w-full max-w-sm p-6 text-[var(--ink-1)] shadow-[var(--shadow-e4)]"
            style={{ animation: 'cp-dialog-in var(--d-3) var(--ease-out)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--sev-nominal-wash)] text-[var(--sev-nominal-ink)]">
                <MailCheck size={20} />
              </span>
              <button
                type="button"
                onClick={() => setSuccessDialog(null)}
                className="rounded-[var(--r-sm)] p-1.5 text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-wash)] hover:text-[var(--ink-1)]"
                aria-label="Close confirmation"
              >
                <X size={16} />
              </button>
            </div>
            <h2 id="auth-success-title" className="mt-4 text-lg font-semibold tracking-[-0.02em] text-[var(--ink-1)]">
              {successDialog.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-3)]">{successDialog.message}</p>
            <div className="mt-6 flex flex-col gap-2">
              <a
                href={successDialog.actionHref}
                className="inline-flex h-10 items-center justify-center rounded-[var(--r-md)] bg-[var(--contrast)] px-4 text-sm font-medium text-[var(--contrast-on)] transition-colors hover:bg-[var(--contrast-hover)]"
              >
                {successDialog.actionLabel}
              </a>
              <button
                type="button"
                onClick={() => setSuccessDialog(null)}
                className="inline-flex h-10 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-2)] px-4 text-sm font-medium text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink-1)]"
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
