import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpenText,
  Brain,
  Check,
  ChevronRight,
  Code2,
  FileCode2,
  Fingerprint,
  GitBranch,
  GitCommitHorizontal,
  Network,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

/* ─── palette ───────────────────────────────────────────────── */
const C = {
  bg: "#080808",
  surface: "#0e0e0e",
  card: "#111111",
  border: "rgba(255,255,255,0.07)",
  borderHi: "rgba(255,255,255,0.13)",
  violet: "#8b5cf6",
  violetDim: "rgba(139,92,246,0.12)",
  violetGlow: "rgba(139,92,246,0.35)",
  cyan: "#22d3ee",
  cyanDim: "rgba(34,211,238,0.12)",
  green: "#4ade80",
  greenDim: "rgba(74,222,128,0.1)",
  orange: "#fb923c",
  orangeDim: "rgba(251,146,60,0.1)",
  red: "#f87171",
  redDim: "rgba(248,113,113,0.1)",
  amber: "#fbbf24",
  text: "#fafafa",
  muted: "#71717a",
  subtle: "#3f3f46",
};

/* ─── data ──────────────────────────────────────────────────── */
const modules = [
  { name: "Billing gateway", owner: "Payments", commits: 188, drift: 38, debt: 72, risk: 94, status: "Critical", color: C.red },
  { name: "Auth session",    owner: "Security",  commits: 96,  drift: 17, debt: 28, risk: 61, status: "Review",   color: C.amber },
  { name: "Search indexer",  owner: "Data",      commits: 143, drift: 29, debt: 44, risk: 78, status: "Review",   color: C.amber },
  { name: "Docs renderer",   owner: "DevEx",     commits: 41,  drift: 8,  debt: 16, risk: 36, status: "Healthy",  color: C.green },
];

const repos = [
  { name: "commerce-core",   branch: "release/checkout-v8", health: 82, drift: 31, debt: 46, risk: "Elevated", riskColor: C.red,   commits: 1842 },
  { name: "identity-edge",   branch: "main",                health: 91, drift: 12, debt: 19, risk: "Stable",   riskColor: C.green, commits: 967  },
  { name: "insights-worker", branch: "ai/retrieval",        health: 76, drift: 24, debt: 38, risk: "Watch",    riskColor: C.amber, commits: 1204 },
];

const logos = ["Axiom", "Cascade", "Fenix Corp", "Meridian", "Orbital", "Vertex HQ"];

const features = [
  {
    id: "repo",
    span: "lg:col-span-2",
    icon: GitBranch,
    color: C.violet,
    dim: C.violetDim,
    title: "Repository Intelligence",
    body: "Deep-clone and parse every repository. Tree-sitter extracts 18K+ symbols per repo, builds a full module ownership map, and traces every dependency edge to its origin.",
  },
  {
    id: "drift",
    span: "lg:row-span-2",
    icon: BookOpenText,
    color: C.cyan,
    dim: C.cyanDim,
    title: "Knowledge Drift Detection",
    body: "Semantic similarity models detect when documentation claims diverge from what the code actually does — at the function, module, and API level.",
  },
  {
    id: "debt",
    span: "",
    icon: BarChart3,
    color: C.orange,
    dim: C.orangeDim,
    title: "Technical Debt Analysis",
    body: "Cyclomatic complexity, circular dependency counts, and change velocity combine into a single weighted debt score with module-level breakdown.",
  },
  {
    id: "risk",
    span: "",
    icon: Brain,
    color: C.red,
    dim: C.redDim,
    title: "Risk Intelligence Engine",
    body: "AI-generated briefs explain exactly why a module is risky — citing specific dependency edges, documentation gaps, and commit patterns as evidence.",
  },
];

const steps = [
  { n: "01", label: "Ingest",  detail: "Clone, parse, index with Tree-sitter",        icon: GitBranch },
  { n: "02", label: "Map",     detail: "Build dependency and ownership graphs",        icon: Network   },
  { n: "03", label: "Detect",  detail: "Score drift, debt, and compounded risk",       icon: Radar     },
  { n: "04", label: "Explain", detail: "Generate evidence-backed AI risk briefs",      icon: Brain     },
];

const scanLines = [
  ["→", "Cloning github.com/acme/commerce-core"],
  ["✓", "18,422 symbols resolved (Tree-sitter)"],
  ["✓", "241 dependency edges mapped"],
  ["→", "Running semantic similarity scan…"],
  ["✓", "76 documentation chunks indexed"],
  ["⚠", "12 stale claims detected — drift 31%"],
  ["→", "Computing risk model…"],
  ["✓", "Risk: 94 · Status: Critical"],
];

/* ─── root ──────────────────────────────────────────────────── */
export default function App() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 130, damping: 28 });

  useEffect(() => {
    const h = (e: PointerEvent) => { mouseX.set(e.clientX); mouseY.set(e.clientY); };
    window.addEventListener("pointermove", h);
    return () => window.removeEventListener("pointermove", h);
  }, [mouseX, mouseY]);

  const glow = useTransform(
    [mouseX, mouseY],
    ([x, y]) => `radial-gradient(700px circle at ${x}px ${y}px, rgba(139,92,246,0.055), transparent 55%)`,
  );

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: C.bg, color: C.text }}>
      {/* progress */}
      <motion.div
        aria-hidden
        className="fixed left-0 right-0 top-0 z-50 h-[2px] origin-left"
        style={{ scaleX: bar, background: "linear-gradient(90deg,#8b5cf6,#22d3ee,#c084fc)" }}
      />
      {/* mouse glow */}
      <motion.div aria-hidden className="pointer-events-none fixed inset-0 z-0" style={{ background: glow }} />
      {/* ambient orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div style={{ position: "absolute", top: "-20%", left: "-15%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.1), transparent 65%)", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", top: "30%", right: "-20%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.07), transparent 65%)", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "30%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(192,132,252,0.08), transparent 65%)", filter: "blur(60px)" }} />
      </div>
      {/* dot grid */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "linear-gradient(to bottom, black 0%, transparent 75%)",
        }}
      />

      <Nav />
      <main className="relative z-10">
        <HeroSection />
        <LogosSection />
        <BentoSection />
        <HowItWorksSection />
        <DemoSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

/* ─── nav ───────────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 py-4">
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex w-full max-w-6xl items-center justify-between px-5 py-3 transition-all duration-300"
        style={
          scrolled
            ? { border: `1px solid ${C.border}`, background: "rgba(8,8,8,0.88)", backdropFilter: "blur(20px)", boxShadow: "0 8px 48px rgba(0,0,0,0.55)" }
            : { border: "1px solid transparent" }
        }
      >
        <a href="#" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center" style={{ border: `1px solid rgba(139,92,246,0.4)`, background: C.violetDim }}>
            <Activity size={16} style={{ color: C.violet }} />
          </span>
          <div>
            <span className="block font-display text-sm font-bold tracking-[0.2em]">CODEPULSE</span>
            <span className="block text-[11px] leading-none" style={{ color: C.muted }}>Engineering Intelligence</span>
          </div>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {[["Features", "#features"], ["How it works", "#howitworks"], ["Demo", "#demo"], ["Triage", "#triage"]].map(([l, h]) => (
            <a key={l} href={h} className="rounded px-4 py-2 text-sm font-medium transition" style={{ color: C.muted }}
              onMouseEnter={e => (e.currentTarget.style.color = C.text)}
              onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
              {l}
            </a>
          ))}
        </div>

        <a
          href="#demo"
          className="group inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white transition"
          style={{ background: C.violet, boxShadow: `0 0 24px ${C.violetGlow}` }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 40px ${C.violetGlow}`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${C.violetGlow}`; }}
        >
          Get started free
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </a>
      </motion.nav>
    </header>
  );
}

/* ─── hero ──────────────────────────────────────────────────── */
function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pb-24 pt-36 text-center">
      {/* badge */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mb-10 inline-flex items-center gap-2.5 px-4 py-2 text-sm font-medium"
        style={{ border: `1px solid rgba(139,92,246,0.3)`, background: C.violetDim, color: "#c4b5fd" }}
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: C.violet }} />
          <span className="relative inline-flex size-2 rounded-full" style={{ background: C.violet }} />
        </span>
        AI-powered repository intelligence · Open Beta
      </motion.div>

      {/* headline */}
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.07 }}
        className="max-w-5xl font-display font-bold leading-[0.87] tracking-tight"
        style={{ fontSize: "clamp(3.4rem,8.8vw,9rem)" }}
      >
        <span className="block" style={{ color: C.text }}>Your codebase,</span>
        <span
          className="block"
          style={{
            background: "linear-gradient(130deg,#a78bfa 0%,#22d3ee 45%,#c084fc 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          fully understood.
        </span>
      </motion.h1>

      {/* subtext */}
      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.16 }}
        className="mt-8 max-w-xl leading-8"
        style={{ fontSize: "clamp(1rem,1.7vw,1.15rem)", color: C.muted }}
      >
        CodePulse maps every dependency, detects documentation drift, and quantifies technical debt — then explains exactly what to fix and why.
      </motion.p>

      {/* ctas */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.24 }}
        className="mt-10 flex flex-wrap items-center justify-center gap-4"
      >
        <a
          href="#demo"
          className="group inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold text-white transition"
          style={{ background: C.violet, boxShadow: `0 0 40px ${C.violetGlow}` }}
        >
          Start analyzing free
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
        </a>
        <a
          href="#howitworks"
          className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold transition"
          style={{ border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.03)", color: "#d4d4d8" }}
        >
          See how it works
        </a>
      </motion.div>

      {/* product UI */}
      <motion.div
        initial={{ opacity: 0, y: 64, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
        className="relative mt-20 w-full max-w-5xl"
      >
        {/* animated gradient border */}
        <div className="animated-gradient-border absolute -inset-px" style={{ borderRadius: 0 }} />
        <ProductMockup />
      </motion.div>
    </section>
  );
}

function ProductMockup() {
  return (
    <div className="relative" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      {/* chrome bar */}
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full" style={{ background: "#ff5f57" }} />
          <span className="size-3 rounded-full" style={{ background: "#febc2e" }} />
          <span className="size-3 rounded-full" style={{ background: "#28c840" }} />
        </div>
        <span className="font-mono text-xs tracking-wider" style={{ color: C.muted }}>codepulse.app / commerce-core / risk</span>
        <span className="flex items-center gap-1.5 font-mono text-xs" style={{ color: C.muted }}>
          <span className="size-1.5 rounded-full" style={{ background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
          live scan
        </span>
      </div>

      {/* layout */}
      <div className="grid" style={{ gridTemplateColumns: "180px 1fr" }}>
        {/* sidebar */}
        <div style={{ borderRight: `1px solid ${C.border}`, padding: 16 }}>
          <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: C.subtle }}>Modules</p>
          <div className="space-y-1">
            {modules.map((m) => (
              <div
                key={m.name}
                className="flex items-center gap-2.5 rounded-none px-2 py-2 text-xs transition"
                style={{ color: m.status === "Critical" ? C.text : C.muted }}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ background: m.color, boxShadow: `0 0 6px ${m.color}` }} />
                <span className="truncate font-medium">{m.name}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 16, paddingTop: 16 }}>
            <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: C.subtle }}>Repos</p>
            {repos.map((r) => (
              <div key={r.name} className="mb-2 px-2 py-1.5 text-xs" style={{ color: C.muted }}>
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{r.name}</span>
                  <span className="ml-1 shrink-0 font-mono font-bold text-[10px]" style={{ color: r.riskColor }}>{r.health}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* main */}
        <div style={{ padding: 20 }}>
          {/* critical banner */}
          <div className="mb-5 flex items-start gap-3 p-4" style={{ border: `1px solid rgba(248,113,113,0.2)`, background: C.redDim }}>
            <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: C.red }} />
            <div>
              <p className="text-sm font-semibold">Billing gateway — Critical risk detected</p>
              <p className="mt-0.5 text-xs" style={{ color: C.muted }}>5 circular deps · 38% doc drift · 188 commits in 30 days</p>
            </div>
            <span className="ml-auto shrink-0 font-mono text-xs font-bold px-2 py-0.5" style={{ background: "rgba(248,113,113,0.15)", color: C.red, border: `1px solid rgba(248,113,113,0.25)` }}>94</span>
          </div>

          {/* metrics */}
          <div className="mb-5 space-y-3">
            {[
              { label: "Documentation drift", value: 38, color: C.cyan },
              { label: "Technical debt score", value: 72, color: C.amber },
              { label: "Compounded risk",      value: 94, color: C.red  },
            ].map((m) => (
              <div key={m.label} className="flex items-center gap-3">
                <span className="w-40 text-xs shrink-0" style={{ color: C.muted }}>{m.label}</span>
                <div className="h-1.5 flex-1" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    className="h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${m.value}%` }}
                    transition={{ duration: 1.1, delay: 0.8, ease: "easeOut" }}
                    style={{ background: m.color }}
                  />
                </div>
                <span className="w-9 text-right font-mono text-xs font-medium" style={{ color: m.color }}>{m.value}%</span>
              </div>
            ))}
          </div>

          {/* ai brief */}
          <div className="p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="mb-2.5 flex items-center gap-2">
              <Sparkles size={12} style={{ color: C.violet }} />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: C.violet }}>AI Risk Brief</span>
            </div>
            <p className="text-sm leading-6" style={{ color: "#a1a1aa" }}>
              Risk concentrates at the intersection of <span style={{ color: C.text }}>38% documentation drift</span> — checkout API docs now trail the implementation by 3 releases — and <span style={{ color: C.text }}>5 circular dependency edges</span> connecting payment adapters back into the core orchestration layer. High commit frequency (188 in 30 days) amplifies both vectors.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90" style={{ background: C.violet }}>
                <Sparkles size={11} />
                Generate remediation plan
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold transition hover:opacity-80" style={{ border: `1px solid ${C.border}`, color: "#a1a1aa" }}>
                View evidence chain
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── logos ─────────────────────────────────────────────────── */
function LogosSection() {
  return (
    <section className="px-4 py-16" style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.015)" }}>
      <div className="mx-auto max-w-5xl">
        <p className="mb-10 text-center text-xs font-bold uppercase tracking-[0.28em]" style={{ color: C.subtle }}>
          Trusted by engineering teams at
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-6">
          {logos.map((l) => (
            <span key={l} className="font-display text-base font-semibold transition" style={{ color: C.subtle }}>
              {l}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── bento ─────────────────────────────────────────────────── */
function BentoSection() {
  return (
    <section id="features" className="px-4 py-32">
      <div className="mx-auto max-w-6xl">
        <SectionLabel
          kicker="Features"
          title="One platform for complete repository intelligence."
          body="Every risk score CodePulse surfaces is traceable back to source symbols, dependency edges, documentation claims, and commit patterns. No black boxes."
        />

        <div className="mt-16 grid gap-3 lg:grid-cols-3" style={{ gridAutoRows: "minmax(240px, auto)" }}>
          {/* Repo Intelligence — wide */}
          <BentoCard feature={features[0]} extraStyle={{ minHeight: 280 }}>
            <RepoGraphVisual />
          </BentoCard>

          {/* Knowledge Drift — tall, spans 2 rows */}
          <BentoCard feature={features[1]} extraStyle={{ gridRow: "span 2" }}>
            <DriftVisual />
          </BentoCard>

          {/* Technical Debt */}
          <BentoCard feature={features[2]}>
            <DebtVisual />
          </BentoCard>

          {/* Risk Engine */}
          <BentoCard feature={features[3]}>
            <RiskVisual />
          </BentoCard>
        </div>
      </div>
    </section>
  );
}

function BentoCard({
  feature,
  children,
  extraStyle = {},
}: {
  feature: (typeof features)[number];
  children?: React.ReactNode;
  extraStyle?: React.CSSProperties;
}) {
  const Icon = feature.icon;
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative overflow-hidden flex flex-col ${feature.span}`}
      style={{
        background: C.card,
        border: `1px solid ${hovered ? C.borderHi : C.border}`,
        padding: 28,
        transition: "border-color 0.25s",
        ...extraStyle,
      }}
    >
      {/* hover glow */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{ background: `radial-gradient(480px circle at 30% 20%, ${feature.dim}, transparent 70%)`, opacity: hovered ? 1 : 0 }}
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="mb-5 grid size-11 place-items-center" style={{ background: feature.dim, border: `1px solid ${feature.color}22`, color: feature.color }}>
          <Icon size={20} />
        </div>
        <h3 className="mb-2 font-display text-lg font-semibold">{feature.title}</h3>
        <p className="mb-6 text-sm leading-6" style={{ color: C.muted }}>{feature.body}</p>
        <div className="mt-auto">{children}</div>
        <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold transition-all" style={{ color: feature.color }}>
          Learn more <ChevronRight size={14} />
        </div>
      </div>
    </motion.div>
  );
}

function RepoGraphVisual() {
  const nodes = [
    { x: "12%", y: "20%", label: "API",     color: C.violet },
    { x: "52%", y: "10%", label: "Docs",    color: C.cyan   },
    { x: "78%", y: "40%", label: "Auth",    color: C.green  },
    { x: "38%", y: "60%", label: "Billing", color: C.red    },
    { x: "16%", y: "75%", label: "Jobs",    color: C.amber  },
  ];
  const lines = [
    "M108 22 C260 10 420 80 682 42",
    "M342 60 C430 28 590 44 702 44",
    "M342 60 C300 40 200 30 108 22",
    "M342 60 C290 80 200 90 144 75",
  ];
  return (
    <div className="relative h-28 w-full overflow-hidden">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 120" preserveAspectRatio="none">
        {lines.map((d) => (
          <motion.path
            key={d}
            d={d}
            fill="none"
            stroke={`${C.violet}40`}
            strokeWidth="1.5"
            strokeDasharray="8 12"
            animate={{ strokeDashoffset: [0, -80] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          />
        ))}
      </svg>
      {nodes.map((n, i) => (
        <motion.div
          key={n.label}
          className="absolute flex items-center justify-center font-mono text-[10px] font-bold"
          style={{ left: n.x, top: n.y, transform: "translate(-50%,-50%)", width: 40, height: 40, background: C.surface, border: `1px solid ${n.color}30`, color: n.color }}
          animate={{ y: [0, i % 2 === 0 ? -5 : 5, 0] }}
          transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
        >
          {n.label}
        </motion.div>
      ))}
    </div>
  );
}

function DriftVisual() {
  const pairs = [
    { label: "Endpoint", docs: "POST /v1/checkout", code: "POST /v2/checkout", drifted: true },
    { label: "Auth",     docs: "Bearer token",      code: "Bearer token",      drifted: false },
    { label: "Response", docs: "{ orderId }",       code: "{ id, status }",    drifted: true },
  ];
  return (
    <div className="space-y-3">
      {pairs.map((p) => (
        <div key={p.label} className="text-xs">
          <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>{p.label}</span>
          <div className="grid grid-cols-2 gap-1">
            <div className="px-2 py-1.5 font-mono" style={{ background: "rgba(255,255,255,0.04)", color: p.drifted ? C.red : C.green, border: `1px solid ${p.drifted ? "rgba(248,113,113,0.2)" : "rgba(74,222,128,0.2)"}` }}>
              {p.docs}
            </div>
            <div className="px-2 py-1.5 font-mono" style={{ background: "rgba(255,255,255,0.04)", color: C.text, border: `1px solid ${C.border}` }}>
              {p.code}
            </div>
          </div>
        </div>
      ))}
      <div className="mt-2 flex items-center gap-2 text-xs font-semibold" style={{ color: C.cyan }}>
        <span className="size-2 rounded-full" style={{ background: C.red }} /> 2 drifted claims detected
      </div>
    </div>
  );
}

function DebtVisual() {
  return (
    <div className="flex items-end gap-4">
      <div>
        <div className="font-display text-6xl font-bold" style={{ color: C.orange }}>72</div>
        <div className="mt-1 text-xs" style={{ color: C.muted }}>Debt score</div>
      </div>
      <div className="flex-1 space-y-1.5 pb-1">
        {[
          { label: "Complexity",    v: 68 },
          { label: "Circular deps", v: 82 },
          { label: "Change rate",   v: 55 },
        ].map((b) => (
          <div key={b.label}>
            <div className="mb-0.5 flex justify-between">
              <span className="text-[10px]" style={{ color: C.muted }}>{b.label}</span>
              <span className="font-mono text-[10px]" style={{ color: C.orange }}>{b.v}%</span>
            </div>
            <div className="h-1" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div
                className="h-full"
                initial={{ width: 0 }}
                whileInView={{ width: `${b.v}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ background: C.orange }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskVisual() {
  return (
    <div className="p-3 text-xs" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles size={11} style={{ color: C.violet }} />
        <span className="font-mono font-bold uppercase tracking-widest" style={{ color: C.violet, fontSize: 10 }}>AI Generated</span>
      </div>
      <p className="leading-5" style={{ color: "#a1a1aa" }}>
        "Billing module risk is <span style={{ color: C.red }}>Critical</span>. Primary drivers: 5 circular dep edges, 38% doc drift trailing 3 releases, 188 commits this month."
      </p>
    </div>
  );
}

/* ─── how it works ──────────────────────────────────────────── */
function HowItWorksSection() {
  return (
    <section id="howitworks" className="px-4 py-32" style={{ borderTop: `1px solid ${C.border}` }}>
      <div className="mx-auto max-w-6xl">
        <SectionLabel
          kicker="How it works"
          title="From raw repository to actionable risk."
          body="A four-stage pipeline converts unstructured source control into structured engineering intelligence — in minutes, not sprints."
        />

        <div className="relative mt-20">
          {/* line */}
          <div
            className="absolute left-0 right-0 top-[28px] hidden h-px md:block"
            style={{ background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.3) 15%,rgba(34,211,238,0.3) 85%,transparent)" }}
          />

          <div className="grid gap-12 md:grid-cols-4">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ delay: i * 0.1 }}
                  className="relative text-center"
                >
                  <div
                    className="relative mx-auto mb-6 grid size-14 place-items-center"
                    style={{ border: `1px solid rgba(139,92,246,0.3)`, background: C.violetDim }}
                  >
                    <Icon size={22} style={{ color: C.violet }} />
                    <span
                      className="absolute -right-2 -top-2 grid size-5 place-items-center font-mono text-[10px] font-bold"
                      style={{ background: C.bg, color: C.violet, boxShadow: `0 0 0 1px rgba(139,92,246,0.4)` }}
                    >
                      {s.n}
                    </span>
                  </div>
                  <h3 className="mb-2 font-display text-lg font-semibold">{s.label}</h3>
                  <p className="text-sm leading-6" style={{ color: C.muted }}>{s.detail}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── demo (tabbed) ─────────────────────────────────────────── */
const TABS = ["Risk Overview", "Drift Detection", "Module Triage"] as const;
type Tab = (typeof TABS)[number];

function DemoSection() {
  const [active, setActive] = useState<Tab>("Risk Overview");

  return (
    <section id="demo" className="px-4 py-32" style={{ borderTop: `1px solid ${C.border}` }}>
      <div className="mx-auto max-w-6xl">
        <SectionLabel
          kicker="Live Demo"
          title="See CodePulse in action."
          body="Explore the three core surfaces: repository risk overview, drift detection, and module triage."
        />

        {/* tab bar */}
        <div className="mt-12 flex flex-wrap gap-1 p-1" style={{ background: C.card, border: `1px solid ${C.border}`, width: "fit-content" }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className="px-5 py-2.5 text-sm font-semibold transition-all"
              style={
                active === t
                  ? { background: C.violet, color: "#fff" }
                  : { background: "transparent", color: C.muted }
              }
            >
              {t}
            </button>
          ))}
        </div>

        {/* tab content */}
        <div className="mt-4" style={{ border: `1px solid ${C.border}`, background: C.surface }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
            >
              {active === "Risk Overview" && <RiskOverviewTab />}
              {active === "Drift Detection" && <DriftDetectionTab />}
              {active === "Module Triage" && <TriageTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function RiskOverviewTab() {
  const [selected, setSelected] = useState(0);
  const repo = repos[selected];

  return (
    <div className="grid lg:grid-cols-[200px_1fr]">
      {/* repo list */}
      <div className="space-y-2 p-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: C.subtle }}>Repositories</p>
        {repos.map((r, i) => (
          <motion.button
            key={r.name}
            whileTap={{ scale: 0.985 }}
            onClick={() => setSelected(i)}
            className="w-full p-3 text-left transition-all"
            style={{
              border: `1px solid ${selected === i ? "rgba(139,92,246,0.35)" : C.border}`,
              background: selected === i ? C.violetDim : "transparent",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-medium" style={{ color: selected === i ? C.text : C.muted }}>{r.name}</span>
              <span className="font-mono text-xs font-bold" style={{ color: r.riskColor }}>{r.health}</span>
            </div>
            <div className="mt-1 truncate font-mono text-xs" style={{ color: C.subtle }}>{r.branch}</div>
          </motion.button>
        ))}
      </div>

      {/* main */}
      <motion.div key={repo.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-display text-xl font-bold">{repo.name}</h3>
              <span className="px-2 py-0.5 font-mono text-[10px] font-bold uppercase" style={{ background: `${repo.riskColor}14`, color: repo.riskColor, border: `1px solid ${repo.riskColor}30` }}>{repo.risk}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-4 text-sm" style={{ color: C.muted }}>
              <span className="flex items-center gap-1.5"><GitBranch size={12} />{repo.branch}</span>
              <span className="flex items-center gap-1.5"><GitCommitHorizontal size={12} />{repo.commits.toLocaleString()} commits</span>
            </div>
          </div>
          <div className="flex gap-3">
            {[{ l: "Health", v: repo.health, c: "#a78bfa" }, { l: "Drift", v: repo.drift, c: C.cyan, s: "%" }, { l: "Debt", v: repo.debt, c: C.amber, s: "%" }].map((m) => (
              <div key={m.l} className="px-4 py-3 text-center" style={{ border: `1px solid ${C.border}`, background: C.card }}>
                <div className="font-display text-3xl font-bold" style={{ color: m.c }}>{m.v}{m.s}</div>
                <div className="mt-0.5 text-xs" style={{ color: C.muted }}>{m.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* evidence chain */}
          <div className="p-5" style={{ border: `1px solid ${C.border}`, background: C.card }}>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="grid size-9 place-items-center" style={{ border: `1px solid rgba(139,92,246,0.3)`, background: C.violetDim }}>
                <Fingerprint size={16} style={{ color: C.violet }} />
              </div>
              <div>
                <p className="text-sm font-semibold">Evidence chain</p>
                <p className="text-xs" style={{ color: C.muted }}>Verified data sources</p>
              </div>
            </div>
            {[["Tree-sitter symbols", "indexed"], ["Dependency graph", "mapped"], ["Docs embeddings", "ready"], ["Commit history", "analyzed"]].map(([l, s]) => (
              <div key={l} className="flex items-center justify-between py-2.5" style={{ borderBottom: `1px solid ${C.border}` }}>
                <span className="text-sm" style={{ color: C.muted }}>{l}</span>
                <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: C.green }}><Check size={12} />{s}</span>
              </div>
            ))}
          </div>

          {/* terminal */}
          <div className="p-5" style={{ border: `1px solid ${C.border}`, background: "#050507" }}>
            <div className="mb-4 flex items-center gap-2">
              <Terminal size={13} style={{ color: C.subtle }} />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: C.subtle }}>Scan stream</span>
            </div>
            <div className="space-y-2.5 font-mono text-xs">
              {scanLines.map(([sym, txt], i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08 }} className="flex gap-3">
                  <span style={{ color: sym === "✓" ? C.green : sym === "⚠" ? C.amber : C.violet, flexShrink: 0 }}>{sym}</span>
                  <span style={{ color: "#71717a" }}>{txt}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DriftDetectionTab() {
  const drifts = [
    { module: "Checkout API",     drift: 38, claims: 12, stale: 5,  severity: "High"   },
    { module: "Auth endpoints",   drift: 17, claims: 8,  stale: 2,  severity: "Medium" },
    { module: "Search API",       drift: 29, claims: 15, stale: 4,  severity: "High"   },
    { module: "Docs site render", drift: 8,  claims: 22, stale: 1,  severity: "Low"    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total documentation claims", v: 57, color: C.text },
          { label: "Stale claims detected", v: 12, color: C.red },
          { label: "Avg drift score", v: "23%", color: C.cyan },
        ].map((s) => (
          <div key={s.label} className="p-4" style={{ border: `1px solid ${C.border}`, background: C.card }}>
            <div className="font-display text-4xl font-bold" style={{ color: s.color }}>{s.v}</div>
            <div className="mt-1 text-xs" style={{ color: C.muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ border: `1px solid ${C.border}` }}>
        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-3.5 md:grid" style={{ borderBottom: `1px solid ${C.border}` }}>
          {["Module", "Drift", "Claims", "Stale", "Severity"].map((h) => (
            <span key={h} className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: C.subtle }}>{h}</span>
          ))}
        </div>
        {drifts.map((d, i) => {
          const sc = d.severity === "High" ? C.red : d.severity === "Medium" ? C.amber : C.green;
          return (
            <motion.div
              key={d.module}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className="grid items-center gap-4 px-5 py-4 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]"
              style={{ borderBottom: i < drifts.length - 1 ? `1px solid ${C.border}` : "none" }}
            >
              <div className="flex items-center gap-3">
                <Code2 size={15} style={{ color: C.muted }} />
                <span className="font-medium">{d.module}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div className="h-full" initial={{ width: 0 }} animate={{ width: `${d.drift}%` }} transition={{ duration: 0.8, delay: i * 0.07 }} style={{ background: C.cyan }} />
                </div>
                <span className="font-mono text-xs" style={{ color: C.cyan }}>{d.drift}%</span>
              </div>
              <span className="font-mono text-sm" style={{ color: C.muted }}>{d.claims}</span>
              <span className="font-mono text-sm" style={{ color: C.red }}>{d.stale}</span>
              <span className="inline-flex w-fit px-2 py-0.5 font-mono text-[10px] font-bold uppercase" style={{ background: `${sc}12`, color: sc, border: `1px solid ${sc}25` }}>{d.severity}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function TriageTab() {
  return (
    <div id="triage" className="p-6">
      <div style={{ border: `1px solid ${C.border}` }}>
        <div className="hidden grid-cols-[1.8fr_0.9fr_1fr_1fr_0.8fr_1fr] px-5 py-3.5 md:grid" style={{ borderBottom: `1px solid ${C.border}` }}>
          {["Module", "Owner", "Drift", "Debt", "Risk", "Status"].map((h) => (
            <span key={h} className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: C.subtle }}>{h}</span>
          ))}
        </div>
        {modules.map((m, i) => {
          const sc = m.status === "Critical" ? C.red : m.status === "Review" ? C.amber : C.green;
          return (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className="grid items-center gap-4 px-5 py-5 transition-colors hover:bg-white/[0.02] md:grid-cols-[1.8fr_0.9fr_1fr_1fr_0.8fr_1fr]"
              style={{ borderBottom: i < modules.length - 1 ? `1px solid ${C.border}` : "none" }}
            >
              <div className="flex items-center gap-3">
                <div className="grid size-9 shrink-0 place-items-center" style={{ border: `1px solid ${C.border}`, background: C.card }}>
                  <FileCode2 size={15} style={{ color: C.muted }} />
                </div>
                <div>
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-xs" style={{ color: C.subtle }}>{m.commits} commits</p>
                </div>
              </div>
              <span className="text-sm" style={{ color: C.muted }}>{m.owner}</span>
              <TriageMeter value={m.drift} color={C.cyan} />
              <TriageMeter value={m.debt} color={C.amber} />
              <span className="font-display text-2xl font-bold" style={{ color: sc }}>{m.risk}</span>
              <span className="inline-flex w-fit px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider" style={{ background: `${sc}12`, color: sc, border: `1px solid ${sc}25` }}>{m.status}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function TriageMeter({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div className="h-full" initial={{ width: 0 }} whileInView={{ width: `${value}%` }} viewport={{ once: true }} transition={{ duration: 0.8, ease: "easeOut" }} style={{ background: color }} />
      </div>
      <span className="font-mono text-xs" style={{ color }}>{value}%</span>
    </div>
  );
}

/* ─── cta ───────────────────────────────────────────────────── */
function CTASection() {
  return (
    <section className="px-4 pb-32 pt-16">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden p-16 text-center"
          style={{
            background: "radial-gradient(ellipse at 50% -30%, rgba(124,58,237,0.22) 0%, transparent 60%), #0d0d14",
            border: `1px solid rgba(139,92,246,0.2)`,
          }}
        >
          {/* top line */}
          <div className="pointer-events-none absolute left-0 right-0 top-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.7) 40%,rgba(34,211,238,0.5) 60%,transparent)" }} />
          {/* corner marks */}
          <div className="pointer-events-none absolute left-0 top-0 size-20" style={{ borderLeft: `1px solid rgba(139,92,246,0.25)`, borderTop: `1px solid rgba(139,92,246,0.25)` }} />
          <div className="pointer-events-none absolute bottom-0 right-0 size-20" style={{ borderRight: `1px solid rgba(139,92,246,0.25)`, borderBottom: `1px solid rgba(139,92,246,0.25)` }} />

          <div className="mb-7 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium" style={{ border: `1px solid rgba(139,92,246,0.3)`, background: C.violetDim, color: "#c4b5fd" }}>
            <Zap size={13} />
            First repository report in under 5 minutes
          </div>

          <h2
            className="mx-auto max-w-3xl font-display font-bold leading-[0.9]"
            style={{ fontSize: "clamp(2.5rem,5.5vw,5rem)", color: C.text }}
          >
            Start understanding your codebase today.
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-8" style={{ color: C.muted }}>
            Connect a GitHub repository and CodePulse delivers your first risk report in minutes — no config, no setup, no guessing.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#"
              className="group inline-flex items-center gap-2 px-9 py-4 font-semibold text-white transition"
              style={{ background: C.violet, boxShadow: `0 0 60px ${C.violetGlow}` }}
            >
              Analyze your first repository
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-sm" style={{ color: C.subtle }}>
            {["No credit card required", "Free for public repos", "Results in 5 minutes"].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <Check size={13} style={{ color: C.green }} />
                {t}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── footer ────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="px-4 py-14" style={{ borderTop: `1px solid ${C.border}` }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-12 sm:flex-row">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center" style={{ border: `1px solid rgba(139,92,246,0.4)`, background: C.violetDim }}>
                <Activity size={14} style={{ color: C.violet }} />
              </span>
              <span className="font-display text-sm font-bold tracking-[0.2em]">CODEPULSE</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-6" style={{ color: C.muted }}>
              Engineering intelligence for teams that ship with confidence.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-16 gap-y-8 text-sm">
            {[
              { heading: "Product", links: ["Features", "How it works", "Demo", "Triage"] },
              { heading: "Resources", links: ["Documentation", "API Reference", "GitHub", "Roadmap"] },
            ].map((col) => (
              <div key={col.heading} className="space-y-3">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: C.subtle }}>{col.heading}</p>
                {col.links.map((l) => (
                  <a key={l} href="#" className="block transition" style={{ color: C.muted }}
                    onMouseEnter={e => (e.currentTarget.style.color = C.text)}
                    onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
                    {l}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 pt-6" style={{ borderTop: `1px solid ${C.border}` }}>
          <p className="text-xs" style={{ color: C.subtle }}>© 2025 CodePulse. Built for engineering teams that care about codebase health.</p>
          <div className="flex gap-6 text-xs" style={{ color: C.subtle }}>
            {["Privacy", "Terms"].map((l) => (
              <a key={l} href="#" className="transition hover:text-zinc-400">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── shared ────────────────────────────────────────────────── */
function SectionLabel({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} className="max-w-3xl">
      <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.28em]" style={{ color: C.violet }}>{kicker}</p>
      <h2 className="font-display font-bold leading-[0.92]" style={{ fontSize: "clamp(2.2rem,5vw,4.5rem)", color: C.text }}>{title}</h2>
      <p className="mt-5 text-lg leading-8" style={{ color: C.muted }}>{body}</p>
    </motion.div>
  );
}
