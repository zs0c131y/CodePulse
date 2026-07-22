import { Link2, ScanSearch, LayoutDashboard, ListChecks } from 'lucide-react'
import Reveal from './Reveal'

const steps = [
  {
    step: '01',
    Icon: Link2,
    color: 'text-violet-300',
    border: 'border-violet-400/30',
    bg: 'bg-violet-500/10',
    glow: 'shadow-violet-500/25',
    title: 'Connect Your Repository',
    body: 'Link your GitHub or GitLab repository in seconds. CodePulse never stores your source code — it analyzes and discards.',
  },
  {
    step: '02',
    Icon: ScanSearch,
    color: 'text-cyan-300',
    border: 'border-cyan-400/30',
    bg: 'bg-cyan-500/10',
    glow: 'shadow-cyan-500/25',
    title: 'Deep Intelligence Analysis',
    body: 'Our AI engine analyzes source code, documentation, commit history, and project structure to build a complete understanding of your repository.',
  },
  {
    step: '03',
    Icon: LayoutDashboard,
    color: 'text-emerald-300',
    border: 'border-emerald-400/30',
    bg: 'bg-emerald-500/10',
    glow: 'shadow-emerald-500/25',
    title: 'Get Your Health Report',
    body: 'Receive a comprehensive, interactive health dashboard — with scores, drift maps, debt estimates, and risk heatmaps — updated continuously.',
  },
  {
    step: '04',
    Icon: ListChecks,
    color: 'text-amber-300',
    border: 'border-amber-400/30',
    bg: 'bg-amber-500/10',
    glow: 'shadow-amber-500/25',
    title: 'Take Action',
    body: 'Follow AI-generated, prioritized recommendations explained in plain language, with effort estimates and impact scores.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="cp-section relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 dot-bg opacity-30" />
      <div className="pointer-events-none absolute inset-0">
        <div className="aurora-blob bottom-0 left-1/2 h-[22rem] w-[34rem] -translate-x-1/2 bg-cyan-900/[0.09] animate-aurora-slow" />
      </div>

      <div className="cp-container relative space-y-16 lg:space-y-20">
        {/* Heading */}
        <Reveal className="mx-auto max-w-2xl space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3.5 py-1.5 text-sm font-medium text-cyan-300">
            How It Works
          </div>
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            Repository health monitoring, simplified
          </h2>
          <p className="text-lg leading-relaxed text-mist-400">
            From zero to full repository intelligence in minutes. No complex setup, no infrastructure to manage.
          </p>
        </Reveal>

        {/* Steps grid */}
        <div className="relative grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-6 2xl:gap-8">
          {/* Connecting line through icon centers (top-8 = half of the 64px box) */}
          <div
            className="pointer-events-none absolute top-8 hidden lg:block"
            style={{ left: 'calc(12.5% + 8px)', right: 'calc(12.5% + 8px)', height: '1px' }}
          >
            <div className="h-full w-full bg-gradient-to-r from-violet-500/40 via-cyan-400/30 to-amber-400/40" />
            {[25, 50, 75].map(pct => (
              <div
                key={pct}
                className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-mist-600"
                style={{ left: `${pct}%` }}
              />
            ))}
          </div>

          {steps.map(({ step, Icon, color, border, bg, glow, title, body }, index) => (
            <Reveal key={step} delay={index * 120} className="flex flex-col items-center gap-5 text-center group">
              {/* Icon box — z-10 so it sits above the connecting line */}
              <div
                className={`relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${bg} ${border} shadow-lg ${glow} backdrop-blur-sm transition-transform duration-300 group-hover:scale-110`}
              >
                <Icon size={22} className={color} strokeWidth={1.5} />
                <span className="absolute bottom-1.5 right-2 font-mono text-[9px] font-bold tracking-widest text-white/25">
                  {step}
                </span>
              </div>

              {/* Text */}
              <div className="max-w-60 space-y-2 lg:max-w-50 2xl:max-w-60">
                <h3 className="font-display text-base font-semibold leading-snug text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-mist-400">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* CTA */}
        <Reveal className="text-center" delay={150}>
          <a
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3 font-semibold text-white shadow-xl shadow-violet-600/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-violet-600/45 hover:brightness-110"
          >
            Start for free — no setup required
          </a>
        </Reveal>
      </div>
    </section>
  )
}
