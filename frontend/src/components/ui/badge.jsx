import { cva } from 'class-variance-authority'

import { cn } from '../../lib/utils'

/*
 * Severity variants exist here for convenience, but a severity in the product
 * UI should use <SeverityBadge>, which pairs the colour with a required icon
 * and label. Colour must never carry severity alone. Spec: docs/design.md §3.1
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.75rem] font-medium tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default: 'border-[var(--accent-line)] bg-[var(--accent-wash)] text-[var(--accent-ink)]',
        secondary: 'border-[var(--line-2)] bg-[var(--surface-3)] text-[var(--ink-2)]',
        success: 'border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] text-[var(--sev-nominal-ink)]',
        warning: 'border-[var(--sev-medium-line)] bg-[var(--sev-medium-wash)] text-[var(--sev-medium-ink)]',
        danger: 'border-[var(--sev-critical-line)] bg-[var(--sev-critical-wash)] text-[var(--sev-critical-ink)]',
        outline: 'border-[var(--line-2)] text-[var(--ink-2)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />
}

export { Badge }
