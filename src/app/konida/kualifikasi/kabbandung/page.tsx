'use client'
// src/app/konida/kualifikasi/page.tsx — v4
// DB-driven: cabor_master + cabor_kuota + v_cabor_kuota_summary
// + Sub-quota gender breakdown (putra/putri)
// + Validation Engine (alert panel)
// + Group by klaster venue option

import { useState, useMemo, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  ShieldAlert, Search, CheckCircle, AlertTriangle,
  Users, Target, Lock, Unlock, RefreshCw, X,
  MapPin, ChevronDown, ChevronUp,
  Printer, FileSpreadsheet, Filter,
  Trophy, Activity, AlertCircle, Loader2,
} from 'lucide-react'
import {
  type CaborKuotaSummary, type KuotaAlert, type StatusKuota,
  STATUS_KUOTA_CFG, KLASTER_CFG,
  aggregateKpi, validateKuota, groupByKlaster,
} from '@/lib/kuota-helpers'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const KONTINGEN_ID = 4
const ACCENT       = '#38bdf8'
const ROWS_DEFAULT = 15
const CABOR_DEFAULT = 6

interface AtletRow {
  id:                 number
  nama_lengkap:       string
  no_ktp:             string
  tgl_lahir:          string
  gender:             string
  cabor_nama_raw:     string
  kode_asal_daerah:   string
  nama_asal_daerah:   string
  status_registrasi:  string
  no_registrasi_koni: number | null
}

type FilterStatus = 'Semua'|'Verified'|'Menunggu Admin'|'Ditolak Admin'|'Posted'
type ViewMode     = 'cabor' | 'klaster'

// ── Helpers ─────────────────────────────────────
function Bar({value, max, color, h=5}: {value:number; max:number; color:string; h?:number}) {
  return (
    <div className="rounded-full overflow-hidden" style={{height:h, background:'rgba(255,255,255,0.06)'}}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{width:`${max>0?Math.min(value/max*100,100):0}%`, background:color}}/>
    </div>
  )
}

function hitungUmur(tgl: string) {
  if (!tgl) return 0
  return Math.floor((Date.now() - new Date(tgl).getTime()) / (365.25*24*3600*1000))
}

// ════════════════════════════════════════════════════════════
export default function PageKualifikasi() {
  const [atlets, setAtlets] = useState<AtletRow[]>([])
  const [caborSummary, setCaborSummary] = useState<CaborKuotaSummary[]>([])
  const [loading, setLoading] = useState(true)
  
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('Semua')
  const [filterCabor, setFilterCabor]   = useState('Semua')
  const [filterStatusKuota, setFilterStatusKuota] = useState<'all'|StatusKuota>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('cabor')
  const [showAllCabor, setShowAllCabor] = useState(false)
  const [showAllAtlet, setShowAllAtlet] = useState(false)
  const [expandedCabor, setExpandedCabor] = useState<string|null>(null)
  const [expandedKlaster, setExpandedKlaster] = useState<string|null>(null)
  const [showAlertPanel, setShowAlertPanel] = useState(true)
  const [animIn, setAnimIn] = useState(false)

  useEffect(()=>{ const t=setTimeout(()=>setAnimIn(true),80); return()=>clearTimeout(t) },[])

  // ── Fetch data ──────────────────────────────────
  useEffect(()=>{
    async function fetchAll() {
      try {
        const [atletRes, summaryRes] = await Promise.all([
          sb.from('atlet')
            .select('id,nama_lengkap,no_ktp,tgl_lahir,gender,cabor_nama_raw,kode_asal_daerah,nama_asal_daerah,status_registrasi,no_registrasi_koni')
            .eq('kontingen_id', KONTINGEN_ID)
            .order('cabor_nama_raw',{ascending:true})
            .order('nama_lengkap',{ascending:true}),
          sb.from('v_cabor_kuota_summary')
            .select('*')
            .eq('kontingen_id', KONTINGEN_ID)
            .order('urutan'),
        ])
        
        if (atletRes.data) setAtlets(atletRes.data as AtletRow[])
        if (summaryRes.data) setCaborSummary(summaryRes.data as CaborKuotaSummary[])
      } catch (e) {
        console.error('[Kualifikasi] Load error:', e)
      } finally {
        setLoading(false)
      }
    }
    void fetchAll()
  },[])

  // ── Filtered cabors ──────────────────────────────
  const filteredCabors = useMemo(()=>{
    let list = caborSummary
    if (filterStatusKuota !== 'all') {
      list = list.filter(c => c.status_kuota === filterStatusKuota)
    }
    return list
  },[caborSummary, filterStatusKuota])

  // ── Aggregate KPI ────────────────────────────────
  const kpi = useMemo(()=>aggregateKpi(caborSummary), [caborSummary])

  // ── Validation alerts ────────────────────────────
  const alerts = useMemo(()=>validateKuota(caborSummary), [caborSummary])

  // ── Group by klaster ─────────────────────────────
  const groupedByKlaster = useMemo(()=>{
    return groupByKlaster(filteredCabors)
  },[filteredCabors])

  // ── Filtered atlet ───────────────────────────────
  const filteredAtlet = useMemo(()=>atlets.filter(a=>{
    const ms = !search || a.nama_lengkap.toLowerCase().includes(search.toLowerCase()) || a.no_ktp?.includes(search)
    const ss = filterStatus==='Semua' || a.status_registrasi===filterStatus
    const cs = filterCabor==='Semua' || a.cabor_nama_raw===filterCabor
    return ms && ss && cs
  }),[atlets, search, filterStatus, filterCabor])

  const caborList = useMemo(()=>
    ['Semua', ...Array.from(new Set(atlets.map(a=>a.cabor_nama_raw||'Lainnya'))).sort()]
  ,[atlets])

  const displayedCabor = showAllCabor ? filteredCabors : filteredCabors.slice(0, CABOR_DEFAULT)
  const displayedAtlet = showAllAtlet ? filteredAtlet : filteredAtlet.slice(0, ROWS_DEFAULT)

  const ani=(d=0)=>({
    style:{transitionDelay:`${d}ms`, transition:'all 0.5s ease'},
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  const STATUS_CFG_ATLET: Record<string,{bg:string;text:string;border:string}> = {
    'Verified':       {bg:'rgba(74,222,128,0.1)', text:'#22d3ee', border:'rgba(74,222,128,0.2)'},
    'Menunggu Admin': {bg:'rgba(251,191,36,0.1)', text:'#fbbf24', border:'rgba(251,191,36,0.2)'},
    'Ditolak Admin':  {bg:'rgba(248,113,113,0.1)',text:'#f87171', border:'rgba(248,113,113,0.2)'},
    'Posted':         {bg:'rgba(96,165,250,0.1)', text:'#60a5fa', border:'rgba(96,165,250,0.2)'},
    'Draft':          {bg:'rgba(255,255,255,0.05)',text:'#6b7280',border:'rgba(255,255,255,0.1)'},
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#020a14'}}>
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{color:ACCENT}}/>
        <p className="font-mono text-xs uppercase tracking-widest" style={{color:ACCENT}}>Memuat Kontrol Kuota...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen text-zinc-300 font-sans flex flex-col"
      style={{background:'linear-gradient(135deg,#020a14 0%,#020c18 100%)'}}>

      <div className="fixed inset-0 pointer-events-none"
        style={{backgroundImage:`linear-gradient(${ACCENT}03 1px,transparent 1px),linear-gradient(90deg,${ACCENT}03 1px,transparent 1px)`,backgroundSize:'24px 24px',zIndex:0}}/>

      {/* HEADER */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl px-6 py-4"
        style={{background:'rgba(2,10,20,0.95)', borderColor:`${ACCENT}12`}}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{background:`${ACCENT}12`, border:`1px solid ${ACCENT}25`}}>
              <Target size={20} style={{color:ACCENT}}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Kontrol Kuota & Kualifikasi</h1>
              <p className="text-[11px] font-mono mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>
                {caborSummary.length} cabor PORPROV XV · Kontingen Kab. Bandung
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl"
              style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)'}}>
              {(['cabor','klaster'] as ViewMode[]).map(v=>(
                <button key={v} onClick={()=>setViewMode(v)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{
                    background: viewMode===v ? `${ACCENT}15` : 'transparent',
                    color:      viewMode===v ? ACCENT : 'rgba(255,255,255,0.4)',
                  }}>
                  {v==='cabor' ? '🏆 Per Cabor' : '🗺 Per Klaster'}
                </button>
              ))}
            </div>
            <button onClick={()=>window.location.reload()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
              style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)'}}>
              <RefreshCw size={11}/> Refresh
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative z-10 space-y-5">

        {/* KPI STRIP */}
        <div {...ani(0)} className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Total Kuota — Big card */}
          <div className="lg:col-span-2 rounded-2xl p-5 relative overflow-hidden"
            style={{background:`${ACCENT}06`, border:`1px solid ${ACCENT}18`}}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users size={13} style={{color:ACCENT}}/>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Kuota Kontingen</span>
                </div>
                <div className="text-5xl font-light text-white">{kpi.totalKuota.toLocaleString('id')}</div>
                <div className="text-[11px] mt-1" style={{color:`${ACCENT}70`}}>
                  {kpi.totalAktif} terpakai · {kpi.sisa} sisa · {kpi.totalCabor} cabor
                </div>
              </div>
              <div className="flex-shrink-0 relative">
                <svg width="64" height="64" style={{transform:'rotate(-90deg)'}}>
                  <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
                  <circle cx="32" cy="32" r="24" fill="none" stroke={ACCENT} strokeWidth="5"
                    strokeDasharray={`${2*Math.PI*24*kpi.pct/100} ${2*Math.PI*24}`} strokeLinecap="round"/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-base font-black" style={{color:ACCENT}}>{kpi.pct}%</div>
                </div>
              </div>
            </div>
            <Bar value={kpi.totalAktif} max={kpi.totalKuota} color={ACCENT} h={5}/>

            {/* Gender breakdown */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg p-2.5"
                style={{background:'rgba(96,165,250,0.06)', border:'1px solid rgba(96,165,250,0.15)'}}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-blue-400 font-bold">♂ PUTRA</span>
                  <span className="text-[10px] font-mono text-zinc-400">{kpi.pctPutra}%</span>
                </div>
                <div className="text-sm font-bold text-white">{kpi.totalAktifPutra} / {kpi.totalKuotaPutra}</div>
                <div className="mt-1.5"><Bar value={kpi.totalAktifPutra} max={kpi.totalKuotaPutra} color="#60a5fa" h={3}/></div>
              </div>
              <div className="rounded-lg p-2.5"
                style={{background:'rgba(236,72,153,0.06)', border:'1px solid rgba(236,72,153,0.15)'}}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-pink-400 font-bold">♀ PUTRI</span>
                  <span className="text-[10px] font-mono text-zinc-400">{kpi.pctPutri}%</span>
                </div>
                <div className="text-sm font-bold text-white">{kpi.totalAktifPutri} / {kpi.totalKuotaPutri}</div>
                <div className="mt-1.5"><Bar value={kpi.totalAktifPutri} max={kpi.totalKuotaPutri} color="#ec4899" h={3}/></div>
              </div>
            </div>
          </div>

          {/* Status Distribution */}
          {[
            { l:'Tiket Aktif', v:kpi.totalAktif, c:'#22d3ee', sub:'Verified + Posted', icon:CheckCircle },
            { l:'Sisa Kuota',  v:kpi.sisa,        c:'#fbbf24', sub:'Slot tersedia',     icon:Unlock      },
            { l:'Alert Cabor', v:kpi.over+kpi.kritis, c:'#f87171', sub:`${kpi.over} over · ${kpi.kritis} kritis`, icon:AlertTriangle },
          ].map(s=>(
            <div key={s.l} className="rounded-2xl p-5 relative overflow-hidden"
              style={{background:'rgba(255,255,255,0.025)', border:`1px solid ${s.c}18`}}>
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:`${s.c}50`}}/>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                <s.icon size={12} style={{color:s.c}}/> {s.l}
              </div>
              <div className="text-4xl font-light" style={{color:s.c}}>{s.v}</div>
              <div className="text-[10px] text-zinc-600 mt-1.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ════════ ALERT PANEL (validation engine) ════════ */}
        {alerts.length > 0 && showAlertPanel && (
          <div {...ani(20)} className="rounded-2xl p-4 relative overflow-hidden"
            style={{
              background:'linear-gradient(135deg, rgba(248,113,113,0.05) 0%, rgba(251,191,36,0.03) 100%)',
              border:'1px solid rgba(248,113,113,0.2)',
            }}>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{background:'rgba(248,113,113,0.15)', border:'1px solid rgba(248,113,113,0.3)'}}>
                <AlertCircle size={16} className="text-red-400"/>
              </div>
              <div className="flex-1">
                <div className="text-sm font-black text-red-300 mb-0.5">
                  ⚠ {alerts.length} Issue Ditemukan
                </div>
                <p className="text-[11px] text-red-200/80">
                  Auto-validation engine mendeteksi anomali kuota
                </p>
              </div>
              <button onClick={()=>setShowAlertPanel(false)}
                className="px-2 py-1 rounded-lg text-[10px] font-bold"
                style={{background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.1)'}}>
                Sembunyikan
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {alerts.map((a,i)=>{
                const c = a.severity==='error' ? '#f87171' : a.severity==='warning' ? '#fbbf24' : '#3b82f6'
                const icon = a.severity==='error' ? '🚨' : a.severity==='warning' ? '⚠' : 'ℹ'
                return (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg"
                    style={{background:`${c}08`, border:`1px solid ${c}20`}}>
                    <span className="text-xs">{icon}</span>
                    <span className="text-[11px] flex-1" style={{color:`${c}cc`}}>{a.message}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ════════ MONITOR KUOTA — VIEW MODE: CABOR ════════ */}
        {viewMode === 'cabor' && (
          <div {...ani(40)} className="rounded-2xl overflow-hidden"
            style={{background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)'}}>

            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-4 border-b flex-wrap gap-3"
              style={{borderColor:'rgba(255,255,255,0.07)'}}>
              <div className="flex items-center gap-2">
                <Target size={14} style={{color:ACCENT}}/>
                <span className="text-sm font-bold text-white">Monitor Kuota per Cabor</span>
                <span className="text-[11px]" style={{color:'rgba(255,255,255,0.3)'}}>
                  {displayedCabor.length} / {filteredCabors.length} cabor
                </span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {([
                  {k:'all',    l:`Semua (${caborSummary.length})`, c:ACCENT},
                  {k:'OPEN',   l:`🟢 Open (${kpi.open})`,           c:'#38bdf8'},
                  {k:'KRITIS', l:`🟡 Kritis (${kpi.kritis})`,       c:'#fbbf24'},
                  {k:'PENUH',  l:`🔵 Penuh (${kpi.penuh})`,         c:'#60a5fa'},
                  {k:'OVER',   l:`🔴 Over (${kpi.over})`,           c:'#f87171'},
                ] as const).map(f=>(
                  <button key={f.k} onClick={()=>setFilterStatusKuota(f.k as any)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                    style={{
                      background: filterStatusKuota===f.k ? `${f.c}20` : 'rgba(255,255,255,0.04)',
                      color:      filterStatusKuota===f.k ? f.c : 'rgba(255,255,255,0.4)',
                      border:     filterStatusKuota===f.k ? `1px solid ${f.c}40` : '1px solid transparent',
                    }}>
                    {f.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid Cabor */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayedCabor.map(c=>{
                const isExp = expandedCabor===c.cabor_nama
                const sCfg = STATUS_KUOTA_CFG[c.status_kuota]
                const klasterCfg = c.klaster_venue ? KLASTER_CFG[c.klaster_venue] : null

                return (
                  <div key={c.cabor_id} className="rounded-xl overflow-hidden transition-all"
                    style={{
                      border: `1px solid ${isExp ? sCfg.color : sCfg.border}`,
                      background: isExp ? `${sCfg.color}08` : 'rgba(255,255,255,0.02)',
                    }}>
                    <div className="p-3.5 cursor-pointer"
                      onClick={()=>setExpandedCabor(isExp ? null : c.cabor_nama)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm font-bold text-zinc-200 truncate">{c.cabor_nama}</span>
                          {klasterCfg && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0"
                              style={{background:`${klasterCfg.color}15`, color:klasterCfg.color}}>
                              {klasterCfg.emoji}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{background:sCfg.bg, color:sCfg.color, border:`1px solid ${sCfg.border}`}}>
                            {sCfg.label}
                          </span>
                          {isExp
                            ? <ChevronUp size={13} style={{color:sCfg.color}}/>
                            : <ChevronDown size={13} style={{color:'rgba(255,255,255,0.3)'}}/>}
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] mb-1.5">
                        <span className="text-zinc-500">
                          Aktif <strong style={{color:sCfg.color}}>{c.aktif}</strong> / <strong className="text-white">{c.kuota_total}</strong>
                        </span>
                        <span style={{color:sCfg.color, fontWeight:700}}>{c.pct}%</span>
                      </div>
                      <Bar value={c.aktif} max={c.kuota_total} color={sCfg.color} h={4}/>
                    </div>

                    {isExp && (
                      <div className="px-3.5 pb-3.5 border-t" style={{borderColor:`${sCfg.color}15`}}>
                        {/* Sub-Quota Gender Breakdown */}
                        <div className="mt-3 mb-3 grid grid-cols-2 gap-2">
                          <div className="rounded-lg p-2"
                            style={{background:'rgba(96,165,250,0.06)', border:'1px solid rgba(96,165,250,0.15)'}}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] text-blue-400 font-bold">♂ PUTRA</span>
                              <span className="text-[10px] font-mono font-bold text-blue-400">
                                {c.aktif_putra}/{c.kuota_putra}
                              </span>
                            </div>
                            <Bar value={c.aktif_putra} max={c.kuota_putra} color="#60a5fa" h={3}/>
                          </div>
                          <div className="rounded-lg p-2"
                            style={{background:'rgba(236,72,153,0.06)', border:'1px solid rgba(236,72,153,0.15)'}}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] text-pink-400 font-bold">♀ PUTRI</span>
                              <span className="text-[10px] font-mono font-bold text-pink-400">
                                {c.aktif_putri}/{c.kuota_putri}
                              </span>
                            </div>
                            <Bar value={c.aktif_putri} max={c.kuota_putri} color="#ec4899" h={3}/>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {[
                            {l:'Total Daftar', v:c.total_terdaftar, c:'rgba(255,255,255,0.6)'},
                            {l:'Verified',     v:c.verified,         c:'#22d3ee'},
                            {l:'Posted',       v:c.posted,           c:'#60a5fa'},
                            {l:'Pending',      v:c.pending,          c:'#fbbf24'},
                            {l:'Ditolak',      v:c.ditolak,          c:'#f87171'},
                            {l:'Ofisial Slot', v:c.kuota_ofisial,    c:'#a855f7'},
                          ].map(s=>(
                            <div key={s.l} className="rounded-lg p-2"
                              style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)'}}>
                              <div className="text-[9px] text-zinc-500 uppercase truncate">{s.l}</div>
                              <div className="text-base font-bold mt-0.5" style={{color:s.c}}>{s.v}</div>
                            </div>
                          ))}
                        </div>

                        <button onClick={()=>{setFilterCabor(c.cabor_nama===filterCabor ? 'Semua' : c.cabor_nama); setExpandedCabor(null)}}
                          className="mt-3 w-full py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
                          style={{
                            background: filterCabor===c.cabor_nama ? `${sCfg.color}20` : `${ACCENT}10`,
                            color:      filterCabor===c.cabor_nama ? sCfg.color : ACCENT,
                            border:     `1px solid ${filterCabor===c.cabor_nama ? sCfg.color : ACCENT}25`,
                          }}>
                          <Filter size={11}/>
                          {filterCabor===c.cabor_nama ? 'Hapus Filter Ini' : 'Filter Tabel Atlet →'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {filteredCabors.length > CABOR_DEFAULT && (
              <div className="px-4 pb-4 flex justify-center border-t" style={{borderColor:'rgba(255,255,255,0.05)', paddingTop:12}}>
                <button onClick={()=>setShowAllCabor(v=>!v)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold"
                  style={{background:`${ACCENT}10`, color:ACCENT, border:`1px solid ${ACCENT}20`}}>
                  {showAllCabor
                    ? <><ChevronUp size={13}/> Tutup ({filteredCabors.length-CABOR_DEFAULT} cabor)</>
                    : <><ChevronDown size={13}/> Buka {filteredCabors.length-CABOR_DEFAULT} cabor lainnya</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ════════ MONITOR KUOTA — VIEW MODE: KLASTER ════════ */}
        {viewMode === 'klaster' && (
          <div {...ani(40)} className="space-y-3">
            {Object.entries(groupedByKlaster).map(([klaster, cabors])=>{
              const klasterCfg = KLASTER_CFG[klaster] || {color:'#94a3b8', emoji:'📍'}
              const totalKuota = cabors.reduce((s,c)=>s+c.kuota_total,0)
              const totalAktif = cabors.reduce((s,c)=>s+c.aktif,0)
              const pct = totalKuota>0 ? Math.round(totalAktif/totalKuota*100) : 0
              const isExp = expandedKlaster===klaster

              return (
                <div key={klaster} className="rounded-2xl overflow-hidden"
                  style={{
                    background:'rgba(255,255,255,0.02)',
                    border:`1px solid ${isExp ? klasterCfg.color+'40' : 'rgba(255,255,255,0.07)'}`,
                  }}>
                  <div className="p-4 cursor-pointer flex items-center justify-between"
                    onClick={()=>setExpandedKlaster(isExp ? null : klaster)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{background:`${klasterCfg.color}15`, border:`1px solid ${klasterCfg.color}30`}}>
                        {klasterCfg.emoji}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Klaster {klaster}</h3>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          {cabors.length} cabor · {totalAktif} / {totalKuota} atlet · {pct}%
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 text-right">
                        <div className="text-2xl font-light" style={{color:klasterCfg.color}}>{pct}%</div>
                        <Bar value={totalAktif} max={totalKuota} color={klasterCfg.color} h={3}/>
                      </div>
                      {isExp
                        ? <ChevronUp size={16} style={{color:klasterCfg.color}}/>
                        : <ChevronDown size={16} style={{color:'rgba(255,255,255,0.3)'}}/>}
                    </div>
                  </div>

                  {isExp && (
                    <div className="border-t p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
                      style={{borderColor:`${klasterCfg.color}15`}}>
                      {cabors.map(c=>{
                        const sCfg = STATUS_KUOTA_CFG[c.status_kuota]
                        return (
                          <div key={c.cabor_id} className="rounded-lg p-3"
                            style={{background:`${sCfg.color}06`, border:`1px solid ${sCfg.border}`}}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-zinc-200 truncate">{c.cabor_nama}</span>
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                                style={{background:sCfg.bg, color:sCfg.color}}>
                                {sCfg.label}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-500 mb-1.5">
                              <strong style={{color:sCfg.color}}>{c.aktif}</strong> / {c.kuota_total} ({c.pct}%)
                            </div>
                            <Bar value={c.aktif} max={c.kuota_total} color={sCfg.color} h={3}/>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ════════ TABEL ATLET ════════ */}
        <div {...ani(80)} className="rounded-2xl overflow-hidden"
          style={{background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)'}}>

          <div className="flex items-center justify-between px-5 py-4 border-b flex-wrap gap-3"
            style={{borderColor:'rgba(255,255,255,0.07)'}}>
            <div className="flex items-center gap-2 flex-wrap">
              <ShieldAlert size={14} style={{color:ACCENT}}/>
              <span className="text-sm font-bold text-white">Daftar Atlet</span>
              <span className="text-[11px]" style={{color:'rgba(255,255,255,0.3)'}}>
                {filteredAtlet.length} / {atlets.length}
              </span>
              {filterCabor!=='Semua' && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                  style={{background:`${ACCENT}15`, color:ACCENT, border:`1px solid ${ACCENT}25`}}>
                  <Filter size={10}/> {filterCabor}
                  <button onClick={()=>setFilterCabor('Semua')} className="ml-1"><X size={9}/></button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1">
                {(['Semua','Verified','Menunggu Admin','Ditolak Admin','Posted'] as FilterStatus[]).map(s=>(
                  <button key={s} onClick={()=>setFilterStatus(s)}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                    style={{
                      background: filterStatus===s ? `${ACCENT}18` : 'rgba(255,255,255,0.04)',
                      color:      filterStatus===s ? ACCENT : 'rgba(255,255,255,0.35)',
                      border:     filterStatus===s ? `1px solid ${ACCENT}25` : '1px solid transparent',
                    }}>
                    {s==='Semua' ? 'Semua' :
                     s==='Verified' ? `✅ ${atlets.filter(a=>a.status_registrasi===s).length}` :
                     s==='Menunggu Admin' ? `⏳ ${atlets.filter(a=>a.status_registrasi===s).length}` :
                     s==='Ditolak Admin' ? `❌ ${atlets.filter(a=>a.status_registrasi===s).length}` :
                     `📌 ${atlets.filter(a=>a.status_registrasi===s).length}`}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama / NIK..."
                  className="bg-transparent border rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 outline-none w-40"
                  style={{borderColor:'rgba(255,255,255,0.1)'}}
                  onFocus={e=>e.target.style.borderColor=ACCENT}
                  onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
              </div>
              <select value={filterCabor} onChange={e=>setFilterCabor(e.target.value)}
                className="rounded-xl px-3 py-1.5 text-xs text-zinc-200 outline-none"
                style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)'}}>
                {caborList.map(c=>(
                  <option key={c} value={c} style={{background:'#03101c'}}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[9px] uppercase tracking-widest"
                style={{background:'rgba(2,10,20,0.98)', color:'rgba(255,255,255,0.3)', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <th className="px-4 py-3 font-bold w-8 text-center">#</th>
                <th className="px-4 py-3 font-bold">Nama & NIK</th>
                <th className="px-4 py-3 font-bold">Cabor</th>
                <th className="px-4 py-3 font-bold">Usia & Gender</th>
                <th className="px-4 py-3 font-bold">Asal Daerah</th>
                <th className="px-4 py-3 font-bold">No Reg KONI</th>
                <th className="px-4 py-3 font-bold text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedAtlet.map((a,i)=>{
                const umur = hitungUmur(a.tgl_lahir)
                const nonLk = a.kode_asal_daerah && !a.kode_asal_daerah.startsWith('3204')
                const st = STATUS_CFG_ATLET[a.status_registrasi] ?? STATUS_CFG_ATLET['Draft']
                return (
                  <tr key={a.id} className="border-b hover:bg-white/[0.02]"
                    style={{borderColor:'rgba(255,255,255,0.04)'}}>
                    <td className="px-4 py-3 text-center text-[10px] font-mono" style={{color:'rgba(255,255,255,0.2)'}}>{i+1}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-bold text-zinc-200">{a.nama_lengkap}</div>
                      <div className="text-[10px] font-mono mt-0.5" style={{color:'rgba(255,255,255,0.25)'}}>{a.no_ktp||'-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-zinc-300">{a.cabor_nama_raw||'-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${umur>35?'text-rose-400':umur<17?'text-amber-400':'text-zinc-300'}`}>{umur}th</span>
                      <span className="text-[10px] ml-1.5" style={{color:'rgba(255,255,255,0.3)'}}>({a.gender||'-'})</span>
                    </td>
                    <td className="px-4 py-3">
                      {nonLk ? (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded-lg w-fit border border-orange-500/20">
                          <MapPin size={8}/> {a.nama_asal_daerah||'Luar'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold" style={{color:`${ACCENT}60`}}>Lokal KBR</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono" style={{color:a.no_registrasi_koni?ACCENT:'rgba(255,255,255,0.2)'}}>
                        {a.no_registrasi_koni ? `#${a.no_registrasi_koni}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase"
                        style={{background:st.bg, color:st.text, border:`1px solid ${st.border}`}}>
                        {a.status_registrasi}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredAtlet.length===0 && (
            <div className="py-10 text-center" style={{color:'rgba(255,255,255,0.2)'}}>
              <Search size={22} className="mx-auto mb-3 opacity-30"/>
              <p className="text-sm">Tidak ada atlet yang cocok</p>
            </div>
          )}

          {filteredAtlet.length > ROWS_DEFAULT && (
            <div className="p-4 flex items-center justify-between border-t"
              style={{borderColor:'rgba(255,255,255,0.05)'}}>
              <span className="text-[11px]" style={{color:'rgba(255,255,255,0.25)'}}>
                Menampilkan {displayedAtlet.length} dari {filteredAtlet.length} atlet
              </span>
              <button onClick={()=>setShowAllAtlet(v=>!v)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold"
                style={{background:`${ACCENT}10`, color:ACCENT, border:`1px solid ${ACCENT}20`}}>
                {showAllAtlet
                  ? <><ChevronUp size={13}/> Tutup — tampilkan {ROWS_DEFAULT} saja</>
                  : <><ChevronDown size={13}/> Buka semua {filteredAtlet.length} atlet</>}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}