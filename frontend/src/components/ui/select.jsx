import { Fragment, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useFloatingMenu } from './floating-menu'

function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  disabled = false,
  className,
  ariaLabel,
}) {
  const listboxId = useId()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const selected = options.find(option => option.value === value)
  const { triggerRef, menuRef, floatingStyle } = useFloatingMenu(open)

  useEffect(() => {
    if (!open) return undefined

    const selectedIndex = options.findIndex(option => option.value === value)
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)

    function onPointerDown(event) {
      if (
        !triggerRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuRef, open, options, triggerRef, value])

  function choose(option) {
    onChange?.(option.value)
    setOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }))
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setActiveIndex(index => event.key === 'ArrowDown'
        ? Math.min(index + 1, options.length - 1)
        : Math.max(index - 1, 0))
    } else if (event.key === 'Home' && open) {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End' && open) {
      event.preventDefault()
      setActiveIndex(Math.max(options.length - 1, 0))
    } else if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault()
      if (options[activeIndex]) choose(options[activeIndex])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }))
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-label={ariaLabel || placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && options[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined}
        onClick={() => setOpen(current => !current)}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-10 w-full items-center gap-3 rounded-[var(--r-md)] border border-[var(--line-2)] bg-[var(--surface-1)] px-3 text-left text-sm font-medium text-[var(--ink-1)] outline-none transition-colors duration-[var(--d-2)] hover:border-[var(--line-3)] focus-visible:border-[var(--accent)] focus-visible:ring-[3px] focus-visible:ring-[var(--accent-wash)] disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? [selected.group, selected.label].filter(Boolean).join(' · ') : placeholder}
        </span>
        <ChevronDown
          size={15}
          className={cn(
            'shrink-0 text-[var(--ink-4)] transition-transform duration-[var(--d-2)]',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel || placeholder}
          style={floatingStyle}
          className="overflow-y-auto rounded-[var(--r-lg)] border border-[var(--line-2)] bg-[var(--surface-1)] p-1.5 shadow-[var(--shadow-e3)]"
          onKeyDown={handleKeyDown}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value
            const isActive = index === activeIndex
            const showGroup = option.group && option.group !== options[index - 1]?.group
            return (
              <Fragment key={option.value}>
                {showGroup && (
                  <div role="presentation" className="px-2.5 pb-1 pt-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--ink-3)] first:pt-1">
                    {option.group}
                  </div>
                )}
                <button
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(option)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-[var(--r-sm)] px-2.5 py-2 text-left text-sm transition-colors duration-[var(--d-1)]',
                    isActive ? 'bg-[var(--surface-wash)]' : 'hover:bg-[var(--surface-wash)]',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-[var(--ink-1)]">
                    {option.label}
                  </span>
                  {isSelected && <Check size={15} className="shrink-0 text-[var(--accent-ink)]" aria-hidden="true" />}
                </button>
              </Fragment>
            )
          })}
        </div>,
        document.body,
      )}
    </>
  )
}

export { Select }
