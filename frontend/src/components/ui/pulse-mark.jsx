/** The shared CodePulse ECG mark, themed through product semantic tokens. */
export function PulseMark({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="CodePulse"
      className={className}
    >
      <rect width="32" height="32" rx="8" fill="var(--contrast)" />
      <path
        d="M5 17h5l2.5-7 4 13 3-9 2 3h5.5"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
