/**
 * Ambient "Midnight Aurora" background: slow-drifting color blobs over a
 * faint grid. Rendered absolute inside a relative/overflow-hidden parent.
 */
const VARIANTS = {
  hero: [
    { className: 'left-[8%] top-[12%] h-[26rem] w-[26rem] bg-violet-600/14', animate: 'animate-aurora' },
    { className: 'right-[6%] top-[30%] h-[22rem] w-[22rem] bg-cyan-500/12', animate: 'animate-aurora-slow' },
    { className: 'bottom-[8%] left-[38%] h-[20rem] w-[20rem] bg-emerald-500/8', animate: 'animate-aurora' },
  ],
  page: [
    { className: 'left-[-6rem] top-[8%] h-[22rem] w-[22rem] bg-violet-600/10', animate: 'animate-aurora-slow' },
    { className: 'right-[-4rem] top-[42%] h-[20rem] w-[20rem] bg-cyan-500/8', animate: 'animate-aurora' },
  ],
  subtle: [
    { className: 'right-[10%] top-[-6rem] h-[18rem] w-[18rem] bg-violet-600/10', animate: 'animate-aurora' },
  ],
}

export default function AuroraBackground({ variant = 'page', grid = true, className = '' }) {
  const blobs = VARIANTS[variant] || VARIANTS.page

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {grid && <div className="absolute inset-0 grid-bg opacity-70" />}
      {blobs.map((blob, index) => (
        <div key={index} className={`aurora-blob ${blob.className} ${blob.animate}`} />
      ))}
    </div>
  )
}
