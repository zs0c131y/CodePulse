import { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import LogoBar from './components/LogoBar'
import Problems from './components/Problems'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import Stats from './components/Stats'
import Testimonials from './components/Testimonials'
import FinalCTA from './components/FinalCTA'
import Footer from './components/Footer'
import AuthPage from './components/AuthPage'
import Dashboard from './components/Dashboard'
import AccountPage from './components/AccountPage'

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
      return <div className="min-h-screen bg-[#030309] p-6 text-slate-100">Loading session...</div>
    }

    if (!user || !accessToken) {
      return null
    }

    if (route.name === 'dashboard') {
      return <Dashboard user={user} accessToken={accessToken} onLogout={handleLogout} />
    }

    return (
      <AccountPage
        mode={route.name}
        user={user}
        accessToken={accessToken}
        onLogout={handleLogout}
        onUserUpdate={setUser}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#030309] text-slate-100">
      <Navbar />
      <main>
        <Hero />
        <LogoBar />
        <Problems />
        <Features />
        <HowItWorks />
        <Stats />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
