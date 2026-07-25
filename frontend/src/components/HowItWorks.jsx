import { Link2, ScanSearch, LayoutDashboard, ListChecks } from 'lucide-react'
import Reveal from './Reveal'

const steps = [
  {
    step: '01',
    Icon: Link2,
    color: 'text-[var(--accent-ink)]',
    border: 'border-[var(--accent-line)]',
    bg: 'bg-[var(--accent-wash)]',
    glow: 'shadow-[var(--shadow-e2)]',
    title: 'Connect Your Repository',
    body: 'Link your GitHub or GitLab repository in seconds. CodePulse never stores your source code — it analyzes and discards.',
  },
  {
    step: '02',
    Icon: ScanSearch,
    color: 'text-[var(--accent-ink)]',
    border: 'border-[var(--accent-line)]',
    bg: 'bg-[var(--accent-wash)]',
    glow: 'shadow-[var(--shadow-e2)]',
    title: 'Deep Intelligence Analysis',
    body: 'Our AI engine analyzes source code, documentation, commit history, and project structure to build a complete understanding of your repository.',
  },
  {
    step: '03',
    Icon: LayoutDashboard,
    color: 'text-[var(--sev-nominal-ink)]',
    border: 'border-[var(--sev-nominal-line)]',
    bg: 'bg-[var(--sev-nominal-wash)]',
    glow: 'shadow-[var(--shadow-e2)]',
    title: 'Get Your Health Report',
    body: 'Receive a comprehensive, interactive health dashboard — with scores, drift maps, debt estimates, and risk heatmaps — updated continuously.',
  },
  {
    step: '04',
    Icon: ListChecks,
    color: 'text-[var(--sev-medium-ink)]',
    border: 'border-[var(--sev-medium-line)]',
    bg: 'bg-[var(--sev-medium-wash)]',
    glow: 'shadow-[var(--shadow-e2)]',
    title: 'Take Action',
    body: 'Follow AI-generated, prioritized recommendations explained in plain language, with effort estimates and impact scores.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="cp-section relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 dot-bg opacity-30" />
      <div className="pointer-events-none absolute inset-0">
        <div className="bottom-0 left-1/2 h-[22rem] w-[34rem] -translate-x-1/2 bg-[var(--accent)]/[0.09]" />
      </div>

      <div className="cp-marketing relative space-y-16 lg:space-y-20">
        {/* Heading */}
        <Reveal className="mx-auto max-w-2xl space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-line)] bg-[var(--accent-wash)] px-3.5 py-1.5 text-sm font-medium text-[var(--accent-ink)]">
            How It Works
          </div>
          <h2 className="text-[var(--text-title-1)] font-semibold text-[var(--ink-1)]">
            Repository health monitoring, simplified
          </h2>
          <p className="text-[var(--text-body-lg)] text-[var(--ink-3)]">
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
            <div className="h-full w-full bg-[var(--surface-2)]" />
            {[25, 50, 75].map(pct => (
              <div
                key={pct}
                className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[var(--ink-4)]"
                style={{ left: `${pct}%` }}
              />
            ))}
          </div>

          {steps.map(({ step, Icon, color, border, bg, glow, title, body }, index) => (
            <Reveal key={step} delay={index * 120} className="flex flex-col items-center gap-5 text-center group">
              {/* Icon box — z-10 so it sits above the connecting line */}
              <div
                className={`relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--r-md)] border ${bg} ${border} shadow-[var(--shadow-e2)] ${glow} backdrop-blur-sm transition-transform duration-300 group-hover:scale-110`}
              >
                <Icon size={22} className={color} strokeWidth={1.5} />
                <span className="absolute bottom-1.5 right-2 font-mono text-[9px] font-bold tracking-widest text-[var(--ink-1)]/25">
                  {step}
                </span>
              </div>

              {/* Text */}
              <div className="max-w-60 space-y-2 lg:max-w-50 2xl:max-w-60">
                <h3 className="text-[var(--text-title-3)] font-semibold leading-snug text-[var(--ink-1)]">{title}</h3>
                <p className="text-[0.9375rem] leading-relaxed text-[var(--ink-3)]">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* CTA */}
        <Reveal className="text-center" delay={150}>
          <a
            href="/signup"
            className="inline-flex items-center gap-2 rounded-[var(--r-xl)] bg-[var(--ink-1)] px-8 py-4 font-medium text-[0.9375rem] text-[var(--surface-canvas)] shadow-[var(--shadow-e2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-e3)] hover:brightness-110"
          >
            Start for free — no setup required
          </a>
        </Reveal>
      </div>
    </section>
  )
}
