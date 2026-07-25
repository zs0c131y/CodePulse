import { ArrowRight, Activity } from 'lucide-react'
import Reveal from './Reveal'

export default function FinalCTA() {
  return (
    <section id="pricing" className="cp-section relative overflow-hidden">
      <div className="cp-marketing relative">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-[var(--surface-2)]" />
            <div className="absolute inset-0 dot-bg opacity-20" />

            {/* Glow orbs */}
            <div className="left-1/4 top-0 h-72 w-72 bg-[var(--accent-wash)]" />
            <div className="bottom-0 right-1/4 h-60 w-60 bg-[var(--accent-wash)]" />

            {/* Border + top highlight */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl border border-[var(--line-2)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[var(--line-2)]" />

            {/* Content */}
            <div className="relative space-y-8 px-5 py-16 text-center sm:px-8 sm:py-20 lg:px-12 lg:py-24">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[var(--r-md)] bg-[var(--surface-2)]">
                  <Activity size={28} strokeWidth={2} className="text-[var(--ink-1)]" />
                </div>
              </div>

              {/* Heading */}
              <div className="mx-auto max-w-3xl space-y-6">
                <h2 className="text-[var(--text-display-2)] font-semibold text-[var(--ink-1)]">
                  Start monitoring your repository's health{' '}
                  <span className="text-[var(--accent-ink)] font-bold">today</span>
                </h2>
                <p className="mx-auto max-w-2xl text-[var(--text-body-lg)] text-[var(--ink-3)]">
                  Join thousands of engineering teams that trust CodePulse to proactively maintain
                  repository health, reduce maintenance costs, and improve long-term software sustainability.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col justify-center gap-4 sm:flex-row sm:flex-wrap pt-4">
                <a
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-[var(--r-xl)] bg-[var(--ink-1)] px-8 py-4 font-medium text-[0.9375rem] text-[var(--surface-canvas)] shadow-[var(--shadow-e2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-e3)] hover:brightness-110 active:translate-y-0"
                >
                  Get Early Access — It's Free
                  <ArrowRight size={18} />
                </a>
                <a
                  href="#"
                  className="panel inline-flex items-center justify-center gap-2 rounded-[var(--r-xl)] px-8 py-4 font-medium text-[0.9375rem] text-[var(--ink-2)] transition-all duration-300 hover:border-[var(--line-3)] hover:text-[var(--ink-1)] hover:bg-[var(--surface-2)]"
                >
                  Book a Demo
                </a>
              </div>

              {/* Fine print */}
              <p className="text-sm text-[var(--ink-4)]">
                Free for open source · Paid plans from $49/mo · No credit card required
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
