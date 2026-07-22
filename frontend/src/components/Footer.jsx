import { Activity, GitFork, X as XIcon, Link2 } from 'lucide-react'

const links = {
  Product: ['Features', 'How It Works', 'Pricing', 'Changelog', 'Roadmap'],
  Company: ['About', 'Blog', 'Careers', 'Press', 'Contact'],
  Resources: ['Documentation', 'API Reference', 'Status', 'Security', 'Privacy'],
  Community: ['GitHub', 'Discord', 'Twitter', 'Newsletter', 'OSS'],
}

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.07]">
      <div className="pointer-events-none absolute inset-0">
        <div className="aurora-blob bottom-0 left-1/2 h-48 w-[36rem] -translate-x-1/2 bg-violet-900/[0.07]" />
      </div>

      <div className="cp-container relative py-16">
        <div className="grid grid-cols-1 gap-10 min-[420px]:grid-cols-2 md:grid-cols-5 2xl:gap-12">
          {/* Brand column */}
          <div className="col-span-2 space-y-4 md:col-span-1">
            <a href="#" className="group flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-400 shadow-lg shadow-violet-600/25">
                <Activity size={15} strokeWidth={2.5} className="text-white" />
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-white">
                Code<span className="text-gradient">Pulse</span>
              </span>
            </a>
            <p className="max-w-45 text-sm leading-relaxed text-mist-500">
              Engineering intelligence for healthy, maintainable codebases.
            </p>
            <div className="flex gap-3">
              {[
                { Icon: GitFork, label: 'GitHub' },
                { Icon: XIcon, label: 'Twitter' },
                { Icon: Link2, label: 'LinkedIn' },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="glass-chip flex h-8 w-8 items-center justify-center rounded-lg text-mist-500 transition-all duration-300 hover:border-white/20 hover:text-white"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section} className="space-y-4">
              <h4 className="font-display text-sm font-semibold text-white">{section}</h4>
              <ul className="space-y-2.5">
                {items.map(item => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-mist-500 transition-colors hover:text-mist-300"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-6 text-center md:flex-row md:text-left">
          <p className="text-sm text-mist-600">
            © {new Date().getFullYear()} CodePulse, Inc. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 md:justify-end">
            {['Terms', 'Privacy', 'Cookies', 'Security'].map(item => (
              <a
                key={item}
                href="#"
                className="text-sm text-mist-600 transition-colors hover:text-mist-400"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
