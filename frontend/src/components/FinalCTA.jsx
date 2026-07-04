import { ArrowRight, Activity } from 'lucide-react'

export default function FinalCTA() {
  return (
    <section id="pricing" className="cp-section relative overflow-hidden">
      <div className="cp-container relative">
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
          <div className="relative space-y-8 px-5 py-14 text-center sm:px-8 sm:py-20 lg:px-12">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-2xl shadow-violet-600/30 animate-glow-pulse">
                <Activity size={28} strokeWidth={2} className="text-white" />
              </div>
            </div>

            {/* Heading */}
            <div className="space-y-4 max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-6xl">
                Start monitoring your repository's health{' '}
                <span className="gradient-text">today</span>
              </h2>
              <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
                Join thousands of engineering teams that trust CodePulse to proactively maintain
                repository health, reduce maintenance costs, and improve long-term software sustainability.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col justify-center gap-4 sm:flex-row sm:flex-wrap">
              <a
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-cyan-500 px-6 py-3.5 text-base font-bold text-white shadow-xl shadow-violet-600/30 transition-all hover:scale-[1.02] hover:opacity-90 active:scale-[0.98] sm:px-8"
              >
                Get Early Access — It's Free
                <ArrowRight size={18} />
              </a>
              <a
                href="#"
                className="glass inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold text-slate-300 transition-all hover:border-white/20 hover:text-white sm:px-8"
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
