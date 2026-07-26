import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * Keyboard-first, grouped combobox for product entities such as repositories.
 * Native selects are deliberately avoided here: repository identity needs more
 * context than a single truncated line can provide.
 */
function Combobox({ value, onChange, options, placeholder = 'Select an option', disabled = false, className, ariaLabel }) {
  const listboxId = useId()
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return options.filter(option => !needle || `${option.label} ${option.description || ''} ${option.group || ''}`.toLowerCase().includes(needle))
  }, [options, query])
  const selected = options.find(option => option.value === value)

  useEffect(() => {
    if (!open) return undefined
    inputRef.current?.focus()
    const onPointerDown = event => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    // Open on the current repository rather than making the first option look
    // hovered. A selection and a keyboard focus are intentionally distinct.
    const selectedIndex = filtered.findIndex(option => option.value === value)
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
  }, [filtered, open, value])

  function choose(option) {
    onChange?.(option.value, option)
    setOpen(false)
    setQuery('')
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) setOpen(true)
      else setActiveIndex(index => Math.min(index + 1, Math.max(filtered.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(index => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && open && filtered[activeIndex]) {
      event.preventDefault()
      choose(filtered[activeIndex])
    } else if (event.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  let currentGroup = ''
  return (
    <div ref={containerRef} className={cn('relative', className)} onKeyDown={onKeyDown}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel || placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen(current => !current)}
        className="flex h-10 w-full items-center gap-3 rounded-[var(--r-md)] border border-[var(--line-2)] bg-[var(--surface-1)] px-3 text-left text-sm transition-colors duration-[var(--d-2)] hover:border-[var(--line-3)] focus-visible:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Search size={16} className="shrink-0 text-[var(--ink-3)]" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-medium text-[var(--ink-1)]">{selected?.label || placeholder}</span>
        {selected?.meta && <span className="shrink-0 text-xs text-[var(--ink-3)]">{selected.meta}</span>}
        <ChevronDown size={16} className={cn('shrink-0 text-[var(--ink-3)] transition-transform duration-180', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full min-w-[19rem] overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-2)] bg-[var(--surface-1)] p-1.5 shadow-[var(--shadow-e3)]">
          <div className="flex items-center gap-2 border-b border-[var(--line-1)] px-2 pb-2">
            <Search size={15} className="text-[var(--ink-3)]" aria-hidden="true" />
            <input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search repositories…" className="h-8 min-w-0 flex-1 bg-transparent text-sm text-[var(--ink-1)] outline-none placeholder:text-[var(--ink-4)]" />
            <kbd className="rounded-[var(--r-xs)] border border-[var(--line-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink-3)]">Esc</kbd>
          </div>
          <div id={listboxId} role="listbox" className="mt-1 max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 && <p className="px-2 py-6 text-center text-sm text-[var(--ink-3)]">No repositories found.</p>}
            {filtered.map((option, index) => {
              const groupLabel = option.group && option.group !== currentGroup ? option.group : ''
              currentGroup = option.group || currentGroup
              const isSelected = option.value === value
              return (
                <div key={option.value}>
                  {groupLabel && <p className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-4)]">{groupLabel}</p>}
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(option)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-[var(--r-sm)] px-2.5 py-2.5 text-left transition-colors duration-150',
                      isSelected
                        ? 'bg-[var(--surface-2)] ring-1 ring-inset ring-[var(--accent-line)]'
                        : activeIndex === index
                          ? 'bg-[var(--surface-wash)]'
                          : 'hover:bg-[var(--surface-wash)]',
                    )}
                  >
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', option.tone || 'bg-[var(--accent)]')} aria-hidden="true" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-[var(--ink-1)]">{option.label}</span>{option.description && <span className="block truncate text-xs text-[var(--ink-3)]">{option.description}</span>}</span>
                    {option.meta && <span className="shrink-0 text-xs text-[var(--ink-3)]">{option.meta}</span>}
                    {isSelected && <Check size={16} className="shrink-0 text-[var(--accent-ink)]" aria-hidden="true" />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export { Combobox }
