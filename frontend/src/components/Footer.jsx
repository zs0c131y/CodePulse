import { Activity, GitFork, X as XIcon, Link2 } from 'lucide-react'

const links = {
  Product: ['Features', 'How It Works', 'Pricing', 'Changelog', 'Roadmap'],
  Company: ['About', 'Blog', 'Careers', 'Press', 'Contact'],
  Resources: ['Documentation', 'API Reference', 'Status', 'Security', 'Privacy'],
  Community: ['GitHub', 'Discord', 'Twitter', 'Newsletter', 'OSS'],
}

export default function Footer() {
  return (
    <footer className="border-t border-white/6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-150 h-50 bg-violet-900/5 rounded-full blur-[80px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <a href="#" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-violet-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-600/20">
                <Activity size={15} strokeWidth={2.5} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg tracking-tight">
                Code<span className="gradient-text">Pulse</span>
              </span>
            </a>
            <p className="text-slate-500 text-sm leading-relaxed max-w-45">
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
                  className="w-8 h-8 rounded-lg glass flex items-center justify-center text-slate-500 hover:text-white hover:border-white/15 transition-all"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section} className="space-y-4">
              <h4 className="text-white text-sm font-semibold">{section}</h4>
              <ul className="space-y-2.5">
                {items.map(item => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-slate-500 text-sm hover:text-slate-300 transition-colors"
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
        <div className="mt-16 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-600 text-sm">
            © {new Date().getFullYear()} CodePulse, Inc. All rights reserved.
          </p>
          <div className="flex gap-6">
            {['Terms', 'Privacy', 'Cookies', 'Security'].map(item => (
              <a
                key={item}
                href="#"
                className="text-slate-600 text-sm hover:text-slate-400 transition-colors"
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
