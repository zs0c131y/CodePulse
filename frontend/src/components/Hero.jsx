import { ArrowRight, CheckCircle, Zap } from 'lucide-react'

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
    <div className="relative w-28 h-28 shrink-0">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
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
        <span className="text-2xl font-bold text-white leading-none">{score}</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Health</span>
      </div>
    </div>
  )
}

function EcgLine() {
  return (
    <div className="overflow-hidden h-15 w-full rounded-md relative">
      <div
        className="animate-ecg"
        style={{ display: 'flex', width: '200%', height: '60px' }}
      >
        <svg
          viewBox="0 0 960 80"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: '60px', display: 'block' }}
        >
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
  { label: 'Knowledge Drift', value: '12%', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
  { label: 'Tech Debt', value: '4.2d', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' },
  { label: 'Risk Score', value: 'Low', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
]

const trust = [
  'No credit card required',
  'Works with GitHub & GitLab',
  'Live in under 2 minutes',
]

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 bg-[#030309]">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute top-1/3 left-1/4 w-125 h-125 bg-violet-600/8 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-100 h-100 bg-cyan-500/8 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-violet-900/5 rounded-full blur-[200px] pointer-events-none" />
      </div>

      <div className="cp-container relative grid w-full grid-cols-1 items-center gap-12 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16 xl:py-24 2xl:gap-20 2xl:py-28">

        {/* Left column — copy */}
        <div className="space-y-8 animate-fade-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 text-sm font-medium">
            <Zap size={12} className="fill-violet-400 text-violet-400" />
            AI-Powered Engineering Intelligence
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl 2xl:text-7xl">
              Your codebase<br />
              has a{' '}
              <span className="gradient-text">pulse.</span>
            </h1>
            <h2 className="text-4xl font-bold leading-[1.05] tracking-tight text-white/40 sm:text-5xl lg:text-6xl 2xl:text-7xl">
              Are you listening?
            </h2>
          </div>

          {/* Subtext */}
          <p className="max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg lg:max-w-lg 2xl:max-w-xl">
            CodePulse continuously analyzes your repositories — detecting knowledge drift,
            quantifying technical debt, and generating AI-powered recommendations before
            small problems become engineering crises.
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-3 min-[420px]:flex-row">
            <a
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-cyan-500 px-6 py-3 font-semibold text-white shadow-xl shadow-violet-600/25 transition-all hover:scale-[1.02] hover:opacity-90 active:scale-[0.98]"
            >
              Get Early Access
              <ArrowRight size={16} />
            </a>
            <a
              href="#how-it-works"
              className="glass inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-medium text-slate-300 transition-all hover:border-white/15 hover:text-white"
            >
              See How It Works
            </a>
          </div>

          {/* Trust signals */}
          <ul className="flex flex-wrap gap-5">
            {trust.map(t => (
              <li key={t} className="flex items-center gap-1.5 text-sm text-slate-500">
                <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Right column — dashboard card */}
        <div className="relative animate-fade-up" style={{ animationDelay: '0.15s' }}>
          {/* Ambient glow behind card */}
          <div className="absolute inset-0 bg-linear-to-br from-violet-600/20 to-cyan-500/10 rounded-3xl blur-2xl scale-105" />

          {/* Card */}
          <div className="relative glass card-glow rounded-2xl p-5 space-y-5 overflow-hidden">
            {/* Subtle inner highlight */}
            <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-violet-400/40 to-transparent" />

            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-white font-semibold text-sm">Repository Health</p>
                <p className="text-slate-500 text-xs">acme-corp/platform · synced just now</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>

            {/* Score + ECG */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <HealthRing score={87} />
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-xs text-slate-500 font-medium">Real-time activity</p>
                <EcgLine />
                <p className="text-xs text-emerald-400">● Healthy — no critical issues</p>
              </div>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
              {metrics.map(m => (
                <div key={m.label} className={`border rounded-xl p-3 text-center space-y-1 ${m.bg}`}>
                  <p className={`text-base font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Alert */}
            <div className="flex items-start gap-3 p-3.5 bg-violet-500/8 border border-violet-500/20 rounded-xl">
              <div className="mt-0.5 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                <span className="text-white text-[10px] font-bold">!</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white font-medium leading-snug">Documentation drift detected</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  <code className="text-violet-300">auth/README.md</code> is 3 weeks behind recent changes to the auth module
                </p>
              </div>
            </div>

            {/* Bottom row */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-1 text-xs text-slate-500">
              <span>4 repos connected</span>
              <span className="text-violet-400 hover:text-violet-300 cursor-pointer transition-colors">View full report →</span>
            </div>
          </div>

          {/* Floating chips — above/below the card so they never overlap card content */}
          <div className="absolute -top-5 left-4 glass rounded-xl px-3 py-2 text-xs font-medium text-white animate-float hidden lg:flex items-center gap-2 z-20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span><span className="text-emerald-400">↑ 23%</span> maintainability</span>
          </div>
          <div className="absolute -bottom-5 right-4 glass rounded-xl px-3 py-2 text-xs font-medium text-white animate-float-delayed hidden lg:flex items-center gap-2 z-20">
            <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
            <span><span className="text-violet-300">14</span> issues resolved</span>
          </div>
        </div>
      </div>

    </section>
  )
}
