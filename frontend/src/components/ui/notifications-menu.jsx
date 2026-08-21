import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, BellOff, Settings } from 'lucide-react'
import { Link } from '../../lib/router'
import { useFloatingMenu } from './floating-menu'

/**
 * The bell opens a panel in place rather than navigating away — CodePulse
 * does not yet have a live notification feed, so the panel says so plainly
 * and offers the settings link as a deliberate next step, not a redirect.
 */
export function NotificationsMenu() {
  const containerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const { triggerRef, menuRef, floatingStyle } = useFloatingMenu(open, 280)

  useEffect(() => {
    if (!open) return undefined

    function onPointerDown(event) {
      if (
        !containerRef.current?.contains(event.target)
        && !menuRef.current?.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuRef, open])

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] text-[var(--ink-2)] transition-colors duration-[var(--d-2)] hover:bg-[var(--surface-wash)] hover:text-[var(--ink-1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <Bell size={15} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="dialog"
          aria-label="Notifications"
          style={floatingStyle}
          className="flex flex-col overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-2)] bg-[var(--surface-1)] shadow-[var(--shadow-e3)]"
        >
          <div className="border-b border-[var(--line-1)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--ink-1)]">Notifications</h2>
          </div>
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <BellOff size={20} className="text-[var(--ink-4)]" aria-hidden="true" />
            <p className="text-sm font-medium text-[var(--ink-2)]">You're all caught up</p>
            <p className="max-w-[26ch] text-xs leading-5 text-[var(--ink-3)]">
              CodePulse doesn't have any scan or drift alerts to show yet. This panel will list them here once they start firing.
            </p>
          </div>
          <Link
            to="/settings#notifications"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 border-t border-[var(--line-1)] px-4 py-3 text-sm text-[var(--ink-2)] transition-colors duration-[var(--d-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-1)]"
          >
            <Settings size={14} aria-hidden="true" /> Notification settings
          </Link>
        </div>,
        document.body,
      )}
    </span>
  )
}
