import { FileX2, Layers, Clock } from 'lucide-react'

const problems = [
  {
    Icon: FileX2,
    color: 'text-rose-400',
    bg: 'bg-rose-400/10 border-rose-400/20',
    title: 'Documentation Rots Silently',
    body:
      'As code evolves, docs fall behind. New engineers make decisions based on outdated assumptions, causing bugs and wasted effort that could have been avoided.',
  },
  {
    Icon: Layers,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10 border-orange-400/20',
    title: 'Technical Debt Is Invisible',
    body:
      'Complexity accumulates invisibly. Teams have no way to measure debt, prioritize refactors, or justify maintenance work — until something breaks in production.',
  },
  {
    Icon: Clock,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10 border-yellow-400/20',
    title: 'Onboarding Takes Months',
    body:
      'Without institutional knowledge encoded anywhere accessible, new engineers spend months reverse-engineering systems instead of shipping features.',
  },
]

export default function Problems() {
  return (
    <section className="py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-100 bg-rose-900/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 space-y-16">
        {/* Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm font-medium">
            The Problem
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
            Software repositories get sick.
            <br />
            <span className="text-slate-500">Most teams don't know until it's too late.</span>
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed">
            Existing tools catch bugs and scan for vulnerabilities, but none of them give you a holistic view of your repository's long-term health. CodePulse does.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.map(({ Icon, color, bg, title, body }) => (
            <div
              key={title}
              className="glass rounded-2xl p-6 space-y-4 hover:border-white/15 transition-all duration-300 group"
            >
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${bg}`}>
                <Icon size={20} className={color} />
              </div>
              <h3 className="text-white font-semibold text-lg leading-snug">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Divider quote */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-2xl font-medium text-slate-300 leading-relaxed italic">
            "CodePulse is to software repositories what a health-monitoring system is to the human body — it continuously analyzes, diagnoses, and recommends actions."
          </p>
        </div>
      </div>
    </section>
  )
}
