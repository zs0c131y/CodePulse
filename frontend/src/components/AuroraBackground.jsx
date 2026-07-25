/**
 * Ambient page background.
 *
 * The drifting blur blobs are gone. Ambient motion that answers none of
 * "where did this come from / how much changed / is work happening" is noise,
 * and on a dashboard people keep open all day it is fatigue. What remains is
 * one static radial wash plus an optional hairline grid — depth without the
 * per-frame cost of animating blurred layers.
 *
 * Spec: docs/design.md §1.2
 */
const VARIANTS = {
  hero: 'radial-gradient(60rem 40rem at 18% 8%, var(--accent-wash), transparent 62%)',
  page: 'radial-gradient(48rem 32rem at 100% 0%, var(--accent-wash), transparent 58%)',
  subtle: 'radial-gradient(36rem 24rem at 50% -10%, var(--accent-wash), transparent 60%)',
}

export default function AuroraBackground({ variant = 'page', grid = true, className = '' }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {grid && <div className="grid-bg absolute inset-0 opacity-60" />}
      <div className="absolute inset-0" style={{ background: VARIANTS[variant] || VARIANTS.page }} />
    </div>
  )
}
