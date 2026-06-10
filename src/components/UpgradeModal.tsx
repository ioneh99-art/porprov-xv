'use client'
/**
 * UpgradeModal — Pricing CTA + Trial 14 hari
 * 
 * Trigger:
 *   - Klik menu locked di sidebar
 *   - Klik tombol "Upgrade Subscription"
 * 
 * Shows pricing comparison + start trial / contact sales action.
 */

import { X, Check, Crown, Sparkles, ArrowRight, Zap } from 'lucide-react'
import { TIER_PRICING, type SubscriptionTier } from '@/lib/subscription-tier'
import { useState } from 'react'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  currentTier: SubscriptionTier
  targetTier: SubscriptionTier
  caborNama: string
}

const TIER_FEATURES: Record<SubscriptionTier, { headline: string; features: string[]; color: string; emoji: string }> = {
  basic: {
    headline: 'Operasional dasar gratis untuk semua cabor',
    color: 'slate',
    emoji: '🆓',
    features: ['Dashboard + KPI', 'Verifikasi Atlet', 'Lineup + Jadwal', 'Input Hasil generic', 'Klasemen basic', 'Profil settings'],
  },
  pro: {
    headline: 'AI assistant + analytics untuk pengprov serius',
    color: 'blue',
    emoji: '💼',
    features: [
      'Semua di BASIC +',
      '🤖 Sport Intelligence (AI chat Groq llama-3.3)',
      '📊 Performance Analytics + trend charts',
      '📝 Strategic Brief auto-generate 1x/minggu',
      '🎨 Custom Branding logo cabor',
      '📱 Athlete Portal self-service',
      '🔔 Smart Notifications',
    ],
  },
  elite: {
    headline: 'Intelligence + content automation untuk federasi populer',
    color: 'yellow',
    emoji: '🏆',
    features: [
      'Semua di PRO +',
      '🧬 Athlete Genome (biomotor + performance fusion)',
      '🔮 Medal Predictor PON 2028 / SEA Games',
      '🎬 Auto Highlight Reels (ione Factory integration)',
      '📢 Press Release Generator',
      '🎯 Talent Scout AI',
      '🏃 Mutation Analytics',
      '🔌 API Access enterprise',
      '🤝 Sponsor Matchmaking',
    ],
  },
  champion: {
    headline: 'Custom modules + dedicated support untuk PB nasional kelas atas',
    color: 'purple',
    emoji: '🌟',
    features: [
      'Semua di ELITE +',
      '🛠️ Custom Module (kayak Pentathlon UIPM)',
      '🎨 White-label rebranding total',
      '👤 Dedicated Success Manager',
      '🚀 Priority Roadmap Input',
      '🌐 International Tournament Integration (UIPM/FIBA/FIFA)',
      '💎 Dedicated AI Fine-tuning',
    ],
  },
}

export default function UpgradeModal({ open, onClose, currentTier, targetTier, caborNama }: UpgradeModalProps) {
  const [startingTrial, setStartingTrial] = useState(false)

  if (!open) return null

  const tiers: SubscriptionTier[] = ['basic', 'pro', 'elite', 'champion']

  const handleStartTrial = async () => {
    setStartingTrial(true)
    // TODO: Actually call API to start trial
    setTimeout(() => {
      alert(`Trial 14 hari ${targetTier.toUpperCase()} dimulai!\n\nSemua fitur ${targetTier.toUpperCase()} akan aktif sampai berakhir trial.\n\n(API endpoint /api/subscription/trial belum implemented — placeholder)`)
      setStartingTrial(false)
      onClose()
    }, 800)
  }

  const handleContactSales = () => {
    const subject = `Inquiry Upgrade ${caborNama} ke ${targetTier.toUpperCase()}`
    const body = `Halo, saya tertarik upgrade subscription PORPROV XV untuk cabor ${caborNama} dari ${currentTier.toUpperCase()} ke ${targetTier.toUpperCase()}.\n\nMohon info detail dan proses onboarding.`
    window.location.href = `mailto:sales@porprov-xv.id?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 flex items-center justify-center">
              <Crown size={18} className="text-yellow-400" />
            </div>
            <div>
              <div className="text-white font-semibold">Upgrade Subscription</div>
              <div className="text-slate-500 text-xs">{caborNama} · saat ini tier <span className="font-semibold uppercase">{currentTier}</span></div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Pricing Grid */}
        <div className="p-6">
          <div className="grid grid-cols-4 gap-3">
            {tiers.map(tier => {
              const config = TIER_FEATURES[tier]
              const pricing = TIER_PRICING[tier]
              const isCurrent = tier === currentTier
              const isTarget = tier === targetTier
              const isHigher = ['basic', 'pro', 'elite', 'champion'].indexOf(tier) > ['basic', 'pro', 'elite', 'champion'].indexOf(currentTier)

              const colorMap: Record<string, string> = {
                slate: 'border-slate-700 bg-slate-800/30',
                blue: 'border-blue-500/30 bg-blue-500/[0.03]',
                yellow: 'border-yellow-500/30 bg-yellow-500/[0.03]',
                purple: 'border-purple-500/30 bg-purple-500/[0.03]',
              }
              const headlineColorMap: Record<string, string> = {
                slate: 'text-slate-300',
                blue: 'text-blue-300',
                yellow: 'text-yellow-300',
                purple: 'text-purple-300',
              }

              return (
                <div key={tier} className={`relative rounded-xl border p-4 ${colorMap[config.color]} ${isTarget ? 'ring-2 ring-yellow-500/50' : ''}`}>
                  {isCurrent && (
                    <div className="absolute -top-2 left-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded-full">
                      CURRENT
                    </div>
                  )}
                  {isTarget && !isCurrent && (
                    <div className="absolute -top-2 left-3 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-[9px] font-bold px-2 py-0.5 rounded-full">
                      RECOMMENDED
                    </div>
                  )}

                  <div className="text-2xl mb-1">{config.emoji}</div>
                  <div className={`text-sm font-bold uppercase tracking-wider ${headlineColorMap[config.color]}`}>
                    {tier}
                  </div>
                  <div className="text-white text-lg font-bold mt-1">{pricing.label}</div>
                  <div className="text-slate-500 text-[10px] mt-0.5 leading-snug min-h-[28px]">
                    {config.headline}
                  </div>

                  <ul className="mt-3 space-y-1 min-h-[180px]">
                    {config.features.slice(0, 7).map((f, i) => (
                      <li key={i} className="text-[10px] text-slate-300 leading-relaxed flex items-start gap-1.5">
                        <Check size={9} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {isHigher && (
                    <button
                      onClick={() => { /* select this tier */ }}
                      disabled={!isTarget}
                      className={`mt-3 w-full text-[10px] font-bold py-1.5 rounded transition-all
                        ${isTarget 
                          ? 'bg-yellow-500 text-slate-900 hover:bg-yellow-400' 
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    >
                      {isTarget ? '✓ SELECTED' : 'Pilih'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* CTA */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={handleStartTrial}
              disabled={startingTrial}
              className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/40 hover:border-emerald-500/60 text-emerald-300 font-semibold text-sm px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {startingTrial ? (
                <div className="w-3 h-3 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Zap size={14} />
              )}
              Mulai Trial 14 Hari Gratis
            </button>
            <button
              onClick={handleContactSales}
              className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/40 hover:border-yellow-500/60 text-yellow-300 font-semibold text-sm px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles size={14} />
              Hubungi Sales
              <ArrowRight size={12} />
            </button>
          </div>

          {/* Info */}
          <div className="mt-4 bg-slate-800/30 border border-slate-700/50 rounded-xl px-4 py-3">
            <div className="text-[10px] text-slate-400 leading-relaxed">
              💡 <span className="font-semibold text-slate-300">Trial 14 hari</span> akses semua fitur tier yang dipilih tanpa kartu kredit. Setelah trial selesai, otomatis kembali ke tier <span className="uppercase font-bold">{currentTier}</span> kecuali confirm upgrade.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
