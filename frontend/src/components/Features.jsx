import { GitBranch, BarChart3, ShieldAlert, Sparkles, RefreshCw, GraduationCap, FileWarning } from 'lucide-react'
import Reveal from './Reveal'

const features = [
  {
    Icon: GitBranch,
    gradient: ' ',
    glow: 'bg-[var(--accent-wash)] border-[var(--accent-line)] text-[var(--accent-ink)]',
    title: 'Knowledge Drift Detection',
    body: 'Automatically identifies when documentation diverges from the actual codebase. Know exactly which README files, API docs, and architecture guides are out of date — and by how much.',
    tag: 'Core',
    featured: true,
  },
  {
    Icon: BarChart3,
    gradient: ' ',
    glow: 'bg-[var(--sev-high-wash)] border-[var(--sev-high-line)] text-[var(--sev-high-ink)]',
    title: 'Technical Debt Quantification',
    body: 'Go beyond code smell detection. Measure debt as estimated engineering effort — data you can use to justify refactoring work to leadership.',
    tag: 'Core',
  },
  {
    Icon: ShieldAlert,
    gradient: ' ',
    glow: 'bg-[var(--sev-critical-wash)] border-[var(--sev-critical-line)] text-[var(--sev-critical-ink)]',
    title: 'Maintainability Risk Assessment',
    body: 'Identify high-risk zones before they cause incidents — tightly coupled modules, single points of failure, and code only one engineer understands.',
    tag: 'Core',
  },
  {
    Icon: Sparkles,
    gradient: ' ',
    glow: 'bg-[var(--accent-wash)] border-[var(--accent-line)] text-[var(--accent-ink)]',
    title: 'AI-Powered Recommendations',
    body: "Specific, prioritized, explainable recommendations — actual engineering guidance grounded in your repository's history and context.",
    tag: 'AI',
  },
  {
    Icon: RefreshCw,
    gradient: ' ',
    glow: 'bg-[var(--sev-nominal-wash)] border-[var(--sev-nominal-line)] text-[var(--sev-nominal-ink)]',
    title: 'Continuous Repository Monitoring',
    body: 'Health scores update automatically with every commit. Get notified when drift appears, debt crosses thresholds, or risk escalates.',
    tag: 'Realtime',
  },
  {
    Icon: GraduationCap,
    gradient: ' ',
    glow: 'bg-[var(--accent-wash)] border-[var(--accent-line)] text-[var(--accent-ink)]',
    title: 'Onboarding Intelligence',
    body: "Auto-generate living architecture guides, module explainers, and 'start here' paths — synthesized directly from your repository's history.",
    tag: 'AI',
  },
]

const driftSignals = [
  { label: 'auth/README.md', severity: 'High', tone: 'text-[var(--sev-critical-ink)] bg-[var(--sev-critical-wash)] border-[var(--sev-critical-line)]' },
  { label: 'api/authentication.md', severity: 'Medium', tone: 'text-[var(--sev-medium-ink)] bg-[var(--sev-medium-wash)] border-[var(--sev-medium-line)]' },
  { label: 'architecture/system.md', severity: 'Medium', tone: 'text-[var(--sev-medium-ink)] bg-[var(--sev-medium-wash)] border-[var(--sev-medium-line)]' },
]

export default function Features() {
  return (
    <section id="features" className="cp-section relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-px bg-[var(--line-2)]" />
        <div className="left-[12%] top-1/3 h-[22rem] w-[22rem] bg-[var(--accent)]/[0.07]" />
        <div className="right-[15%] top-[20%] h-[18rem] w-[18rem] bg-[var(--accent)]/[0.06]" />
      </div>

      <div className="cp-marketing relative space-y-16">
        {/* Heading */}
        <Reveal className="mx-auto max-w-2xl space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-line)] bg-[var(--accent-wash)] px-3.5 py-1.5 text-sm font-medium text-[var(--accent-ink)]">
            Features
          </div>
          <h2 className="text-[var(--text-title-1)] font-semibold text-[var(--ink-1)]">
            Everything you need to understand your codebase
          </h2>
          <p className="text-[var(--text-body-lg)] text-[var(--ink-3)]">
            A unified intelligence layer that connects code, documentation, history, and structure
            to give you a complete picture of your repository's health.
          </p>
        </Reveal>

        {/* Bento grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 2xl:gap-6">
          {features.map(({ Icon, gradient, glow, title, body, tag, featured }, index) => (
            <Reveal
              key={title}
              delay={index * 90}
              className={featured ? 'md:col-span-2 lg:row-span-2' : ''}
            >
              <div className={`glass-panel group relative h-full space-y-6 overflow-hidden p-8 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-e3)] ${featured ? 'flex flex-col' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className={`flex rounded-[var(--r-sm)]  ${gradient} items-center justify-center shadow-[var(--shadow-e2)] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${featured ? 'h-12 w-12' : 'h-10 w-10'}`}>
                    <Icon size={featured ? 22 : 18} className="text-[var(--ink-1)]" strokeWidth={2} />
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${glow}`}>
                    {tag}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className={`font-semibold leading-snug text-[var(--ink-1)] ${featured ? 'text-[var(--text-title-2)]' : 'text-[var(--text-title-3)]'}`}>
                    {title}
                  </h3>
                  <p className="text-[0.9375rem] leading-relaxed text-[var(--ink-3)]">{body}</p>
                </div>

                {featured && (
                  <div className="mt-auto space-y-2 pt-4">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)]">
                      <FileWarning size={13} />
                      Live drift signals
                    </p>
                    {driftSignals.map(signal => (
                      <div key={signal.label} className="panel-2 flex items-center justify-between rounded-[var(--r-sm)] px-3.5 py-2.5">
                        <span className="font-mono text-xs text-[var(--ink-2)]">{signal.label}</span>
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${signal.tone}`}>
                          {signal.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
