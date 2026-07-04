import { cn } from '../../lib/utils'

function Select({ className, ...props }) {
  return (
    <select
      className={cn(
        'flex h-11 w-full rounded-lg border border-white/10 bg-slate-950/45 px-3 text-sm font-semibold text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}

export { Select }
