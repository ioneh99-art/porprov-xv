'use client'
// src/app/konida/cabor-baseline/page.tsx
// PAGE A — Landing Baseline Performance (overview semua cabor) · Kab. Bandung (kontingen_id=4)

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Activity, Waves, Users, Trophy, Target, ChevronRight, TrendingUp, Medal } from 'lucide-react'
import { CABOR_META, ACCENT, slugForId, caborById } from '@/lib/baseline/cabor-map'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface CaborAgg {
  cabor_id: number
  nama: string
  records: number
  atlet: Set<number>
  emas: number; perak: number; perunggu: number
}

export default function BaselineLandingPage() {
  const [loading, setLoading] = useState(true)
  const [aggs, setAggs] = useState<any[]>([])
  const [kpi, setKpi] = useState({ cabor: 0, atlet: 0, events: 0, target: 0 })

  useEffect(() => {
    (async () => {
      const { data } = await sb
        .from('atlet_baseline_performance')
        .select('cabor_id, atlet_id, target_medali, cabor:cabang_olahraga!cabor_id(nama)')
      const rows = data ?? []
      const map = new Map<number, CaborAgg>()
      const allAtlet = new Set<number>()
      let targetCount = 0
      for (const r of rows as any[]) {
        if (!map.has(r.cabor_id)) map.set(r.cabor_id, { cabor_id: r.cabor_id, nama: r.cabor?.nama ?? caborById(r.cabor_id)?.name ?? `Cabor ${r.cabor_id}`, records: 0, atlet: new Set(), emas: 0, perak: 0, perunggu: 0 })
        const a = map.get(r.cabor_id)!
        a.records++; a.atlet.add(r.atlet_id); allAtlet.add(r.atlet_id)
        const t = (r.target_medali || '').toLowerCase()
        if (t.includes('emas')) a.emas++
        if (t.includes('perak')) a.perak++
        if (t.includes('perunggu')) a.perunggu++
        if (t && t !== '-') targetCount++
      }
      const list = Array.from(map.values()).sort((a, b) => b.records - a.records)
        .map(a => ({ ...a, atletCount: a.atlet.size }))
      setAggs(list)
      setKpi({ cabor: list.length, atlet: allAtlet.size, events: rows.length, target: targetCount })
      setLoading(false)
    })()
  }, [])

  return (
    <div className="text-slate-200">
      {/* Breadcrumb */}
      <div className="text-xs text-slate-500 mb-2">
        KAB. BANDUNG <span className="text-slate-700">/</span> <span style={{ color: ACCENT }}>Baseline Performance</span>
      </div>

      {/* Title */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}40` }}>
          <TrendingUp size={20} style={{ color: ACCENT }} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Baseline Performance</h1>
          <p className="text-xs text-slate-500">Data historical PORPROV 2022 untuk prediksi medali PORPROV XV 2026</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
        {[
          { l: 'Cabor', v: kpi.cabor, icon: Trophy, c: ACCENT },
          { l: 'Atlet', v: kpi.atlet, icon: Users, c: '#a855f7' },
          { l: 'Event Baseline', v: kpi.events, icon: Activity, c: '#10b981' },
          { l: 'Target Medali', v: kpi.target, icon: Target, c: '#fbbf24' },
        ].map(k => (
          <div key={k.l} className="rounded-2xl p-4 bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-2 mb-2"><k.icon size={14} style={{ color: k.c }} /><span className="text-[10px] uppercase tracking-wider text-slate-500">{k.l}</span></div>
            <div className="text-3xl font-black text-white">{loading ? '—' : k.v}</div>
          </div>
        ))}
      </div>

      {/* Cabor cards */}
      {loading ? (
        <div className="py-20 text-center text-slate-600 text-sm">Memuat data baseline…</div>
      ) : aggs.length === 0 ? (
        <div className="py-20 text-center">
          <Medal size={40} className="mx-auto mb-3 text-slate-700" />
          <div className="text-slate-400 text-sm">Belum ada data baseline.</div>
          <div className="text-slate-600 text-xs mt-1">Jalankan seed script setelah file Excel siap.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {aggs.map(a => {
            const meta = caborById(a.cabor_id)
            const Icon = meta?.icon === 'swim' ? Waves : Activity
            return (
              <Link key={a.cabor_id} href={`/konida/cabor-baseline/${slugForId(a.cabor_id)}`}
                className="group rounded-2xl p-5 bg-slate-900/70 border border-slate-800 hover:border-slate-600 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}40` }}>
                      <Icon size={22} style={{ color: ACCENT }} />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">{a.nama}</div>
                      <div className="text-[11px] text-slate-500">{meta?.label ?? 'Baseline'}</div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-600 group-hover:text-white transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="rounded-xl bg-slate-800/50 p-3"><div className="text-2xl font-black text-white">{a.atletCount}</div><div className="text-[10px] text-slate-500">Atlet</div></div>
                  <div className="rounded-xl bg-slate-800/50 p-3"><div className="text-2xl font-black text-white">{a.records}</div><div className="text-[10px] text-slate-500">Event Baseline</div></div>
                </div>
                <div className="flex gap-2 mt-3">
                  <span className="text-[10px] px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">🥇 {a.emas} emas</span>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-slate-400/10 text-slate-300 border border-slate-400/20">🥈 {a.perak} perak</span>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-amber-700/10 text-amber-500 border border-amber-700/20">🥉 {a.perunggu} perunggu</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
