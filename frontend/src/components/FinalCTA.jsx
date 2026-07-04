import { ArrowRight, Activity } from 'lucide-react'

export default function FinalCTA() {
  return (
    <section id="pricing" className="py-28 relative overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="relative rounded-3xl overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-linear-to-br from-violet-900/80 via-[#0a0a20] to-cyan-900/40" />
          <div className="absolute inset-0 dot-bg opacity-20" />

          {/* Glow orbs */}
          <div className="absolute top-0 left-1/4 w-75 h-75 bg-violet-600/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-62.5 h-62.5 bg-cyan-500/15 rounded-full blur-[80px] pointer-events-none" />

          {/* Border */}
          <div className="absolute inset-0 rounded-3xl border border-white/10 pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-violet-400/40 to-transparent pointer-events-none" />

          {/* Content */}
          <div className="relative px-8 py-20 text-center space-y-8">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-2xl shadow-violet-600/30 animate-glow-pulse">
                <Activity size={28} strokeWidth={2} className="text-white" />
              </div>
            </div>

            {/* Heading */}
            <div className="space-y-4 max-w-3xl mx-auto">
              <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight tracking-tight">
                Start monitoring your repository's health{' '}
                <span className="gradient-text">today</span>
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Join thousands of engineering teams that trust CodePulse to proactively maintain
                repository health, reduce maintenance costs, and improve long-term software sustainability.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white bg-linear-to-r from-violet-600 to-cyan-500 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-violet-600/30 text-base"
              >
                Get Early Access — It's Free
                <ArrowRight size={18} />
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-slate-300 glass hover:text-white hover:border-white/20 transition-all text-base"
              >
                Book a Demo
              </a>
            </div>

            {/* Fine print */}
            <p className="text-sm text-slate-600">
              Free for open source · Paid plans from $49/mo · No credit card required
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
