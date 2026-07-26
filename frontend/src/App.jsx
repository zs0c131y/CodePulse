import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from './lib/router'
import { useLocation, useNavigate } from './lib/router-context'
import AuthPage from './components/AuthPage'
import MarketingPage from './components/MarketingPage'

// Authenticated screens pull in the dashboard chart stack (recharts), so they
// are code-split and only downloaded after sign-in.
const Dashboard = lazy(() => import('./components/Dashboard'))
const AccountPage = lazy(() => import('./components/AccountPage'))
const ReportsPage = lazy(() => import('./components/ReportsPage'))

const legacyRoutes = new Set([
  'signin',
  'signup',
  'reset-password',
  'verify-email',
  'dashboard',
  'profile',
  'settings',
  'reports',
])

function LoadingScreen({ label }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[var(--surface-canvas)] p-6 text-[var(--ink-3)]"
      role="status"
    >
      <span className="flex items-center gap-3 text-sm font-medium">
        {/* Loading indicators keep looping under reduced motion — they carry
            meaning, unlike decorative animation. */}
        <span className="motion-safe-loop h-4 w-4 animate-spin rounded-full border-2 border-[var(--line-2)] border-t-[var(--accent)]" />
        {label}
      </span>
    </div>
  )
}

function ProtectedScreenFallback() {
  return <LoadingScreen label="Loading workspace…" />
}

function apiUrl(path) {
  return `${import.meta.env.VITE_API_BASE_URL || ''}${path}`
}

function storedPreference(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function withLocalTheme(user) {
  if (!user) return user

  const localTheme = storedPreference('codepulse-theme')
  if (localTheme === 'light' || localTheme === 'dark') {
    return {
      ...user,
      settings: { ...(user.settings || {}), theme: localTheme },
    }
  }

  return user
}

function LegacyHashRedirect() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (location.pathname !== '/' || !window.location.hash) return

    const [legacyName, legacyQuery = ''] = window.location.hash.slice(1).split('?')
    if (!legacyRoutes.has(legacyName)) return

    navigate(`/${legacyName}${legacyQuery ? `?${legacyQuery}` : ''}`, { replace: true })
  }, [location.pathname, navigate])

  return null
}

function ProtectedRoute({ authLoading, user, accessToken, children }) {
  if (authLoading) return <LoadingScreen label="Loading session…" />
  if (!user || !accessToken) return <Navigate to="/signin" replace />
  return children
}

function PublicRoute({ authLoading, user, accessToken, children }) {
  if (authLoading) return <LoadingScreen label="Loading session…" />
  if (user && accessToken) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState('')
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const theme = storedPreference('codepulse-theme') || user?.settings?.theme || 'system'
    const density = user?.settings?.density || 'comfortable'
    const root = document.documentElement

    const colorScheme = window.matchMedia('(prefers-color-scheme: light)')
    const applyTheme = () => {
      root.dataset.theme = theme === 'system'
        ? (colorScheme.matches ? 'light' : 'dark')
        : theme
      root.dataset.density = density
    }

    applyTheme()
    if (theme === 'system') colorScheme.addEventListener('change', applyTheme)

    // Persisted so the pre-paint script in index.html can stamp both before
    // first paint on the next load.
    try {
      localStorage.setItem('codepulse-theme', theme)
      localStorage.setItem('codepulse-density', density)
    } catch {
      /* Storage blocked; the in-memory stamp above still applies. */
    }

    return () => colorScheme.removeEventListener('change', applyTheme)
  }, [user?.settings?.density, user?.settings?.theme])

  useEffect(() => {
    const onThemeChange = event => {
      const theme = event.detail?.theme
      if (theme !== 'light' && theme !== 'dark') return

      setUser(current => current
        ? { ...current, settings: { ...(current.settings || {}), theme } }
        : current)
    }

    window.addEventListener('codepulse-theme-change', onThemeChange)
    return () => window.removeEventListener('codepulse-theme-change', onThemeChange)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function refreshSession() {
      try {
        const response = await fetch(apiUrl('/api/auth/refresh'), {
          method: 'POST',
          credentials: 'include',
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.message || 'No active session.')
        }

        if (!cancelled) {
          setUser(withLocalTheme(data.user))
          setAccessToken(data.accessToken)
        }
      } catch {
        if (!cancelled) {
          setUser(null)
          setAccessToken('')
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false)
        }
      }
    }

    refreshSession()

    return () => {
      cancelled = true
    }
  }, [])

  function handleAuthSuccess(data) {
    setUser(withLocalTheme(data.user))
    setAccessToken(data.accessToken)
    navigate('/dashboard', { replace: true })
  }

  async function handleLogout() {
    await fetch(apiUrl('/api/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {})
    setUser(null)
    setAccessToken('')
    navigate('/signin', { replace: true })
  }

  function handleUserUpdate(nextUser) {
    const theme = nextUser?.settings?.theme

    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      try {
        localStorage.setItem('codepulse-theme', theme)
      } catch {
        /* The user object still updates when browser storage is unavailable. */
      }
    }

    setUser(nextUser)
  }

  const authError = new URLSearchParams(location.search).get('error') || ''
  const authToken = new URLSearchParams(location.search).get('token') || ''

  return (
    <>
      <LegacyHashRedirect />
      <Routes>
        <Route path="/" element={<PublicRoute authLoading={authLoading} user={user} accessToken={accessToken}><MarketingPage /></PublicRoute>} />
        <Route
          path="/signin"
          element={<PublicRoute authLoading={authLoading} user={user} accessToken={accessToken}><AuthPage mode="signin" oauthError={authError} onAuthSuccess={handleAuthSuccess} /></PublicRoute>}
        />
        <Route
          path="/signup"
          element={<PublicRoute authLoading={authLoading} user={user} accessToken={accessToken}><AuthPage mode="signup" onAuthSuccess={handleAuthSuccess} /></PublicRoute>}
        />
        <Route path="/reset-password" element={<AuthPage mode="reset-password" token={authToken} onAuthSuccess={handleAuthSuccess} />} />
        <Route path="/verify-email" element={<AuthPage mode="verify-email" token={authToken} onAuthSuccess={handleAuthSuccess} />} />
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute authLoading={authLoading} user={user} accessToken={accessToken}>
              <Suspense fallback={<ProtectedScreenFallback />}>
                <Dashboard user={user} accessToken={accessToken} onLogout={handleLogout} />
              </Suspense>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/profile"
          element={(
            <ProtectedRoute authLoading={authLoading} user={user} accessToken={accessToken}>
              <Suspense fallback={<ProtectedScreenFallback />}>
                <AccountPage mode="profile" user={user} accessToken={accessToken} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
              </Suspense>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/settings"
          element={(
            <ProtectedRoute authLoading={authLoading} user={user} accessToken={accessToken}>
              <Suspense fallback={<ProtectedScreenFallback />}>
                <AccountPage mode="settings" user={user} accessToken={accessToken} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
              </Suspense>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/reports"
          element={(
            <ProtectedRoute authLoading={authLoading} user={user} accessToken={accessToken}>
              <Suspense fallback={<ProtectedScreenFallback />}>
                <ReportsPage user={user} accessToken={accessToken} onLogout={handleLogout} />
              </Suspense>
            </ProtectedRoute>
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
