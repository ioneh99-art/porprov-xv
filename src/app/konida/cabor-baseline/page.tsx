'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Activity, Waves, Users, Trophy, Target, ChevronRight, TrendingUp, Medal } from 'lucide-react'
import { CABOR_META, slugForId, caborById } from '@/lib/baseline/cabor-map'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const ACCENT = '#38bdf8'

const CABOR_ACCENT: Record<number, string> = {
  10: '#f97316', // Atletik — orange
  7:  '#06b6d4', // Akuatik  — cyan
}

interface CaborAgg {
  cabor_id: number; nama: string; records: number
  atlet: Set<number>; emas: number; perak: number; perunggu: number
}

export default function BaselineLandingPage() {
  const [loading, setLoading] = useState(true)
  const [aggs, setAggs]       = useState<any[]>([])
  const [kpi, setKpi]         = useState({ cabor: 0, atlet: 0, events: 0, target: 0 })

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
        if (!map.has(r.cabor_id))
          map.set(r.cabor_id, { cabor_id: r.cabor_id, nama: r.cabor?.nama ?? caborById(r.cabor_id)?.name ?? `Cabor ${r.cabor_id}`, records: 0, atlet: new Set(), emas: 0, perak: 0, perunggu: 0 })
        const a = map.get(r.cabor_id)!
        a.records++; a.atlet.add(r.atlet_id); allAtlet.add(r.atlet_id)
        const t = (r.target_medali || '').toLowerCase()
        if (t.includes('emas'))     a.emas++
        if (t.includes('perak'))    a.perak++
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
        KAB. BANDUNG <span className="text-slate-700">/</span>{' '}
        <span style={{ color: ACCENT }}>Baseline Performance</span>
      </div>

      {/* Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}40` }}>
          <TrendingUp size={20} style={{ color: ACCENT }} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Baseline Performance</h1>
          <p className="text-xs text-slate-500">Data historical PORPROV 2022 untuk prediksi medali PORPROV XV 2026</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { l: 'Cabor',         sub: 'terdata',           v: kpi.cabor,  icon: Trophy,  c: ACCENT    },
          { l: 'Atlet',         sub: 'punya baseline',    v: kpi.atlet,  icon: Users,   c: '#a855f7' },
          { l: 'Event Baseline',sub: 'record individu',   v: kpi.events, icon: Activity,c: '#10b981' },
          { l: 'Target Medali', sub: 'diestimasi',        v: kpi.target, icon: Target,  c: '#fbbf24' },
        ].map(k => (
          <div key={k.l} className="rounded-2xl p-4 bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <k.icon size={13} style={{ color: k.c }} />
              <span className="text-[10px] uppercase tracking-wider text-slate-500">{k.l}</span>
            </div>
            <div className="text-3xl font-black text-white">{loading ? '—' : k.v}</div>
            <div className="text-[10px] text-slate-600 mt-0.5">{k.sub}</div>
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
            const meta    = caborById(a.cabor_id)
            const Icon    = meta?.icon === 'swim' ? Waves : Activity
            const accent  = CABOR_ACCENT[a.cabor_id] ?? ACCENT
            const total   = a.emas + a.perak + a.perunggu
            return (
              <Link key={a.cabor_id} href={`/konida/cabor-baseline/${slugForId(a.cabor_id)}`}
                className="group rounded-2xl p-5 bg-slate-900/70 border border-slate-800 hover:border-slate-600 transition-all">

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: `${accent}18`, border: `1px solid ${accent}40` }}>
                      <Icon size={22} style={{ color: accent }} />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">{a.nama}</div>
                      <div className="text-[11px] text-slate-500">{meta?.label ?? 'Baseline'}</div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-slate-800/50 p-3">
                    <div className="text-2xl font-black text-white">{a.atletCount}</div>
                    <div className="text-[10px] text-slate-500">Atlet</div>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-3">
                    <div className="text-2xl font-black text-white">{a.records}</div>
                    <div className="text-[10px] text-slate-500">Event Baseline</div>
                  </div>
                </div>

                {/* Medal target bar */}
                {total > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Target Medali</span>
                      <span className="text-[10px] text-slate-400 font-bold">{total} total</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-slate-800 flex">
                      {a.emas > 0     && <div className="h-full" style={{ width:`${(a.emas/total)*100}%`,     background:'#fbbf24' }} />}
                      {a.perak > 0    && <div className="h-full" style={{ width:`${(a.perak/total)*100}%`,    background:'#cbd5e1' }} />}
                      {a.perunggu > 0 && <div className="h-full" style={{ width:`${(a.perunggu/total)*100}%`, background:'#cd7f32' }} />}
                    </div>
                    <div className="flex gap-3 mt-1.5">
                      <span className="text-[10px] text-yellow-400">🥇 {a.emas}</span>
                      <span className="text-[10px] text-slate-300">🥈 {a.perak}</span>
                      <span className="text-[10px] text-amber-500">🥉 {a.perunggu}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[10px]" style={{ color: accent }}>
                  <span>Lihat roster & analisa</span>
                  <ChevronRight size={11} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
