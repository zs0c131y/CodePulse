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
        className={`mx-auto flex h-16 max-w-6xl items-center justify-between rounded-[var(--r-xl)] px-6 transition-all duration-500 sm:px-8 ${
          scrolled || open
            ? 'glass-panel'
            : 'border border-transparent bg-transparent'
        }`}
      >
        {/* Logo */}
        <a href="#" className="group flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)] shadow-[var(--shadow-e2)] shadow-[var(--shadow-e2)] transition-shadow duration-300 group-hover:shadow-[var(--shadow-e2)]">
            <Activity size={15} strokeWidth={2.5} className="text-[var(--ink-1)]" />
          </span>
          <span className="text-lg font-bold tracking-tight text-[var(--ink-1)]">
            Code<span className="text-[var(--accent-ink)]">Pulse</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map(l => (
            <a
              key={l.label}
              href={l.href}
              className="rounded-lg px-4 py-2 text-sm text-[var(--ink-3)] transition-all duration-200 hover:bg-[var(--surface-3)] hover:text-[var(--ink-1)]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="hidden items-center gap-2 md:flex">
          <a
            href="/signin"
            className="rounded-[var(--r-md)] px-5 py-2.5 text-[0.9375rem] font-medium text-[var(--ink-2)] transition-colors hover:text-[var(--ink-1)]"
          >
            Sign in
          </a>
          <a
            href="/signup"
            className="inline-flex items-center gap-2 rounded-[var(--r-md)] bg-[var(--ink-1)] px-5 py-2.5 text-[0.9375rem] font-medium text-[var(--surface-canvas)] shadow-[var(--shadow-e2)] transition-all duration-300 hover:-translate-y-[1px] hover:shadow-[var(--shadow-e3)] hover:brightness-110"
          >
            Get Early Access
            <ArrowRight size={16} />
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          className="rounded-lg p-2 text-[var(--ink-3)] transition-all hover:bg-[var(--surface-3)] hover:text-[var(--ink-1)] md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`mx-auto mt-2 max-w-6xl overflow-hidden rounded-[var(--r-md)] transition-all duration-300 md:hidden ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="glass-panel flex flex-col gap-1 p-4 mt-2">
          {links.map(l => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm text-[var(--ink-3)] transition-all hover:bg-[var(--surface-3)] hover:text-[var(--ink-1)]"
            >
              {l.label}
            </a>
          ))}
          <div className="my-2 h-px bg-[var(--surface-2)]" />
          <a
            href="/signin"
            className="rounded-lg px-3 py-2.5 text-sm text-[var(--ink-3)] transition-all hover:bg-[var(--surface-3)] hover:text-[var(--ink-1)]"
          >
            Sign in
          </a>
          <a
            href="/signup"
            className="rounded-[var(--r-sm)] bg-[var(--surface-2)] px-3 py-2.5 text-center text-sm font-semibold text-[var(--ink-1)]"
          >
            Get Early Access
          </a>
        </div>
      </div>
    </header>
  )
}
