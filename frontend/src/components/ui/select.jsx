import { cn } from '../../lib/utils'

function Select({ className, ...props }) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-[var(--r-md)] border border-[var(--line-2)] bg-[var(--surface-1)] px-3 py-2 text-sm font-medium text-[var(--ink-1)] outline-none transition-colors duration-[var(--d-2)] hover:border-[var(--line-3)] focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-wash)] disabled:cursor-not-allowed disabled:opacity-50 [&>optgroup]:bg-[var(--surface-1)] [&>option]:bg-[var(--surface-1)]',
        className,
      )}
      {...props}
    />
  )
}

export { Select }
