'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

interface LiftRecord {
  id:             number
  periode:        string
  kelas_berat:    string | null
  squat_kg:       number | null
  bench_press_kg: number | null
  deadlift_kg:    number | null
  total_kg:       number | null
  notes:          string | null
}

interface Props {
  atletId: number
  accent:  string
}

const PERIODE_ORDER = ['BK PORPROV', 'Bulan Desember', 'Bulan Februari']
const PERIODE_SHORT: Record<string, string> = {
  'BK PORPROV':     'BK Porprov',
  'Bulan Desember': 'Desember',
  'Bulan Februari': 'Februari',
}

export function LiftProgressionCard({ atletId, accent }: Props) {
  const [records, setRecords] = useState<LiftRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    sb.from('atlet_lift_test')
      .select('id,periode,kelas_berat,squat_kg,bench_press_kg,deadlift_kg,total_kg,notes')
      .eq('atlet_id', atletId)
      .then(({ data }) => {
        if (data) setRecords(data as LiftRecord[])
        setLoading(false)
      })
  }, [atletId])

  if (loading) return (
    <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800 animate-pulse">
      <div className="h-4 w-36 bg-slate-800 rounded mb-4"/>
      <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-8 bg-slate-800 rounded"/>)}</div>
    </div>
  )

  if (records.length === 0) return null

  const sorted = [...records].sort((a, b) => {
    const ai = PERIODE_ORDER.indexOf(a.periode)
    const bi = PERIODE_ORDER.indexOf(b.periode)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const totals = sorted.map(r => r.total_kg).filter((v): v is number => v !== null)
  const maxTotal = totals.length > 0 ? Math.max(...totals) : 1
  const firstTotal = totals[0] ?? null
  const lastTotal  = totals[totals.length - 1] ?? null
  const trend = firstTotal !== null && lastTotal !== null && sorted.length > 1
    ? lastTotal > firstTotal ? 'up' : lastTotal < firstTotal ? 'down' : 'flat'
    : null
  const deltaPct = firstTotal && lastTotal && firstTotal !== lastTotal
    ? ((lastTotal - firstTotal) / firstTotal * 100).toFixed(1)
    : null

  const notesRow = sorted.find(r => r.notes)

  return (
    <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          🏋 Progression Test
          <span className="text-[10px] font-normal text-slate-500">{sorted.length} periode</span>
        </h3>
        {records[0]?.kelas_berat && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}>
            {records[0].kelas_berat}
          </span>
        )}
      </div>

      {/* Visual bars — total per periode */}
      <div className="space-y-2 mb-4">
        {sorted.map(r => {
          const pct = r.total_kg !== null ? (r.total_kg / maxTotal) * 100 : 0
          return (
            <div key={r.id}>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <span className="text-slate-400">{PERIODE_SHORT[r.periode] ?? r.periode}</span>
                <span className="font-bold tabular-nums text-white">
                  {r.total_kg !== null ? `${r.total_kg} kg` : '—'}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: accent, opacity: 0.75 }}/>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left py-1.5 text-slate-500 font-normal">Periode</th>
              <th className="text-right py-1.5 text-slate-500 font-normal">Squat</th>
              <th className="text-right py-1.5 text-slate-500 font-normal">BP</th>
              <th className="text-right py-1.5 text-slate-500 font-normal">DL</th>
              <th className="text-right py-1.5 text-white font-bold">Total</th>
              <th className="text-right py-1.5 text-slate-500 font-normal">Δ</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const prev  = i > 0 ? sorted[i - 1].total_kg : null
              const delta = r.total_kg !== null && prev !== null ? r.total_kg - prev : null
              return (
                <tr key={r.id} className="border-b border-slate-800/40">
                  <td className="py-2 text-slate-400">{PERIODE_SHORT[r.periode] ?? r.periode}</td>
                  <td className="py-2 text-right text-slate-400 tabular-nums">{r.squat_kg ?? '—'}</td>
                  <td className="py-2 text-right text-slate-400 tabular-nums">{r.bench_press_kg ?? '—'}</td>
                  <td className="py-2 text-right text-slate-400 tabular-nums">{r.deadlift_kg ?? '—'}</td>
                  <td className="py-2 text-right font-bold text-white tabular-nums">
                    {r.total_kg ?? '—'}
                  </td>
                  <td className="py-2 text-right tabular-nums text-[10px]">
                    {delta !== null
                      ? <span style={{ color: delta > 0 ? '#4ade80' : delta < 0 ? '#f87171' : '#64748b' }}>
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      : <span className="text-slate-700">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Trend summary */}
      {trend && firstTotal && lastTotal && (
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">BK Porprov → {PERIODE_SHORT['Bulan Februari']}</span>
          <div className="flex items-center gap-1.5 text-[11px] font-bold"
            style={{ color: trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#94a3b8' }}>
            {trend === 'up'   ? <TrendingUp   size={13}/>
             : trend === 'down' ? <TrendingDown size={13}/>
             : <Minus size={13}/>}
            {firstTotal} → {lastTotal} kg
            {deltaPct && (
              <span className="font-normal text-slate-500 ml-0.5">({trend === 'up' ? '+' : ''}{deltaPct}%)</span>
            )}
          </div>
        </div>
      )}

      {/* Warning note */}
      {notesRow?.notes && trend === 'down' && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg px-3 py-2"
          style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <span className="text-amber-400 text-[10px] shrink-0 mt-0.5">⚠</span>
          <span className="text-[10px] text-amber-400/80">{notesRow.notes}</span>
        </div>
      )}
    </div>
  )
}
