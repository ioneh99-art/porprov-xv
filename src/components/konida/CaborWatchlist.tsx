'use client'
// src/components/konida/CaborWatchlist.tsx
// Operational Cabor Tracker — pengganti Intel Cabor di Dashboard
// Pure REAL data: atlet status + tes fisik UPI
// Hardcoded medali ditandai badge "⚠ DEMO" supaya jelas placeholder

import { useState, useMemo } from 'react'
import {
  AlertTriangle, CheckCircle2, ChevronRight, TrendingUp, Activity,
  Users, Trophy, Flame, Filter, Search,
} from 'lucide-react'

export interface CaborWatchData {
  nama: string
  total: number
  putra: number
  putri: number
  verified: number
  pending: number
  ditolak: number
  nonLokal: number
  // Tes fisik UPI — real
  fisikHadir: number       // jumlah atlet yang udah tes
  fisikAvg: number         // rata-rata skor 0-100, 0 = no data
  // Medali — masih hardcode (akan diganti ke kejuaraan_atlet)
  emas: number
  perak: number
  perunggu: number
  medaliIsDemo: boolean    // flag untuk badge DEMO
}

interface ScoredCabor extends CaborWatchData {
  riskScore: number        // 0-100, makin tinggi makin perlu atensi
  excellenceScore: number  // 0-100, makin tinggi makin excellent
  status: 'critical' | 'warning' | 'good' | 'excellent'
  issues: string[]         // list masalah specific
  highlights: string[]     // list keunggulan
}

// ── Scoring engine ────────────────────────────────
function scoreCabor(c: CaborWatchData): ScoredCabor {
  const issues: string[] = []
  const highlights: string[] = []
  let risk = 0
  let excel = 0

  // 1. Verifikasi rate
  const verifPct = c.total > 0 ? (c.verified / c.total) * 100 : 0
  const pendingPct = c.total > 0 ? (c.pending / c.total) * 100 : 0
  if (pendingPct >= 40) {
    issues.push(`${c.pending} pending (${Math.round(pendingPct)}%)`)
    risk += 30
  } else if (pendingPct >= 20) {
    issues.push(`${c.pending} pending`)
    risk += 15
  }
  if (verifPct >= 90) {
    highlights.push(`Verifikasi ${Math.round(verifPct)}%`)
    excel += 25
  }

  // 2. Ditolak
  if (c.ditolak > 0) {
    issues.push(`${c.ditolak} ditolak`)
    risk += 10 + c.ditolak * 2
  }

  // 3. Fisik UPI
  if (c.fisikHadir > 0) {
    if (c.fisikAvg < 50) {
      issues.push(`Fisik ${c.fisikAvg}% rendah`)
      risk += 35
    } else if (c.fisikAvg < 60) {
      issues.push(`Fisik ${c.fisikAvg}% perlu boost`)
      risk += 15
    } else if (c.fisikAvg >= 75) {
      highlights.push(`Fisik ${c.fisikAvg}% prima`)
      excel += 30
    }
  } else if (c.total >= 5) {
    issues.push(`Belum ada data fisik`)
    risk += 10
  }

  // 4. Non-lokal anomali
  const nonLokalPct = c.total > 0 ? (c.nonLokal / c.total) * 100 : 0
  if (nonLokalPct > 80 && c.total >= 5) {
    issues.push(`${Math.round(nonLokalPct)}% non-lokal`)
    risk += 8
  }

  // 5. Medali — hanya tambahin highlight kalau bukan demo OR ada minimal
  const totalMedali = c.emas + c.perak + c.perunggu
  if (totalMedali > 0) {
    highlights.push(`${c.emas}🥇 ${c.perak}🥈 ${c.perunggu}🥉`)
    excel += c.emas * 10 + c.perak * 5 + c.perunggu * 2
  } else if (c.total >= 10 && c.fisikAvg >= 60) {
    issues.push(`Belum dapat medali`)
    risk += 5
  }

  // Determine status
  let status: ScoredCabor['status'] = 'good'
  if (risk >= 50) status = 'critical'
  else if (risk >= 25) status = 'warning'
  else if (excel >= 50) status = 'excellent'

  return { ...c, riskScore: risk, excellenceScore: excel, status, issues, highlights }
}

// ── Main Component ─────────────────────────────────
export default function CaborWatchlist({
  cabors,
  primary = '#00ffaa',
  onClickCabor,
}: {
  cabors: CaborWatchData[]
  primary?: string
  onClickCabor?: (nama: string) => void
}) {
  const [filter, setFilter] = useState<'critical'|'excellent'|'all'>('critical')
  const [search, setSearch] = useState('')

  const scored = useMemo(() => cabors.map(scoreCabor), [cabors])

  const criticals = useMemo(() =>
    [...scored]
      .filter(c => c.status === 'critical' || c.status === 'warning')
      .sort((a, b) => b.riskScore - a.riskScore)
  , [scored])

  const excellents = useMemo(() =>
    [...scored]
      .filter(c => c.status === 'excellent')
      .sort((a, b) => b.excellenceScore - a.excellenceScore)
  , [scored])

  const others = useMemo(() =>
    [...scored]
      .filter(c => c.status === 'good')
      .sort((a, b) => b.total - a.total)
  , [scored])

  // Apply filter + search
  const displayed = useMemo(() => {
    let list = filter === 'critical' ? criticals
             : filter === 'excellent' ? excellents
             : [...criticals, ...excellents, ...others]
    if (search) {
      list = list.filter(c => c.nama.toLowerCase().includes(search.toLowerCase()))
    }
    return list.slice(0, filter === 'all' ? 30 : 12)
  }, [filter, criticals, excellents, others, search])

  // Stats summary
  const stats = useMemo(() => ({
    critical: scored.filter(c => c.status === 'critical').length,
    warning:  scored.filter(c => c.status === 'warning').length,
    excellent: scored.filter(c => c.status === 'excellent').length,
    good:     scored.filter(c => c.status === 'good').length,
  }), [scored])

  return (
    <div className="rounded-3xl overflow-hidden bg-white/[0.02] border border-white/[0.08] shadow-xl backdrop-blur-sm">

      {/* ── HEADER ── */}
      <div className="px-6 py-5 border-b border-white/[0.06] bg-gradient-to-r from-rose-500/[0.04] via-transparent to-emerald-500/[0.04]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)' }}>
                <AlertTriangle size={18} className="text-rose-400"/>
              </div>
              {stats.critical > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center animate-pulse"
                  style={{ boxShadow:'0 0 12px rgba(239,68,68,0.8)' }}>
                  <span className="text-[9px] font-black text-white">{stats.critical}</span>
                </div>
              )}
            </div>
            <div>
              <h2 className="text-white font-black text-lg tracking-tight">CABOR WATCHLIST</h2>
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mt-0.5">
                Operational Tracker · Real-time monitoring per cabor
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border"
              style={{ background:'rgba(239,68,68,0.08)', borderColor:'rgba(239,68,68,0.25)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"/>
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">{stats.critical} Kritis</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border"
              style={{ background:'rgba(251,191,36,0.08)', borderColor:'rgba(251,191,36,0.25)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400"/>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">{stats.warning} Waspada</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border"
              style={{ background:'rgba(0,255,170,0.08)', borderColor:'rgba(0,255,170,0.25)' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background:primary }}/>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color:primary }}>{stats.excellent} Excellent</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTER + SEARCH ── */}
      <div className="px-6 py-3 border-b border-white/[0.05] flex items-center gap-3 flex-wrap bg-black/20">
        <div className="flex items-center gap-1">
          <Filter size={12} className="text-zinc-500"/>
          {[
            { k:'critical' as const, l:`🚨 Perlu Atensi (${criticals.length})`,  c:'#ef4444' },
            { k:'excellent' as const,l:`✨ Excellent (${excellents.length})`,    c:primary    },
            { k:'all' as const,      l:`📊 Semua (${scored.length})`,             c:'#94a3b8' },
          ].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              style={{
                background: filter === f.k ? `${f.c}20` : 'transparent',
                color:      filter === f.k ? f.c : 'rgba(255,255,255,0.4)',
                border:     filter === f.k ? `1px solid ${f.c}40` : '1px solid transparent',
              }}>
              {f.l}
            </button>
          ))}
        </div>
        <div className="ml-auto relative w-full md:w-56">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari cabor..."
            className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-[11px] text-white outline-none focus:border-[#00ffaa]/50 transition-colors"/>
        </div>
      </div>

      {/* ── BODY: List of cabor cards ── */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[680px] overflow-y-auto"
        style={{ scrollbarWidth:'thin', scrollbarColor:`${primary}30 transparent` }}>

        {displayed.length === 0 ? (
          <div className="col-span-full text-center py-12">
            {filter === 'critical' ? (
              <>
                <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-3 opacity-50"/>
                <p className="text-sm text-emerald-300 font-bold">Tidak ada cabor kritis! 🎉</p>
                <p className="text-[11px] text-zinc-500 mt-1">Semua cabor dalam kondisi baik</p>
              </>
            ) : (
              <>
                <Search size={28} className="text-zinc-600 mx-auto mb-3"/>
                <p className="text-sm text-zinc-400">Tidak ada hasil ditemukan</p>
              </>
            )}
          </div>
        ) : displayed.map(c => {
          const totalMedali = c.emas + c.perak + c.perunggu
          const verifPct = c.total > 0 ? Math.round(c.verified / c.total * 100) : 0
          
          const cfg = c.status === 'critical' ? { color:'#ef4444', bg:'rgba(239,68,68,0.06)', border:'rgba(239,68,68,0.3)', label:'🚨 KRITIS', glow:'rgba(239,68,68,0.15)' }
                    : c.status === 'warning'  ? { color:'#fbbf24', bg:'rgba(251,191,36,0.05)', border:'rgba(251,191,36,0.25)', label:'⚠ WASPADA', glow:'rgba(251,191,36,0.1)' }
                    : c.status === 'excellent'? { color:primary,   bg:`${primary}08`,           border:`${primary}30`,           label:'✨ EXCELLENT', glow:`${primary}15` }
                    :                           { color:'#94a3b8', bg:'rgba(255,255,255,0.02)', border:'rgba(255,255,255,0.06)', label:'GOOD',     glow:'transparent' }

          return (
            <div key={c.nama}
              onClick={() => onClickCabor?.(c.nama)}
              className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg relative overflow-hidden group"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>

              {/* Status glow accent (top bar) */}
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.glow}` }}/>

              {/* HEAD: name + status badge */}
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black text-white truncate group-hover:text-white">{c.nama}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {c.total} atlet
                    </span>
                    <span className="text-[10px] text-zinc-600">·</span>
                    <span className="text-[10px] font-mono">
                      <span style={{ color: primary }}>{c.putra}L</span>
                      <span className="text-zinc-600 mx-0.5">/</span>
                      <span className="text-pink-400">{c.putri}P</span>
                    </span>
                  </div>
                </div>
                <span className="px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest whitespace-nowrap"
                  style={{ background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
                  {cfg.label}
                </span>
              </div>

              {/* METRICS BAR: 3 mini metrics */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {/* Verifikasi */}
                <div className="rounded-lg p-2 bg-black/20 border border-white/[0.04]">
                  <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">Verif</div>
                  <div className="text-sm font-black"
                    style={{ color: verifPct >= 90 ? '#4ade80' : verifPct >= 60 ? '#fbbf24' : '#f87171' }}>
                    {verifPct}%
                  </div>
                  <div className="text-[9px] text-zinc-500 mt-0.5">{c.verified}/{c.total}</div>
                </div>

                {/* Fisik UPI */}
                <div className="rounded-lg p-2 bg-black/20 border border-white/[0.04]">
                  <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">Fisik UPI</div>
                  {c.fisikHadir > 0 ? (
                    <>
                      <div className="text-sm font-black"
                        style={{ color: c.fisikAvg >= 75 ? '#10b981' : c.fisikAvg >= 60 ? '#3b82f6' : c.fisikAvg >= 50 ? '#fbbf24' : '#ef4444' }}>
                        {c.fisikAvg}%
                      </div>
                      <div className="text-[9px] text-zinc-500 mt-0.5">{c.fisikHadir} tes</div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-black text-zinc-600">—</div>
                      <div className="text-[9px] text-zinc-500 mt-0.5">no data</div>
                    </>
                  )}
                </div>

                {/* Medali */}
                <div className="rounded-lg p-2 bg-black/20 border border-white/[0.04] relative">
                  <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1">
                    Medali
                    {c.medaliIsDemo && (
                      <span className="px-1 py-0.5 rounded text-[7px] font-black uppercase tracking-wider"
                        style={{ background:'rgba(239,68,68,0.25)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.5)' }}
                        title="Data medali masih placeholder/dummy">
                        DEMO
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-black"
                    style={{ color: totalMedali > 0 ? '#ffd700' : '#52525b' }}>
                    {totalMedali}
                  </div>
                  <div className="text-[9px] mt-0.5">
                    {totalMedali > 0 ? (
                      <span>
                        <span className="text-yellow-400">{c.emas}</span>
                        <span className="text-zinc-500">/</span>
                        <span className="text-zinc-300">{c.perak}</span>
                        <span className="text-zinc-500">/</span>
                        <span className="text-amber-600">{c.perunggu}</span>
                      </span>
                    ) : (
                      <span className="text-zinc-500">belum</span>
                    )}
                  </div>
                </div>
              </div>

              {/* ISSUES or HIGHLIGHTS */}
              <div className="space-y-1">
                {c.status === 'critical' || c.status === 'warning' ? (
                  c.issues.slice(0, 2).map((issue, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px]">
                      <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: cfg.color }}/>
                      <span className="text-zinc-300 truncate">{issue}</span>
                    </div>
                  ))
                ) : c.status === 'excellent' ? (
                  c.highlights.slice(0, 2).map((highlight, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px]">
                      <CheckCircle2 size={9} style={{ color: cfg.color, flexShrink: 0 }}/>
                      <span className="text-zinc-300 truncate">{highlight}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-zinc-500 italic">Status normal</div>
                )}
              </div>

              {/* Click hint */}
              {onClickCabor && (
                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={14} style={{ color: cfg.color }}/>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── FOOTER: methodology ── */}
      <div className="px-6 py-3 border-t border-white/[0.05] bg-black/30 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <Activity size={10}/>
          <span><strong className="text-zinc-300">Scoring</strong>: Verifikasi + Fisik UPI + Anomali</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-zinc-500">
          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase"
            style={{ background:'rgba(239,68,68,0.2)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.4)' }}>
            DEMO
          </span>
          <span>= data placeholder, akan diganti data real</span>
        </div>
      </div>
    </div>
  )
}
