'use client'
// src/components/konida/kejuaraan/KejuaraanCaborCard.tsx
// Cabor card for kejuaraan landing — mirrors baseline performance landing pattern
// Shows medal aggregate, atlet count, and "Buka roster" CTA

import Link from 'next/link'
import { ChevronRight, Trophy } from 'lucide-react'
import { getCaborAccent, getCaborIcon, caborToSlug, hasBaselineData } from '@/lib/kejuaraan/cabor-accent-map'

export interface CaborKejuaraanData {
  nama:           string
  atletCount:     number        // unique atlet with ≥1 record
  totalRecords:   number
  emas:           number
  perak:          number
  perunggu:       number
  topLevel:       string | null  // 'Internasional' | 'Nasional' | ... | null
  yearRange:      { from: number; to: number } | null
  realRecords:    number         // non-demo, non-rejected
  demoRecords:    number
  pendingRecords: number
}

interface Props {
  cabor:    CaborKejuaraanData
  basePath: string   // e.g. '/konida/kejuaraan/kabbandung'
}

export function KejuaraanCaborCard({ cabor, basePath }: Props) {
  const accent  = getCaborAccent(cabor.nama)
  const Icon    = getCaborIcon(cabor.nama)
  const slug    = caborToSlug(cabor.nama)
  const total   = cabor.emas + cabor.perak + cabor.perunggu
  const hasData = cabor.totalRecords > 0
  const baseline= hasBaselineData(cabor.nama)
  
  // Data quality indicator
  const realPct = cabor.totalRecords > 0
    ? Math.round((cabor.realRecords / cabor.totalRecords) * 100)
    : 0
  
  return (
    <Link href={`${basePath}/${slug}`}
      className="group rounded-2xl p-5 bg-slate-900/70 border border-slate-800 hover:border-slate-600 transition-all block">
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${accent}18`, border: `1px solid ${accent}40` }}>
            <Icon size={22} style={{ color: accent }}/>
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold text-white truncate">{cabor.nama}</div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {baseline && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}>
                  🌟 Baseline Ready
                </span>
              )}
              {hasData && cabor.demoRecords > cabor.realRecords && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                  DEMO
                </span>
              )}
              {cabor.pendingRecords > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>
                  {cabor.pendingRecords} pending
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronRight size={18} className="text-slate-600 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0"/>
      </div>
      
      {/* Empty state */}
      {!hasData ? (
        <div className="rounded-xl bg-slate-800/30 p-4 text-center">
          <Trophy size={28} className="mx-auto mb-2 text-slate-700"/>
          <div className="text-xs text-slate-500">Belum ada data prestasi</div>
          <div className="text-[10px] text-slate-600 mt-1">
            Tambah lewat dossier atlet atau Portal Atlet
          </div>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl bg-slate-800/50 p-3">
              <div className="text-2xl font-black text-white tabular-nums">{cabor.atletCount}</div>
              <div className="text-[10px] text-slate-500">Atlet</div>
            </div>
            <div className="rounded-xl bg-slate-800/50 p-3">
              <div className="text-2xl font-black text-white tabular-nums">{cabor.totalRecords}</div>
              <div className="text-[10px] text-slate-500">Records</div>
            </div>
          </div>
          
          {/* Medal bar */}
          {total > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Total Medali</span>
                <span className="text-[10px] text-slate-400 font-bold">{total} medali</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-slate-800 flex">
                {cabor.emas > 0     && <div className="h-full" style={{ width:`${(cabor.emas/total)*100}%`,     background:'#fbbf24' }}/>}
                {cabor.perak > 0    && <div className="h-full" style={{ width:`${(cabor.perak/total)*100}%`,    background:'#cbd5e1' }}/>}
                {cabor.perunggu > 0 && <div className="h-full" style={{ width:`${(cabor.perunggu/total)*100}%`, background:'#cd7f32' }}/>}
              </div>
              <div className="flex gap-3 mt-1.5">
                <span className="text-[10px] text-yellow-400 tabular-nums">🥇 {cabor.emas}</span>
                <span className="text-[10px] text-slate-300 tabular-nums">🥈 {cabor.perak}</span>
                <span className="text-[10px] text-amber-500 tabular-nums">🥉 {cabor.perunggu}</span>
              </div>
            </div>
          )}
          
          {/* Footer meta */}
          <div className="flex items-center justify-between text-[10px] mt-3 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-3 text-slate-600">
              {cabor.topLevel && (
                <span>Level tertinggi: <span className="text-slate-300 font-bold">{cabor.topLevel}</span></span>
              )}
              {cabor.yearRange && (
                <span>{cabor.yearRange.from === cabor.yearRange.to ? cabor.yearRange.from : `${cabor.yearRange.from}–${cabor.yearRange.to}`}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5" style={{ color: accent }}>
              <span>Lihat roster</span>
              <ChevronRight size={11}/>
            </div>
          </div>
          
          {/* Data quality indicator */}
          {cabor.totalRecords > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-600">
              <div className="flex-1 h-0.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full transition-all"
                  style={{ width: `${realPct}%`, background: realPct >= 70 ? '#22c55e' : realPct >= 30 ? '#f59e0b' : '#ef4444' }}/>
              </div>
              <span className="tabular-nums">{realPct}% real</span>
            </div>
          )}
        </>
      )}
    </Link>
  )
}
