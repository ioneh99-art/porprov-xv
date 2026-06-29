'use client'
// src/app/operator/dayung/performance/page.tsx
// PREMIUM — Performance Dayung (KHUSUS Dayung, tanpa cabor lain).
// Sumber: biomotorik Dayung (API /konida/tes-fisik?cabor=Dayung) + struktur disiplin/nomor.

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Activity, TrendingUp, Trophy, Gauge, Dumbbell, Waves } from 'lucide-react'
import { DAYUNG, fitnessTier } from '@/lib/sport-plugins/dayung/config'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const ACCENT = '#38bdf8'

export default function DayungPerformancePage() {
  const [bio, setBio] = useState<any>(null)
  const [disiplin, setDisiplin] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const me = await fetch('/api/auth/me').then(r => r.json()).catch(() => ({}))
      const caborId = me?.cabor_id ?? DAYUNG.caborId
      const [bioRes, nomorRes] = await Promise.all([
        fetch('/api/konida/tes-fisik?kontingen_id=4&cabor=Dayung').then(r => r.json()).catch(() => null),
        sb.from('nomor_pertandingan').select('disiplin:disiplin_id(nama)').eq('cabor_id', caborId),
      ])
      setBio(bioRes)
      const dc: Record<string, number> = {}
      for (const n of (nomorRes.data ?? []) as any[]) { const d = n.disiplin?.nama ?? 'Lainnya'; dc[d] = (dc[d] || 0) + 1 }
      setDisiplin(dc); setLoading(false)
    })()
  }, [])

  const top = useMemo(() => (bio?.atlet_list ?? []).filter((a: any) => a.kesimpulan_persen != null).slice(0, 10), [bio])
  const komponen = useMemo(() => (bio?.komponen_overall ?? []).slice(0, 8), [bio])
  const s = bio?.summary ?? {}

  if (loading) return <div className="py-20 text-center text-slate-600 text-sm">Memuat performance Dayung…</div>

  return (
    <div className="text-zinc-300 min-h-screen" style={{ background: 'linear-gradient(150deg,#02060f,#04121f)', margin: '-1.75rem', padding: '1.75rem' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}40` }}><TrendingUp size={20} style={{ color: ACCENT }} /></div>
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">PERFORMANCE DAYUNG</h1>
          <div className="text-[11px] text-slate-500">Kesiapan fisik & biomotorik · Kab. Bandung</div>
        </div>
      </div>

      {/* Hero KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { l: 'Atlet Ter-tes', v: s.total_atlet ?? 0, icon: Activity, c: ACCENT },
          { l: 'Avg Kesiapan Fisik', v: `${s.avg_fitness_persen ?? 0}%`, icon: Gauge, c: '#34d399' },
          { l: 'Hadir Tes', v: s.hadir ?? 0, icon: Waves, c: '#fbbf24' },
          { l: 'Partisipasi', v: `${s.participation_rate ?? 0}%`, icon: TrendingUp, c: '#a855f7' },
        ].map(k => (
          <div key={k.l} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-1.5"><k.icon size={13} style={{ color: k.c }} /><span className="text-[10px] uppercase tracking-wider text-slate-500">{k.l}</span></div>
            <div className="text-2xl font-black text-white tabular-nums">{k.v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Komponen biomotorik terlemah — fokus latihan */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-1"><Dumbbell size={14} style={{ color: ACCENT }} /><h3 className="text-sm font-bold text-white">Komponen Biomotorik — Prioritas Latihan</h3></div>
          <p className="text-[10px] text-slate-600 mb-3">Rata-rata capaian per komponen (terendah = perlu fokus)</p>
          {komponen.length === 0 ? <div className="text-xs text-slate-600">Belum ada data komponen.</div> : (
            <div className="space-y-2.5">
              {komponen.map((c: any) => {
                const v = c.rata_capaian ?? 0
                const col = v >= 75 ? '#34d399' : v >= 55 ? '#fbbf24' : '#f87171'
                return (
                  <div key={c.komponen}>
                    <div className="flex justify-between text-[11px] mb-1"><span className="text-slate-300">{c.komponen}</span><span style={{ color: col }}>{v}%</span></div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, v)}%`, background: col }} /></div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top performers */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-3"><Trophy size={14} style={{ color: ACCENT }} /><h3 className="text-sm font-bold text-white">Top 10 Performa Fisik Dayung</h3></div>
          {top.length === 0 ? <div className="text-xs text-slate-600">Belum ada data.</div> : (
            <div className="space-y-1.5">
              {top.map((a: any, i: number) => {
                const nama = a.atlet?.nama_lengkap ?? a.nama_atlet ?? '?'
                const ft = fitnessTier(a.kesimpulan_persen)
                return (
                  <div key={a.id ?? i} className="flex items-center gap-3 text-xs">
                    <span className="w-6 text-center font-black text-slate-600">{i + 1}</span>
                    <span className="flex-1 text-slate-200 truncate">{nama}</span>
                    <span className="text-slate-500 text-[10px]">{a.cabor_nama}</span>
                    <span className="text-[10px] px-2 py-1 rounded-full font-semibold" style={{ color: ft.color, background: ft.bg }}>{a.kesimpulan_persen}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Struktur disiplin */}
      <div className="rounded-2xl p-5 mt-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h3 className="text-sm font-bold text-white mb-3">Struktur Nomor per Disiplin Dayung</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(disiplin).sort((a, b) => b[1] - a[1]).map(([d, c]) => (
            <div key={d} className="rounded-xl bg-slate-800/40 p-3 flex items-center justify-between">
              <span className="text-xs text-slate-300">{d}</span><span className="text-lg font-black" style={{ color: ACCENT }}>{c}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-4 mt-4 border border-dashed border-slate-800 text-center" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="text-xs text-slate-500">📈 Proyeksi medali & analisa hasil lomba akan aktif setelah lineup & hasil pertandingan masuk (PORPROV Nov 2026). Saat ini performance dinilai dari kesiapan fisik/biomotorik.</div>
      </div>
    </div>
  )
}
