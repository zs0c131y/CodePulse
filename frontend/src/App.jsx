import { lazy, Suspense, useEffect, useState } from 'react'
import AuthPage from './components/AuthPage'
import MarketingPage from './components/MarketingPage'

// Authenticated screens pull in the dashboard chart stack (recharts), so they
// are code-split and only downloaded after sign-in.
const Dashboard = lazy(() => import('./components/Dashboard'))
const AccountPage = lazy(() => import('./components/AccountPage'))

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

const appRoutes = new Set([
  'signin',
  'signup',
  'reset-password',
  'verify-email',
  'dashboard',
  'profile',
  'settings',
])

function getRoute() {
  if (typeof window === 'undefined') return { name: 'home', params: new URLSearchParams() }

  const pathName = window.location.pathname.replace(/^\/+|\/+$/g, '')

  if (appRoutes.has(pathName)) {
    return { name: pathName, params: new URLSearchParams(window.location.search) }
  }

  const hash = window.location.hash.replace('#', '')
  const [hashName, hashQuery = ''] = hash.split('?')

  if (appRoutes.has(hashName)) {
    return { name: hashName, params: new URLSearchParams(hashQuery) }
  }

  return { name: 'home', params: new URLSearchParams(window.location.search) }
}

function apiUrl(path) {
  return `${import.meta.env.VITE_API_BASE_URL || ''}${path}`
}

function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function App() {
  const [route, setRoute] = useState(getRoute)
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const isProtectedRoute = ['dashboard', 'profile', 'settings'].includes(route.name)

  useEffect(() => {
    const onRouteChange = () => setRoute(getRoute())

    window.addEventListener('popstate', onRouteChange)
    window.addEventListener('hashchange', onRouteChange)

    if (appRoutes.has(window.location.hash.replace('#', '').split('?')[0])) {
      const legacyRoute = getRoute()
      const query = legacyRoute.params.toString()
      window.history.replaceState({}, '', `/${legacyRoute.name}${query ? `?${query}` : ''}`)
      setRoute(getRoute())
    }

    return () => {
      window.removeEventListener('popstate', onRouteChange)
      window.removeEventListener('hashchange', onRouteChange)
    }
  }, [])

  useEffect(() => {
    const theme = user?.settings?.theme || localStorage.getItem('codepulse-theme') || 'system'
    const density = user?.settings?.density || 'comfortable'
    const root = document.documentElement

    const resolvedTheme = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : theme
    root.dataset.theme = resolvedTheme
    root.dataset.density = density

    // Persisted so the pre-paint script in index.html can stamp both before
    // first paint on the next load.
    try {
      localStorage.setItem('codepulse-theme', theme)
      localStorage.setItem('codepulse-density', density)
    } catch {
      /* Storage blocked; the in-memory stamp above still applies. */
    }
  }, [user?.settings?.density, user?.settings?.theme])

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
          setUser(data.user)
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

  useEffect(() => {
    if (!authLoading && isProtectedRoute && (!user || !accessToken)) {
      navigate('/signin')
    }
  }, [accessToken, authLoading, isProtectedRoute, user])

  useEffect(() => {
    if (!authLoading && user && accessToken && ['home', 'signin', 'signup'].includes(route.name)) {
      navigate('/dashboard')
    }
  }, [accessToken, authLoading, route.name, user])

  function handleAuthSuccess(data) {
    setUser(data.user)
    setAccessToken(data.accessToken)
    navigate('/dashboard')
  }

  async function handleLogout() {
    await fetch(apiUrl('/api/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {})
    setUser(null)
    setAccessToken('')
    navigate('/signin')
  }

  if (route.name === 'signin' || route.name === 'signup') {
    return (
      <AuthPage
        mode={route.name}
        oauthError={route.params.get('error') || ''}
        onAuthSuccess={handleAuthSuccess}
      />
    )
  }

  if (route.name === 'reset-password' || route.name === 'verify-email') {
    return (
      <AuthPage
        mode={route.name}
        token={route.params.get('token') || ''}
        onAuthSuccess={handleAuthSuccess}
      />
    )
  }

  if (isProtectedRoute) {
    if (authLoading) {
      return <LoadingScreen label="Loading session…" />
    }

    if (!user || !accessToken) {
      return null
    }

    if (route.name === 'dashboard') {
      return (
        <Suspense fallback={<ProtectedScreenFallback />}>
          <Dashboard user={user} accessToken={accessToken} onLogout={handleLogout} />
        </Suspense>
      )
    }

    return (
      <Suspense fallback={<ProtectedScreenFallback />}>
        <AccountPage
          mode={route.name}
          user={user}
          accessToken={accessToken}
          onLogout={handleLogout}
          onUserUpdate={setUser}
        />
      </Suspense>
    )
  }

  return <MarketingPage />
}
