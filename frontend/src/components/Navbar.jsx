import { useState, useEffect } from 'react'
import { Activity, Menu, X } from 'lucide-react'

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
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#030309]/85 backdrop-blur-2xl'
          : 'bg-transparent'
      }`}
    >
      <div className="cp-container h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-violet-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-600/20 group-hover:shadow-violet-600/40 transition-shadow">
            <Activity size={15} strokeWidth={2.5} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            Code<span className="gradient-text">Pulse</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <a
              key={l.label}
              href={l.href}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/4 transition-all duration-200"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="/signin"
            className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            Sign in
          </a>
          <a
            href="/signup"
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-linear-to-r from-violet-600 to-cyan-500 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-violet-600/20"
          >
            Get Early Access
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/4 transition-all"
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          open ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-[#030309]/95 backdrop-blur-2xl border-b border-white/6 px-4 py-4 flex flex-col gap-1 sm:px-6">
          {links.map(l => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/4 transition-all"
            >
              {l.label}
            </a>
          ))}
          <div className="h-px bg-white/6 my-2" />
          <a
            href="/signin"
            className="px-3 py-2.5 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/4 transition-all"
          >
            Sign in
          </a>
          <a
            href="/signup"
            className="px-3 py-2.5 text-sm font-semibold text-white rounded-lg bg-linear-to-r from-violet-600 to-cyan-500 text-center"
          >
            Get Early Access
          </a>
        </div>
      </div>
    </header>
  )
}
