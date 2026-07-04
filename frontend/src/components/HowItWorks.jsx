import { Link2, ScanSearch, LayoutDashboard, ListChecks } from 'lucide-react'

const steps = [
  {
    step: '01',
    Icon: Link2,
    color: 'text-violet-400',
    border: 'border-violet-500/30',
    bg: 'bg-violet-500/10',
    glow: 'shadow-violet-500/20',
    title: 'Connect Your Repository',
    body: 'Link your GitHub or GitLab repository in seconds. CodePulse never stores your source code — it analyzes and discards.',
  },
  {
    step: '02',
    Icon: ScanSearch,
    color: 'text-cyan-400',
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/10',
    glow: 'shadow-cyan-500/20',
    title: 'Deep Intelligence Analysis',
    body: 'Our AI engine analyzes source code, documentation, commit history, and project structure to build a complete understanding of your repository.',
  },
  {
    step: '03',
    Icon: LayoutDashboard,
    color: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    glow: 'shadow-emerald-500/20',
    title: 'Get Your Health Report',
    body: 'Receive a comprehensive, interactive health dashboard — with scores, drift maps, debt estimates, and risk heatmaps — updated continuously.',
  },
  {
    step: '04',
    Icon: ListChecks,
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    glow: 'shadow-amber-500/20',
    title: 'Take Action',
    body: 'Follow AI-generated, prioritized recommendations explained in plain language, with effort estimates and impact scores.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="cp-section relative overflow-hidden">
      <div className="absolute inset-0 dot-bg opacity-30 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-150 h-100 bg-cyan-900/8 rounded-full blur-[120px]" />
      </div>

      <div className="cp-container relative space-y-16 lg:space-y-20">
        {/* Heading */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-sm font-medium">
            How It Works
          </div>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            Repository health monitoring, simplified
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed">
            From zero to full repository intelligence in minutes. No complex setup, no infrastructure to manage.
          </p>
        </div>

        {/* Steps grid */}
        <div className="relative grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-6 2xl:gap-8">
          {/*
            Connecting line: passes through the exact center of the icon boxes.
            Icon boxes are w-16 h-16 (64px), so center = 32px = top-8.
            In a 4-col grid each col is 25% wide; icon is centered so its
            midpoint is at 12.5% and 87.5% of the container — hence left/right [12.5%].
          */}
          <div
            className="absolute top-8 hidden lg:block pointer-events-none"
            style={{ left: 'calc(12.5% + 8px)', right: 'calc(12.5% + 8px)', height: '1px' }}
          >
            <div className="w-full h-full bg-linear-to-r from-violet-500/40 via-emerald-500/30 to-amber-500/40" />
            {/* Dots at step positions (25%, 50%, 75%) */}
            {[25, 50, 75].map(pct => (
              <div
                key={pct}
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-600"
                style={{ left: `${pct}%` }}
              />
            ))}
          </div>

          {steps.map(({ step, Icon, color, border, bg, glow, title, body }) => (
            <div key={step} className="flex flex-col items-center text-center gap-5 group">
              {/* Icon box — z-10 so it sits above the connecting line */}
              <div
                className={`relative z-10 w-16 h-16 rounded-2xl ${bg} border ${border} flex items-center justify-center shrink-0 shadow-lg ${glow} group-hover:scale-105 transition-transform duration-300`}
              >
                <Icon size={22} className={color} strokeWidth={1.5} />
                {/* Step number — inside the box, bottom-right corner */}
                <span className="absolute bottom-1.5 right-2 text-[9px] font-bold tracking-widest text-white/20">
                  {step}
                </span>
              </div>

              {/* Text */}
              <div className="max-w-60 space-y-2 lg:max-w-50 2xl:max-w-60">
                <h3 className="text-white font-semibold text-base leading-snug">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href="#"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-linear-to-r from-violet-600 to-cyan-500 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-violet-600/20"
          >
            Start for free — no setup required
          </a>
        </div>
      </div>
    </section>
  )
}
