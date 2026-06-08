'use client'
// src/app/konida/kejuaraan/kabbandung/page.tsx — v3
// DB-driven: pakai riwayat_prestasi + v_atlet_medali_summary
// 3-Layer Demo Signal: badge + pattern + banner
// Filter: Real/Demo/Semua

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Trophy, Search, Medal, Calendar, MapPin,
  ChevronRight, Award, Flame, Users, User,
  ChevronDown, ChevronUp, Star, AlertTriangle,
  RefreshCw, Clock, X, Info, CheckCircle, Filter,
} from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const KONTINGEN_ID = 4
const ACCENT       = '#38bdf8'

// ── Interfaces ───────────────────────────────────────────
interface AtletDB {
  id:                 number
  nama_lengkap:       string
  cabor_nama_raw:     string
  gender:             string
  tgl_lahir:          string
  kode_asal_daerah:   string
  nama_asal_daerah:   string
  no_registrasi_koni: number|null
  status_registrasi:  string
}

interface RiwayatPrestasi {
  id:            number
  atlet_id:      number
  event:         string
  tahun:         number
  lokasi:        string
  nomor_tanding: string
  hasil:         'Emas'|'Perak'|'Perunggu'|'Juara 4'|'Peserta'
  catatan:       string
  level_event:   'Internasional'|'Nasional'|'Provinsi'|'Kabupaten'|'Lokal'
  is_demo:       boolean
  created_at:    string
}

type FilterType = 'all' | 'real' | 'demo'
type FilterGender = 'Semua' | 'L' | 'P'

// ── Helpers ──────────────────────────────────────────────
function hitungUmur(tgl: string) {
  if (!tgl) return 0
  return Math.floor((Date.now()-new Date(tgl).getTime())/(365.25*24*3600*1000))
}

function Bar({ value, max, color, h=4 }:{ value:number; max:number; color:string; h?:number }) {
  return (
    <div className="rounded-full overflow-hidden" style={{ height:h, background:'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width:`${max>0?Math.min(value/max*100,100):0}%`, background:color }}/>
    </div>
  )
}

const HASIL_CFG: Record<string,{bg:string;text:string;border:string;dot:string;emoji:string}> = {
  'Emas':     { bg:'rgba(245,158,11,0.1)',  text:'#fbbf24', border:'rgba(245,158,11,0.25)', dot:'#fbbf24', emoji:'🥇' },
  'Perak':    { bg:'rgba(203,213,225,0.1)', text:'#cbd5e1', border:'rgba(203,213,225,0.2)', dot:'#cbd5e1', emoji:'🥈' },
  'Perunggu': { bg:'rgba(205,127,50,0.1)',  text:'#cd7f32', border:'rgba(205,127,50,0.2)',  dot:'#cd7f32', emoji:'🥉' },
  'Juara 4':  { bg:'rgba(255,255,255,0.04)',text:'#6b7280', border:'rgba(255,255,255,0.08)',dot:'#6b7280', emoji:'4️⃣' },
  'Peserta':  { bg:'rgba(255,255,255,0.04)',text:'#4b5563', border:'rgba(255,255,255,0.06)',dot:'#374151', emoji:'—' },
}

const LEVEL_CFG: Record<string,{color:string;label:string}> = {
  'Internasional': { color:'#a855f7', label:'🌍 Internasional' },
  'Nasional':      { color:'#3b82f6', label:'🇮🇩 Nasional' },
  'Provinsi':      { color:'#0ea5e9', label:'🏛 Provinsi' },
  'Kabupaten':     { color:'#f59e0b', label:'🏙 Kabupaten' },
  'Lokal':         { color:'#6b7280', label:'📍 Lokal' },
}

// ════════════════════════════════════════════════════════════
export default function PageKejuaraan() {
  const [atlets, setAtlets] = useState<AtletDB[]>([])
  const [allRecords, setAllRecords] = useState<RiwayatPrestasi[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedAtlet, setSelectedAtlet] = useState<AtletDB|null>(null)
  const [expandedCabor, setExpandedCabor] = useState<string|null>(null)
  const [animIn, setAnimIn] = useState(false)
  const [filterGender, setFilterGender] = useState<FilterGender>('Semua')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [showAllCabor, setShowAllCabor] = useState(false)
  const [showDemoBanner, setShowDemoBanner] = useState(true)
  const CABOR_DEFAULT = 5

  useEffect(()=>{ const t=setTimeout(()=>setAnimIn(true),80); return()=>clearTimeout(t) },[])

  useEffect(()=>{
    async function load() {
      try {
        const [atletRes, riwayatRes] = await Promise.all([
          sb.from('atlet')
            .select('id,nama_lengkap,cabor_nama_raw,gender,tgl_lahir,kode_asal_daerah,nama_asal_daerah,no_registrasi_koni,status_registrasi')
            .eq('kontingen_id', KONTINGEN_ID)
            .eq('status_registrasi', 'Verified')
            .order('cabor_nama_raw', { ascending:true })
            .order('nama_lengkap',   { ascending:true }),
          sb.from('riwayat_prestasi')
            .select('*')
            .order('tahun', { ascending:false }),
        ])
        
        if (atletRes.data) {
          const data = atletRes.data as AtletDB[]
          setAtlets(data)
          if (data.length > 0) {
            // Auto-select atlet pertama yang punya record
            const recordsMap: Record<number, number> = {}
            ;(riwayatRes.data || []).forEach((r: any) => {
              recordsMap[r.atlet_id] = (recordsMap[r.atlet_id] || 0) + 1
            })
            const atletWithRecord = data.find(a => recordsMap[a.id] > 0) || data[0]
            setExpandedCabor(atletWithRecord.cabor_nama_raw || 'Umum')
            setSelectedAtlet(atletWithRecord)
          }
        }
        if (riwayatRes.data) setAllRecords(riwayatRes.data as RiwayatPrestasi[])
      } catch (e) {
        console.error('[Kejuaraan] Load error:', e)
      } finally {
        setLoading(false)
      }
    }
    void load()
  },[])

  // ── Records per atlet ──────────────────────────────────
  const recordsByAtlet = useMemo(()=>{
    const map: Record<number, RiwayatPrestasi[]> = {}
    allRecords.forEach(r => {
      if (!map[r.atlet_id]) map[r.atlet_id] = []
      map[r.atlet_id].push(r)
    })
    return map
  },[allRecords])

  // ── Grouped by cabor ───────────────────────────────────
  const grouped = useMemo(()=>{
    let list = atlets
    if (search) list = list.filter(a=>
      a.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
      (a.cabor_nama_raw||'').toLowerCase().includes(search.toLowerCase())
    )
    if (filterGender!=='Semua') list = list.filter(a=>a.gender===filterGender)

    const map: Record<string, AtletDB[]> = {}
    list.forEach(a=>{
      const c = a.cabor_nama_raw||'Lainnya'
      if (!map[c]) map[c]=[]
      map[c].push(a)
    })
    return map
  },[atlets,search,filterGender])

  // ── KPI ────────────────────────────────────────────────
  const kpi = useMemo(()=>{
    const totalAtlet = atlets.length
    const putra      = atlets.filter(a=>a.gender==='L').length
    const putri      = atlets.filter(a=>a.gender==='P').length
    const cabors     = new Set(atlets.map(a=>a.cabor_nama_raw)).size

    const totalRecords = allRecords.length
    const totalDemo    = allRecords.filter(r=>r.is_demo).length
    const totalReal    = allRecords.filter(r=>!r.is_demo).length

    const totalEmas     = allRecords.filter(r=>r.hasil==='Emas').length
    const totalPerak    = allRecords.filter(r=>r.hasil==='Perak').length
    const totalPerunggu = allRecords.filter(r=>r.hasil==='Perunggu').length

    const atletDenganRekam = atlets.filter(a=>(recordsByAtlet[a.id]||[]).length>0).length

    return {
      totalAtlet, putra, putri, cabors,
      totalRecords, totalDemo, totalReal,
      totalEmas, totalPerak, totalPerunggu,
      atletDenganRekam,
    }
  },[atlets, allRecords, recordsByAtlet])

  // ── Track record atlet terpilih ────────────────────────
  const selectedHistoryRaw = selectedAtlet ? (recordsByAtlet[selectedAtlet.id]||[]) : []
  const selectedHistory = useMemo(()=>{
    if (filterType === 'real') return selectedHistoryRaw.filter(r=>!r.is_demo)
    if (filterType === 'demo') return selectedHistoryRaw.filter(r=>r.is_demo)
    return selectedHistoryRaw
  },[selectedHistoryRaw, filterType])

  const selectedEmas    = selectedHistoryRaw.filter(r=>r.hasil==='Emas').length
  const selectedPerak   = selectedHistoryRaw.filter(r=>r.hasil==='Perak').length
  const selectedPerunggu= selectedHistoryRaw.filter(r=>r.hasil==='Perunggu').length
  const isElite         = selectedEmas > 0

  const caborEntries = Object.entries(grouped)
  const displayedCabor = showAllCabor ? caborEntries : caborEntries.slice(0, CABOR_DEFAULT)

  const ani=(d=0)=>({
    style:{ transitionDelay:`${d}ms`, transition:'all 0.5s ease' },
    className: animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-4',
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#020a14' }}>
      <div className="text-center">
        <div className="w-12 h-12 border-2 rounded-full animate-spin mx-auto mb-4"
          style={{ borderColor:`${ACCENT}20`, borderTopColor:ACCENT }}/>
        <p className="font-mono text-xs uppercase tracking-widest" style={{ color:ACCENT }}>Memuat Basis Data Prestasi...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen text-zinc-300 font-sans flex flex-col"
      style={{ background:'linear-gradient(135deg,#020a14 0%,#020c18 100%)' }}>

      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage:`linear-gradient(${ACCENT}03 1px,transparent 1px),linear-gradient(90deg,${ACCENT}03 1px,transparent 1px)`,backgroundSize:'24px 24px',zIndex:0 }}/>

      {/* HEADER */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl px-6 py-4"
        style={{ background:'rgba(2,10,20,0.95)', borderColor:`${ACCENT}12` }}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background:`${ACCENT}12`, border:`1px solid ${ACCENT}25` }}>
              <Trophy size={20} style={{ color:ACCENT }}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Basis Data Prestasi Atlet</h1>
              <p className="text-[11px] font-mono mt-0.5" style={{ color:'rgba(255,255,255,0.35)' }}>
                {kpi.totalRecords} records · {kpi.atletDenganRekam} atlet · Kab. Bandung
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              {[{v:'Semua',l:'Semua'},{v:'L',l:'⚡ Putra'},{v:'P',l:'♀ Putri'}].map(g=>(
                <button key={g.v} onClick={()=>setFilterGender(g.v as any)}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: filterGender===g.v?`${ACCENT}18`:'rgba(255,255,255,0.04)',
                    color:      filterGender===g.v?ACCENT:'rgba(255,255,255,0.35)',
                    border:     filterGender===g.v?`1px solid ${ACCENT}25`:'1px solid rgba(255,255,255,0.08)',
                  }}>
                  {g.l}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Cari nama / cabor..."
                className="bg-transparent border rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 outline-none w-48"
                style={{ borderColor:'rgba(255,255,255,0.1)' }}
                onFocus={e=>e.target.style.borderColor=ACCENT}
                onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
            </div>
            <button onClick={()=>window.location.reload()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
              style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)' }}>
              <RefreshCw size={11}/>
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative z-10 space-y-5">

        {/* ═════════ LAYER 1: DEMO BANNER ═════════ */}
        {showDemoBanner && kpi.totalDemo > 0 && (
          <div {...ani(0)} className="rounded-2xl p-4 relative overflow-hidden"
            style={{
              background:'linear-gradient(135deg, rgba(251,191,36,0.06) 0%, rgba(245,158,11,0.04) 100%)',
              border:'1px solid rgba(251,191,36,0.25)',
            }}>
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, #fbbf24 0, #fbbf24 1px, transparent 1px, transparent 12px)`,
              }}/>
            <div className="relative flex items-start gap-3 flex-wrap">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background:'rgba(251,191,36,0.15)', border:'1px solid rgba(251,191,36,0.3)' }}>
                <AlertTriangle size={16} className="text-amber-400"/>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="text-sm font-black text-amber-300 mb-1 flex items-center gap-2 flex-wrap">
                  Mode Preview Demo
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest"
                    style={{ background:'rgba(251,191,36,0.2)', color:'#fbbf24', border:'1px solid rgba(251,191,36,0.4)' }}>
                    {kpi.totalDemo} records
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Halaman ini berisi <strong>{kpi.totalDemo} data demo</strong> dari {kpi.atletDenganRekam} atlet top performer Kab. Bandung (mix event PORPROV XIV, PON XX, KEJURNAS, Pra-PORPROV). Admin dapat input data real via tabel <code className="px-1 rounded" style={{background:'rgba(251,191,36,0.1)'}}>riwayat_prestasi</code> di Supabase.
                  {kpi.totalReal > 0 && (
                    <> · Sudah ada <strong className="text-sky-400">{kpi.totalReal} data REAL</strong>.</>
                  )}
                </p>
              </div>
              <button onClick={()=>setShowDemoBanner(false)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
                style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.1)' }}>
                Sembunyikan
              </button>
            </div>
          </div>
        )}

        {/* KPI CARDS */}
        <div {...ani(20)} className="grid grid-cols-4 gap-4">
          <div className="col-span-2 rounded-2xl p-5 relative overflow-hidden"
            style={{ background:`${ACCENT}06`, border:`1px solid ${ACCENT}18` }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users size={13} style={{ color:ACCENT }}/>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Atlet Verified Siap Tanding</span>
                </div>
                <div className="text-5xl font-light text-white">{kpi.totalAtlet.toLocaleString('id')}</div>
                <div className="text-[11px] mt-1" style={{ color:`${ACCENT}70` }}>
                  dari {kpi.cabors} cabang olahraga
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[10px] text-zinc-500 mb-2">Gender</div>
                <div className="flex gap-2">
                  <div className="px-2.5 py-1.5 rounded-xl text-center"
                    style={{ background:`${ACCENT}12`, border:`1px solid ${ACCENT}20` }}>
                    <div className="text-lg font-black" style={{ color:ACCENT }}>{kpi.putra}</div>
                    <div className="text-[9px] text-zinc-600">Putra</div>
                  </div>
                  <div className="px-2.5 py-1.5 rounded-xl text-center"
                    style={{ background:'rgba(244,114,182,0.1)', border:'1px solid rgba(244,114,182,0.2)' }}>
                    <div className="text-lg font-black text-pink-400">{kpi.putri}</div>
                    <div className="text-[9px] text-zinc-600">Putri</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-[10px] mb-1.5">
                  <span style={{ color:ACCENT }}>Putra</span>
                  <span className="text-white font-bold">{kpi.totalAtlet>0?Math.round(kpi.putra/kpi.totalAtlet*100):0}%</span>
                </div>
                <Bar value={kpi.putra} max={kpi.totalAtlet} color={ACCENT} h={5}/>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1.5">
                  <span className="text-pink-400">Putri</span>
                  <span className="text-white font-bold">{kpi.totalAtlet>0?Math.round(kpi.putri/kpi.totalAtlet*100):0}%</span>
                </div>
                <Bar value={kpi.putri} max={kpi.totalAtlet} color="#f472b6" h={5}/>
              </div>
            </div>
          </div>

          {/* Rekam Prestasi (Real vs Demo) */}
          <div className="rounded-2xl p-5"
            style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Medal size={13} style={{ color:'#fbbf24' }}/>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Rekam Prestasi</span>
            </div>
            <div className="space-y-2.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-sky-400 flex items-center gap-1">
                    <CheckCircle size={9}/> REAL DATA
                  </span>
                  <span className="text-base font-bold text-sky-400">{kpi.totalReal}</span>
                </div>
                <Bar value={kpi.totalReal} max={kpi.totalRecords||1} color="#0ea5e9" h={3}/>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-amber-400 flex items-center gap-1">
                    <AlertTriangle size={9}/> DEMO DATA
                  </span>
                  <span className="text-base font-bold text-amber-400">{kpi.totalDemo}</span>
                </div>
                <Bar value={kpi.totalDemo} max={kpi.totalRecords||1} color="#fbbf24" h={3}/>
              </div>
            </div>
            <div className="mt-3 text-[10px] text-zinc-500 text-center font-mono">
              {kpi.atletDenganRekam} atlet · {kpi.totalRecords} record total
            </div>
          </div>

          {/* Medali Historis */}
          <div className="rounded-2xl p-5 relative"
            style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,215,0,0.12)' }}>
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
              style={{ background:'linear-gradient(90deg,transparent,#ffd70040,transparent)' }}/>
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={13} className="text-yellow-400"/>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Medali</span>
            </div>
            {kpi.totalEmas+kpi.totalPerak+kpi.totalPerunggu === 0 ? (
              <div>
                <div className="text-3xl font-light text-zinc-600 mb-2">—</div>
                <div className="text-[10px] text-zinc-600">Belum ada track record</div>
              </div>
            ) : (
              <div className="flex gap-2">
                {[
                  {l:'Emas',     v:kpi.totalEmas,    c:'#ffd700', e:'🥇'},
                  {l:'Perak',    v:kpi.totalPerak,   c:'#c0c0c0', e:'🥈'},
                  {l:'Perunggu', v:kpi.totalPerunggu, c:'#cd7f32', e:'🥉'},
                ].map(m=>(
                  <div key={m.l} className="flex-1 text-center rounded-xl py-2.5"
                    style={{ background:`${m.c}10`, border:`1px solid ${m.c}25` }}>
                    <div className="text-base">{m.e}</div>
                    <div className="text-xl font-black mt-0.5" style={{ color:m.c }}>{m.v}</div>
                    <div className="text-[9px] text-zinc-600">{m.l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* MASTER-DETAIL */}
        <div {...ani(60)} className="grid grid-cols-3 gap-5">
          {/* LEFT — List per cabor */}
          <div className="rounded-2xl overflow-hidden flex flex-col"
            style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', minHeight:500, maxHeight:700 }}>

            <div className="px-4 py-3.5 border-b flex items-center justify-between"
              style={{ borderColor:'rgba(255,255,255,0.07)', background:'rgba(2,10,20,0.5)' }}>
              <div className="flex items-center gap-2">
                <Award size={13} style={{ color:ACCENT }}/>
                <span className="text-xs font-bold text-white">Mapping per Cabor</span>
              </div>
              <span className="text-[10px]" style={{ color:'rgba(255,255,255,0.3)' }}>
                {caborEntries.length} cabor
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5"
              style={{ scrollbarWidth:'thin', scrollbarColor:`${ACCENT}25 transparent` }}>
              {displayedCabor.map(([cabor,list])=>{
                const isExp = expandedCabor===cabor
                const putraCabor = list.filter(a=>a.gender==='L').length
                const putriCabor = list.filter(a=>a.gender==='P').length

                return (
                  <div key={cabor} className="rounded-xl overflow-hidden"
                    style={{ border:`1px solid ${isExp?`${ACCENT}20`:'rgba(255,255,255,0.05)'}`, background: isExp?`${ACCENT}04`:'rgba(255,255,255,0.015)' }}>
                    <div className="p-3 flex items-center justify-between cursor-pointer"
                      onClick={()=>setExpandedCabor(isExp?null:cabor)}>
                      <div>
                        <div className="text-xs font-bold text-zinc-200">{cabor}</div>
                        <div className="text-[10px] mt-0.5" style={{ color:'rgba(255,255,255,0.3)' }}>
                          {list.length} atlet ·{' '}
                          <span style={{ color:ACCENT }}>⚡{putraCabor}L</span>{' '}
                          <span className="text-pink-400">♀{putriCabor}P</span>
                        </div>
                      </div>
                      {isExp
                        ? <ChevronUp size={13} style={{ color:ACCENT }}/>
                        : <ChevronDown size={13} style={{ color:'rgba(255,255,255,0.25)' }}/>}
                    </div>

                    {isExp && (
                      <div className="border-t px-2 pb-2" style={{ borderColor:`${ACCENT}12` }}>
                        {list.map(a=>{
                          const tr = recordsByAtlet[a.id]||[]
                          const emasA = tr.filter(r=>r.hasil==='Emas').length
                          const isSel = selectedAtlet?.id===a.id
                          const hasDemo = tr.some(r=>r.is_demo)
                          return (
                            <div key={a.id}
                              onClick={()=>setSelectedAtlet(a)}
                              className="flex items-center justify-between p-2.5 rounded-xl mt-1.5 cursor-pointer"
                              style={{
                                background: isSel?`${ACCENT}10`:'transparent',
                                border:     `1px solid ${isSel?`${ACCENT}25`:'transparent'}`,
                              }}
                              onMouseEnter={e=>{ if(!isSel)(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)' }}
                              onMouseLeave={e=>{ if(!isSel)(e.currentTarget as HTMLElement).style.background='transparent' }}>
                              <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ background: emasA>0?'rgba(251,191,36,0.15)':'rgba(255,255,255,0.06)', border:`1px solid ${emasA>0?'rgba(251,191,36,0.3)':'rgba(255,255,255,0.08)'}` }}>
                                  {emasA>0
                                    ? <Flame size={11} style={{ color:'#fbbf24' }}/>
                                    : <User size={11} style={{ color:'rgba(255,255,255,0.3)' }}/>}
                                </div>
                                <div>
                                  <div className="text-xs font-bold flex items-center gap-1.5"
                                    style={{ color: isSel?ACCENT:emasA>0?'#fbbf24':'rgba(255,255,255,0.7)' }}>
                                    {a.nama_lengkap}
                                    {hasDemo && (
                                      <span className="text-[8px] px-1 py-0.5 rounded font-black"
                                        style={{ background:'rgba(251,191,36,0.15)', color:'#fbbf24' }}>
                                        DEMO
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] mt-0.5"
                                    style={{ color:'rgba(255,255,255,0.25)' }}>
                                    {hitungUmur(a.tgl_lahir)}th · {a.gender==='L'?'Putra':'Putri'}
                                    {emasA>0&&<span className="text-amber-500 ml-1">· {emasA} Emas</span>}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight size={12} style={{ color: isSel?ACCENT:'rgba(255,255,255,0.2)' }}/>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {caborEntries.length > CABOR_DEFAULT && (
                <button onClick={()=>setShowAllCabor(v=>!v)}
                  className="w-full py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 mt-1"
                  style={{ background:`${ACCENT}08`, color:ACCENT, border:`1px solid ${ACCENT}15` }}>
                  {showAllCabor
                    ? <><ChevronUp size={12}/> Tutup</>
                    : <><ChevronDown size={12}/> {caborEntries.length-CABOR_DEFAULT} cabor lainnya</>}
                </button>
              )}
            </div>
          </div>

          {/* RIGHT — Dossier atlet */}
          <div className="col-span-2 rounded-2xl overflow-hidden flex flex-col"
            style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', minHeight:500 }}>

            {selectedAtlet ? (
              <>
                {/* Profile header */}
                <div className="p-6 border-b relative overflow-hidden"
                  style={{ borderColor:'rgba(255,255,255,0.07)', background:'rgba(2,10,20,0.5)' }}>
                  <div className="absolute top-0 right-0 opacity-[0.03]"><Trophy size={120}/></div>
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isElite?'rgba(251,191,36,0.1)':'rgba(255,255,255,0.05)',
                        border:     `2px solid ${isElite?'rgba(251,191,36,0.4)':`${ACCENT}30`}`,
                        boxShadow:  isElite?'0 0 20px rgba(251,191,36,0.15)':'none',
                      }}>
                      {isElite
                        ? <Flame size={28} style={{ color:'#fbbf24' }}/>
                        : <User size={28} style={{ color:'rgba(255,255,255,0.4)' }}/>}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-2xl font-black text-white">{selectedAtlet.nama_lengkap}</h2>
                        {isElite && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                            style={{ background:'rgba(251,191,36,0.12)', color:'#fbbf24', border:'1px solid rgba(251,191,36,0.25)' }}>
                            <Star size={10}/> Atlet Elit Prioritas
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        {[
                          { l:'Cabor',  v:selectedAtlet.cabor_nama_raw||'-',                                                   c:ACCENT },
                          { l:'Usia',   v:`${hitungUmur(selectedAtlet.tgl_lahir)} Tahun`,                                       c:'rgba(255,255,255,0.6)'},
                          { l:'Gender', v:selectedAtlet.gender==='L'?'Putra':'Putri',                                           c:selectedAtlet.gender==='L'?ACCENT:'#f472b6'},
                        ].map(f=>(
                          <div key={f.l} className="flex items-center gap-1.5 text-xs">
                            <span className="text-zinc-500">{f.l}:</span>
                            <strong style={{ color:f.c }}>{f.v}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6"
                  style={{ scrollbarWidth:'thin', scrollbarColor:`${ACCENT}25 transparent` }}>

                  {/* Medali summary */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { l:'Emas',     v:selectedEmas,     c:'#ffd700', e:'🥇' },
                      { l:'Perak',    v:selectedPerak,    c:'#c0c0c0', e:'🥈' },
                      { l:'Perunggu', v:selectedPerunggu,  c:'#cd7f32', e:'🥉' },
                    ].map(m=>(
                      <div key={m.l} className="rounded-xl p-4 text-center"
                        style={{ background:`${m.c}08`, border:`1px solid ${m.c}20` }}>
                        <div className="text-2xl mb-1">{m.e}</div>
                        <div className="text-3xl font-light" style={{ color:m.c }}>{m.v}</div>
                        <div className="text-[10px] text-zinc-500 mt-1">{m.l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Track Record Header + Filter */}
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar size={12} style={{ color:ACCENT }}/> Riwayat Kompetisi Resmi
                    </h3>
                    <div className="flex items-center gap-1 px-1 py-1 rounded-lg"
                      style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                      <Filter size={10} className="text-zinc-500 ml-1.5"/>
                      {([
                        { k:'all',  l:`Semua (${selectedHistoryRaw.length})`,                            c:ACCENT    },
                        { k:'real', l:`✅ Real (${selectedHistoryRaw.filter(r=>!r.is_demo).length})`,    c:'#0ea5e9' },
                        { k:'demo', l:`⚠ Demo (${selectedHistoryRaw.filter(r=>r.is_demo).length})`,     c:'#fbbf24' },
                      ] as const).map(f=>(
                        <button key={f.k} onClick={()=>setFilterType(f.k as FilterType)}
                          className="px-2 py-1 rounded text-[10px] font-bold transition-all"
                          style={{
                            background: filterType===f.k ? `${f.c}15` : 'transparent',
                            color:      filterType===f.k ? f.c : 'rgba(255,255,255,0.4)',
                            border:     filterType===f.k ? `1px solid ${f.c}30` : '1px solid transparent',
                          }}>
                          {f.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedHistory.length === 0 ? (
                    <div className="rounded-2xl p-6 text-center"
                      style={{ background:'rgba(255,255,255,0.02)', border:'1px dashed rgba(255,255,255,0.1)' }}>
                      <Trophy size={32} className="mx-auto mb-3 opacity-15"/>
                      <div className="text-sm font-bold text-zinc-500 mb-1">
                        {filterType==='all' ? 'Belum Ada Data Prestasi' : `Tidak ada data ${filterType}`}
                      </div>
                      <p className="text-xs text-zinc-600 leading-relaxed">
                        {filterType==='all'
                          ? 'Riwayat kompetisi atlet ini belum diinput.'
                          : `Ubah filter untuk lihat data lain.`}
                      </p>
                    </div>
                  ) : (
                    // ═════════ LAYER 2: TIMELINE TRACK RECORD ═════════
                    <div className="relative border-l-2 ml-3 space-y-4"
                      style={{ borderColor:'rgba(255,255,255,0.08)' }}>
                      {selectedHistory.map(h=>{
                        const cfg = HASIL_CFG[h.hasil]??HASIL_CFG['Peserta']
                        const levelCfg = LEVEL_CFG[h.level_event] ?? LEVEL_CFG['Provinsi']
                        return (
                          <div key={h.id} className="relative pl-6">
                            <div className="absolute -left-[9px] top-2 w-3.5 h-3.5 rounded-full border-2"
                              style={{ background:cfg.dot, borderColor:'#020a14' }}/>
                            <div className="rounded-xl p-4 relative overflow-hidden"
                              style={{
                                background: h.is_demo ? 'rgba(251,191,36,0.025)' : 'rgba(255,255,255,0.025)',
                                border:`1px solid ${h.is_demo ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.07)'}`,
                              }}>
                              {/* ═════════ LAYER 3: STRIPED PATTERN buat DEMO ═════════ */}
                              {h.is_demo && (
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                                  style={{
                                    backgroundImage:`repeating-linear-gradient(45deg, #fbbf24 0, #fbbf24 1px, transparent 1px, transparent 10px)`,
                                  }}/>
                              )}
                              <div className="relative">
                                <div className="flex items-start justify-between gap-3 mb-1.5">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <div className="text-sm font-bold text-zinc-200">{h.event}</div>
                                      {/* BADGE LEVEL */}
                                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                                        style={{ background:`${levelCfg.color}15`, color:levelCfg.color, border:`1px solid ${levelCfg.color}30` }}>
                                        {levelCfg.label}
                                      </span>
                                      {/* BADGE DEMO/REAL */}
                                      {h.is_demo ? (
                                        <span className="text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest flex items-center gap-1"
                                          style={{ background:'rgba(251,191,36,0.15)', color:'#fbbf24', border:'1px solid rgba(251,191,36,0.35)' }}>
                                          <AlertTriangle size={8}/> DEMO
                                        </span>
                                      ) : (
                                        <span className="text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest flex items-center gap-1"
                                          style={{ background:'rgba(16,185,129,0.15)', color:'#0ea5e9', border:'1px solid rgba(16,185,129,0.35)' }}>
                                          <CheckCircle size={8}/> REAL
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px]"
                                      style={{ color:'rgba(255,255,255,0.4)' }}>
                                      <span className="flex items-center gap-1"><Calendar size={9}/>{h.tahun}</span>
                                      <span className="flex items-center gap-1"><MapPin size={9}/>{h.lokasi}</span>
                                      <span>{h.nomor_tanding}</span>
                                    </div>
                                    {h.catatan && (
                                      <div className="text-[10px] mt-1.5 font-mono pl-2 border-l-2"
                                        style={{ color:h.is_demo?'rgba(251,191,36,0.7)':`${ACCENT}80`, borderColor:h.is_demo?'rgba(251,191,36,0.3)':`${ACCENT}30` }}>
                                        📝 {h.catatan}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                                    style={{ background:cfg.bg, color:cfg.text, border:`1px solid ${cfg.border}` }}>
                                    {cfg.emoji} {h.hasil}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center"
                style={{ color:'rgba(255,255,255,0.2)' }}>
                <Trophy size={48} className="mb-4 opacity-20"/>
                <p className="text-sm">Pilih atlet dari daftar untuk melihat dossier prestasi</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}