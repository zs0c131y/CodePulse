import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-cyan-400 text-slate-950 shadow-sm shadow-cyan-950/20 hover:bg-cyan-300',
        destructive: 'bg-rose-500 text-white hover:bg-rose-400',
        outline: 'border border-white/10 bg-white/[0.04] text-slate-200 hover:border-white/16 hover:bg-white/[0.07]',
        secondary: 'bg-white/[0.07] text-slate-100 hover:bg-white/[0.1]',
        ghost: 'text-slate-300 hover:bg-white/[0.07] hover:text-white',
        link: 'text-cyan-300 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-lg px-5',
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
