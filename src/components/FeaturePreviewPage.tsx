'use client'
/**
 * FeaturePreviewPage — Beautiful template untuk preview features yang masih dalam development.
 * 
 * Showcase fitur yang akan dirilis sambil maintain consistency UI.
 * Bisa expand jadi functional page kapan saja tinggal replace `mockContent` dengan real data.
 */

import { ArrowLeft, Calendar, Sparkles, Check } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

interface FeaturePreviewPageProps {
  icon: ReactNode
  title: string
  subtitle: string
  tierBadge: 'PRO' | 'ELITE' | 'CHAMPION'
  description: string
  releaseTimeline: string  // e.g. "Q3 2026"
  capabilities: string[]
  mockContent?: ReactNode
  ctaText?: string
  onCtaClick?: () => void
}

export default function FeaturePreviewPage({
  icon, title, subtitle, tierBadge, description,
  releaseTimeline, capabilities, mockContent,
  ctaText = 'Request Early Access',
  onCtaClick,
}: FeaturePreviewPageProps) {
  const tierColor = tierBadge === 'PRO' ? 'blue' : tierBadge === 'ELITE' ? 'yellow' : 'purple'
  const tierClass: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  }

  return (
    <div>
      {/* Breadcrumb */}
      <Link href="/operator/dashboard"
        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs mb-4 transition-colors">
        <ArrowLeft size={12} />
        Kembali ke Dashboard
      </Link>

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/50 border border-slate-800 rounded-3xl p-8 mb-6 relative overflow-hidden">
        {/* Decorative gradient blob */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-yellow-500/10 to-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
              {icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${tierClass[tierColor]}`}>
                  {tierBadge === 'PRO' ? '💼' : tierBadge === 'ELITE' ? '🏆' : '🌟'} {tierBadge}
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Sparkles size={9} />
                  BETA PREVIEW
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">{title}</h1>
              <p className="text-slate-400 text-sm">{subtitle}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest">Target Release</div>
            <div className="text-yellow-400 text-sm font-bold flex items-center gap-1 mt-0.5">
              <Calendar size={12} />
              {releaseTimeline}
            </div>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-800/60 text-slate-300 text-sm leading-relaxed max-w-3xl">
          {description}
        </div>
      </div>

      {/* Capabilities */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-white text-sm font-semibold mb-3">What you'll be able to do</div>
          <ul className="space-y-2">
            {capabilities.map((cap, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                <div className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={9} className="text-emerald-400" />
                </div>
                <span>{cap}</span>
              </li>
            ))}
          </ul>

          <button onClick={onCtaClick}
            className="mt-5 w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-semibold text-xs px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2">
            <Sparkles size={12} />
            {ctaText}
          </button>
        </div>

        {/* Mock preview */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 min-h-[300px]">
          <div className="text-white text-sm font-semibold mb-3 flex items-center justify-between">
            <span>Preview</span>
            <span className="text-[9px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded">MOCK DATA</span>
          </div>
          {mockContent ?? (
            <div className="flex items-center justify-center h-full text-slate-600 text-xs">
              Preview UI akan tampil di sini
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
