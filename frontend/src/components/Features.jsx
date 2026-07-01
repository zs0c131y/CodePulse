import { GitBranch, BarChart3, ShieldAlert, Sparkles, RefreshCw, GraduationCap } from 'lucide-react'

const features = [
  {
    Icon: GitBranch,
    gradient: 'from-violet-500 to-purple-600',
    glow: 'bg-violet-500/10 border-violet-500/20',
    title: 'Knowledge Drift Detection',
    body: 'Automatically identifies when documentation diverges from the actual codebase. Know exactly which README files, API docs, and architecture guides are out of date — and by how much.',
    tag: 'Core',
  },
  {
    Icon: BarChart3,
    gradient: 'from-orange-500 to-amber-500',
    glow: 'bg-orange-500/10 border-orange-500/20',
    title: 'Technical Debt Quantification',
    body: 'Go beyond code smell detection. CodePulse measures and tracks debt in terms of estimated engineering effort, giving you data to justify refactoring work to leadership.',
    tag: 'Core',
  },
  {
    Icon: ShieldAlert,
    gradient: 'from-rose-500 to-pink-600',
    glow: 'bg-rose-500/10 border-rose-500/20',
    title: 'Maintainability Risk Assessment',
    body: 'Identify high-risk zones before they cause incidents — tightly coupled modules, single points of failure, and code that only one engineer understands.',
    tag: 'Core',
  },
  {
    Icon: Sparkles,
    gradient: 'from-cyan-500 to-blue-500',
    glow: 'bg-cyan-500/10 border-cyan-500/20',
    title: 'AI-Powered Recommendations',
    body: "Get specific, prioritized, explainable recommendations. Not generic linting warnings — actual engineering guidance grounded in your repository's history and context.",
    tag: 'AI',
  },
  {
    Icon: RefreshCw,
    gradient: 'from-emerald-500 to-teal-500',
    glow: 'bg-emerald-500/10 border-emerald-500/20',
    title: 'Continuous Repository Monitoring',
    body: 'Health scores update automatically with every commit. Get notified when new drift is introduced, when debt crosses thresholds, or when risk escalates.',
    tag: 'Realtime',
  },
  {
    Icon: GraduationCap,
    gradient: 'from-indigo-500 to-violet-600',
    glow: 'bg-indigo-500/10 border-indigo-500/20',
    title: 'Onboarding Intelligence',
    body: "Auto-generate living architecture guides, module explainers, and 'start here' paths for new engineers — synthesized directly from your repository's history.",
    tag: 'AI',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-200 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-200 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute top-1/2 left-1/4 w-100 h-100 bg-violet-600/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-75 h-75 bg-cyan-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 space-y-16">
        {/* Heading */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 text-sm font-medium">
            Features
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
            Everything you need to understand your codebase
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed">
            A unified intelligence layer that connects code, documentation, history, and structure
            to give you a complete picture of your repository's health.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ Icon, gradient, glow, title, body, tag }) => (
            <div
              key={title}
              className="glass rounded-2xl p-6 space-y-4 group hover:border-white/12 transition-all duration-300 relative overflow-hidden"
            >
              {/* Hover glow */}
              <div className="absolute inset-0 bg-linear-to-br from-violet-600/0 to-transparent opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl pointer-events-none" />

              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                  <Icon size={18} className="text-white" strokeWidth={2} />
                </div>
                <span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full border ${glow}`}>
                  {tag}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-white font-semibold text-lg leading-snug">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
