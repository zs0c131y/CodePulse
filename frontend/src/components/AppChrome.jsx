import { Link } from '../lib/router'
import { LogOut } from 'lucide-react'
import { Button } from './ui/button'
import { ThemeToggle } from './ui/theme-toggle'
import { PulseMark } from './ui/pulse-mark'

/*
 * The shared application chrome: one quiet top bar for every authenticated
 * screen. Brand and workspace navigation on the left, screen-specific
 * actions (endContent) plus theme, identity, and sign-out on the right.
 */

const navItems = [
  { label: 'Dashboard', href: '/dashboard', key: 'dashboard' },
  { label: 'Profile', href: '/profile', key: 'profile' },
  { label: 'Settings', href: '/settings', key: 'settings' },
  { label: 'Reports', href: '/reports', key: 'reports' },
]

function initials(name, email) {
  return String(name || email || 'CP')
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')
}

export function AppTopBar({ user, onLogout, active, endContent = null }) {
  return (
    <header className="scrim sticky top-0 z-40 border-b border-[var(--line-1)]">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6 2xl:px-8">
        <div className="flex min-w-0 items-center gap-7">
          <Link to="/dashboard" className="flex shrink-0 items-center gap-2.5" aria-label="CodePulse dashboard">
            <PulseMark size={24} />
            <span className="text-[0.9375rem] font-semibold tracking-[-0.02em] text-[var(--ink-1)]">CodePulse</span>
          </Link>
          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Workspace">
            {navItems.map(item => (
              <Link
                key={item.key}
                to={item.href}
                aria-current={active === item.key ? 'page' : undefined}
                className={`rounded-[var(--r-md)] px-3 py-1.5 text-sm transition-colors duration-[var(--d-2)] ${
                  active === item.key
                    ? 'font-medium text-[var(--ink-1)]'
                    : 'text-[var(--ink-3)] hover:text-[var(--ink-1)]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {endContent}
          <ThemeToggle />
          <Link
            to="/profile"
            aria-label="Profile"
            title={user.name || user.email}
            className="ml-1 grid h-8 w-8 place-items-center rounded-full border border-[var(--line-2)] bg-[var(--surface-2)] text-xs font-semibold text-[var(--ink-1)] transition-colors duration-[var(--d-2)] hover:border-[var(--line-3)]"
          >
            {initials(user.name, user.email)}
          </Link>
          <Button
            type="button"
            onClick={onLogout}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={15} />
          </Button>
        </div>
      </div>
    </header>
  )
}
