import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Check,
  ChevronRight,
  FileWarning,
  GitBranch,
  Menu,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react'
import { ThemeToggle } from './ui/theme-toggle'

const productSignals = [
  ['Repository health', '86', 'Measured from code, docs, and change activity'],
  ['Documentation drift', '12', 'Findings that need a source-of-truth review'],
  ['High-risk modules', '4', 'Ranked by risk contribution and change pressure'],
]

const capabilities = [
  { icon: GitBranch, title: 'Map what changed', text: 'Turn repository structure, dependencies, and commit activity into a single operating picture.' },
  { icon: FileWarning, title: 'See knowledge drift', text: 'Find documentation that no longer matches the implementation your team relies on.' },
  { icon: ShieldAlert, title: 'Prioritize engineering risk', text: 'Bring debt, churn, ownership, and drift together so the next action is obvious.' },
  { icon: BrainCircuit, title: 'Explain the evidence', text: 'Give every recommendation a traceable reason, an impact, and a practical next step.' },
]

const steps = [
  ['Connect', 'Link GitHub or GitLab and choose the repository you want to understand.'],
  ['Measure', 'CodePulse builds a precise model of code, documentation, history, and dependencies.'],
  ['Decide', 'Review evidence-backed risk signals and share a clear engineering case with your team.'],
]

function Brand() {
  return <Link to="/" className="flex items-center gap-2.5 text-[var(--ink-1)]"><span className="grid h-9 w-9 place-items-center rounded-[var(--r-sm)] border border-[var(--line-2)] bg-[var(--surface-2)] shadow-[var(--shadow-e1)]"><Activity size={18} strokeWidth={1.8} /></span><span className="text-[1.0625rem] font-semibold tracking-[-.03em]">CodePulse</span></Link>
}

function Nav() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line-1)] bg-[color-mix(in_srgb,var(--surface-canvas)_88%,transparent)] backdrop-blur-xl">
      <div className="cp-marketing flex h-16 items-center justify-between">
        <Brand />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          <a href="#product" className="rounded-[var(--r-sm)] px-3 py-2 text-sm text-[var(--ink-3)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-1)]">Product</a>
          <a href="#workflow" className="rounded-[var(--r-sm)] px-3 py-2 text-sm text-[var(--ink-3)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-1)]">How it works</a>
          <a href="#principles" className="rounded-[var(--r-sm)] px-3 py-2 text-sm text-[var(--ink-3)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-1)]">Principles</a>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Link to="/signin" className="px-3 py-2 text-sm font-medium text-[var(--ink-2)] hover:text-[var(--ink-1)]">Sign in</Link>
          <Link to="/signup" className="inline-flex h-10 items-center gap-2 rounded-[var(--r-sm)] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-on)] shadow-[var(--shadow-e1)] hover:bg-[var(--accent-hover)]">Get started <ArrowRight size={15} /></Link>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button type="button" onClick={() => setOpen(value => !value)} className="grid h-10 w-10 place-items-center rounded-[var(--r-sm)] border border-[var(--line-2)] text-[var(--ink-2)]" aria-label="Toggle navigation">{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
      {open && <nav className="cp-marketing border-t border-[var(--line-1)] py-3 md:hidden" aria-label="Mobile navigation"><div className="grid gap-1"><a onClick={() => setOpen(false)} href="#product" className="rounded-[var(--r-sm)] px-3 py-3 text-sm text-[var(--ink-2)]">Product</a><a onClick={() => setOpen(false)} href="#workflow" className="rounded-[var(--r-sm)] px-3 py-3 text-sm text-[var(--ink-2)]">How it works</a><Link onClick={() => setOpen(false)} to="/signin" className="rounded-[var(--r-sm)] px-3 py-3 text-sm text-[var(--ink-2)]">Sign in</Link><Link to="/signup" className="mt-1 rounded-[var(--r-sm)] bg-[var(--accent)] px-3 py-3 text-center text-sm font-semibold text-[var(--accent-on)]">Get started</Link></div></nav>}
    </header>
  )
}

function InstrumentPreview() {
  return <div className="panel overflow-hidden p-5 sm:p-6"><div className="flex items-start justify-between gap-4 border-b border-[var(--line-1)] pb-5"><div><p className="overline text-[var(--ink-4)]">Repository instrument</p><p className="mt-1 font-mono text-sm text-[var(--ink-1)]">acme/platform</p></div><span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--sev-nominal-line)] bg-[var(--sev-nominal-wash)] px-2.5 py-1 text-xs font-semibold text-[var(--sev-nominal)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--sev-nominal)]" />Healthy</span></div><div className="grid gap-3 py-5 sm:grid-cols-[.9fr_1.1fr]"><div className="rounded-[var(--r-md)] bg-[var(--surface-2)] p-5"><p className="text-sm text-[var(--ink-3)]">Health score</p><div className="mt-3 flex items-end gap-3"><span className="tnum text-[3.25rem] font-semibold leading-none tracking-[-.05em] text-[var(--ink-1)]">86</span><span className="mb-1 text-sm font-medium text-[var(--sev-nominal)]">↑ 4 this week</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--surface-3)]"><div className="h-full w-[86%] rounded-full bg-[var(--sev-nominal)]" /></div></div><div className="rounded-[var(--r-md)] border border-[var(--line-1)] p-5"><div className="flex items-center justify-between"><p className="text-sm text-[var(--ink-2)]">Change pulse</p><span className="text-xs text-[var(--ink-4)]">90 days</span></div><svg viewBox="0 0 260 82" className="mt-5 h-20 w-full" role="img" aria-label="Sample repository activity waveform"><path d="M0 62 L18 56 L36 60 L54 38 L72 52 L90 25 L108 46 L126 42 L144 59 L162 31 L180 39 L198 16 L216 45 L234 35 L260 50" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><path d="M0 72H260" stroke="var(--line-2)" /></svg></div></div><div className="space-y-2">{['Documentation requires a review after the auth flow change', 'Billing module has high churn and complexity', 'Recommendation ready: separate retry orchestration'].map((finding, index) => <div key={finding} className="flex items-center gap-3 rounded-[var(--r-sm)] border border-[var(--line-1)] px-3 py-3"><span className={`h-2 w-2 rounded-full ${index === 0 ? 'bg-[var(--sev-medium)]' : index === 1 ? 'bg-[var(--sev-high)]' : 'bg-[var(--accent)]'}`} /><span className="min-w-0 flex-1 truncate text-sm text-[var(--ink-2)]">{finding}</span><ChevronRight size={15} className="text-[var(--ink-4)]" /></div>)}</div></div>
}

export default function MarketingPage() {
  return <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--ink-2)]"><Nav /><main><section className="cp-marketing grid gap-12 py-18 sm:py-24 lg:grid-cols-[1fr_.95fr] lg:items-center lg:gap-16"><div><p className="overline inline-flex items-center gap-2 text-[var(--accent-ink)]"><Sparkles size={14} />Engineering intelligence</p><h1 className="mt-5 max-w-3xl text-[var(--text-display-1)] font-semibold leading-[1.04] tracking-[-.045em] text-[var(--ink-1)]">A clearer case for better engineering decisions.</h1><p className="mt-6 max-w-xl text-[1.125rem] leading-8 text-[var(--ink-3)]">CodePulse measures the codebase signals behind technical debt, knowledge drift, and delivery risk—then turns them into evidence your team can use.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><a href="/signup" className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--r-sm)] bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-on)] shadow-[var(--shadow-e1)] hover:bg-[var(--accent-hover)]">Start with a repository <ArrowRight size={16} /></a><a href="#workflow" className="inline-flex h-11 items-center justify-center rounded-[var(--r-sm)] border border-[var(--line-2)] px-5 text-sm font-semibold text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-1)]">How CodePulse works</a></div><ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--ink-3)]">{['Evidence over opinion', 'GitHub and GitLab', 'Built for technical leaders'].map(item => <li key={item} className="inline-flex items-center gap-2"><Check size={14} className="text-[var(--sev-nominal)]" />{item}</li>)}</ul></div><InstrumentPreview /></section><section id="product" className="border-y border-[var(--line-1)] bg-[var(--surface-1)]"><div className="cp-marketing py-16 sm:py-20"><div className="max-w-2xl"><p className="overline text-[var(--accent-ink)]">The operational view</p><h2 className="mt-3 text-[var(--text-title-1)] font-semibold tracking-[-.035em] text-[var(--ink-1)]">Know where to look before the cost compounds.</h2></div><div className="mt-10 grid gap-px overflow-hidden rounded-[var(--r-md)] border border-[var(--line-1)] bg-[var(--line-1)] md:grid-cols-3">{productSignals.map(([label, value, text]) => <div key={label} className="bg-[var(--surface-1)] p-6"><p className="text-sm text-[var(--ink-3)]">{label}</p><p className="tnum mt-5 text-[2.5rem] font-semibold leading-none tracking-[-.04em] text-[var(--ink-1)]">{value}</p><p className="mt-4 text-sm leading-6 text-[var(--ink-3)]">{text}</p></div>)}</div></div></section><section className="cp-marketing py-16 sm:py-24"><div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]"><div><p className="overline text-[var(--accent-ink)]">What it changes</p><h2 className="mt-3 text-[var(--text-title-1)] font-semibold tracking-[-.035em] text-[var(--ink-1)]">One calm workspace for engineering health.</h2><p className="mt-4 max-w-md text-base leading-7 text-[var(--ink-3)]">No novelty metrics, no decorative dashboards. Every signal exists to support a concrete conversation or decision.</p></div><div className="grid gap-4 sm:grid-cols-2">{capabilities.map(({ icon: Icon, title, text }) => <article key={title} className="panel panel-interactive p-5"><span className="grid h-10 w-10 place-items-center rounded-[var(--r-sm)] bg-[var(--accent-wash)] text-[var(--accent-ink)]"><Icon size={19} strokeWidth={1.75} /></span><h3 className="mt-5 text-lg font-semibold tracking-[-.02em] text-[var(--ink-1)]">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--ink-3)]">{text}</p></article>)}</div></div></section><section id="workflow" className="border-y border-[var(--line-1)] bg-[var(--surface-1)]"><div className="cp-marketing py-16 sm:py-24"><div className="max-w-2xl"><p className="overline text-[var(--accent-ink)]">A precise workflow</p><h2 className="mt-3 text-[var(--text-title-1)] font-semibold tracking-[-.035em] text-[var(--ink-1)]">From repository to a decision you can defend.</h2></div><ol className="mt-10 grid gap-4 md:grid-cols-3">{steps.map(([number, text], index) => <li key={number} className="panel relative p-6"><span className="tnum text-sm font-semibold text-[var(--accent-ink)]">0{index + 1}</span><h3 className="mt-8 text-xl font-semibold tracking-[-.02em] text-[var(--ink-1)]">{number}</h3><p className="mt-3 text-sm leading-6 text-[var(--ink-3)]">{text}</p></li>)}</ol></div></section><section id="principles" className="cp-marketing py-16 sm:py-24"><div className="rounded-[var(--r-lg)] border border-[var(--line-1)] bg-[var(--surface-1)] px-6 py-12 text-center shadow-[var(--shadow-e1)] sm:px-12"><BadgeCheck size={26} className="mx-auto text-[var(--sev-nominal)]" /><h2 className="mx-auto mt-5 max-w-2xl text-[var(--text-title-1)] font-semibold tracking-[-.035em] text-[var(--ink-1)]">Built to make engineering tradeoffs legible.</h2><p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--ink-3)]">Start with one repository. See the evidence behind its health. Turn the next review into a more useful conversation.</p><a href="/signup" className="mt-7 inline-flex h-11 items-center gap-2 rounded-[var(--r-sm)] bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-on)] shadow-[var(--shadow-e1)] hover:bg-[var(--accent-hover)]">Create your workspace <ArrowRight size={16} /></a></div></section></main><footer className="border-t border-[var(--line-1)]"><div className="cp-marketing flex flex-col gap-4 py-8 text-sm text-[var(--ink-3)] sm:flex-row sm:items-center sm:justify-between"><Brand /><p>© {new Date().getFullYear()} CodePulse. Engineering intelligence for maintainable systems.</p><div className="flex gap-4"><a href="/signin" className="hover:text-[var(--ink-1)]">Sign in</a><a href="/signup" className="hover:text-[var(--ink-1)]">Get started</a></div></div></footer></div>
}
