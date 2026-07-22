const companies = [
  'Acme Corp',
  'TechFlow',
  'DevStack',
  'CloudFirst',
  'DataBridge',
  'NeuralOps',
  'ShipFast',
]

export default function LogoBar() {
  return (
    <section className="relative overflow-hidden border-y border-[var(--line-1)] py-14">
      <div className="cp-marketing space-y-9 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--ink-4)]">
          Trusted by engineering teams at forward-thinking companies
        </p>
        <div className="edge-fade-x overflow-hidden">
          <div className="flex w-max items-center gap-14 pr-14">
            {[...companies, ...companies].map((name, index) => (
              <span
                key={`${name}-${index}`}
                className="cursor-default select-none whitespace-nowrap text-lg font-semibold tracking-tight text-[var(--ink-4)] transition-colors duration-300 hover:text-[var(--ink-2)]"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
