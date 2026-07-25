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
    gradient: ' ',
  },
  {
    quote:
      "The knowledge drift detection alone saved us weeks of debugging. We shipped a refactor confident that our docs matched reality — for the first time in years. I can't imagine going back.",
    name: 'Marcus Rodriguez',
    role: 'CTO',
    company: 'DevStack',
    avatar: 'MR',
    gradient: ' ',
  },
  {
    quote:
      "Onboarding used to take three months. With CodePulse's intelligence reports and auto-generated architecture guides, our last two hires were shipping meaningful features in their second week.",
    name: 'Emily Watson',
    role: 'Engineering Manager',
    company: 'CloudFirst',
    avatar: 'EW',
    gradient: ' ',
  },
]

export default function Testimonials() {
  return (
    <section className="cp-section relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="left-1/2 top-1/2 h-[26rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 bg-[var(--accent)]/[0.09]" />
      </div>

      <div className="cp-marketing relative space-y-16">
        {/* Heading */}
        <Reveal className="mx-auto max-w-2xl space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] px-3.5 py-1.5 text-sm font-medium text-[var(--sev-nominal-ink)]">
            Testimonials
          </div>
          <h2 className="text-[var(--text-title-1)] font-semibold text-[var(--ink-1)]">
            Engineering teams love CodePulse
          </h2>
          <p className="text-[var(--text-body-lg)] text-[var(--ink-3)]">
            Don't take our word for it. Hear from the engineers on the front lines.
          </p>
        </Reveal>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 2xl:gap-8">
          {testimonials.map(({ quote, name, role, company, avatar, gradient }, index) => (
            <Reveal key={name} delay={index * 120} className="h-full">
              <div className="glass-panel flex h-full flex-col space-y-6 p-8 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-e3)]">
                {/* Stars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} className="fill-[var(--sev-medium)] text-[var(--sev-medium-ink)]" />
                  ))}
                </div>

                {/* Quote */}
                <div className="relative flex-1">
                  <Quote size={24} className="mb-4 text-[var(--ink-4)] opacity-50" />
                  <p className="text-[0.9375rem] leading-relaxed text-[var(--ink-2)] font-medium">{quote}</p>
                </div>

                {/* Author */}
                <div className="flex items-center gap-3 border-t border-[var(--line-1)] pt-4">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full  ${gradient}`}>
                    <span className="text-xs font-bold text-[var(--ink-1)]">{avatar}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight text-[var(--ink-1)]">{name}</p>
                    <p className="text-xs text-[var(--ink-3)]">{role} · {company}</p>
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
