'use client'
// src/app/operator/dayung/anomaly/page.tsx
// Phase 2 — Deteksi anomali waktu (z-score live per nomor) dari hasil_pertandingan.

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { DAYUNG } from '@/lib/sport-plugins/dayung/config'
import { detectAnomaly, SEVERITY_COLOR, reasonLabel, type Severity } from '@/lib/sport-plugins/dayung/anomaly'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const fmt = (s: number) => {
  const m = Math.floor(s / 60), sec = (s % 60).toFixed(2).padStart(5, '0')
  return `${m}:${sec}`
}

export default function DayungAnomalyPage() {
  const [findings, setFindings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [scanned, setScanned] = useState(0)

  useEffect(() => {
    (async () => {
      const me = await fetch('/api/auth/me').then(r => r.json()).catch(() => ({}))
      const caborId = me?.cabor_id ?? DAYUNG.caborId
      const { data: nomors } = await sb.from('nomor_pertandingan').select('id,nama').eq('cabor_id', caborId)
      const nomorIds = (nomors ?? []).map(n => n.id)
      const nameById: Record<number, string> = {}
      for (const n of nomors ?? []) nameById[n.id] = n.nama

      let totalResults = 0
      const flagged: any[] = []
      // per nomor (event) — grup paling valid utk z-score
      for (let i = 0; i < nomorIds.length; i += 50) {
        const batch = nomorIds.slice(i, i + 50)
        const { data: hasil } = await sb.from('hasil_pertandingan')
          .select('nomor_id,atlet_id,nilai,atlet:atlet_id(nama_lengkap)')
          .in('nomor_id', batch).not('nilai', 'is', null)
        const byNomor: Record<number, any[]> = {}
        for (const h of hasil ?? []) { if ((h.nilai ?? 0) > 0) (byNomor[h.nomor_id] ||= []).push(h) }
        for (const nid in byNomor) {
          const rows = byNomor[+nid]
          totalResults += rows.length
          const sample = rows.map(r => Number(r.nilai))
          for (const r of rows) {
            const res = detectAnomaly(Number(r.nilai), sample)
            if (res.is_anomaly) flagged.push({
              nomor: nameById[+nid], nama: (r.atlet as any)?.nama_lengkap ?? '?',
              waktu: Number(r.nilai), ...res,
            })
          }
        }
      }
      flagged.sort((a, b) => Math.abs(b.z_score) - Math.abs(a.z_score))
      setFindings(flagged); setScanned(totalResults); setLoading(false)
    })()
  }, [])

  return (
    <div className="text-slate-200">
      <div className="flex items-center gap-2 mb-1"><AlertTriangle size={18} className="text-amber-400" /><h1 className="text-xl font-black text-white">Deteksi Anomali</h1></div>
      <p className="text-xs text-slate-500 mb-5">Outlier waktu via z-score (ambang 2.5σ) per nomor pertandingan · {scanned} hasil dipindai</p>

      {loading ? (
        <div className="py-20 text-center text-slate-600 text-sm">Memindai hasil…</div>
      ) : findings.length === 0 ? (
        <div className="py-16 text-center">
          <ShieldCheck size={36} className="mx-auto mb-3 text-emerald-500/70" />
          <div className="text-slate-300 text-sm">Tidak ada anomali terdeteksi.</div>
          <div className="text-slate-600 text-xs mt-1">{scanned === 0 ? 'Belum ada hasil lomba yang diinput, atau sampel per nomor < 5.' : 'Semua waktu dalam batas normal.'}</div>
        </div>
      ) : (
        <div className="space-y-2">
          {findings.map((f, i) => {
            const sc = SEVERITY_COLOR[f.severity as Severity]
            return (
              <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0" style={{ color: sc.color, background: sc.bg }}>{f.severity.toUpperCase()}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{f.nama}</div>
                  <div className="text-[11px] text-slate-500 truncate">{f.nomor}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono text-sky-300">{fmt(f.waktu)}</div>
                  <div className="text-[10px] text-slate-500">z = {f.z_score}σ · {reasonLabel[f.reason as keyof typeof reasonLabel]}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
