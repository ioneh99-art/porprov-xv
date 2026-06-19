'use client'
// src/components/konida/performance/PerformanceCaborCard.tsx
// Hybrid card untuk landing — combines baseline + medal indicators

import Link from 'next/link'
import { ChevronRight, Trophy, Activity, Zap } from 'lucide-react'
import { getCaborAccent, getCaborIcon, caborToSlug, hasBaselineData } from '@/lib/performance/cabor-accent-map'

export interface PerformanceCaborData {
  nama:               string
  atletTotal:         number          // total atlet di cabor
  atletWithBaseline:  number          // atlet punya record baseline
  atletWithMedal:     number          // atlet punya riwayat prestasi terverifikasi
  
  baselineEvents:     number          // total record baseline events
  avgGap:             number | null   // average gap dari semua atlet
  
  totalMedals:        number          // total record kejuaraan terverifikasi
  emas:               number
  perak:              number
  perunggu:           number
  topLevel:           string | null
  yearRange:          { from: number; to: number } | null
  
  realRecords:        number
  demoRecords:        number
  pendingRecords:     number
}

interface Props {
  cabor:    PerformanceCaborData
  basePath: string
}

export function PerformanceCaborCard({ cabor, basePath }: Props) {
  const accent  = getCaborAccent(cabor.nama)
  const Icon    = getCaborIcon(cabor.nama)
  const slug    = caborToSlug(cabor.nama)
  const totalMedal   = cabor.emas + cabor.perak + cabor.perunggu
  const hasBase      = cabor.baselineEvents > 0
  const hasMed       = cabor.totalMedals > 0
  const hasAnyRecord = (cabor.realRecords + cabor.demoRecords + cabor.pendingRecords) > 0
  const hasAnyData   = hasBase || hasAnyRecord
  const baseline = hasBaselineData(cabor.nama)
  
  const realPct = cabor.totalMedals > 0
    ? Math.round((cabor.realRecords / cabor.totalMedals) * 100)
    : 0
  
  return (
    <Link href={`${basePath}/${slug}`}
      className="group rounded-2xl p-5 bg-slate-900/70 border border-slate-800 hover:border-slate-600 transition-all block">
      
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${accent}18`, border: `1px solid ${accent}40` }}>
            <Icon size={22} style={{ color: accent }}/>
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold text-white truncate">{cabor.nama}</div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {hasBase && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"
                  style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}>
                  <Zap size={8}/> Baseline
                </span>
              )}
              {hasMed && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"
                  style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                  <Trophy size={8}/> {cabor.totalMedals}
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
      {!hasAnyData ? (
        <div className="rounded-xl bg-slate-800/30 p-4 text-center">
          <Activity size={24} className="mx-auto mb-2 text-slate-700"/>
          <div className="text-xs text-slate-500">Belum ada data performa</div>
          <div className="text-[10px] text-slate-600 mt-1">
            {baseline ? 'Tunggu seed baseline data' : 'Tambah prestasi via dossier'}
          </div>
        </div>
      ) : (
        <>
          {/* Stats grid — 4 col compact */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="rounded-lg bg-slate-800/50 p-2 text-center">
              <div className="text-lg font-black text-white tabular-nums">{cabor.atletTotal}</div>
              <div className="text-[8px] text-slate-500 uppercase">Atlet</div>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-2 text-center">
              <div className="text-lg font-black tabular-nums" style={{ color: hasBase ? accent : '#475569' }}>
                {cabor.atletWithBaseline}
              </div>
              <div className="text-[8px] text-slate-500 uppercase">Baseline</div>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-2 text-center">
              <div className="text-lg font-black tabular-nums" style={{ color: hasMed ? '#fbbf24' : '#475569' }}>
                {cabor.atletWithMedal}
              </div>
              <div className="text-[8px] text-slate-500 uppercase">Medali</div>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-2 text-center">
              <div className="text-lg font-black tabular-nums" style={{ 
                color: cabor.avgGap !== null 
                  ? cabor.avgGap <= 3 ? '#10b981' 
                  : cabor.avgGap <= 7 ? '#06b6d4'
                  : cabor.avgGap <= 12 ? '#f59e0b' : '#ef4444'
                  : '#475569'
              }}>
                {cabor.avgGap !== null ? `${cabor.avgGap.toFixed(0)}%` : '—'}
              </div>
              <div className="text-[8px] text-slate-500 uppercase">Avg Gap</div>
            </div>
          </div>
          
          {/* Medal bar (kalau ada) */}
          {totalMedal > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider">Medali Terverifikasi</span>
                <span className="text-[9px] text-slate-400 font-bold tabular-nums">{totalMedal}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden bg-slate-800 flex">
                {cabor.emas > 0     && <div className="h-full" style={{ width: `${(cabor.emas/totalMedal)*100}%`,     background: '#fbbf24' }}/>}
                {cabor.perak > 0    && <div className="h-full" style={{ width: `${(cabor.perak/totalMedal)*100}%`,    background: '#cbd5e1' }}/>}
                {cabor.perunggu > 0 && <div className="h-full" style={{ width: `${(cabor.perunggu/totalMedal)*100}%`, background: '#cd7f32' }}/>}
              </div>
              <div className="flex gap-2 mt-1">
                <span className="text-[9px] text-yellow-400 tabular-nums">🥇 {cabor.emas}</span>
                <span className="text-[9px] text-slate-300 tabular-nums">🥈 {cabor.perak}</span>
                <span className="text-[9px] text-amber-500 tabular-nums">🥉 {cabor.perunggu}</span>
              </div>
            </div>
          )}
          
          {/* Footer */}
          <div className="flex items-center justify-between text-[10px] mt-3 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-3 text-slate-600 truncate">
              {cabor.topLevel && (
                <span className="truncate">Top: <span className="text-slate-300 font-bold">{cabor.topLevel}</span></span>
              )}
              {cabor.yearRange && (
                <span className="tabular-nums shrink-0">{cabor.yearRange.from === cabor.yearRange.to ? cabor.yearRange.from : `${cabor.yearRange.from}–${cabor.yearRange.to}`}</span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0" style={{ color: accent }}>
              <span>Lihat</span>
              <ChevronRight size={11}/>
            </div>
          </div>
          
          {/* Data quality bar */}
          {cabor.totalMedals > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-[8px] text-slate-600">
              <div className="flex-1 h-0.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full" style={{ width: `${realPct}%`, background: realPct >= 70 ? '#22c55e' : realPct >= 30 ? '#f59e0b' : '#ef4444' }}/>
              </div>
              <span className="tabular-nums">{realPct}% real</span>
            </div>
          )}
        </>
      )}
    </Link>
  )
}
