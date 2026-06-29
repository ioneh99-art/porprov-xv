'use client'
// src/components/konida/performance/MultiDisciplineProjection.tsx
// KBAAS Fase 2.6 — projeksi performa ke nomor sefamili (mis. 10K Race Walk -> 20K).

import { useEffect, useState } from 'react'
import { TrendingUp, ArrowRight } from 'lucide-react'

const ACCENT = '#38bdf8'

interface Proj {
  source_event: string; source_mark: string; source_seconds: number
  target_event: string; projected_seconds: number
  family_name: string; conversion_factor: number; confidence: string
}

function fmt(s: number) {
  if (!s) return '-'
  if (s >= 3600) { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` }
  const m = Math.floor(s / 60), x = s % 60; return `${m}:${String(x).padStart(2, '0')}`
}
const cColor = (c: string) => c === 'HIGH' ? '#34d399' : c === 'MEDIUM' ? '#fbbf24' : '#94a3b8'

export default function MultiDisciplineProjection({ atletId, targetNomor }: { atletId: number; targetNomor: string }) {
  const [rows, setRows] = useState<Proj[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    fetch(`/api/konida/atlet-projection?atlet_id=${atletId}&target=${encodeURIComponent(targetNomor)}`)
      .then(r => r.json()).then(d => { if (alive) { setRows(d.projections ?? []); setLoaded(true) } })
      .catch(() => { if (alive) setLoaded(true) })
    return () => { alive = false }
  }, [atletId, targetNomor])

  if (!loaded || rows.length === 0) return null

  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 mb-1"><TrendingUp size={14} style={{ color: ACCENT }} /><h3 className="text-sm font-bold text-white">Projeksi Performa → {targetNomor}</h3></div>
      <p className="text-[10px] text-slate-600 mb-3">Estimasi dari hasil kejurnas nomor sefamili (rasio waktu antar-event)</p>
      <div className="space-y-2.5">
        {rows.map((p, i) => (
          <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', borderLeft: `3px solid ${cColor(p.confidence)}` }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-[11px] text-slate-400">
                Dasar: <span className="text-slate-200 font-semibold">{p.source_event}</span> <span className="font-mono" style={{ color: ACCENT }}>{p.source_mark}</span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ color: cColor(p.confidence), background: `${cColor(p.confidence)}18` }}>{p.confidence}</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <ArrowRight size={16} className="text-slate-600" />
              <span className="text-[11px] text-slate-500">Estimasi {p.target_event}:</span>
              <span className="text-lg font-mono font-black" style={{ color: '#a855f7' }}>{fmt(p.projected_seconds)}</span>
            </div>
            <div className="text-[10px] text-slate-600 mt-1">Faktor {p.conversion_factor.toFixed(2)}x · family {p.family_name}</div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-slate-600 mt-3 italic">⚠️ Estimasi kasar rasio waktu antar-event. Faktor individu (endurance/teknik) bisa menyebabkan deviasi.</div>
    </div>
  )
}
