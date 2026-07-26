import { cn } from '../../lib/utils'

function Input({ className, invalid = false, ...props }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        'flex h-10 w-full rounded-[var(--r-md)] border bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--ink-1)] outline-none transition-colors duration-[var(--d-2)] placeholder:text-[var(--ink-4)] hover:border-[var(--line-3)] focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-wash)] disabled:cursor-not-allowed disabled:opacity-50',
        invalid ? 'border-[var(--sev-critical)]' : 'border-[var(--line-2)]',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
