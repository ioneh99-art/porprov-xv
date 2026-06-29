'use client'
// src/components/konida/performance/CompetitionTimeline.tsx
// KBAAS Fase 3.12 — roadmap kompetisi multi-tahun per atlet.

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { CalendarRange } from 'lucide-react'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const ACCENT = '#38bdf8'

interface Entry {
  id: number; tahun: number; event_name: string; event_type: string
  category_age: string | null; nomor_pertandingan: string | null
  target_medal: string | null; actual_medal: string | null; actual_mark: string | null; status: string
}
const medalIcon = (m: string | null) => m === 'EMAS' ? '🥇' : m === 'PERAK' ? '🥈' : m === 'PERUNGGU' ? '🥉' : ''

export default function CompetitionTimeline({ atletId }: { atletId: number }) {
  const [rows, setRows] = useState<Entry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    sb.from('atlet_competition_cycle').select('*').eq('atlet_id', atletId).order('tahun', { ascending: true })
      .then(({ data }) => { if (alive) { setRows((data ?? []) as Entry[]); setLoaded(true) } })
    return () => { alive = false }
  }, [atletId])

  if (!loaded || rows.length === 0) return null

  const byYear: Record<number, Entry[]> = {}
  rows.forEach(e => { (byYear[e.tahun] ||= []).push(e) })

  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 mb-4"><CalendarRange size={14} style={{ color: ACCENT }} /><h3 className="text-sm font-bold text-white">Roadmap Kompetisi</h3></div>
      <div className="space-y-5">
        {Object.entries(byYear).sort((a, b) => Number(a[0]) - Number(b[0])).map(([year, evs]) => (
          <div key={year}>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-black" style={{ color: ACCENT }}>{year}</span>
              <span className="text-[10px] text-slate-600">{evs.length} event</span>
            </div>
            <div className="ml-4 border-l border-slate-700 pl-4 space-y-2">
              {evs.map(e => (
                <div key={e.id} className="rounded-xl p-3" style={{ background: e.status === 'COMPLETED' ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${e.status === 'COMPLETED' ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.06)'}` }}>
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-[12px] font-bold text-slate-200">{e.event_name}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{e.event_type}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{[e.nomor_pertandingan, e.category_age].filter(Boolean).join(' · ')}</div>
                  {e.actual_medal && <div className="text-[11px] mt-1 font-semibold text-white">{medalIcon(e.actual_medal)} {e.actual_medal} {e.actual_mark && <span className="font-mono text-slate-400">· {e.actual_mark}</span>}</div>}
                  {e.target_medal && !e.actual_medal && <div className="text-[11px] mt-1" style={{ color: '#a855f7' }}>🎯 Target: {e.target_medal}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
