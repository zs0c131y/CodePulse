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
    <section className="py-20 relative overflow-hidden">
      {/* Background gradient strip */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-violet-950/20 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="cp-container relative">
        <div className="grid grid-cols-1 gap-8 min-[420px]:grid-cols-2 lg:grid-cols-4 2xl:gap-10">
          {stats.map(({ value, label, sub }) => (
            <div key={label} className="text-center space-y-2 group">
              <div className="gradient-text text-4xl font-bold leading-none sm:text-5xl lg:text-6xl">
                {value}
              </div>
              <div className="text-white font-semibold text-base">{label}</div>
              <div className="text-slate-500 text-sm">{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
