import { ArrowRight, Activity } from 'lucide-react'
import Reveal from './Reveal'

export default function FinalCTA() {
  return (
    <section id="pricing" className="cp-section relative overflow-hidden">
      <div className="cp-container relative">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-950/80 via-night-900 to-cyan-950/50" />
            <div className="absolute inset-0 dot-bg opacity-20" />

            {/* Glow orbs */}
            <div className="aurora-blob left-1/4 top-0 h-72 w-72 bg-violet-600/25 animate-aurora" />
            <div className="aurora-blob bottom-0 right-1/4 h-60 w-60 bg-cyan-500/20 animate-aurora-slow" />

            {/* Border + top highlight */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />

            {/* Content */}
            <div className="relative space-y-8 px-5 py-16 text-center sm:px-8 sm:py-20 lg:px-12 lg:py-24">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="animate-glow-pulse flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500">
                  <Activity size={28} strokeWidth={2} className="text-white" />
                </div>
              </div>

              {/* Heading */}
              <div className="mx-auto max-w-3xl space-y-4">
                <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-6xl">
                  Start monitoring your repository's health{' '}
                  <span className="text-gradient-aurora">today</span>
                </h2>
                <p className="mx-auto max-w-2xl text-base leading-relaxed text-mist-400 sm:text-lg">
                  Join thousands of engineering teams that trust CodePulse to proactively maintain
                  repository health, reduce maintenance costs, and improve long-term software sustainability.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col justify-center gap-4 sm:flex-row sm:flex-wrap">
                <a
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3.5 text-base font-bold text-white shadow-xl shadow-violet-600/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-violet-600/50 hover:brightness-110 sm:px-8"
                >
                  Get Early Access — It's Free
                  <ArrowRight size={18} />
                </a>
                <a
                  href="#"
                  className="glass-panel inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold text-mist-300 transition-all duration-300 hover:border-white/20 hover:text-white sm:px-8"
                >
                  Book a Demo
                </a>
              </div>

              {/* Fine print */}
              <p className="text-sm text-mist-600">
                Free for open source · Paid plans from $49/mo · No credit card required
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
