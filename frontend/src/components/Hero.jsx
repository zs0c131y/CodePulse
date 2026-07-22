import { ArrowRight, CheckCircle, Zap } from 'lucide-react'
import AuroraBackground from './AuroraBackground'

const ECG_PATH =
  'M0,40 L25,40 L35,35 L43,40 L47,10 L57,70 L65,40 L75,40 L82,33 L89,40 L120,40 ' +
  'L145,40 L155,35 L163,40 L167,10 L177,70 L185,40 L195,40 L202,33 L209,40 L240,40 ' +
  'L265,40 L275,35 L283,40 L287,10 L297,70 L305,40 L315,40 L322,33 L329,40 L360,40 ' +
  'L385,40 L395,35 L403,40 L407,10 L417,70 L425,40 L435,40 L442,33 L449,40 L480,40 ' +
  'L505,40 L515,35 L523,40 L527,10 L537,70 L545,40 L555,40 L562,33 L569,40 L600,40 ' +
  'L625,40 L635,35 L643,40 L647,10 L657,70 L665,40 L675,40 L682,33 L689,40 L720,40 ' +
  'L745,40 L755,35 L763,40 L767,10 L777,70 L785,40 L795,40 L802,33 L809,40 L840,40 ' +
  'L865,40 L875,35 L883,40 L887,10 L897,70 L905,40 L915,40 L922,33 L929,40 L960,40'

function HealthRing({ score = 87 }) {
  const r = 42
  const c = 2 * Math.PI * r
  const filled = (score / 100) * c

  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
        <circle
          cx="48" cy="48" r={r}
          fill="none"
          stroke="url(#healthGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
          className="animate-pulse-ring"
        />
        <defs>
          <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold leading-none text-white">{score}</span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wider text-mist-500">Health</span>
      </div>
    </div>
  )
}

function EcgLine() {
  return (
    <div className="relative h-15 w-full overflow-hidden rounded-md">
      <div className="animate-ecg flex h-[60px] w-[200%]">
        <svg viewBox="0 0 960 80" preserveAspectRatio="xMidYMid meet" className="block h-[60px] w-full">
          <path
            d={ECG_PATH}
            fill="none"
            stroke="#34d399"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}

const metrics = [
  { label: 'Knowledge Drift', value: '12%', color: 'text-amber-300', bg: 'bg-amber-400/[0.08] border-amber-400/20' },
  { label: 'Tech Debt', value: '4.2d', color: 'text-orange-300', bg: 'bg-orange-400/[0.08] border-orange-400/20' },
  { label: 'Risk Score', value: 'Low', color: 'text-emerald-300', bg: 'bg-emerald-400/[0.08] border-emerald-400/20' },
]

const trust = [
  'No credit card required',
  'Works with GitHub & GitLab',
  'Live in under 2 minutes',
]

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pt-24 pb-10">
      <AuroraBackground variant="hero" />

      <div className="cp-container relative grid w-full grid-cols-1 items-center gap-12 py-12 sm:py-16 lg:grid-cols-2 lg:gap-16 xl:py-20 2xl:gap-20">

        {/* Left column — copy */}
        <div className="space-y-8 animate-fade-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3.5 py-1.5 text-sm font-medium text-violet-300">
            <Zap size={12} className="fill-violet-400 text-violet-400" />
            AI-Powered Engineering Intelligence
          </div>

          {/* Headline */}
          <div className="space-y-1">
            <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl 2xl:text-8xl">
              Your codebase
              <br />
              has a <span className="text-gradient-aurora">pulse.</span>
            </h1>
            <p className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-white/35 sm:text-5xl lg:text-6xl 2xl:text-7xl">
              Are you listening?
            </p>
          </div>

          {/* Subtext */}
          <p className="max-w-2xl text-base leading-relaxed text-mist-400 sm:text-lg lg:max-w-lg 2xl:max-w-xl">
            CodePulse continuously analyzes your repositories — detecting knowledge drift,
            quantifying technical debt, and generating AI-powered recommendations before
            small problems become engineering crises.
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-3 min-[420px]:flex-row">
            <a
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3 font-semibold text-white shadow-xl shadow-violet-600/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-violet-600/50 hover:brightness-110 active:translate-y-0"
            >
              Get Early Access
              <ArrowRight size={16} />
            </a>
            <a
              href="#how-it-works"
              className="glass-panel inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-medium text-mist-300 transition-all duration-300 hover:border-white/20 hover:text-white"
            >
              See How It Works
            </a>
          </div>

          {/* Trust signals */}
          <ul className="flex flex-wrap gap-5">
            {trust.map(t => (
              <li key={t} className="flex items-center gap-1.5 text-sm text-mist-500">
                <CheckCircle size={13} className="shrink-0 text-emerald-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Right column — dashboard card */}
        <div className="relative animate-fade-up" style={{ animationDelay: '0.15s' }}>
          {/* Ambient glow behind card */}
          <div className="absolute inset-0 scale-105 rounded-3xl bg-gradient-to-br from-violet-600/25 via-cyan-500/10 to-emerald-500/10 blur-3xl" />

          {/* Card */}
          <div className="glass-panel card-hover relative space-y-5 overflow-hidden rounded-2xl p-5">
            {/* Subtle inner highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />

            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-display text-sm font-semibold text-white">Repository Health</p>
                <p className="text-xs text-mist-500">acme-corp/platform · synced just now</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live
              </span>
            </div>

            {/* Score + ECG */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <HealthRing score={87} />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-xs font-medium text-mist-500">Real-time activity</p>
                <EcgLine />
                <p className="text-xs text-emerald-300">● Healthy — no critical issues</p>
              </div>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
              {metrics.map(m => (
                <div key={m.label} className={`space-y-1 rounded-xl border p-3 text-center ${m.bg}`}>
                  <p className={`font-display text-base font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-[10px] leading-tight text-mist-400">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Alert */}
            <div className="flex items-start gap-3 rounded-xl border border-violet-400/20 bg-violet-500/[0.08] p-3.5">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600">
                <span className="text-[10px] font-bold text-white">!</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug text-white">Documentation drift detected</p>
                <p className="mt-0.5 text-xs leading-relaxed text-mist-400">
                  <code className="font-mono text-violet-300">auth/README.md</code> is 3 weeks behind recent changes to the auth module
                </p>
              </div>
            </div>

            {/* Bottom row */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-1 text-xs text-mist-500">
              <span>4 repos connected</span>
              <span className="cursor-pointer text-violet-300 transition-colors hover:text-violet-200">View full report →</span>
            </div>
          </div>

          {/* Floating chips */}
          <div className="glass-panel absolute -top-5 left-4 z-20 hidden items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-white animate-float lg:flex">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
            <span><span className="text-emerald-300">↑ 23%</span> maintainability</span>
          </div>
          <div className="glass-panel absolute -bottom-5 right-4 z-20 hidden items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-white animate-float-delayed lg:flex">
            <span className="h-2 w-2 shrink-0 rounded-full bg-violet-400" />
            <span><span className="text-violet-300">14</span> issues resolved</span>
          </div>
        </div>
      </div>

    </section>
  )
}
