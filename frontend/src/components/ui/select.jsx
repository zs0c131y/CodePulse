import { cn } from '../../lib/utils'

function Select({ className, ...props }) {
  return (
    <select
      className={cn(
        'flex h-11 w-full rounded-[var(--r-md)] border border-[var(--line-2)] bg-[var(--surface-canvas)] px-4 py-2 text-[0.9375rem] font-medium text-[var(--ink-1)] outline-none transition-all duration-[var(--d-2)] focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-wash)] disabled:cursor-not-allowed disabled:opacity-50 hover:border-[var(--line-3)] shadow-sm [&>optgroup]:bg-[var(--surface-1)] [&>option]:bg-[var(--surface-1)]',
        className,
      )}
      {...props}
    />
  )
}

export { Select }
