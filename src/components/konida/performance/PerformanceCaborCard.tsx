'use client'
// src/components/konida/performance/PerformanceCaborCard.tsx

import Link from 'next/link'
import { ChevronRight, Zap } from 'lucide-react'
import { getCaborAccent, getCaborEmoji, caborToSlug, hasBaselineData } from '@/lib/performance/cabor-accent-map'

export interface PerformanceCaborData {
  nama:               string
  atletTotal:         number
  atletWithBaseline:  number
  atletWithMedal:     number

  baselineEvents:     number
  avgGap:             number | null
  gapMin:             number | null
  gapMax:             number | null

  totalMedals:        number
  emas:               number
  perak:              number
  perunggu:           number
  topLevel:           string | null
  yearRange:          { from: number; to: number } | null

  realRecords:        number
  demoRecords:        number
  pendingRecords:     number

  // Target dari baseline (proyeksi)
  targetEmas:         number
  targetPerak:        number
  targetPerunggu:     number
  nomorCount:         number
  kelasBeratCount:    number
  topAtletNames:      string[]
}

interface Props {
  cabor:    PerformanceCaborData
  basePath: string
}

export function PerformanceCaborCard({ cabor, basePath }: Props) {
  const accent   = getCaborAccent(cabor.nama)
  const emoji    = getCaborEmoji(cabor.nama)
  const slug     = caborToSlug(cabor.nama)
  const hasBase  = cabor.baselineEvents > 0
  const hasMed   = cabor.totalMedals > 0
  const isMultiLift = cabor.kelasBeratCount > 0
  const isHiddenGem = cabor.nama === 'Angkat Berat' && hasBase
  const baseline = hasBaselineData(cabor.nama)

  // Gap range display
  const gapRange = cabor.gapMin !== null && cabor.gapMax !== null
    ? `gap ${Math.round(Math.min(Math.abs(cabor.gapMin), Math.abs(cabor.gapMax)))}–${Math.round(Math.max(Math.abs(cabor.gapMin), Math.abs(cabor.gapMax)))}%`
    : cabor.avgGap !== null ? `avg gap ${Math.round(Math.abs(cabor.avgGap))}%` : null

  // Subtitle line
  const subtitle = [
    `${cabor.atletTotal} atlet`,
    isMultiLift
      ? `${cabor.kelasBeratCount} kelas berat`
      : cabor.nomorCount > 0 ? `${cabor.nomorCount} nomor` : null,
    !isMultiLift ? gapRange : null,
  ].filter(Boolean).join(' · ')

  // Target medals (from baseline)
  const totalTarget = cabor.targetEmas + cabor.targetPerak + cabor.targetPerunggu
  // Actual medals (from riwayat)
  const totalActual = cabor.emas + cabor.perak + cabor.perunggu

  return (
    <Link href={`${basePath}/${slug}`}
      className="group rounded-2xl p-5 block transition-all relative overflow-hidden"
      style={{
        background: isHiddenGem
          ? `linear-gradient(135deg, ${accent}10 0%, rgba(2,10,20,0.8) 100%)`
          : 'rgba(2,10,20,0.65)',
        border: `1px solid ${isHiddenGem ? accent + '30' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: isHiddenGem ? `0 0 30px ${accent}10` : 'none',
      }}>

      {/* Hidden gem glow */}
      {isHiddenGem && (
        <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
          style={{ background: `radial-gradient(circle at 100% 0%, ${accent}12 0%, transparent 70%)` }}/>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3 relative">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-2xl"
            style={{ background: `${accent}15`, border: `1px solid ${accent}35` }}>
            {emoji}
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold text-white">{cabor.nama}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {isHiddenGem && (
            <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1"
              style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}>
              <Zap size={8}/> Hidden Gem
            </span>
          )}
          {hasBase && !isHiddenGem && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: `${accent}12`, color: accent, border: `1px solid ${accent}25` }}>
              Baseline
            </span>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!hasBase && !hasMed ? (
        <div className="rounded-xl p-4 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="text-xs text-slate-600">Belum ada data performa</div>
          <div className="text-[10px] text-slate-700 mt-0.5">
            {baseline ? 'Tunggu import data' : 'Tambah prestasi via dossier'}
          </div>
        </div>
      ) : (
        <>
          {/* Target / actual medals */}
          {(totalTarget > 0 || totalActual > 0) && (
            <div className="mb-3">
              {totalTarget > 0 && (
                <>
                  <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-1.5 font-bold">
                    Target Medali {isMultiLift ? '(Proyeksi)' : '(Baseline 2022)'}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {cabor.targetEmas > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black tabular-nums"
                        style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
                        🥇 {cabor.targetEmas}
                      </span>
                    )}
                    {cabor.targetPerak > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black tabular-nums"
                        style={{ background: 'rgba(203,213,225,0.10)', color: '#cbd5e1', border: '1px solid rgba(203,213,225,0.22)' }}>
                        🥈 {cabor.targetPerak}
                      </span>
                    )}
                    {cabor.targetPerunggu > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black tabular-nums"
                        style={{ background: 'rgba(205,127,50,0.12)', color: '#cd7f32', border: '1px solid rgba(205,127,50,0.25)' }}>
                        🥉 {cabor.targetPerunggu}
                      </span>
                    )}
                  </div>
                </>
              )}
              {totalActual > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-600">
                  <span>Medali terverifikasi:</span>
                  {cabor.emas > 0 && <span className="text-yellow-400 font-bold">🥇{cabor.emas}</span>}
                  {cabor.perak > 0 && <span className="text-slate-300 font-bold">🥈{cabor.perak}</span>}
                  {cabor.perunggu > 0 && <span className="text-amber-500 font-bold">🥉{cabor.perunggu}</span>}
                </div>
              )}
            </div>
          )}

          {/* Top atlet names */}
          {cabor.topAtletNames.length > 0 && (
            <div className="mb-3 text-[10px] text-slate-500">
              Top: <span className="text-slate-300 font-semibold">{cabor.topAtletNames.join(' · ')}</span>
            </div>
          )}

          {/* Pending badge */}
          {cabor.pendingRecords > 0 && (
            <div className="mb-2 text-[10px]"
              style={{ color: '#60a5fa' }}>
              {cabor.pendingRecords} prestasi menunggu verifikasi
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] pt-3 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <span className="text-slate-600">
          {cabor.atletWithBaseline > 0 && `${cabor.atletWithBaseline} atlet baseline`}
        </span>
        <div className="flex items-center gap-1 font-semibold transition-colors"
          style={{ color: accent }}>
          Lihat roster <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform"/>
        </div>
      </div>
    </Link>
  )
}
