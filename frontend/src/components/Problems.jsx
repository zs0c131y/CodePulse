import { FileX2, Layers, Clock } from 'lucide-react'
import Reveal from './Reveal'

const problems = [
  {
    Icon: FileX2,
    color: 'text-rose-300',
    bg: 'bg-rose-400/[0.08] border-rose-400/20',
    title: 'Documentation Rots Silently',
    body:
      'As code evolves, docs fall behind. New engineers make decisions based on outdated assumptions, causing bugs and wasted effort that could have been avoided.',
  },
  {
    Icon: Layers,
    color: 'text-orange-300',
    bg: 'bg-orange-400/[0.08] border-orange-400/20',
    title: 'Technical Debt Is Invisible',
    body:
      'Complexity accumulates invisibly. Teams have no way to measure debt, prioritize refactors, or justify maintenance work — until something breaks in production.',
  },
  {
    Icon: Clock,
    color: 'text-amber-300',
    bg: 'bg-amber-400/[0.08] border-amber-400/20',
    title: 'Onboarding Takes Months',
    body:
      'Without institutional knowledge encoded anywhere accessible, new engineers spend months reverse-engineering systems instead of shipping features.',
  },
]

export default function Problems() {
  return (
    <section className="cp-section relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="aurora-blob left-1/2 top-1/2 h-[24rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 bg-rose-900/[0.07]" />
      </div>

      <div className="cp-container relative space-y-16">
        {/* Heading */}
        <Reveal className="mx-auto max-w-3xl space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/25 bg-rose-500/10 px-3.5 py-1.5 text-sm font-medium text-rose-300">
            The Problem
          </div>
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            Software repositories get sick.
            <br />
            <span className="text-mist-500">Most teams don't know until it's too late.</span>
          </h2>
          <p className="text-lg leading-relaxed text-mist-400">
            Existing tools catch bugs and scan for vulnerabilities, but none of them give you a holistic view of your repository's long-term health. CodePulse does.
          </p>
        </Reveal>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 2xl:gap-8">
          {problems.map(({ Icon, color, bg, title, body }, index) => (
            <Reveal key={title} delay={index * 120}>
              <div className="glass-panel card-hover group h-full space-y-4 rounded-2xl p-6">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${bg}`}>
                  <Icon size={20} className={color} />
                </div>
                <h3 className="font-display text-lg font-semibold leading-snug text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-mist-400">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Divider quote */}
        <Reveal className="mx-auto max-w-2xl text-center" delay={150}>
          <p className="font-display text-xl font-medium leading-relaxed text-mist-300 sm:text-2xl">
            "CodePulse is to software repositories what a health-monitoring system is to the human body — it{' '}
            <span className="text-gradient">continuously analyzes, diagnoses, and recommends actions.</span>"
          </p>
        </Reveal>
      </div>
    </section>
  )
}
