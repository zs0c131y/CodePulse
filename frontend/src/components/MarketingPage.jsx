import { useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  Check,
  ChevronRight,
  Code2,
  GitBranch,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { Link } from '../lib/router'
import Reveal from './Reveal'
import { SeverityBadge } from './dashboard/shared'
import { Button } from './ui/button'
import { PulseMark } from './ui/pulse-mark'
import { ThemeToggle } from './ui/theme-toggle'

const navigation = [
  { label: 'Product', href: '#product' },
  { label: 'How it works', href: '#workflow' },
  { label: 'Trust', href: '#trust' },
]

const capabilities = [
  {
    icon: GitBranch,
    title: 'See the system clearly',
    text: 'Map repository structure, internal dependencies, code activity, and ownership without stitching together separate tools.',
  },
  {
    icon: BookOpenCheck,
    title: 'Catch knowledge drift',
    text: 'Find documentation that is missing, stale, or no longer aligned with the implementation your team depends on.',
  },
  {
    icon: ShieldCheck,
    title: 'Focus on the right risk',
    text: 'Group files by comparable risk and inspect the exact complexity, churn, dependency, and ownership signals behind each flag.',
  },
  {
    icon: BrainCircuit,
    title: 'Turn findings into a plan',
    text: 'Review evidence-backed changes by category, then request a plain-language AI explanation only when it adds value.',
  },
]

const workflow = [
  {
    number: '01',
    title: 'Connect a repository',
    text: 'Choose a connected GitHub or GitLab repository, or start with a supported public repository URL.',
  },
  {
    number: '02',
    title: 'Build the evidence',
    text: 'CodePulse analyzes structure, documentation, history, dependencies, coverage, and ownership signals in one run.',
  },
  {
    number: '03',
    title: 'Prioritize the work',
    text: 'Explore grouped risks, understand why files were flagged, and save a point-in-time report for the team.',
  },
]

const previewTabs = [
  { id: 'risk', label: 'Risk overview', icon: ShieldCheck },
  { id: 'drift', label: 'Knowledge drift', icon: BookOpenCheck },
  { id: 'actions', label: 'Recommended changes', icon: Sparkles },
]

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-[var(--ink-1)]" aria-label="CodePulse home">
      <PulseMark size={26} />
      <span className="text-base font-semibold tracking-[-0.025em]">CodePulse</span>
    </Link>
  )
}

function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line-1)] bg-[var(--surface-1)]">
      <div className="cp-marketing flex h-16 items-center justify-between gap-4">
        <Brand />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {navigation.map(item => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-[var(--r-md)] px-3 py-2 text-sm font-medium text-[var(--ink-3)] transition-colors duration-[var(--d-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-1)]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm"><Link to="/signin">Sign in</Link></Button>
          <Button asChild size="sm"><Link to="/signup">Get started</Link></Button>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => setOpen(value => !value)}
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
            aria-controls="landing-mobile-navigation"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>
      </div>

      {open && (
        <nav id="landing-mobile-navigation" className="border-t border-[var(--line-1)] bg-[var(--surface-1)] md:hidden" aria-label="Mobile navigation">
          <div className="cp-marketing py-3">
            {navigation.map(item => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center justify-between rounded-[var(--r-md)] px-3 text-sm font-medium text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
              >
                {item.label}<ChevronRight size={15} aria-hidden="true" />
              </a>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--line-1)] pt-3">
              <Button asChild variant="outline"><Link to="/signin">Sign in</Link></Button>
              <Button asChild><Link to="/signup">Get started</Link></Button>
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}

function RiskPreview() {
  const risks = [
    { path: 'src/billing/InvoicePipeline.ts', risk: 'Critical', score: 91, reason: 'High complexity · dependency cycle' },
    { path: 'src/auth/sessionStore.ts', risk: 'High', score: 76, reason: 'High churn · concentrated ownership' },
    { path: 'src/api/reportRoutes.ts', risk: 'Medium', score: 52, reason: 'Elevated complexity · recent changes' },
  ]

  return (
    <div className="space-y-2.5">
      {risks.map(item => (
        <div key={item.path} className="rounded-[var(--r-md)] border border-[var(--line-1)] bg-[var(--surface-1)] p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-all font-mono text-xs font-medium text-[var(--ink-1)]">{item.path}</p>
              <p className="mt-1 text-xs text-[var(--ink-3)]">{item.reason}</p>
            </div>
            <SeverityBadge severity={item.risk} />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${item.score}%` }} />
            </div>
            <span className="tnum w-8 text-right text-xs font-semibold text-[var(--ink-2)]">{item.score}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function DriftPreview() {
  const findings = [
    ['Authentication guide needs an update', 'docs/api/authentication.md', 'High'],
    ['Architecture overview is missing the risk engine', 'docs/architecture/system.md', 'Medium'],
    ['Billing module has no ownership guidance', 'src/billing', 'Medium'],
  ]

  return (
    <ul className="space-y-2.5">
      {findings.map(([title, path, severity]) => (
        <li key={title} className="flex items-start gap-3 rounded-[var(--r-md)] border border-[var(--line-1)] bg-[var(--surface-1)] p-3.5">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[var(--r-sm)] bg-[var(--accent-wash)] text-[var(--accent-ink)]">
            <BookOpenCheck size={14} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--ink-1)]">{title}</p>
            <p className="mt-1 break-all font-mono text-xs text-[var(--ink-3)]">{path}</p>
          </div>
          <SeverityBadge severity={severity} />
        </li>
      ))}
    </ul>
  )
}

function ActionsPreview() {
  const actions = [
    ['Dependency health', 'Break the dependency cycle around InvoicePipeline', '2–5 days'],
    ['Documentation', 'Refresh the authentication lifecycle guide', '0.5–1 day'],
    ['Change stability', 'Stabilize the high-churn session module', '1–3 days'],
  ]

  return (
    <ul className="space-y-2.5">
      {actions.map(([category, title, effort]) => (
        <li key={title} className="rounded-[var(--r-md)] border border-[var(--line-1)] bg-[var(--surface-1)] p-3.5">
          <div className="flex items-center gap-2 text-xs text-[var(--accent-ink)]">
            <Sparkles size={13} aria-hidden="true" />
            <span className="font-semibold">{category}</span>
          </div>
          <p className="mt-2 text-sm font-medium text-[var(--ink-1)]">{title}</p>
          <p className="mt-1 text-xs text-[var(--ink-3)]">Estimated effort: {effort}</p>
        </li>
      ))}
    </ul>
  )
}

function ProductPreview() {
  const [activeTab, setActiveTab] = useState(previewTabs[0].id)

  function handleTabKeyDown(event, index) {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (!keys.includes(event.key)) return
    event.preventDefault()

    let nextIndex = index
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + previewTabs.length) % previewTabs.length
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % previewTabs.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = previewTabs.length - 1

    setActiveTab(previewTabs[nextIndex].id)
    event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')[nextIndex]?.focus()
  }

  return (
    <div className="landing-preview overflow-hidden rounded-[var(--r-xl)] border border-[var(--line-2)] bg-[var(--surface-1)] shadow-[var(--shadow-e4)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line-1)] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <PulseMark size={28} />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[var(--ink-1)]">acme/platform</p>
            <p className="text-[0.6875rem] text-[var(--ink-3)]">Illustrative workspace preview</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] px-2.5 py-1 text-[0.6875rem] font-semibold text-[var(--sev-nominal-ink)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--sev-nominal)]" aria-hidden="true" /> Analysis complete
        </span>
      </div>

      <div className="border-b border-[var(--line-1)] px-2 sm:px-3">
        <div className="flex overflow-x-auto" role="tablist" aria-label="Product preview">
          {previewTabs.map((tab, index) => {
            const selected = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                id={`preview-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`preview-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={event => handleTabKeyDown(event, index)}
                className={`relative flex h-12 shrink-0 items-center gap-2 px-3 text-xs font-medium transition-colors duration-[var(--d-2)] ${selected ? 'text-[var(--ink-1)] after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-[var(--accent)]' : 'text-[var(--ink-3)] hover:text-[var(--ink-1)]'}`}
              >
                <Icon size={14} aria-hidden="true" /> {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div
        id={`preview-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`preview-tab-${activeTab}`}
        className="bg-[var(--surface-2)] p-3 sm:p-4"
      >
        {activeTab === 'risk' && <RiskPreview />}
        {activeTab === 'drift' && <DriftPreview />}
        {activeTab === 'actions' && <ActionsPreview />}
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="landing-hero-bg overflow-hidden border-b border-[var(--line-1)]">
      <div className="cp-marketing grid gap-12 pb-16 pt-16 sm:pb-20 sm:pt-20 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-24">
        <div>
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-line)] bg-[var(--accent-wash)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-ink)]">
              <BarChart3 size={14} aria-hidden="true" /> Repository intelligence for engineering teams
            </p>
          </Reveal>
          <Reveal delay={70}>
            <h1 className="mt-6 max-w-2xl text-[clamp(2.75rem,6vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.055em] text-[var(--ink-1)]">
              Know what makes your codebase harder to change.
            </h1>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-6 max-w-[62ch] text-base leading-7 text-[var(--ink-2)] sm:text-lg sm:leading-8">
              CodePulse connects repository structure, change history, documentation, dependencies, and ownership into one clear view of maintainability risk—and shows the evidence behind every priority.
            </p>
          </Reveal>
          <Reveal delay={210}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-5">
                <Link to="/signup">Analyze a repository <ArrowRight size={16} /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-5">
                <a href="#product">Explore the product</a>
              </Button>
            </div>
          </Reveal>
          <Reveal delay={280}>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--ink-3)]" aria-label="Product assurances">
              {['GitHub and GitLab', 'Evidence-linked findings', 'AI only on request'].map(item => (
                <li key={item} className="flex items-center gap-1.5"><Check size={13} className="text-[var(--sev-nominal-ink)]" aria-hidden="true" /> {item}</li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={160}>
          <ProductPreview />
        </Reveal>
      </div>
    </section>
  )
}

function Capabilities() {
  return (
    <section id="product" className="scroll-mt-24 py-20 sm:py-24 lg:py-28">
      <div className="cp-marketing">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--accent-ink)]">One view, connected evidence</p>
            <h2 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--ink-1)]">
              Move from scattered signals to a defensible engineering plan.
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--ink-3)]">
              CodePulse keeps the path from metric to finding to recommendation visible, so teams can decide what deserves attention without relying on a black box.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {capabilities.map((item, index) => {
            const Icon = item.icon
            return (
              <Reveal key={item.title} delay={index * 60}>
                <article className="panel panel-interactive h-full p-5 sm:p-6">
                  <span className="grid h-10 w-10 place-items-center rounded-[var(--r-md)] border border-[var(--accent-line)] bg-[var(--accent-wash)] text-[var(--accent-ink)]">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-[var(--ink-1)]">{item.title}</h3>
                  <p className="mt-2 max-w-[58ch] text-sm leading-6 text-[var(--ink-3)]">{item.text}</p>
                </article>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Workflow() {
  return (
    <section id="workflow" className="scroll-mt-24 border-y border-[var(--line-1)] bg-[var(--surface-2)] py-20 sm:py-24 lg:py-28">
      <div className="cp-marketing">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--accent-ink)]">How it works</p>
            <h2 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--ink-1)]">
              From repository to next action in three steps.
            </h2>
          </div>
        </Reveal>

        <ol className="mt-10 grid gap-4 lg:grid-cols-3">
          {workflow.map((item, index) => (
            <Reveal key={item.number} delay={index * 80}>
              <li className="panel h-full p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs font-semibold text-[var(--accent-ink)]">{item.number}</span>
                  {index < workflow.length - 1 && <ArrowRight size={15} className="hidden text-[var(--ink-4)] lg:block" aria-hidden="true" />}
                </div>
                <h3 className="mt-8 text-lg font-semibold tracking-[-0.02em] text-[var(--ink-1)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-3)]">{item.text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Trust() {
  const points = [
    ['Deterministic evidence first', 'Risk scores and recommended changes remain available without an AI provider.'],
    ['AI stays optional', 'Explanations run only when requested and use bounded stored evidence rather than raw repository source.'],
    ['Reports stay stable', 'Saved reports preserve the evidence captured at generation time and are private until you create a share link.'],
  ]

  return (
    <section id="trust" className="scroll-mt-24 py-20 sm:py-24 lg:py-28">
      <div className="cp-marketing">
        <Reveal>
          <div className="overflow-hidden rounded-[var(--r-xl)] bg-[var(--contrast)] text-[var(--contrast-on)]">
            <div className="grid gap-10 p-6 sm:p-9 lg:grid-cols-[0.85fr_1.15fr] lg:p-12">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-current/20 px-3 py-1.5 text-xs font-semibold">
                  <ShieldCheck size={14} aria-hidden="true" /> Built for trustworthy decisions
                </span>
                <h2 className="mt-5 text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--contrast-on)]">
                  Evidence you can inspect. AI you control.
                </h2>
                <p className="mt-4 max-w-[55ch] text-sm leading-6 text-[color:color-mix(in_srgb,var(--contrast-on)_72%,transparent)] sm:text-base sm:leading-7">
                  CodePulse separates measured repository evidence from optional generated explanation, so your team always knows what a conclusion is based on.
                </p>
              </div>

              <ul className="space-y-3">
                {points.map(([title, text]) => (
                  <li key={title} className="rounded-[var(--r-lg)] border border-current/15 bg-[color:color-mix(in_srgb,var(--contrast-on)_6%,transparent)] p-4">
                    <div className="flex gap-3">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--contrast-on)] text-[var(--contrast)]">
                        <Check size={13} aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--contrast-on)]">{title}</h3>
                        <p className="mt-1 text-sm leading-6 text-[color:color-mix(in_srgb,var(--contrast-on)_70%,transparent)]">{text}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="border-y border-[var(--line-1)] bg-[var(--accent-wash)] py-20 sm:py-24">
      <div className="cp-marketing text-center">
        <Reveal>
          <Code2 size={28} className="mx-auto text-[var(--accent-ink)]" aria-hidden="true" />
          <h2 className="mx-auto mt-5 max-w-3xl text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.06] tracking-[-0.045em] text-[var(--ink-1)]">
            Make the next refactor easier to defend.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--ink-3)]">
            Start with a repository, review the evidence, and give your team a clearer reason for what should change next.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-5"><Link to="/signup">Get started <ArrowRight size={16} /></Link></Button>
            <Button asChild variant="outline" size="lg" className="h-12 bg-[var(--surface-1)] px-5"><Link to="/signin">Sign in</Link></Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function LandingFooter() {
  return (
    <footer className="bg-[var(--surface-1)]">
      <div className="cp-marketing py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Brand />
            <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--ink-3)]">
              Engineering intelligence for healthier, easier-to-change repositories.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm">
            <div>
              <p className="font-semibold text-[var(--ink-1)]">Product</p>
              <ul className="mt-3 space-y-2 text-[var(--ink-3)]">
                {navigation.map(item => <li key={item.href}><a className="hover:text-[var(--ink-1)]" href={item.href}>{item.label}</a></li>)}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-[var(--ink-1)]">Account</p>
              <ul className="mt-3 space-y-2 text-[var(--ink-3)]">
                <li><Link className="hover:text-[var(--ink-1)]" to="/signin">Sign in</Link></li>
                <li><Link className="hover:text-[var(--ink-1)]" to="/signup">Create account</Link></li>
                <li><Link className="hover:text-[var(--ink-1)]" to="/reset-password">Reset password</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-9 border-t border-[var(--line-1)] pt-5 text-xs text-[var(--ink-3)]">
          © 2026 CodePulse. Repository intelligence with traceable evidence.
        </div>
      </div>
    </footer>
  )
}

export default function MarketingPage() {
  return (
    <div className="landing min-h-screen bg-[var(--surface-canvas)] text-[var(--ink-2)]">
      <LandingNav />
      <main>
        <Hero />
        <Capabilities />
        <Workflow />
        <Trust />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  )
}
