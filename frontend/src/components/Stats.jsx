import Reveal from './Reveal'

const stats = [
  {
    value: '10,000+',
    label: 'Repositories Analyzed',
    sub: 'across all major languages',
  },
  {
    value: '98.2%',
    label: 'Detection Accuracy',
    sub: 'for knowledge drift signals',
  },
  {
    value: '3.4×',
    label: 'Faster Onboarding',
    sub: 'for new engineering hires',
  },
  {
    value: '45%',
    label: 'Maintenance Cost Reduction',
    sub: 'in the first 6 months',
  },
]

export default function Stats() {
  return (
    <section className="relative overflow-hidden py-20">
      {/* Background gradient strip */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[var(--line-2)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-[var(--line-2)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-[var(--line-2)]" />
      </div>

      <div className="cp-marketing relative">
        <div className="grid grid-cols-1 gap-10 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ value, label, sub }, index) => (
            <Reveal key={label} delay={index * 100} className="space-y-2 text-center">
              <div className="text-[var(--accent-ink)] text-[var(--text-metric-xl)] font-bold leading-none">
                {value}
              </div>
              <div className="text-[var(--text-title-3)] font-semibold text-[var(--ink-1)]">{label}</div>
              <div className="text-[0.9375rem] text-[var(--ink-3)]">{sub}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
