import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

function currentTheme() {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function ThemeToggle({ className = '', showLabel = false }) {
  const [theme, setTheme] = useState(currentTheme)
  const nextTheme = theme === 'light' ? 'dark' : 'light'

  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => setTheme(currentTheme()))

    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => observer.disconnect()
  }, [])

  function toggleTheme() {
    const next = currentTheme() === 'light' ? 'dark' : 'light'
    const root = document.documentElement

    root.dataset.theme = next
    setTheme(next)

    try {
      localStorage.setItem('codepulse-theme', next)
    } catch {
      /* The active page still changes when browser storage is unavailable. */
    }

    window.dispatchEvent(new CustomEvent('codepulse-theme-change', {
      detail: { theme: next },
    }))
  }

  const Icon = theme === 'light' ? Moon : Sun

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-[var(--r-sm)] border border-[var(--line-2)] bg-[var(--surface-1)] px-3 text-sm font-medium text-[var(--ink-2)] transition-colors hover:border-[var(--line-3)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-1)] ${className}`}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      <Icon size={17} aria-hidden="true" />
      {showLabel && <span className="hidden sm:inline">{theme === 'light' ? 'Dark' : 'Light'} mode</span>}
    </button>
  )
}

export { ThemeToggle }
