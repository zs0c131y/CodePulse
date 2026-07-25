import { FileX2, Layers, Clock } from 'lucide-react'
import Reveal from './Reveal'

const problems = [
  {
    Icon: FileX2,
    color: 'text-[var(--sev-critical-ink)]',
    bg: 'bg-[var(--sev-critical)]/[0.08] border-[var(--sev-critical-line)]',
    title: 'Documentation Rots Silently',
    body:
      'As code evolves, docs fall behind. New engineers make decisions based on outdated assumptions, causing bugs and wasted effort that could have been avoided.',
  },
  {
    Icon: Layers,
    color: 'text-[var(--sev-high-ink)]',
    bg: 'bg-[var(--sev-high)]/[0.08] border-[var(--sev-high-line)]',
    title: 'Technical Debt Is Invisible',
    body:
      'Complexity accumulates invisibly. Teams have no way to measure debt, prioritize refactors, or justify maintenance work — until something breaks in production.',
  },
  {
    Icon: Clock,
    color: 'text-[var(--sev-medium-ink)]',
    bg: 'bg-[var(--sev-medium)]/[0.08] border-[var(--sev-medium-line)]',
    title: 'Onboarding Takes Months',
    body:
      'Without institutional knowledge encoded anywhere accessible, new engineers spend months reverse-engineering systems instead of shipping features.',
  },
]

export default function Problems() {
  return (
    <section className="cp-section relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="left-1/2 top-1/2 h-[24rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 bg-[var(--sev-critical)]/[0.07]" />
      </div>

      <div className="cp-marketing relative space-y-16">
        {/* Heading */}
        <Reveal className="mx-auto max-w-3xl space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--sev-critical-line)] bg-[var(--sev-critical-wash)] px-3.5 py-1.5 text-sm font-medium text-[var(--sev-critical-ink)]">
            The Problem
          </div>
          <h2 className="text-[var(--text-title-1)] font-semibold text-[var(--ink-1)]">
            Software repositories get sick.
            <br />
            <span className="text-[var(--ink-3)]">Most teams don't know until it's too late.</span>
          </h2>
          <p className="text-[var(--text-body-lg)] text-[var(--ink-3)]">
            Existing tools catch bugs and scan for vulnerabilities, but none of them give you a holistic view of your repository's long-term health. CodePulse does.
          </p>
        </Reveal>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 2xl:gap-8">
          {problems.map(({ Icon, color, bg, title, body }, index) => (
            <Reveal key={title} delay={index * 120}>
              <div className="glass-panel group h-full space-y-5 p-8 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-e3)]">
                <div className={`flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${bg}`}>
                  <Icon size={22} className={color} />
                </div>
                <h3 className="text-[var(--text-title-3)] font-semibold leading-snug text-[var(--ink-1)]">{title}</h3>
                <p className="text-[0.9375rem] leading-relaxed text-[var(--ink-3)]">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Divider quote */}
        <Reveal className="mx-auto max-w-2xl text-center" delay={150}>
          <p className="text-[var(--text-title-2)] font-medium leading-relaxed text-[var(--ink-2)]">
            "CodePulse is to software repositories what a health-monitoring system is to the human body — it{' '}
            <span className="text-[var(--accent-ink)]">continuously analyzes, diagnoses, and recommends actions.</span>"
          </p>
        </Reveal>
      </div>
    </section>
  )
}
