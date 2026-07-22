import { useState, useEffect } from 'react'
import { Activity, ArrowRight, Menu, X } from 'lucide-react'

const links = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Docs', href: '#' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div
        className={`mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl px-4 transition-all duration-500 sm:px-5 ${
          scrolled || open
            ? 'glass-panel'
            : 'border border-transparent bg-transparent'
        }`}
      >
        {/* Logo */}
        <a href="#" className="group flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-400 shadow-lg shadow-violet-600/25 transition-shadow duration-300 group-hover:shadow-violet-600/50">
            <Activity size={15} strokeWidth={2.5} className="text-white" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-white">
            Code<span className="text-gradient">Pulse</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map(l => (
            <a
              key={l.label}
              href={l.href}
              className="rounded-lg px-4 py-2 text-sm text-mist-400 transition-all duration-200 hover:bg-white/[0.06] hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="hidden items-center gap-2 md:flex">
          <a
            href="/signin"
            className="rounded-lg px-4 py-2 text-sm font-medium text-mist-300 transition-colors hover:text-white"
          >
            Sign in
          </a>
          <a
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all duration-300 hover:-translate-y-px hover:shadow-violet-600/45 hover:brightness-110"
          >
            Get Early Access
            <ArrowRight size={14} />
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          className="rounded-lg p-2 text-mist-400 transition-all hover:bg-white/[0.06] hover:text-white md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`mx-auto mt-2 max-w-6xl overflow-hidden rounded-2xl transition-all duration-300 md:hidden ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="glass-strong flex flex-col gap-1 rounded-2xl p-4">
          {links.map(l => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm text-mist-400 transition-all hover:bg-white/[0.06] hover:text-white"
            >
              {l.label}
            </a>
          ))}
          <div className="my-2 h-px bg-white/[0.08]" />
          <a
            href="/signin"
            className="rounded-lg px-3 py-2.5 text-sm text-mist-400 transition-all hover:bg-white/[0.06] hover:text-white"
          >
            Sign in
          </a>
          <a
            href="/signup"
            className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-3 py-2.5 text-center text-sm font-semibold text-white"
          >
            Get Early Access
          </a>
        </div>
      </div>
    </header>
  )
}
