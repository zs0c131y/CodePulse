import { cn } from '../../lib/utils'

function Input({ className, invalid = false, ...props }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        'flex h-11 w-full rounded-[var(--r-md)] border bg-[var(--surface-canvas)] px-4 py-2 text-[0.9375rem] text-[var(--ink-1)] outline-none transition-all duration-[var(--d-2)] placeholder:text-[var(--ink-4)] focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-wash)] disabled:cursor-not-allowed disabled:opacity-50 hover:border-[var(--line-3)] shadow-sm',
        invalid ? 'border-[var(--sev-critical)]' : 'border-[var(--line-2)]',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
