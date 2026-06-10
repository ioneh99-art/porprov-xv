/**
 * PentaScore section layout wrapper — themed amber/dark (Sprint 5: + formula link)
 */
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, ChevronRight, Info, Shield } from 'lucide-react'

type Crumb = { label: string; href?: string }

export default function PentascoreShell({
  children, title, subtitle, actions, crumbs = [],
}: {
  children: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
  crumbs?: Crumb[]
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Page header */}
      <header className="border-b border-amber-500/20 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="px-6 py-4">
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Link href="/operator/pentascore" className="hover:text-amber-400 transition flex items-center gap-1">
              <Sparkles size={11} className="text-amber-500" />
              PentaScore
            </Link>
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-2">
                <ChevronRight size={11} />
                {c.href
                  ? <Link href={c.href} className="hover:text-amber-400">{c.label}</Link>
                  : <span className="text-amber-300">{c.label}</span>}
              </span>
            ))}
          </nav>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                {title}
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  BETA
                </span>
              </h1>
              {subtitle && (
                <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-6 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-800 mt-12">
        <div className="flex items-center justify-between text-xs text-slate-500 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Info size={12} />
            <span>PentaScore Indonesia · <code className="text-amber-300">uipm-2026-v1</code> (99.52% verified)</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/formula"
              target="_blank"
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              <Shield size={11} /> Formula Disclosure
            </Link>
            <Link href="/operator/pentathlon" className="text-slate-500 hover:text-amber-300">
              ← Back to Pentathlon Module
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
