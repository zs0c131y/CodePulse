import { cn } from '../../lib/utils'

function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'flex h-11 w-full rounded-xl border border-white/10 bg-night-950/60 px-3 text-sm text-mist-100 outline-none transition placeholder:text-mist-600 focus:border-cyan-300/50 focus:bg-night-950/80 focus:ring-4 focus:ring-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
