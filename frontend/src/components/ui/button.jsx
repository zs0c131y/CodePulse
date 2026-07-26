import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'

import { cn } from '../../lib/utils'

/*
 * The primary action is an inverted surface (ink on canvas), not a coloured
 * one — colour is reserved for interactive state and severity. Spec:
 * docs/design.md §3.2
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-md)] text-sm font-medium transition-colors duration-[var(--d-2)] ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--contrast)] text-[var(--contrast-on)] hover:bg-[var(--contrast-hover)]',
        destructive:
          'bg-[var(--sev-critical)] text-[var(--sev-critical-on)] hover:brightness-110',
        outline:
          'border border-[var(--line-2)] bg-[var(--surface-1)] text-[var(--ink-1)] hover:border-[var(--line-3)] hover:bg-[var(--surface-2)]',
        secondary:
          'border border-[var(--line-1)] bg-[var(--surface-2)] text-[var(--ink-1)] hover:bg-[var(--surface-3)]',
        ghost:
          'text-[var(--ink-2)] hover:bg-[var(--surface-wash)] hover:text-[var(--ink-1)]',
        link: 'h-auto min-h-0 rounded-none px-0 text-[var(--accent-ink)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-8 px-3 text-[0.8125rem] [&_svg]:size-3.5',
        lg: 'h-11 px-5 text-[0.9375rem]',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : 'button'

  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button }
