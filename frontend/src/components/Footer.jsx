import { Activity, GitFork, X as XIcon, Link2 } from 'lucide-react'

const links = {
  Product: ['Features', 'How It Works', 'Pricing', 'Changelog', 'Roadmap'],
  Company: ['About', 'Blog', 'Careers', 'Press', 'Contact'],
  Resources: ['Documentation', 'API Reference', 'Status', 'Security', 'Privacy'],
  Community: ['GitHub', 'Discord', 'Twitter', 'Newsletter', 'OSS'],
}

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-[var(--line-1)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="bottom-0 left-1/2 h-48 w-[36rem] -translate-x-1/2 bg-[var(--accent)]/[0.07]" />
      </div>

      <div className="cp-marketing relative py-16">
        <div className="grid grid-cols-1 gap-10 min-[420px]:grid-cols-2 md:grid-cols-5 2xl:gap-12">
          {/* Brand column */}
          <div className="col-span-2 space-y-4 md:col-span-1">
            <a href="#" className="group flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)] shadow-[var(--shadow-e2)] shadow-[var(--shadow-e2)]">
                <Activity size={15} strokeWidth={2.5} className="text-[var(--ink-1)]" />
              </span>
              <span className="text-lg font-bold tracking-tight text-[var(--ink-1)]">
                Code<span className="text-[var(--accent-ink)]">Pulse</span>
              </span>
            </a>
            <p className="max-w-45 text-sm leading-relaxed text-[var(--ink-3)]">
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
                  className="panel-2 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ink-3)] transition-all duration-300 hover:border-[var(--line-3)] hover:text-[var(--ink-1)]"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section} className="space-y-4">
              <h4 className="text-sm font-semibold text-[var(--ink-1)]">{section}</h4>
              <ul className="space-y-2.5">
                {items.map(item => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-[var(--ink-3)] transition-colors hover:text-[var(--ink-2)]"
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
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-[var(--line-1)] pt-6 text-center md:flex-row md:text-left">
          <p className="text-sm text-[var(--ink-4)]">
            © {new Date().getFullYear()} CodePulse, Inc. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 md:justify-end">
            {['Terms', 'Privacy', 'Cookies', 'Security'].map(item => (
              <a
                key={item}
                href="#"
                className="text-sm text-[var(--ink-4)] transition-colors hover:text-[var(--ink-3)]"
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
