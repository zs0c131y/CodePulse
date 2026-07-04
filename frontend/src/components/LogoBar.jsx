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
    <section className="py-16 border-y border-white/5 relative overflow-hidden">
      <div className="cp-container text-center space-y-8">
        <p className="text-sm text-slate-500 uppercase tracking-widest font-medium">
          Trusted by engineering teams at forward-thinking companies
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {companies.map(name => (
            <span
              key={name}
              className="text-slate-600 text-lg font-semibold tracking-tight hover:text-slate-400 transition-colors cursor-default select-none"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
