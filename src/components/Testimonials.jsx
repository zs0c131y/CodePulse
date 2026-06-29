import { Quote } from 'lucide-react'

const testimonials = [
  {
    quote:
      "CodePulse completely changed how we approach repository health. We caught three major documentation gaps before they caused on-call incidents. The ROI was visible within the first week.",
    name: 'Sarah Chen',
    role: 'Lead Engineer',
    company: 'TechFlow',
    avatar: 'SC',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    quote:
      "The knowledge drift detection alone saved us weeks of debugging. We shipped a refactor confident that our docs matched reality — for the first time in years. I can't imagine going back.",
    name: 'Marcus Rodriguez',
    role: 'CTO',
    company: 'DevStack',
    avatar: 'MR',
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    quote:
      "Onboarding used to take three months. With CodePulse's intelligence reports and auto-generated architecture guides, our last two hires were shipping meaningful features in their second week.",
    name: 'Emily Watson',
    role: 'Engineering Manager',
    company: 'CloudFirst',
    avatar: 'EW',
    gradient: 'from-emerald-500 to-teal-600',
  },
]

const stars = Array(5).fill('★')

export default function Testimonials() {
  return (
    <section className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-violet-900/8 rounded-full blur-[150px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 space-y-16">
        {/* Heading */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm font-medium">
            Testimonials
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
            Engineering teams love CodePulse
          </h2>
          <p className="text-lg text-slate-400">
            Don't take our word for it. Hear from the engineers on the front lines.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map(({ quote, name, role, company, avatar, gradient }) => (
            <div
              key={name}
              className="glass rounded-2xl p-6 space-y-5 hover:border-white/12 transition-all duration-300 flex flex-col"
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {stars.map((s, i) => (
                  <span key={i} className="text-amber-400 text-sm">{s}</span>
                ))}
              </div>

              {/* Quote */}
              <div className="relative flex-1">
                <Quote size={20} className="text-slate-700 mb-3" />
                <p className="text-slate-300 text-sm leading-relaxed">{quote}</p>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-xs font-bold">{avatar}</span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-tight">{name}</p>
                  <p className="text-slate-500 text-xs">{role} · {company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
