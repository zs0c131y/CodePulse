import { cn } from '../../lib/utils'

function Select({ className, ...props }) {
  return (
    <select
      className={cn(
        'flex h-11 w-full rounded-xl border border-white/10 bg-night-950/60 px-3 text-sm font-semibold text-mist-100 outline-none transition focus:border-cyan-300/50 focus:ring-4 focus:ring-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-60 [&>option]:bg-night-900',
        className,
      )}
      {...props}
    />
  )
}

export { Select }
