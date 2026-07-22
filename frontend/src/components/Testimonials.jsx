import { Quote, Star } from 'lucide-react'
import Reveal from './Reveal'

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

export default function Testimonials() {
  return (
    <section className="cp-section relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="aurora-blob left-1/2 top-1/2 h-[26rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 bg-violet-900/[0.09] animate-aurora" />
      </div>

      <div className="cp-container relative space-y-16">
        {/* Heading */}
        <Reveal className="mx-auto max-w-2xl space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3.5 py-1.5 text-sm font-medium text-emerald-300">
            Testimonials
          </div>
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            Engineering teams love CodePulse
          </h2>
          <p className="text-lg text-mist-400">
            Don't take our word for it. Hear from the engineers on the front lines.
          </p>
        </Reveal>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 2xl:gap-8">
          {testimonials.map(({ quote, name, role, company, avatar, gradient }, index) => (
            <Reveal key={name} delay={index * 120} className="h-full">
              <div className="glass-panel card-hover flex h-full flex-col space-y-5 rounded-2xl p-6">
                {/* Stars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className="fill-amber-300 text-amber-300" />
                  ))}
                </div>

                {/* Quote */}
                <div className="relative flex-1">
                  <Quote size={20} className="mb-3 text-mist-600" />
                  <p className="text-sm leading-relaxed text-mist-300">{quote}</p>
                </div>

                {/* Author */}
                <div className="flex items-center gap-3 border-t border-white/[0.07] pt-4">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient}`}>
                    <span className="text-xs font-bold text-white">{avatar}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight text-white">{name}</p>
                    <p className="text-xs text-mist-500">{role} · {company}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
