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
    <section className="relative overflow-hidden border-y border-white/[0.06] py-14">
      <div className="cp-container space-y-9 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-mist-600">
          Trusted by engineering teams at forward-thinking companies
        </p>
        <div className="edge-fade-x overflow-hidden">
          <div className="animate-marquee flex w-max items-center gap-14 pr-14">
            {[...companies, ...companies].map((name, index) => (
              <span
                key={`${name}-${index}`}
                className="cursor-default select-none whitespace-nowrap font-display text-lg font-semibold tracking-tight text-mist-600 transition-colors duration-300 hover:text-mist-300"
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
