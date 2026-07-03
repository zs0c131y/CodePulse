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
import { Activity, LogOut, ShieldCheck } from 'lucide-react'

function getRoute() {
  if (typeof window === 'undefined') return { name: 'home', params: new URLSearchParams() }

  const hash = window.location.hash.replace('#', '') || 'home'
  const [name, query = ''] = hash.split('?')
  return { name, params: new URLSearchParams(query) }
}

function apiUrl(path) {
  return `${import.meta.env.VITE_API_BASE_URL || ''}${path}`
}

function Dashboard({ user, accessToken, onLogout }) {
  const [status, setStatus] = useState('Checking protected API access...')

  useEffect(() => {
    let cancelled = false

    async function loadProtectedUser() {
      try {
        const response = await fetch(apiUrl('/api/auth/me'), {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.message || 'Protected API check failed.')
        }

        if (!cancelled) {
          setStatus(`Protected API authorized for ${data.user.email}.`)
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : 'Protected API check failed.')
        }
      }
    }

    loadProtectedUser()

    return () => {
      cancelled = true
    }
  }, [accessToken])

  return (
    <div className="min-h-screen bg-[#030309] text-slate-100">
      <header className="border-b border-white/10 bg-[#030309]/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="#" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-violet-600 to-cyan-400 shadow-lg shadow-violet-600/20">
              <Activity size={17} strokeWidth={2.5} className="text-white" />
            </span>
            <span className="text-lg font-bold tracking-tight">
              Code<span className="gradient-text">Pulse</span>
            </span>
          </a>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:text-white"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="text-emerald-400" size={24} />
            <div>
              <h1 className="text-2xl font-bold">Protected workspace</h1>
              <p className="text-sm text-slate-400">{user.email}</p>
            </div>
          </div>
          <p className="text-sm text-slate-300">{status}</p>
        </section>
      </main>
    </div>
  )
}

export default function App() {
  const [route, setRoute] = useState(getRoute)
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState('')
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
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
    if (!authLoading && route.name === 'dashboard' && (!user || !accessToken)) {
      window.location.hash = 'signin'
    }
  }, [accessToken, authLoading, route.name, user])

  function handleAuthSuccess(data) {
    setUser(data.user)
    setAccessToken(data.accessToken)
    window.location.hash = 'dashboard'
  }

  async function handleLogout() {
    await fetch(apiUrl('/api/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {})
    setUser(null)
    setAccessToken('')
    window.location.hash = 'signin'
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

  if (route.name === 'dashboard') {
    if (authLoading) {
      return <div className="min-h-screen bg-[#030309] p-6 text-slate-100">Loading session...</div>
    }

    if (!user || !accessToken) {
      return null
    }

    return <Dashboard user={user} accessToken={accessToken} onLogout={handleLogout} />
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
