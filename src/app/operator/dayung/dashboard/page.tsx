'use client'
// src/app/operator/dayung/dashboard/page.tsx
// Phase 3 — Performance Dashboard: roster + fitness intelligence Cabor Dayung.

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, Activity, TrendingUp, Trophy, Gauge } from 'lucide-react'
import { DAYUNG, fitnessTier, genderLabel } from '@/lib/sport-plugins/dayung/config'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function DayungDashboardIntel() {
  const [atlet, setAtlet] = useState<any[]>([])
  const [nomorByDisiplin, setNomorByDisiplin] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const me = await fetch('/api/auth/me').then(r => r.json()).catch(() => ({}))
      const caborId = me?.cabor_id ?? DAYUNG.caborId
      const kontingenId = me?.kontingen_id ?? DAYUNG.kontingenId
      const { data: a } = await sb.from('atlet').select('id,nama_lengkap,gender').eq('cabor_id', caborId).eq('kontingen_id', kontingenId)
      const ids = (a ?? []).map(x => x.id)
      const fit: Record<number, number> = {}
      for (let i = 0; i < ids.length; i += 200) {
        const { data: tf } = await sb.from('atlet_tes_fisik').select('atlet_id,kesimpulan_persen,tahap,status_tes').in('atlet_id', ids.slice(i, i + 200)).eq('status_tes', 'Hadir')
        for (const t of tf ?? []) if (t.kesimpulan_persen != null) fit[t.atlet_id] = Math.max(fit[t.atlet_id] ?? 0, t.kesimpulan_persen)
      }
      setAtlet((a ?? []).map(x => ({ ...x, fit: fit[x.id] ?? null })))
      const { data: nomor } = await sb.from('nomor_pertandingan').select('disiplin:disiplin_id(nama)').eq('cabor_id', caborId)
      const dc: Record<string, number> = {}
      for (const n of (nomor ?? []) as any[]) { const d = n.disiplin?.nama ?? 'Lainnya'; dc[d] = (dc[d] || 0) + 1 }
      setNomorByDisiplin(dc); setLoading(false)
    })()
  }, [])

  const m = useMemo(() => {
    const tested = atlet.filter(a => a.fit != null)
    const avg = tested.length ? Math.round(tested.reduce((s, a) => s + a.fit, 0) / tested.length) : 0
    const dist = { ELITE: 0, BAGUS: 0, CUKUP: 0, KURANG: 0 }
    for (const a of tested) { const l = fitnessTier(a.fit).label; if (l in dist) (dist as any)[l]++ }
    const top = [...tested].sort((a, b) => b.fit - a.fit).slice(0, 10)
    return {
      total: atlet.length, putra: atlet.filter(a => a.gender === 'L').length, putri: atlet.filter(a => a.gender === 'P').length,
      tested: tested.length, avg, dist, top,
    }
  }, [atlet])

  if (loading) return <div className="py-20 text-center text-slate-600 text-sm">Memuat intelligence…</div>

  return (
    <div className="text-slate-200">
      <div className="flex items-center gap-2 mb-1"><Gauge size={18} className="text-sky-400" /><h1 className="text-xl font-black text-white">Performance Intelligence</h1></div>
      <p className="text-xs text-slate-500 mb-5">Cabor Dayung · Kab. Bandung · fase persiapan PORPROV XV</p>

      {/* Hero */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { l: 'Total Atlet', v: m.total, s: `${m.putra} Pa · ${m.putri} Pi`, icon: Users, c: '#0ea5e9' },
          { l: 'Avg Kesiapan Fisik', v: `${m.avg}%`, s: 'dari yang sudah tes', icon: Activity, c: '#34d399' },
          { l: 'Sudah Tes Fisik', v: m.tested, s: `${m.total ? Math.round(m.tested / m.total * 100) : 0}% coverage`, icon: TrendingUp, c: '#fbbf24' },
          { l: 'Kategori ELITE', v: m.dist.ELITE, s: 'fisik ≥85%', icon: Trophy, c: '#f472b6' },
        ].map(k => (
          <div key={k.l} className="rounded-2xl p-4 bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-2 mb-1.5"><k.icon size={13} style={{ color: k.c }} /><span className="text-[10px] uppercase tracking-wider text-slate-500">{k.l}</span></div>
            <div className="text-2xl font-black text-white">{k.v}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{k.s}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Fitness distribution */}
        <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-3">Distribusi Kesiapan Fisik</h3>
          {m.tested === 0 ? <div className="text-xs text-slate-600">Belum ada data tes fisik.</div> : (
            <div className="space-y-2.5">
              {([['ELITE', '#fbbf24'], ['BAGUS', '#34d399'], ['CUKUP', '#facc15'], ['KURANG', '#f87171']] as const).map(([k, c]) => {
                const v = (m.dist as any)[k] as number; const pct = m.tested ? Math.round(v / m.tested * 100) : 0
                return (
                  <div key={k}>
                    <div className="flex justify-between text-[11px] mb-1"><span className="text-slate-400">{k}</span><span className="text-slate-500">{v} atlet · {pct}%</span></div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} /></div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Disiplin overview */}
        <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-3">Nomor per Disiplin</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(nomorByDisiplin).sort((a, b) => b[1] - a[1]).map(([d, c]) => (
              <div key={d} className="rounded-xl bg-slate-800/40 p-3 flex items-center justify-between">
                <span className="text-xs text-slate-300">{d}</span><span className="text-lg font-black text-sky-300">{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top performers */}
      <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800 mt-4">
        <h3 className="text-sm font-bold text-white mb-3">Top 10 Kesiapan Fisik</h3>
        {m.top.length === 0 ? <div className="text-xs text-slate-600">Belum ada data.</div> : (
          <div className="space-y-1.5">
            {m.top.map((a, i) => {
              const ft = fitnessTier(a.fit)
              return (
                <div key={a.id} className="flex items-center gap-3 text-xs">
                  <span className="w-6 text-center font-black text-slate-500">{i + 1}</span>
                  <span className="flex-1 text-slate-200 truncate">{a.nama_lengkap}</span>
                  <span className="text-slate-500">{genderLabel(a.gender)}</span>
                  <span className="w-24 text-right"><span className="text-[10px] px-2 py-1 rounded-full font-semibold" style={{ color: ft.color, background: ft.bg }}>{a.fit}% · {ft.label}</span></span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Competition placeholder */}
      <div className="rounded-2xl p-5 bg-slate-900/40 border border-dashed border-slate-800 mt-4 text-center">
        <div className="text-xs text-slate-500">📊 Analitik hasil lomba & proyeksi medali akan aktif setelah lineup & hasil pertandingan diinput (PORPROV mulai Nov 2026).</div>
      </div>
    </div>
  )
}
