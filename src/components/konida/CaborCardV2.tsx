'use client'
// src/components/konida/CaborCardV2.tsx
// Cabor Card v2 — status-driven: Critical / Watch / Stable / Excellence

import {
  AlertTriangle, Eye, CheckCircle, Star, ChevronDown,
  Activity, Clock, type LucideIcon,
} from 'lucide-react'

export type CaborStatus = 'critical' | 'watch' | 'stable' | 'excellence'

export interface CaborCardData {
  nama:        string
  status:      CaborStatus
  total:       number
  putra:       number
  putri:       number
  lokal:       number
  nonLokal:    number
  verified:    number
  pending:     number
  ditolak:     number
  posted:      number
  sudahTes:    number
  belumTes:    number
  avgSkor:     number
  kategoriAvg: string
  rating: {
    elite:       number
    ready:       number
    needsWork:   number
    subPar:      number
    kritis:      number
    tidakHadir:  number
  }
  coverage:     number
  verifikasi:   number
  urgencyScore: number
}

interface StatusCfg {
  label:     string
  spine:     string
  bg:        string
  border:    string
  badgeBg:   string
  badgeText: string
  icon:      LucideIcon
}

const STATUS_CFG: Record<CaborStatus, StatusCfg> = {
  critical: {
    label: 'Critical', spine: '#ef4444',
    bg: 'rgba(239,68,68,0.04)', border: 'rgba(239,68,68,0.20)',
    badgeBg: 'rgba(239,68,68,0.15)', badgeText: '#fca5a5', icon: AlertTriangle,
  },
  watch: {
    label: 'Watch', spine: '#f59e0b',
    bg: 'rgba(245,158,11,0.04)', border: 'rgba(245,158,11,0.18)',
    badgeBg: 'rgba(245,158,11,0.15)', badgeText: '#fbbf24', icon: Eye,
  },
  stable: {
    label: 'Stable', spine: '#10b981',
    bg: 'rgba(16,185,129,0.03)', border: 'rgba(16,185,129,0.18)',
    badgeBg: 'rgba(16,185,129,0.12)', badgeText: '#34d399', icon: CheckCircle,
  },
  excellence: {
    label: 'Excellence', spine: '#a78bfa',
    bg: 'rgba(139,92,246,0.04)', border: 'rgba(139,92,246,0.22)',
    badgeBg: 'rgba(139,92,246,0.15)', badgeText: '#c4b5fd', icon: Star,
  },
}

const RATING_COLORS = {
  elite:     '#fbbf24',
  ready:     '#10b981',
  needsWork: '#f59e0b',
  subPar:    '#fb923c',
  kritis:    '#ef4444',
}

export type CaborAction = 'review_pending' | 'lihat_tes' | 'export'

interface Props {
  cabor:      CaborCardData
  isExpanded: boolean
  onToggle:   () => void
  onAction:   (action: CaborAction) => void
}

export function CaborCardV2({ cabor, isExpanded, onToggle, onAction }: Props) {
  const cfg        = STATUS_CFG[cabor.status]
  const StatusIcon = cfg.icon

  const avgColor =
    cabor.avgSkor >= 75 ? '#a78bfa' :
    cabor.avgSkor >= 60 ? '#34d399' :
    cabor.avgSkor >= 50 ? '#fbbf24' :
    cabor.avgSkor > 0   ? '#ef4444' : '#64748b'

  const verifColor =
    cabor.verifikasi >= 70 ? '#10b981' :
    cabor.verifikasi >= 40 ? '#f59e0b' : '#ef4444'

  const coverageColor =
    cabor.coverage >= 70 ? '#10b981' :
    cabor.coverage >= 40 ? '#f59e0b' :
    cabor.coverage > 0   ? '#ef4444' : '#64748b'

  const total  = cabor.total || 1
  const pct    = (n: number) => (n / total) * 100
  const lokalPct = cabor.total > 0 ? Math.round((cabor.lokal / cabor.total) * 100) : 0
  const hasAlerts    = cabor.pending > 0 || cabor.rating.kritis > 0
  const hasRatingData = cabor.sudahTes > 0

  return (
    <div className="rounded-xl border transition-all relative overflow-hidden"
      style={{
        background:   isExpanded ? 'rgba(56,189,248,0.04)' : cfg.bg,
        borderColor:  isExpanded ? 'rgba(56,189,248,0.30)' : cfg.border,
      }}>

      {/* Left spine */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: cfg.spine }}/>

      <div className="p-4 pl-5">

        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${cfg.spine}18` }}>
              <Activity size={14} style={{ color: cfg.spine }}/>
            </div>
            <h3 className="text-sm font-bold text-white truncate">{cabor.nama}</h3>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
              style={{ background: cfg.badgeBg, color: cfg.badgeText, borderColor: cfg.badgeBg }}>
              <StatusIcon size={10}/>
              {cfg.label}
            </div>
          </div>
          <button onClick={onToggle}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5 shrink-0"
            aria-label={isExpanded ? 'Tutup detail' : 'Buka detail'}>
            <ChevronDown size={14}
              className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              style={{ color: 'rgba(255,255,255,0.4)' }}/>
          </button>
        </div>

        {/* Meta row */}
        <div className="text-[11px] text-zinc-500 mb-3 ml-9 truncate">
          {cabor.total} atlet · {cabor.putra}♂ {cabor.putri}♀
          {cabor.total > 0 && ` · ${lokalPct}% lokal Kab. Bandung`}
        </div>

        {/* 3-col KPI grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 ml-9">

          {/* Verifikasi */}
          <div>
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Verifikasi</div>
            <div className="h-[5px] rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${cabor.verifikasi}%`, background: verifColor }}/>
            </div>
            <div className="text-[10px] font-mono text-zinc-400 tabular-nums">
              {cabor.verifikasi}%
              <span className="ml-1.5 text-emerald-500/80">✓{cabor.verified + cabor.posted}</span>
              {cabor.pending > 0 && <span className="ml-1 text-amber-500/80">⏳{cabor.pending}</span>}
              {cabor.ditolak > 0 && <span className="ml-1 text-rose-500/80">✗{cabor.ditolak}</span>}
            </div>
          </div>

          {/* Coverage Tes */}
          <div>
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Coverage Tes</div>
            <div className="h-[5px] rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${cabor.coverage}%`, background: coverageColor }}/>
            </div>
            <div className="text-[10px] font-mono text-zinc-400 tabular-nums">
              {cabor.sudahTes} / {cabor.total} atlet
            </div>
          </div>

          {/* Avg Skor */}
          <div>
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Avg Skor Fisik</div>
            {cabor.avgSkor > 0 ? (
              <>
                <div className="text-lg font-black leading-none tabular-nums" style={{ color: avgColor }}>
                  {cabor.avgSkor}%
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">{cabor.kategoriAvg}</div>
              </>
            ) : (
              <>
                <div className="text-lg font-black leading-none text-zinc-700">—</div>
                <div className="text-[10px] text-zinc-600 mt-1">belum ada data</div>
              </>
            )}
          </div>
        </div>

        {/* Rating distribution stacked bar */}
        {hasRatingData && (
          <div className="ml-9 mb-3">
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
              Distribusi Rating
              <span className="text-zinc-600 normal-case font-normal tracking-normal ml-2">
                ({cabor.sudahTes} sudah tes{cabor.belumTes > 0 ? `, ${cabor.belumTes} belum` : ''})
              </span>
            </div>
            <div className="flex h-[6px] gap-px rounded-full overflow-hidden mb-1.5">
              {cabor.rating.elite     > 0 && <div style={{ width:`${pct(cabor.rating.elite)}%`,     background:RATING_COLORS.elite     }}/>}
              {cabor.rating.ready     > 0 && <div style={{ width:`${pct(cabor.rating.ready)}%`,     background:RATING_COLORS.ready     }}/>}
              {cabor.rating.needsWork > 0 && <div style={{ width:`${pct(cabor.rating.needsWork)}%`, background:RATING_COLORS.needsWork }}/>}
              {cabor.rating.subPar    > 0 && <div style={{ width:`${pct(cabor.rating.subPar)}%`,    background:RATING_COLORS.subPar    }}/>}
              {cabor.rating.kritis    > 0 && <div style={{ width:`${pct(cabor.rating.kritis)}%`,    background:RATING_COLORS.kritis    }}/>}
              {cabor.belumTes         > 0 && <div style={{ width:`${pct(cabor.belumTes)}%`,         background:'rgba(255,255,255,0.08)' }}/>}
            </div>
            <div className="flex gap-3 text-[10px] text-zinc-500 flex-wrap">
              {cabor.rating.elite     > 0 && <span><span style={{color:RATING_COLORS.elite    }}>●</span> {cabor.rating.elite} elite</span>}
              {cabor.rating.ready     > 0 && <span><span style={{color:RATING_COLORS.ready    }}>●</span> {cabor.rating.ready} ready</span>}
              {cabor.rating.needsWork > 0 && <span><span style={{color:RATING_COLORS.needsWork}}>●</span> {cabor.rating.needsWork} needs</span>}
              {cabor.rating.subPar    > 0 && <span><span style={{color:RATING_COLORS.subPar   }}>●</span> {cabor.rating.subPar} sub-par</span>}
              {cabor.rating.kritis    > 0 && <span><span style={{color:RATING_COLORS.kritis   }}>●</span> {cabor.rating.kritis} kritis</span>}
            </div>
          </div>
        )}

        {/* Alert chips */}
        {hasAlerts && (
          <div className="flex gap-1.5 ml-9 mb-3 flex-wrap">
            {cabor.pending > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-md inline-flex items-center gap-1 border"
                style={{ background:'rgba(245,158,11,0.12)', color:'#fbbf24', borderColor:'rgba(245,158,11,0.25)' }}>
                <Clock size={10}/> {cabor.pending} pending butuh approve
              </span>
            )}
            {cabor.rating.kritis > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-md inline-flex items-center gap-1 border"
                style={{ background:'rgba(239,68,68,0.12)', color:'#fca5a5', borderColor:'rgba(239,68,68,0.25)' }}>
                <AlertTriangle size={10}/> {cabor.rating.kritis} atlet skor kritis
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 ml-9 flex-wrap">
          {cabor.pending > 0 && (
            <button onClick={(e) => { e.stopPropagation(); onAction('review_pending') }}
              className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{ background:'rgba(245,158,11,0.15)', color:'#fbbf24', border:'1px solid rgba(245,158,11,0.30)' }}>
              Review {cabor.pending} pending
            </button>
          )}
          {cabor.sudahTes > 0 && (
            <button onClick={(e) => { e.stopPropagation(); onAction('lihat_tes') }}
              className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{ background:'rgba(56,189,248,0.10)', color:'#38bdf8', border:'1px solid rgba(56,189,248,0.25)' }}>
              Lihat tes fisik
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onAction('export') }}
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.10)' }}>
            Export CSV
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// CLASSIFICATION HELPER
// ─────────────────────────────────────────────────────────

export function classifyCabor(args: {
  total:    number
  sudahTes: number
  avgSkor:  number
  kritis:   number
  subPar:   number
  elite:    number
  pending:  number
}): { status: CaborStatus; urgencyScore: number } {
  const { total, sudahTes, avgSkor, kritis, subPar, elite, pending } = args
  const coverage = total > 0 ? (sudahTes / total) * 100 : 0

  let status: CaborStatus
  if (coverage < 40 || kritis >= 3 || (avgSkor > 0 && avgSkor < 50)) {
    status = 'critical'
  } else if (coverage >= 80 && avgSkor >= 75 && elite >= 3) {
    status = 'excellence'
  } else if (coverage >= 70 && avgSkor >= 60 && kritis === 0 && subPar === 0) {
    status = 'stable'
  } else {
    status = 'watch'
  }

  let urgencyScore = 0
  if (status === 'critical')   urgencyScore = 1000 + kritis * 50 + pending * 10 + (100 - coverage)
  else if (status === 'watch') urgencyScore = 500  + subPar * 20 + pending * 5  + (100 - coverage) * 0.5
  else if (status === 'stable') urgencyScore = 100 + pending * 2
  else urgencyScore = elite > 5 ? 50 : 25

  return { status, urgencyScore: Math.round(urgencyScore) }
}

// ─────────────────────────────────────────────────────────
// STATUS COUNT HELPER
// ─────────────────────────────────────────────────────────

export function countByStatus(cabors: { status: CaborStatus }[]) {
  return cabors.reduce(
    (acc, c) => { acc[c.status]++; return acc },
    { critical: 0, watch: 0, stable: 0, excellence: 0 } as Record<CaborStatus, number>
  )
}
