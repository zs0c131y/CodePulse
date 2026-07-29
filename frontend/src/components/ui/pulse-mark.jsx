/**
 * The CodePulse mark: an ECG trace inside a chip. One SVG, two skins —
 * `product` (theme ink + blue trace) for the app, `journal` (ink + orange
 * trace) for the marketing broadsheet.
 */
export function PulseMark({ size = 28, variant = 'product', className = '' }) {
  const isJournal = variant === 'journal'
  const box = isJournal ? 'var(--mk-ink)' : 'var(--contrast)'
  const trace = isJournal ? 'var(--mk-accent)' : 'var(--accent)'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="CodePulse"
      className={className}
    >
      <rect width="32" height="32" rx={isJournal ? 0 : 8} fill={box} />
      <path
        d="M5 17h5l2.5-7 4 13 3-9 2 3h5.5"
        fill="none"
        stroke={trace}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
