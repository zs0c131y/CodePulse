import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react'
import Reveal from './Reveal'
import { PulseMark } from './ui/pulse-mark'

/*
 * THE JOURNAL — the CodePulse marketing broadsheet.
 * Editorial brutalism: warm paper, ink rules, one hot orange, oversized
 * grotesk cut with italic serif, mono metadata, hard offset shadows.
 * This surface has a fixed palette (.mk scope) — it does not follow the
 * product theme. Spec: docs/design.md §2
 */

const signals = [
  {
    index: '01',
    title: 'The map',
    tag: 'Structure + Dependencies',
    text: 'Repository structure, dependency edges, and change activity fused into a single operating picture of the system you actually run.',
  },
  {
    index: '02',
    title: 'The drift',
    tag: 'Knowledge Debt',
    text: 'Documentation that no longer matches the implementation your team relies on — found, ranked, and assigned before it misleads someone.',
  },
  {
    index: '03',
    title: 'The risk',
    tag: 'Debt + Churn + Ownership',
    text: 'Complexity, churn, duplication, and ownership pressure combined into one ranked queue, so the next engineering decision is obvious.',
  },
  {
    index: '04',
    title: 'The evidence',
    tag: 'AI Explainability',
    text: 'Every recommendation ships with its reason, its impact, and a practical next step. No black-box scores, no unsourced advice.',
  },
]

const steps = [
  {
    step: 'Step 01',
    title: 'Connect.',
    text: 'Link GitHub or GitLab and pick the repository you want to understand. Read-only, revoked any time.',
    meta: 'OAuth — 60 seconds',
  },
  {
    step: 'Step 02',
    title: 'Measure.',
    text: 'CodePulse builds a precise model of code, documentation, history, and dependencies — then scores what matters.',
    meta: '4 engines — one run',
  },
  {
    step: 'Step 03',
    title: 'Decide.',
    text: 'Review evidence-backed risk signals and walk into the next planning meeting with an engineering case, not a hunch.',
    meta: 'Shareable — traceable',
  },
]

const marqueeItems = [
  'Documentation drift',
  'Technical debt',
  'Knowledge debt',
  'Risk intelligence',
  'AI remediation',
  'Ownership signals',
]

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-[var(--mk-ink)]" aria-label="CodePulse home">
      <PulseMark variant="journal" size={26} />
      <span className="font-[family-name:var(--font-display)] text-lg font-black uppercase tracking-[-0.02em]">
        CodePulse<sup className="ml-0.5 text-[0.6em] font-bold">®</sup>
      </span>
    </Link>
  )
}

function Nav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b-[1.5px] border-[var(--mk-line)] bg-[var(--mk-paper)]">
      <div className="cp-marketing flex h-16 items-center justify-between">
        <Brand />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
          {[
            ['Signals', '#signals', '01'],
            ['Workflow', '#workflow', '02'],
            ['Evidence', '#evidence', '03'],
          ].map(([label, href, index]) => (
            <a key={href} href={href} className="mk-mono group text-[var(--mk-ink-2)] transition-colors hover:text-[var(--mk-ink)]">
              <span className="mr-1.5 text-[var(--mk-accent-strong)]">{index}</span>
              {label}
              <span className="block h-px max-w-0 bg-[var(--mk-ink)] transition-all duration-300 group-hover:max-w-full" />
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-5 md:flex">
          <Link to="/signin" className="mk-mono text-[var(--mk-ink-2)] transition-colors hover:text-[var(--mk-ink)]">
            Sign in
          </Link>
          <Link to="/signup" className="mk-btn mk-btn-sm">
            Get started
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          className="grid h-10 w-10 place-items-center border-[1.5px] border-[var(--mk-line)] text-[var(--mk-ink)] md:hidden"
          aria-label="Toggle navigation"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <nav className="border-t-[1.5px] border-[var(--mk-line)] bg-[var(--mk-paper)] md:hidden" aria-label="Mobile navigation">
          <div className="cp-marketing grid gap-0 py-2">
            {[
              ['Signals', '#signals', '01'],
              ['Workflow', '#workflow', '02'],
              ['Evidence', '#evidence', '03'],
            ].map(([label, href, index]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-baseline gap-3 border-b border-[var(--mk-line-soft)] py-4 font-[family-name:var(--font-display)] text-2xl font-extrabold uppercase text-[var(--mk-ink)]"
              >
                <span className="mk-mono text-[var(--mk-accent-strong)]">{index}</span>
                {label}
              </a>
            ))}
            <div className="flex gap-3 py-4">
              <Link to="/signin" className="mk-btn mk-btn-ghost flex-1">Sign in</Link>
              <Link to="/signup" className="mk-btn flex-1">Get started</Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}

function EcgTrace() {
  return (
    <svg viewBox="0 0 560 160" className="h-32 w-full sm:h-40" role="img" aria-label="Live repository pulse trace (illustrative)">
      {[40, 80, 120].map(y => (
        <line key={y} x1="0" y1={y} x2="560" y2={y} stroke="var(--mk-line-soft)" strokeWidth="1" />
      ))}
      <path
        className="mk-ecg"
        d="M0 84 H52 l10-8 9 14 13-66 14 92 12-46 9 14 H210 l10-8 9 14 13-66 14 92 12-46 9 14 H370 l10-8 9 14 13-66 14 92 12-46 9 14 H560"
        fill="none"
        stroke="var(--mk-accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Instrument() {
  const readouts = [
    { label: 'Health score', value: '86', unit: '/100', width: '86%', tone: 'var(--mk-ink)' },
    { label: 'Drift findings', value: '12', unit: 'open', width: '34%', tone: 'var(--mk-accent)' },
    { label: 'High-risk modules', value: '04', unit: 'ranked', width: '52%', tone: 'var(--mk-ink)' },
  ]

  return (
    <div className="mk-card relative">
      <div className="flex items-center justify-between border-b-[1.5px] border-[var(--mk-line)] px-4 py-3">
        <p className="mk-mono text-[var(--mk-ink)]">Fig. 01 — Repository instrument</p>
        <p className="mk-mono flex items-center gap-2 text-[var(--mk-accent-strong)]">
          <span className="mk-blink inline-block h-2 w-2 rounded-full bg-[var(--mk-accent)]" />
          Live
        </p>
      </div>
      <div className="px-4 pt-4">
        <EcgTrace />
      </div>
      <div className="grid grid-cols-1 gap-4 border-t-[1.5px] border-[var(--mk-line)] p-4 sm:grid-cols-3">
        {readouts.map(item => (
          <div key={item.label}>
            <p className="mk-mono text-[var(--mk-ink-3)]">{item.label}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.03em] text-[var(--mk-ink)]">
              {item.value}
              <span className="ml-1 font-[family-name:var(--font-mono)] text-xs font-medium tracking-normal text-[var(--mk-ink-3)]">{item.unit}</span>
            </p>
            <div className="mt-2 h-1.5 w-full bg-[var(--mk-paper-2)]">
              <div className="h-full" style={{ width: item.width, background: item.tone }} />
            </div>
          </div>
        ))}
      </div>
      <div className="border-t-[1.5px] border-[var(--mk-line)] px-4 py-2.5">
        <p className="mk-mono text-[var(--mk-ink-3)]">acme/platform · main · scanned 12s ago · illustrative preview</p>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="cp-marketing grid gap-12 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:pb-24">
      <div>
        <Reveal>
          <p className="mk-mono flex flex-wrap items-center gap-x-3 gap-y-1 text-[var(--mk-ink-2)]">
            <span className="text-[var(--mk-accent-strong)]">●</span>
            Engineering intelligence
            <span aria-hidden="true">/</span>
            <span>Issue Nº 01 — 2026</span>
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="mk-h mt-6 text-[clamp(3.5rem,9.5vw,8rem)]">
            Your<br />codebase<br />
            has a <span className="mk-serif text-[var(--mk-accent)]">pulse.</span>
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--mk-ink-2)]">
            CodePulse listens to the signals your repository already emits — drift, debt,
            churn, ownership — and turns them into evidence your team can act on.
          </p>
        </Reveal>
        <Reveal delay={240}>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/signup" className="mk-btn mk-btn-accent">
              Start scanning <ArrowRight size={15} />
            </Link>
            <a href="#workflow" className="mk-btn mk-btn-ghost">
              How it works
            </a>
          </div>
        </Reveal>
        <Reveal delay={320}>
          <p className="mk-mono mt-8 flex flex-wrap gap-x-4 gap-y-2 text-[var(--mk-ink-3)]">
            <span>GitHub + GitLab</span>
            <span aria-hidden="true">/</span>
            <span>Evidence-backed</span>
            <span aria-hidden="true">/</span>
            <span>No fabricated metrics</span>
          </p>
        </Reveal>
      </div>
      <Reveal delay={200}>
        <Instrument />
      </Reveal>
    </section>
  )
}

function Marquee() {
  const row = [...marqueeItems, ...marqueeItems]
  return (
    <div className="overflow-hidden border-y-[1.5px] border-[var(--mk-line)] bg-[var(--mk-ink)] py-3.5" aria-hidden="true">
      <div className="mk-marquee-track">
        {[0, 1].map(half => (
          <div key={half} className="flex shrink-0 items-center">
            {row.map((item, index) => (
              <span key={`${half}-${index}`} className="mk-mono flex items-center text-[var(--mk-paper)]">
                <span className="px-6">{item}</span>
                <span className="text-[var(--mk-accent)]">●</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Signals() {
  return (
    <section id="signals" className="cp-marketing scroll-mt-24 py-16 sm:py-24">
      <Reveal>
        <p className="mk-mono text-[var(--mk-accent-strong)]">01 / Signals</p>
        <h2 className="mk-h mt-4 max-w-4xl text-[clamp(2.25rem,5.5vw,4.5rem)]">
          It reads what your team <span className="mk-serif text-[var(--mk-accent)]">stopped</span> seeing.
        </h2>
      </Reveal>
      <div className="mt-12 border-t-[1.5px] border-[var(--mk-line)]">
        {signals.map((signal, index) => (
          <Reveal key={signal.index} delay={index * 60}>
            <article className="group grid gap-3 border-b-[1.5px] border-[var(--mk-line)] py-7 transition-colors duration-200 hover:bg-[var(--mk-ink)] sm:grid-cols-[5rem_1fr_auto] sm:items-baseline sm:gap-8 sm:px-4">
              <p className="mk-mono text-[var(--mk-accent-strong)] transition-colors group-hover:text-[var(--mk-accent)]">{signal.index}</p>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase tracking-[-0.02em] text-[var(--mk-ink)] transition-colors group-hover:text-[var(--mk-paper)] sm:text-4xl">
                  {signal.title}
                </h3>
                <p className="mt-2 max-w-2xl leading-7 text-[var(--mk-ink-2)] transition-colors group-hover:text-[var(--mk-paper-2)]">
                  {signal.text}
                </p>
              </div>
              <p className="mk-mono whitespace-nowrap border-[1.5px] border-[var(--mk-line)] px-2.5 py-1.5 text-[var(--mk-ink-2)] transition-colors group-hover:border-[var(--mk-paper)] group-hover:text-[var(--mk-paper)]">
                {signal.tag}
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function Workflow() {
  return (
    <section id="workflow" className="scroll-mt-24 border-y-[1.5px] border-[var(--mk-line)] bg-[var(--mk-paper-2)]">
      <div className="cp-marketing py-16 sm:py-24">
        <Reveal>
          <p className="mk-mono text-[var(--mk-accent-strong)]">02 / Workflow</p>
          <h2 className="mk-h mt-4 text-[clamp(2.25rem,5.5vw,4.5rem)]">
            Three moves. <span className="mk-serif text-[var(--mk-accent)]">No</span> ceremony.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-0">
          {steps.map((item, index) => (
            <Reveal key={item.step} delay={index * 90} className={index > 0 ? 'md:border-l-[1.5px] md:border-[var(--mk-line)] md:pl-10' : 'md:pr-10'}>
              <p className="mk-mono text-[var(--mk-ink-3)]">{item.step}</p>
              <h3 className="mk-serif mt-4 text-[clamp(2.5rem,4vw,3.75rem)] leading-none text-[var(--mk-ink)]">{item.title}</h3>
              <p className="mt-4 leading-7 text-[var(--mk-ink-2)]">{item.text}</p>
              <p className="mk-mono mt-6 text-[var(--mk-accent-strong)]">{item.meta}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Evidence() {
  const stats = [
    ['04', 'analysis engines, one run'],
    ['05', 'signal families measured'],
    ['100%', 'of recommendations sourced'],
    ['00', 'fabricated metrics, ever'],
  ]

  return (
    <section id="evidence" className="scroll-mt-24 bg-[var(--mk-ink)] text-[var(--mk-paper)]">
      <div className="cp-marketing py-16 sm:py-24">
        <Reveal>
          <p className="mk-mono text-[var(--mk-accent)]">03 / Evidence, not vibes</p>
        </Reveal>
        <div className="mt-10 grid gap-px border-[1.5px] border-[var(--mk-paper)] sm:grid-cols-2 lg:grid-cols-4" style={{ background: 'var(--mk-paper)' }}>
          {stats.map(([value, label], index) => (
            <Reveal key={label} delay={index * 60} className="bg-[var(--mk-ink)] p-6">
              <p className="mk-serif text-[clamp(3rem,5vw,4.5rem)] leading-none text-[var(--mk-paper)]">{value}</p>
              <p className="mk-mono mt-3 text-[var(--mk-paper-2)] opacity-70">{label}</p>
            </Reveal>
          ))}
        </div>
        <Reveal delay={120}>
          <blockquote className="mt-16 max-w-4xl">
            <p className="mk-serif text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.2] text-[var(--mk-paper)]">
              “The first tool that shows me <span className="text-[var(--mk-accent)]">why</span> the
              codebase is tired — and proves it in front of my team.”
            </p>
            <footer className="mk-mono mt-6 text-[var(--mk-paper-2)] opacity-70">
              — Engineering lead, beta cohort
            </footer>
          </blockquote>
        </Reveal>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="cp-marketing py-20 text-center sm:py-28">
      <Reveal>
        <p className="mk-mono text-[var(--mk-accent-strong)]">04 / Begin</p>
        <h2 className="mk-h mx-auto mt-5 max-w-5xl text-[clamp(3rem,9vw,7.5rem)]">
          Start <span className="mk-serif text-[var(--mk-accent)]">listening.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-[var(--mk-ink-2)]">
          Point CodePulse at a public repository and see its first health report in minutes.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4">
          <Link to="/signup" className="mk-btn mk-btn-accent mk-btn-lg">
            Scan your first repository <ArrowUpRight size={16} />
          </Link>
          <p className="mk-mono text-[var(--mk-ink-3)]">Free while in beta — no card required</p>
        </div>
      </Reveal>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t-[1.5px] border-[var(--mk-line)] bg-[var(--mk-ink)] text-[var(--mk-paper)]">
      <div className="cp-marketing py-14">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div>
            <p className="font-[family-name:var(--font-display)] text-[clamp(2.5rem,6vw,4.5rem)] font-black uppercase leading-none tracking-[-0.03em]">
              CodePulse<sup className="text-[0.4em]">®</sup>
            </p>
            <p className="mk-mono mt-4 text-[var(--mk-paper-2)] opacity-70">
              Engineering intelligence platform
            </p>
          </div>
          <div className="grid grid-cols-2 gap-12">
            <div>
              <p className="mk-mono mb-4 text-[var(--mk-accent)]">Product</p>
              <ul className="space-y-2.5 text-sm">
                {['Signals', 'Workflow', 'Evidence'].map(item => (
                  <li key={item}>
                    <a href={`#${item.toLowerCase()}`} className="text-[var(--mk-paper-2)] transition-colors hover:text-[var(--mk-paper)]">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mk-mono mb-4 text-[var(--mk-accent)]">Account</p>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/signin" className="text-[var(--mk-paper-2)] transition-colors hover:text-[var(--mk-paper)]">Sign in</Link></li>
                <li><Link to="/signup" className="text-[var(--mk-paper-2)] transition-colors hover:text-[var(--mk-paper)]">Create account</Link></li>
                <li><Link to="/reset-password" className="text-[var(--mk-paper-2)] transition-colors hover:text-[var(--mk-paper)]">Reset password</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mk-mono mt-14 flex flex-col gap-2 border-t border-[var(--mk-paper-2)] pt-6 text-[var(--mk-paper-2)] opacity-70 sm:flex-row sm:justify-between">
          <p>© 2026 CodePulse — Engineering intelligence</p>
          <p>Set in Archivo & Instrument Serif</p>
        </div>
      </div>
    </footer>
  )
}

export default function MarketingPage() {
  return (
    <div className="mk min-h-screen">
      <div className="mk-grain" aria-hidden="true" />
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Signals />
        <Workflow />
        <Evidence />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
