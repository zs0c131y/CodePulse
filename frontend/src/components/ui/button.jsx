import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-600/25 hover:shadow-xl hover:shadow-violet-600/35 hover:brightness-110 hover:-translate-y-px active:translate-y-0 active:brightness-95',
        destructive: 'bg-rose-500/90 text-white hover:bg-rose-400',
        outline:
          'border border-white/10 bg-white/[0.04] text-mist-300 backdrop-blur-sm hover:border-white/20 hover:bg-white/[0.08] hover:text-white',
        secondary: 'bg-white/[0.07] text-mist-100 hover:bg-white/[0.11]',
        ghost: 'text-mist-400 hover:bg-white/[0.07] hover:text-white',
        link: 'text-cyan-300 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-11 rounded-xl px-5',
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
