'use client'
// src/components/konida/AtletDokumenRowV2.tsx
// Atlet Dokumen Row v2 — informative + scannable + actionable
// Status-driven design: Critical / Incomplete / In Review / Expiring / Compliant

import {
  AlertTriangle, AlertCircle, CheckCircle, Clock, Calendar, ChevronDown,
  X, Check, Mail, Eye, Download, type LucideIcon,
} from 'lucide-react'
import type {
  JenisDokumen, AtletDokumen,
  AtletComplianceStatus, DocCellState,
} from '@/lib/dokumen-helpers'
import { getDocCellState } from '@/lib/dokumen-helpers'

export interface AtletRowData {
  id:                number
  nama_lengkap:      string
  no_ktp:            string
  cabor_nama_raw:    string
  status_registrasi: string
  pct:               number
  status:            AtletComplianceStatus
  urgencyScore:      number
  verified:          number
  pendingReview:     number
  rejected:          number
  expired:           number
  expiringSoon:      number
  empty:             number
}

interface StatusCfg {
  label:     string
  spine:     string
  badgeBg:   string
  badgeText: string
  icon:      LucideIcon
}

const STATUS_CFG: Record<AtletComplianceStatus, StatusCfg> = {
  critical: {
    label: 'Critical', spine: '#ef4444',
    badgeBg: 'rgba(239,68,68,0.15)', badgeText: '#fca5a5', icon: AlertTriangle,
  },
  incomplete: {
    label: 'Incomplete', spine: '#f59e0b',
    badgeBg: 'rgba(245,158,11,0.15)', badgeText: '#fbbf24', icon: AlertCircle,
  },
  in_review: {
    label: 'In Review', spine: '#3b82f6',
    badgeBg: 'rgba(59,130,246,0.15)', badgeText: '#60a5fa', icon: Clock,
  },
  expiring: {
    label: 'Expiring', spine: '#eab308',
    badgeBg: 'rgba(234,179,8,0.15)', badgeText: '#facc15', icon: Calendar,
  },
  compliant: {
    label: 'Compliant', spine: '#10b981',
    badgeBg: 'rgba(16,185,129,0.15)', badgeText: '#34d399', icon: CheckCircle,
  },
}

interface CellCfg {
  bg:      string
  color:   string
  icon:    LucideIcon | null
  border?: string
}

const CELL_CFG: Record<DocCellState, CellCfg> = {
  verified:  { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', icon: Check         },
  in_review: { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa', icon: Clock         },
  rejected:  { bg: 'rgba(239,68,68,0.15)',   color: '#fca5a5', icon: X             },
  expiring:  { bg: 'rgba(234,179,8,0.12)',   color: '#facc15', icon: AlertTriangle,
               border: '1px solid rgba(234,179,8,0.4)'                             },
  expired:   { bg: 'rgba(239,68,68,0.2)',    color: '#fca5a5', icon: AlertTriangle,
               border: '1px solid rgba(239,68,68,0.5)'                             },
  empty:     { bg: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', icon: null },
}

export type AtletAction = 'open_detail' | 'send_reminder' | 'download'

interface Props {
  atlet:          AtletRowData
  mandatoryJenis: JenisDokumen[]
  atletDokumens:  AtletDokumen[]
  isExpanded:     boolean
  onToggle:       () => void
  onAction:       (action: AtletAction) => void
}

export function AtletDokumenRowV2({
  atlet, mandatoryJenis, atletDokumens, isExpanded, onToggle, onAction,
}: Props) {
  const cfg        = STATUS_CFG[atlet.status]
  const StatusIcon = cfg.icon

  const expiringChips: { kode: string; days: number; expired: boolean }[] = []
  if (atlet.expiringSoon > 0 || atlet.expired > 0) {
    atletDokumens.forEach(d => {
      if (d.status !== 'verified' || !d.tanggal_expired) return
      const days = Math.ceil((new Date(d.tanggal_expired).getTime() - Date.now()) / 86400000)
      if (days < 30) {
        const jenis = mandatoryJenis.find(j => j.id === d.jenis_id)
        if (jenis) expiringChips.push({ kode: jenis.kode, days, expired: days < 0 })
      }
    })
  }

  return (
    <div className="rounded-xl border transition-all relative overflow-hidden"
      style={{
        background:  isExpanded ? 'rgba(56,189,248,0.04)' : 'rgba(255,255,255,0.02)',
        borderColor: isExpanded ? 'rgba(56,189,248,0.30)' : 'rgba(255,255,255,0.06)',
      }}>

      {/* Left spine */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: cfg.spine }}/>

      <div className="px-4 py-3 pl-5">
        {/* Main row */}
        <div className="grid grid-cols-12 gap-3 items-center">

          {/* Cols 1–4: Name + meta + alert chips */}
          <div className="col-span-12 md:col-span-4 min-w-0">
            <div className="text-sm font-bold text-zinc-200 truncate">{atlet.nama_lengkap}</div>
            <div className="text-[11px] font-mono text-zinc-500 mt-0.5 truncate">
              {atlet.cabor_nama_raw} · {atlet.no_ktp}
            </div>
            {(atlet.rejected > 0 || expiringChips.length > 0) && (
              <div className="flex gap-1 flex-wrap mt-1.5">
                {atlet.rejected > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.25)' }}>
                    <X size={9}/> {atlet.rejected} ditolak
                  </span>
                )}
                {expiringChips.slice(0, 2).map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border"
                    style={{ background: 'rgba(234,179,8,0.12)', color: '#facc15', borderColor: 'rgba(234,179,8,0.25)' }}>
                    <Calendar size={9}/> {c.kode} {c.expired ? 'expired' : `${c.days}h`}
                  </span>
                ))}
                {expiringChips.length > 2 && (
                  <span className="text-[9px] text-zinc-500 px-1">+{expiringChips.length - 2}</span>
                )}
              </div>
            )}
          </div>

          {/* Cols 5–10: Document matrix */}
          <div className="col-span-12 md:col-span-6">
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${mandatoryJenis.length}, 1fr)` }}>
              {mandatoryJenis.map(jenis => {
                const state    = getDocCellState({ id: jenis.id }, atletDokumens)
                const cellCfg  = CELL_CFG[state]
                const CellIcon = cellCfg.icon
                return (
                  <div key={jenis.id}
                    title={`${jenis.nama}: ${state.replace('_', ' ')}`}
                    className="aspect-square rounded-md flex items-center justify-center transition-all hover:scale-110 cursor-help"
                    style={{
                      background: cellCfg.bg,
                      color:      cellCfg.color,
                      border:     cellCfg.border ?? '1px solid transparent',
                    }}>
                    {CellIcon
                      ? <CellIcon size={10}/>
                      : <span style={{ opacity: 0.4, fontSize: 10 }}>—</span>
                    }
                  </div>
                )
              })}
            </div>
            <div className="grid gap-1 mt-1" style={{ gridTemplateColumns: `repeat(${mandatoryJenis.length}, 1fr)` }}>
              {mandatoryJenis.map(jenis => (
                <div key={jenis.id}
                  title={jenis.nama}
                  className="text-[8px] text-center text-zinc-500 truncate font-mono uppercase tracking-wider">
                  {jenis.kode}
                </div>
              ))}
            </div>
          </div>

          {/* Col 11: Pct */}
          <div className="col-span-6 md:col-span-1 text-center">
            <div className="text-base font-black tabular-nums" style={{ color: cfg.spine }}>
              {atlet.pct}%
            </div>
            <div className="text-[9px] text-zinc-500 tabular-nums">
              {atlet.verified}/{mandatoryJenis.length}
            </div>
          </div>

          {/* Col 12: Status badge + chevron */}
          <div className="col-span-6 md:col-span-1 flex items-center justify-end gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap"
              style={{ background: cfg.badgeBg, color: cfg.badgeText, borderColor: cfg.badgeBg }}>
              <StatusIcon size={10}/>
              <span className="hidden lg:inline">{cfg.label}</span>
            </span>
            <button onClick={onToggle}
              className="p-1 rounded-md hover:bg-white/5"
              aria-label={isExpanded ? 'Tutup detail' : 'Buka detail'}>
              <ChevronDown size={12}
                className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                style={{ color: 'rgba(255,255,255,0.4)' }}/>
            </button>
          </div>
        </div>

        {/* Expanded action row */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t flex gap-2 flex-wrap items-center"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mr-2">
              Status: <span style={{ color: cfg.badgeText }}>{cfg.label}</span>
            </span>
            <button onClick={(e) => { e.stopPropagation(); onAction('open_detail') }}
              className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{ background: 'rgba(56,189,248,0.10)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}>
              <Eye size={11} className="inline mr-1"/> Open detail
            </button>
            {(atlet.empty > 0 || atlet.rejected > 0 || atlet.expired > 0 || atlet.expiringSoon > 0) && (
              <button onClick={(e) => { e.stopPropagation(); onAction('send_reminder') }}
                className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }}>
                <Mail size={11} className="inline mr-1"/> Send reminder
              </button>
            )}
            {atlet.verified > 0 && (
              <button onClick={(e) => { e.stopPropagation(); onAction('download') }}
                className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ background: 'rgba(16,185,129,0.10)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
                <Download size={11} className="inline mr-1"/> Download verified ({atlet.verified})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
