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

function getRoute() {
  if (typeof window === 'undefined') return 'home'
  return window.location.hash.replace('#', '') || 'home'
}

export default function App() {
  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (route === 'signin' || route === 'signup') {
    return <AuthPage mode={route} />
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
