import { cn } from '../../lib/utils'

function Card({ className, ...props }) {
  return (
    <div
      className={cn('rounded-lg border border-white/10 bg-white/[0.045] shadow-[0_18px_70px_rgba(0,0,0,0.22)]', className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-1.5 p-5', className)} {...props} />
}

function CardTitle({ className, ...props }) {
  return <h2 className={cn('text-base font-bold text-slate-50', className)} {...props} />
}

function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm leading-6 text-slate-400', className)} {...props} />
}

function CardContent({ className, ...props }) {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent }
