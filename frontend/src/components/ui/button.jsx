import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'

import { cn } from '../../lib/utils'

/*
 * Primary actions use the shared signal-blue token and its tested foreground.
 * The foreground intentionally changes with the theme so normal button text
 * remains readable without a component-specific colour exception.
 */
const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-md)] text-[0.9375rem] font-medium transition-all duration-[var(--d-2)] ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--accent)] text-[var(--accent-on)] shadow-[var(--shadow-e1)] hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-e2)] hover:-translate-y-[1px] disabled:bg-[var(--surface-3)] disabled:text-[var(--ink-4)] disabled:opacity-100 disabled:shadow-none',
        destructive:
          'bg-[var(--sev-critical)] text-[var(--sev-critical-on)] shadow-[var(--shadow-e1)] hover:brightness-110 hover:shadow-[var(--shadow-e2)] hover:-translate-y-[1px]',
        outline:
          'border border-[var(--line-2)] bg-transparent text-[var(--ink-2)] hover:border-[var(--line-3)] hover:bg-[var(--surface-overlay)] hover:text-[var(--ink-1)]',
        secondary:
          'bg-[var(--surface-3)] text-[var(--ink-1)] hover:bg-[var(--surface-2)] shadow-[var(--shadow-e1)] hover:shadow-[var(--shadow-e2)] hover:-translate-y-[1px]',
        ghost:
          'text-[var(--ink-2)] hover:bg-[var(--surface-wash)] hover:text-[var(--ink-1)]',
        link: 'min-h-0 text-[var(--accent-ink)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 px-4 text-sm',
        lg: 'h-12 px-8 text-base',
        icon: 'h-11 w-11',
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
