'use client'
// src/components/konida/PrestasiAlert.tsx
// KBAAS — kartu alert prestasi nasional atlet Kab. Bandung (dipakai di Dashboard & Radar Prestasi).

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Medal, ChevronRight } from 'lucide-react'
import { caborToSlug } from '@/lib/performance/cabor-accent-map'

const medalIcon = (m: string | null) => m === 'EMAS' ? '🥇' : m === 'PERAK' ? '🥈' : m === 'PERUNGGU' ? '🥉' : ''
const dossierHref = (r: any) => `/konida/performance/kabbandung/${caborToSlug(r.cabor_nama || '')}/${r.atlet_id}`

export default function PrestasiAlert({ title = 'Alert Prestasi — Atlet Kab. Bandung' }: { title?: string }) {
  const [medalists, setMedalists] = useState<any[]>([])

  useEffect(() => {
    let alive = true
    fetch('/api/konida/pipeline-watch').then(r => r.json()).then(d => {
      if (alive) setMedalists((d.rows ?? []).filter((r: any) => r.atlet_kontingen_id === 4 && r.medal))
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  if (medalists.length === 0) return null

  return (
    <div className="rounded-2xl p-5 mb-5" style={{ background: 'linear-gradient(120deg,rgba(251,191,36,0.12),rgba(251,191,36,0.03))', border: '1px solid rgba(251,191,36,0.25)' }}>
      <div className="flex items-center gap-2 mb-3"><Medal size={15} style={{ color: '#fbbf24' }} /><h3 className="text-sm font-bold text-white">{title}</h3></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {medalists.map(r => (
          <Link key={r.id} href={dossierHref(r)}
            className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-white/[0.06] group"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="text-2xl">{medalIcon(r.medal)}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-white truncate">{r.atlet_db_nama ?? r.athlete_name_raw}</div>
              <div className="text-[11px] text-slate-400 truncate">{r.medal} · {r.nomor_pertandingan} {r.kategori_umur} {r.gender} · <span className="font-mono text-slate-300">{r.mark}</span></div>
              <div className="text-[10px] text-slate-600 truncate">{r.event_short_name}</div>
            </div>
            <ChevronRight size={16} className="text-slate-600 group-hover:text-amber-400 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
