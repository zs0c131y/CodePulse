import { GitBranch, BarChart3, ShieldAlert, Sparkles, RefreshCw, GraduationCap, FileWarning } from 'lucide-react'
import Reveal from './Reveal'

const features = [
  {
    Icon: GitBranch,
    gradient: 'from-violet-500 to-purple-600',
    glow: 'bg-violet-400/10 border-violet-400/20 text-violet-300',
    title: 'Knowledge Drift Detection',
    body: 'Automatically identifies when documentation diverges from the actual codebase. Know exactly which README files, API docs, and architecture guides are out of date — and by how much.',
    tag: 'Core',
    featured: true,
  },
  {
    Icon: BarChart3,
    gradient: 'from-orange-500 to-amber-500',
    glow: 'bg-orange-400/10 border-orange-400/20 text-orange-300',
    title: 'Technical Debt Quantification',
    body: 'Go beyond code smell detection. Measure debt as estimated engineering effort — data you can use to justify refactoring work to leadership.',
    tag: 'Core',
  },
  {
    Icon: ShieldAlert,
    gradient: 'from-rose-500 to-pink-600',
    glow: 'bg-rose-400/10 border-rose-400/20 text-rose-300',
    title: 'Maintainability Risk Assessment',
    body: 'Identify high-risk zones before they cause incidents — tightly coupled modules, single points of failure, and code only one engineer understands.',
    tag: 'Core',
  },
  {
    Icon: Sparkles,
    gradient: 'from-cyan-500 to-blue-500',
    glow: 'bg-cyan-400/10 border-cyan-400/20 text-cyan-300',
    title: 'AI-Powered Recommendations',
    body: "Specific, prioritized, explainable recommendations — actual engineering guidance grounded in your repository's history and context.",
    tag: 'AI',
  },
  {
    Icon: RefreshCw,
    gradient: 'from-emerald-500 to-teal-500',
    glow: 'bg-emerald-400/10 border-emerald-400/20 text-emerald-300',
    title: 'Continuous Repository Monitoring',
    body: 'Health scores update automatically with every commit. Get notified when drift appears, debt crosses thresholds, or risk escalates.',
    tag: 'Realtime',
  },
  {
    Icon: GraduationCap,
    gradient: 'from-indigo-500 to-violet-600',
    glow: 'bg-indigo-400/10 border-indigo-400/20 text-indigo-300',
    title: 'Onboarding Intelligence',
    body: "Auto-generate living architecture guides, module explainers, and 'start here' paths — synthesized directly from your repository's history.",
    tag: 'AI',
  },
]

const driftSignals = [
  { label: 'auth/README.md', severity: 'High', tone: 'text-rose-300 bg-rose-400/10 border-rose-400/20' },
  { label: 'api/authentication.md', severity: 'Medium', tone: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
  { label: 'architecture/system.md', severity: 'Medium', tone: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
]

export default function Features() {
  return (
    <section id="features" className="cp-section relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="aurora-blob left-[12%] top-1/3 h-[22rem] w-[22rem] bg-violet-600/[0.07] animate-aurora-slow" />
        <div className="aurora-blob right-[15%] top-[20%] h-[18rem] w-[18rem] bg-cyan-500/[0.06] animate-aurora" />
      </div>

      <div className="cp-container relative space-y-16">
        {/* Heading */}
        <Reveal className="mx-auto max-w-2xl space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3.5 py-1.5 text-sm font-medium text-violet-300">
            Features
          </div>
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            Everything you need to understand your codebase
          </h2>
          <p className="text-lg leading-relaxed text-mist-400">
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
              <div className={`glass-panel card-hover group relative h-full space-y-4 overflow-hidden rounded-2xl p-6 ${featured ? 'flex flex-col lg:p-8' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className={`flex rounded-xl bg-gradient-to-br ${gradient} items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${featured ? 'h-12 w-12' : 'h-10 w-10'}`}>
                    <Icon size={featured ? 22 : 18} className="text-white" strokeWidth={2} />
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${glow}`}>
                    {tag}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className={`font-display font-semibold leading-snug text-white ${featured ? 'text-xl lg:text-2xl' : 'text-lg'}`}>
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-mist-400">{body}</p>
                </div>

                {featured && (
                  <div className="mt-auto space-y-2 pt-4">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mist-500">
                      <FileWarning size={13} />
                      Live drift signals
                    </p>
                    {driftSignals.map(signal => (
                      <div key={signal.label} className="glass-chip flex items-center justify-between rounded-xl px-3.5 py-2.5">
                        <span className="font-mono text-xs text-mist-300">{signal.label}</span>
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
