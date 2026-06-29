'use client'
// src/components/konida/performance/AchievementBanner.tsx
// KBAAS Fase 1.2 — banner prestasi nasional terbaru atlet (≤180 hari).
// Variant: full (dossier), compact (warroom), badge (list).

import { useEffect, useState } from 'react'

interface Achievement {
  atlet_id: number
  latest_championship: string
  latest_medal: 'EMAS' | 'PERAK' | 'PERUNGGU'
  latest_level: string
  latest_mark: string
  event_date: string | null
  nomor_pertandingan: string | null
  kategori_umur: string | null
  gender: string | null
  is_recent_180d: boolean
  is_recent_30d: boolean
  tier: string
}

const CFG: Record<string, { emoji: string; from: string; to: string; ring: string; text: string; label: string }> = {
  EMAS:     { emoji: '🥇', from: '#facc15', to: '#d97706', ring: 'rgba(251,191,36,0.4)',  text: '#3b2f05', label: 'GOLD MEDALIST' },
  PERAK:    { emoji: '🥈', from: '#e2e8f0', to: '#94a3b8', ring: 'rgba(203,213,225,0.4)', text: '#1e293b', label: 'SILVER MEDALIST' },
  PERUNGGU: { emoji: '🥉', from: '#fb923c', to: '#c2410c', ring: 'rgba(251,146,60,0.4)',  text: '#3b1605', label: 'BRONZE MEDALIST' },
}

export default function AchievementBanner({ atletId, variant = 'full' }: { atletId: number; variant?: 'full' | 'compact' | 'badge' }) {
  const [a, setA] = useState<Achievement | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    fetch(`/api/konida/atlet-achievement?atlet_id=${atletId}`)
      .then(r => r.json()).then(d => { if (alive) { setA(d.achievement); setLoaded(true) } })
      .catch(() => { if (alive) setLoaded(true) })
    return () => { alive = false }
  }, [atletId])

  if (!loaded || !a || !a.is_recent_180d) return null
  const c = CFG[a.latest_medal]; if (!c) return null
  const tgl = a.event_date ? new Date(a.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null
  const detail = [a.nomor_pertandingan, a.kategori_umur, a.gender].filter(Boolean).join(' ')

  if (variant === 'badge') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
        style={{ background: `linear-gradient(90deg,${c.from},${c.to})`, color: c.text }}>
        {c.emoji} {a.latest_medal}
      </span>
    )
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: `linear-gradient(110deg,${c.from},${c.to})` }}>
        <span className="text-2xl">{c.emoji}</span>
        <div className="min-w-0">
          <div className="text-[12px] font-black truncate" style={{ color: c.text }}>{c.label}</div>
          <div className="text-[10px] font-semibold truncate" style={{ color: c.text, opacity: 0.85 }}>{detail}</div>
        </div>
      </div>
    )
  }

  // full
  return (
    <div className="relative overflow-hidden rounded-2xl p-4" style={{ background: `linear-gradient(115deg,${c.from},${c.to})`, boxShadow: `0 0 30px ${c.ring}` }}>
      {a.is_recent_30d && (
        <span className="absolute top-3 right-3 text-[9px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">NEW</span>
      )}
      <div className="flex items-start gap-3">
        <span className="text-5xl leading-none">{c.emoji}</span>
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: c.text, opacity: 0.7 }}>🏆 {c.label} · NASIONAL</div>
          <div className="text-base font-black mt-0.5" style={{ color: c.text }}>{a.latest_medal} {detail}</div>
          <div className="text-[12px] font-semibold mt-0.5" style={{ color: c.text, opacity: 0.9 }}>{a.latest_championship}</div>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] font-semibold" style={{ color: c.text, opacity: 0.8 }}>
            {tgl && <span>📅 {tgl}</span>}
            <span className="font-mono">⏱ {a.latest_mark}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
