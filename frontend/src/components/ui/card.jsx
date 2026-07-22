import { cn } from '../../lib/utils'

function Card({ className, interactive = false, ...props }) {
  return (
    <div
      className={cn(
        'panel',
        interactive && 'panel-interactive',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-2 p-6', className)} {...props} />
}

function CardTitle({ className, ...props }) {
  return <h2 className={cn('text-lg font-medium text-[var(--ink-1)] tracking-tight', className)} {...props} />
}

function CardDescription({ className, ...props }) {
  return <p className={cn('text-[0.9375rem] leading-relaxed text-[var(--ink-3)]', className)} {...props} />
}

function CardContent({ className, ...props }) {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent }
