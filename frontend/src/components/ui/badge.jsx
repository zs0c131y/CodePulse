import { cva } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const badgeVariants = cva('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'border-cyan-300/35 bg-cyan-300/12 text-cyan-100',
      secondary: 'border-white/10 bg-white/[0.06] text-slate-200',
      success: 'border-emerald-300/35 bg-emerald-300/12 text-emerald-100',
      warning: 'border-amber-300/35 bg-amber-300/12 text-amber-100',
      danger: 'border-rose-300/35 bg-rose-300/12 text-rose-100',
      outline: 'border-white/12 text-slate-300',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />
}

export { Badge }
