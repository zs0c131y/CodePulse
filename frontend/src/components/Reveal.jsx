import { useReveal } from '../lib/useReveal'

/**
 * Scroll-reveal wrapper. Fades/slides content in (with a slight blur lift)
 * the first time it enters the viewport. Use `delay` (ms) for staggered grids.
 */
export default function Reveal({ children, className = '', delay = 0, as: Tag = 'div', ...props }) {
  const [ref, visible] = useReveal()

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'reveal-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...props}
    >
      {children}
    </Tag>
  )
}
