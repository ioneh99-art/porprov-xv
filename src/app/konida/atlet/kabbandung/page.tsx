'use client'
// src/app/konida/atlet/kabbandung/page.tsx — v2
// Fix: filter kontingen_id=4, tambah search nama, status Posted, dossier lengkap, export CSV

import { useState, useMemo, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Search, ShieldAlert, CheckCircle, Clock, X, User, MapPin,
  AlertTriangle, Download, FileCheck, XCircle, Loader2,
  ChevronDown, Activity, Users, Award, RefreshCw,
  CreditCard, Shirt, Banknote, Hash, Filter, FileSpreadsheet,
  Target, Heart, Flame, Eye,
} from 'lucide-react'
import { ExportModal } from '@/components/ExportModal'
import {
  CriticalAlertsCard, MissionControlActions,
  buildAlertsFromData, buildMissionActions,
} from '@/components/konida/DashboardHelpers'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const KONTINGEN_ID = 4
const ACCENT       = '#38bdf8'

interface TesFisikItem {
  komponen: string
  item_tes: string
  capaian_persen: number
  kategori: string
}

interface TesFisikInfo {
  id: number
  bmi: number | null
  berat_badan: number | null
  tinggi_badan: number | null
  kesimpulan_persen: number | null
  kesimpulan_kategori: string | null
  status_tes: string
  cabor_nama: string | null
  matching_method: string
  items?: TesFisikItem[]
}

interface Atlet {
  id:                  number
  nama_lengkap:        string
  no_ktp:              string
  tgl_lahir:           string
  gender:              string
  cabor_nama_raw:      string
  kode_asal_daerah:    string
  nama_asal_daerah:    string
  no_registrasi_koni:  number | null
  status_registrasi:   string
  status_verifikasi:   string
  ukuran_kemeja:       string | null
  ukuran_sepatu:       string | null
  nama_bank:           string | null
  no_rekening:         string | null
  catatan_verifikasi:  string | null
  kontingen_id:        number
  created_at:          string
  tes_fisik?:          TesFisikInfo | null    // NEW
}

const KATEGORI_COLOR: Record<string, string> = {
  'Baik Sekali':   '#0ea5e9',
  'Baik':          '#3b82f6',
  'Cukup':         '#fbbf24',
  'Kurang':        '#f97316',
  'Kurang Sekali': '#ef4444',
}

const hitungUmur = (tgl: string) => {
  if (!tgl) return 0
  return Math.floor((Date.now() - new Date(tgl).getTime()) / (365.25 * 24 * 3600 * 1000))
}

const isNonLokal = (kode: string) => kode && !kode.startsWith('3204')

const STATUS_CFG: Record<string, { bg:string; text:string; border:string; icon:any; label:string }> = {
  'Verified':       { bg:'bg-sky-500/10', text:'text-sky-400', border:'border-sky-500/20', icon:CheckCircle, label:'Verified'       },
  'Menunggu Admin': { bg:'bg-amber-500/10',   text:'text-amber-400',   border:'border-amber-500/20',   icon:Clock,       label:'Menunggu'       },
  'Ditolak Admin':  { bg:'bg-rose-500/10',    text:'text-rose-400',    border:'border-rose-500/20',    icon:XCircle,     label:'Ditolak'        },
  'Posted':         { bg:'bg-blue-500/10',    text:'text-blue-400',    border:'border-blue-500/20',    icon:FileCheck,   label:'Posted'         },
  'Draft':          { bg:'bg-zinc-800',       text:'text-zinc-400',    border:'border-zinc-700',       icon:User,        label:'Draft'          },
}

type FilterStatus = 'semua'|'Verified'|'Menunggu Admin'|'Ditolak Admin'|'Posted'

export default function PageAtletKabBandung() {
  const [data,         setData]         = useState<Atlet[]>([])
  const [loading,      setLoading]      = useState(true)
  const [searchCabor,  setSearchCabor]  = useState('')
  const [searchNama,   setSearchNama]   = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('semua')
  const [filterTesFisik, setFilterTesFisik] = useState<'semua'|'sudah'|'belum'|'top'>('semua')
  const [expandedCabor,setExpandedCabor]= useState<string|null>(null)
  const [selectedAtlet,setSelectedAtlet]= useState<Atlet|null>(null)
  const [modalTab,     setModalTab]     = useState<'profil'|'fisik'>('profil')
  const [rejectNote,   setRejectNote]   = useState('')
  const [isUpdating,   setIsUpdating]   = useState(false)
  const [animIn,           setAnimIn]           = useState(false)
  const [showExport,       setShowExport]       = useState(false)
  const [caborListExpanded, setCaborListExpanded] = useState(false)

  useEffect(()=>{ const t=setTimeout(()=>setAnimIn(true),80); return()=>clearTimeout(t) },[])

  // ── Fetch — filter by kontingen_id + parallel fetch tes fisik ──
  useEffect(()=>{
    async function fetchAtlet() {
      try {
        // Parallel: atlet + tes_fisik (header) + tes_fisik items
        const [atletRes, tesFisikRes, itemsRes] = await Promise.all([
          sb.from('atlet')
            .select('id,nama_lengkap,no_ktp,tgl_lahir,gender,cabor_nama_raw,kode_asal_daerah,nama_asal_daerah,no_registrasi_koni,status_registrasi,status_verifikasi,ukuran_kemeja,ukuran_sepatu,nama_bank,no_rekening,catatan_verifikasi,kontingen_id,created_at')
            .eq('kontingen_id', KONTINGEN_ID)
            .order('cabor_nama_raw', { ascending: true })
            .order('nama_lengkap',   { ascending: true }),
          sb.from('atlet_tes_fisik')
            .select('id,atlet_id,bmi,berat_badan,tinggi_badan,kesimpulan_persen,kesimpulan_kategori,status_tes,cabor_nama,matching_method')
            .eq('kontingen_id', KONTINGEN_ID)
            .eq('tahap', 3),
          sb.from('atlet_tes_fisik_item')
            .select('tes_fisik_id,komponen,item_tes,capaian_persen,kategori'),
        ])

        if (atletRes.error) throw atletRes.error
        const atlets = (atletRes.data || []) as Atlet[]
        const tesFisikList = tesFisikRes.data || []
        const itemsList = itemsRes.data || []

        // Build map: atlet_id → tes_fisik
        const tesMap: Record<number, TesFisikInfo> = {}
        const tesIdToAtletId: Record<number, number> = {}
        tesFisikList.forEach((tf: any) => {
          tesMap[tf.atlet_id] = {
            id: tf.id, bmi: tf.bmi,
            berat_badan: tf.berat_badan, tinggi_badan: tf.tinggi_badan,
            kesimpulan_persen: tf.kesimpulan_persen,
            kesimpulan_kategori: tf.kesimpulan_kategori,
            status_tes: tf.status_tes, cabor_nama: tf.cabor_nama,
            matching_method: tf.matching_method,
            items: [],
          }
          tesIdToAtletId[tf.id] = tf.atlet_id
        })
        // Attach items
        itemsList.forEach((it: any) => {
          const atletId = tesIdToAtletId[it.tes_fisik_id]
          if (atletId && tesMap[atletId]) {
            tesMap[atletId].items!.push({
              komponen: it.komponen, item_tes: it.item_tes,
              capaian_persen: it.capaian_persen, kategori: it.kategori,
            })
          }
        })

        // Merge into atlet
        const merged = atlets.map(a => ({ ...a, tes_fisik: tesMap[a.id] || null }))
        setData(merged)
      } catch (e) {
        console.error('[AtletKabBandung]', e)
      } finally {
        setLoading(false)
      }
    }
    void fetchAtlet()
  },[])

  // ── Summary ───────────────────────────────────────────────
  const summary = useMemo(()=>{
    let total=0, verified=0, pending=0, ditolak=0, posted=0, nonLokal=0
    let sudahTes=0, belumTes=0, totalSkor=0, topAtlet=0, lowAtlet=0
    const caborSkorMap: Record<string, {sum:number; n:number}> = {}
    data.forEach(a=>{
      total++
      if(a.status_registrasi==='Verified')       verified++
      if(a.status_registrasi==='Menunggu Admin') pending++
      if(a.status_registrasi==='Ditolak Admin')  ditolak++
      if(a.status_registrasi==='Posted')         posted++
      if(isNonLokal(a.kode_asal_daerah))         nonLokal++
      if(a.tes_fisik) {
        sudahTes++
        const skor = a.tes_fisik.kesimpulan_persen
        if(skor != null) {
          totalSkor += skor
          if(skor >= 80) topAtlet++
          if(skor < 40)  lowAtlet++
          const c = a.cabor_nama_raw || 'Lainnya'
          if(!caborSkorMap[c]) caborSkorMap[c] = {sum:0, n:0}
          caborSkorMap[c].sum += skor
          caborSkorMap[c].n++
        }
      } else belumTes++
    })
    const avgSkor = sudahTes > 0 ? Math.round(totalSkor / sudahTes) : 0
    const caborLemahCount = Object.values(caborSkorMap)
      .filter(v => v.n >= 2 && v.sum / v.n < 55).length
    return { total, verified, pending, ditolak, posted, nonLokal,
             sudahTes, belumTes, avgSkor, topAtlet, lowAtlet, caborLemahCount }
  },[data])

  // ── Top 3 Performers (skor fisik tertinggi) ──────────────
  const topPerformers = useMemo(()=>{
    return [...data]
      .filter(a => a.tes_fisik?.kesimpulan_persen != null)
      .sort((a,b) => (b.tes_fisik?.kesimpulan_persen||0) - (a.tes_fisik?.kesimpulan_persen||0))
      .slice(0, 3)
  },[data])

  // ── Group by cabor + filter ───────────────────────────────
  const groupedCabors = useMemo(()=>{
    // Filter status dulu
    let filtered = filterStatus==='semua'
      ? data
      : data.filter(a=>a.status_registrasi===filterStatus)

    // Filter tes fisik
    if (filterTesFisik === 'sudah') filtered = filtered.filter(a => a.tes_fisik != null)
    else if (filterTesFisik === 'belum') filtered = filtered.filter(a => a.tes_fisik == null)
    else if (filterTesFisik === 'top')   filtered = filtered.filter(a => (a.tes_fisik?.kesimpulan_persen || 0) >= 80)

    const caborMap: Record<string, Atlet[]> = {}
    filtered.forEach(a=>{
      const c = a.cabor_nama_raw||'Belum Ditentukan'
      if(!caborMap[c]) caborMap[c]=[]
      caborMap[c].push(a)
    })

    let list = Object.entries(caborMap).map(([nama,atlets])=>({
      nama,
      total:    atlets.length,
      verified: atlets.filter(a=>a.status_registrasi==='Verified').length,
      pending:  atlets.filter(a=>a.status_registrasi==='Menunggu Admin').length,
      ditolak:  atlets.filter(a=>a.status_registrasi==='Ditolak Admin').length,
      posted:   atlets.filter(a=>a.status_registrasi==='Posted').length,
      nonLokal: atlets.filter(a=>isNonLokal(a.kode_asal_daerah)).length,
      atlets:   searchNama
        ? atlets.filter(a=>a.nama_lengkap.toLowerCase().includes(searchNama.toLowerCase()))
        : atlets,
    })).sort((a,b)=>b.total-a.total)

    if (searchCabor) {
      list = list.filter(c=>c.nama.toLowerCase().includes(searchCabor.toLowerCase()))
    }
    // Kalau search nama — hanya tampil cabor yang punya hasil
    if (searchNama) {
      list = list.filter(c=>c.atlets.length>0)
    }

    return list
  },[data, searchCabor, searchNama, filterStatus])

  // ── Export CSV ────────────────────────────────────────────
  const handleExport = useCallback(()=>{
    const rows = [
      ['No','Nama','NIK','Tgl Lahir','Gender','Cabor','Asal Daerah','Status','No Reg KONI'],
      ...data.map((a,i)=>[
        i+1, a.nama_lengkap, a.no_ktp, a.tgl_lahir, a.gender,
        a.cabor_nama_raw, a.nama_asal_daerah, a.status_registrasi,
        a.no_registrasi_koni??''
      ])
    ]
    const csv  = rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `atlet_kabbandung_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  },[data])

  // ── Verify/Reject ─────────────────────────────────────────
  const handleVerify = async (id: number, status: string) => {
    setIsUpdating(true)
    try {
      const { error } = await sb.from('atlet')
        .update({ status_registrasi: status, catatan_verifikasi: status==='Ditolak Admin'?rejectNote:null })
        .eq('id', id)
      if (error) throw error
      setData(prev => prev.map(a => a.id===id ? {...a, status_registrasi:status, catatan_verifikasi:rejectNote} : a))
      setSelectedAtlet(null)
      setRejectNote('')
    } catch {
      alert('Gagal update status atlet.')
    } finally {
      setIsUpdating(false)
    }
  }

  const ani=(d=0)=>({
    style:{transitionDelay:`${d}ms`,transition:'all 0.5s ease'},
    className:animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-4',
  })

  return (
    <div className="min-h-screen text-zinc-300 font-sans flex flex-col relative"
      style={{background:'linear-gradient(135deg,#020a14 0%,#03101c 100%)'}}>
      <div className="fixed inset-0 pointer-events-none"
        style={{backgroundImage:'linear-gradient(rgba(56,189,248,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.025) 1px,transparent 1px)',backgroundSize:'24px 24px',zIndex:0}}/>

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-40 border-b border-zinc-800/60 px-6 py-4 backdrop-blur-xl"
        style={{background:'rgba(2,10,20,0.93)'}}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{background:'rgba(56,189,248,0.1)',border:'1px solid rgba(56,189,248,0.25)'}}>
              <ShieldAlert size={20} style={{color:ACCENT}}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Terminal Audit Atlet</h1>
              <p className="text-[11px] font-mono mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>
                Verifikasi Pendaftaran · Kontingen Kabupaten Bandung
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={()=>window.location.reload()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all"
              style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.4)'}}>
              <RefreshCw size={12}/> Refresh
            </button>
            <button onClick={()=>setShowExport(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{background:'rgba(56,189,248,0.12)',border:'1px solid rgba(56,189,248,0.3)',color:ACCENT}}>
              <FileSpreadsheet size={14}/> Export Excel
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative z-10 space-y-5">

        {/* ── KPI CARDS ── */}
        <div {...ani(0)} className="grid grid-cols-5 gap-4">
          {/* Total + progress bar */}
          <div className="col-span-2 rounded-2xl p-5 flex flex-col justify-between"
            style={{background:'rgba(56,189,248,0.05)',border:'1px solid rgba(56,189,248,0.15)'}}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
                <Users size={16} style={{color:ACCENT}}/> Total Registrasi Atlet
              </div>
              <span className="font-mono text-4xl font-light text-white">{summary.total}</span>
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-zinc-500 mb-2 uppercase font-mono font-bold">
                <span>Progress Verifikasi</span>
                <span style={{color:ACCENT}}>
                  {summary.total>0?Math.round((summary.verified+summary.posted)/summary.total*100):0}%
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{width:`${summary.total>0?(summary.verified+summary.posted)/summary.total*100:0}%`,background:ACCENT}}/>
              </div>
              <div className="flex justify-between text-[9px] mt-1.5" style={{color:'rgba(255,255,255,0.3)'}}>
                <span>{summary.verified} verified · {summary.posted} posted</span>
                <span className="text-rose-400">{summary.nonLokal} non-lokal</span>
              </div>
            </div>
          </div>

          {[
            {l:'Data Valid',       v:summary.verified, c:'#22d3ee', sub:'Siap diterbitkan ID',   icon:CheckCircle },
            {l:'Menunggu Audit',   v:summary.pending,  c:'#fbbf24', sub:'Perlu tindakan admin',  icon:Clock       },
            {l:'Ditolak Admin',    v:summary.ditolak,  c:'#f87171', sub:'Perlu perbaikan data',  icon:XCircle     },
            {l:'Anomali NIK',      v:summary.nonLokal, c:'#fb923c', sub:'Atlet non-lokal KBR',   icon:AlertTriangle},
          ].map(s=>(
            <div key={s.l} className="rounded-2xl p-5 flex flex-col justify-center relative overflow-hidden"
              style={{background:'rgba(255,255,255,0.025)',border:`1px solid ${s.c}18`}}>
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:`${s.c}60`}}/>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500 uppercase tracking-widest font-mono mb-2">
                <s.icon size={13} style={{color:s.c}}/> {s.l}
              </div>
              <div className="text-4xl font-light" style={{color:s.c}}>{s.v}</div>
              <div className="mt-1.5 text-[10px] text-zinc-600">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── SPORT SCIENCE OVERVIEW + TOP PERFORMERS ── */}
        <div {...ani(20)} className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Sport Science Stats */}
          <div className="lg:col-span-2 rounded-2xl p-5 relative overflow-hidden"
            style={{background:'rgba(16,185,129,0.05)', border:'1px solid rgba(16,185,129,0.15)'}}>
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20"
              style={{background:'#0ea5e9'}}/>
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={16} style={{color:'#0ea5e9'}}/>
                <h3 className="text-sm font-bold text-white">Sport Science Overview</h3>
                <span className="ml-auto text-[10px] font-mono uppercase tracking-widest" style={{color:'rgba(255,255,255,0.3)'}}>
                  FPOK UPI · Tahap 3
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 tracking-widest font-mono mb-1">Sudah Tes</div>
                  <div className="text-3xl font-black text-sky-400">{summary.sudahTes}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    {summary.total>0 ? Math.round(summary.sudahTes/summary.total*100) : 0}% dari total
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 tracking-widest font-mono mb-1">Rata Skor</div>
                  <div className="text-3xl font-black" style={{color:summary.avgSkor>=70?'#0ea5e9':summary.avgSkor>=50?'#fbbf24':'#f97316'}}>
                    {summary.avgSkor}%
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    {summary.avgSkor>=70?'Baik Sekali':summary.avgSkor>=60?'Baik':summary.avgSkor>=50?'Cukup':'Kurang'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 tracking-widest font-mono mb-1">Top (≥80%)</div>
                  <div className="text-3xl font-black text-amber-400">{summary.topAtlet}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">atlet elit</div>
                </div>
              </div>
            </div>
          </div>

          {/* Top 3 Performers */}
          <div className="lg:col-span-3 rounded-2xl p-5"
            style={{background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)'}}>
            <div className="flex items-center gap-2 mb-4">
              <Flame size={16} style={{color:'#fb923c'}}/>
              <h3 className="text-sm font-bold text-white">Top 3 Performers · Skor Fisik Tertinggi</h3>
            </div>
            {topPerformers.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-zinc-600">
                Belum ada atlet dengan data tes fisik
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {topPerformers.map((a, i) => {
                  const medals = ['🥇','🥈','🥉']
                  const colors = ['#fbbf24','#cbd5e1','#cd7f32']
                  return (
                    <button key={a.id}
                      onClick={() => { setSelectedAtlet(a); setModalTab('fisik') }}
                      className="rounded-xl p-3 text-left transition-all hover:scale-[1.02]"
                      style={{
                        background: `linear-gradient(135deg, ${colors[i]}12, transparent)`,
                        border: `1px solid ${colors[i]}30`,
                      }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl">{medals[i]}</span>
                        <span className="text-2xl font-black" style={{color:colors[i]}}>
                          {a.tes_fisik?.kesimpulan_persen}%
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white truncate">{a.nama_lengkap}</div>
                      <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                        {a.cabor_nama_raw} · {a.tes_fisik?.kesimpulan_kategori}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── FILTER + SEARCH ── */}
        <div {...ani(50)} className="rounded-2xl px-5 py-4 flex items-center gap-4 flex-wrap"
          style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.07)'}}>

          {/* Filter status */}
          <div className="flex items-center gap-2">
            <Filter size={13} style={{color:'rgba(255,255,255,0.3)'}}/>
            <div className="flex gap-1">
              {(['semua','Verified','Menunggu Admin','Ditolak Admin','Posted'] as FilterStatus[]).map(s=>(
                <button key={s} onClick={()=>setFilterStatus(s)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                  style={{
                    background: filterStatus===s?`${ACCENT}20`:'rgba(255,255,255,0.04)',
                    color:      filterStatus===s?ACCENT:'rgba(255,255,255,0.35)',
                    border:     filterStatus===s?`1px solid ${ACCENT}30`:'1px solid transparent',
                  }}>
                  {s==='semua'?`Semua (${summary.total})`
                  :s==='Verified'?`✅ Valid (${summary.verified})`
                  :s==='Menunggu Admin'?`⏳ Pending (${summary.pending})`
                  :s==='Ditolak Admin'?`❌ Ditolak (${summary.ditolak})`
                  :`📌 Posted (${summary.posted})`}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Tes Fisik */}
          <div className="flex items-center gap-2 pl-3 ml-1 border-l border-white/5">
            <Activity size={13} style={{color:'rgba(16,185,129,0.5)'}}/>
            <div className="flex gap-1">
              {([
                {k:'semua', l:`Semua (${summary.total})`,   c:'#94a3b8'},
                {k:'sudah', l:`✓ Tes (${summary.sudahTes})`, c:'#0ea5e9'},
                {k:'belum', l:`⊘ Belum (${summary.belumTes})`, c:'#f97316'},
                {k:'top',   l:`⭐ Top (${summary.topAtlet})`, c:'#fbbf24'},
              ] as const).map(f=>(
                <button key={f.k} onClick={()=>setFilterTesFisik(f.k as any)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                  style={{
                    background: filterTesFisik===f.k?`${f.c}20`:'rgba(255,255,255,0.04)',
                    color:      filterTesFisik===f.k?f.c:'rgba(255,255,255,0.35)',
                    border:     filterTesFisik===f.k?`1px solid ${f.c}40`:'1px solid transparent',
                  }}>
                  {f.l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Search nama atlet */}
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
              <input value={searchNama} onChange={e=>setSearchNama(e.target.value)}
                placeholder="Cari nama atlet..."
                className="bg-transparent border rounded-xl pl-8 pr-4 py-2 text-xs text-zinc-200 outline-none w-48"
                style={{borderColor:'rgba(255,255,255,0.1)'}}
                onFocus={e=>e.target.style.borderColor=ACCENT}
                onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
              {searchNama && <button onClick={()=>setSearchNama('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"><X size={12}/></button>}
            </div>
            {/* Search cabor */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
              <input value={searchCabor} onChange={e=>setSearchCabor(e.target.value)}
                placeholder="Cari cabor..."
                className="bg-transparent border rounded-xl pl-8 pr-4 py-2 text-xs text-zinc-200 outline-none w-40"
                style={{borderColor:'rgba(255,255,255,0.1)'}}
                onFocus={e=>e.target.style.borderColor=ACCENT}
                onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
              {searchCabor && <button onClick={()=>setSearchCabor('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"><X size={12}/></button>}
            </div>
          </div>
        </div>

        {/* ── CRITICAL ALERTS + MISSION CONTROL ── */}
        <div {...ani(65)} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CriticalAlertsCard
            primary={ACCENT}
            alerts={buildAlertsFromData({
              pendingVerifikasi: summary.pending,
              dnsAtlet: summary.belumTes,
              lowSkorAtlet: summary.lowAtlet,
              daysToEvent: Math.max(0, Math.ceil((new Date('2026-11-07').getTime()-Date.now())/86400000)),
              nonLokal: summary.nonLokal,
              cabors_lemah_count: summary.caborLemahCount,
            })}
          />
          <MissionControlActions
            primary={ACCENT}
            actions={buildMissionActions({
              pendingVerifikasi: summary.pending,
              dnsAtlet: summary.belumTes,
              lowSkorAtlet: summary.lowAtlet,
              topPerformers: summary.topAtlet,
              cabors_lemah_count: summary.caborLemahCount,
              nonLokal: summary.nonLokal,
            })}
          />
        </div>

        {/* ── ACCORDION CABOR ── */}
        <div {...ani(80)} className="rounded-2xl p-5 shadow-xl"
          style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)'}}>

          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Award size={16} style={{color:ACCENT}}/> Klasifikasi per Cabor
              <span className="text-[11px] font-normal" style={{color:'rgba(255,255,255,0.3)'}}>{groupedCabors.length} cabor</span>
            </h2>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center" style={{color:ACCENT}}>
              <Loader2 className="w-8 h-8 animate-spin mb-4"/>
              <p className="font-mono text-xs tracking-widest uppercase">Menganalisa Data...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(caborListExpanded ? groupedCabors : groupedCabors.slice(0, 10)).map((cabor)=>{
                const isExpanded = expandedCabor===cabor.nama
                return (
                  <div key={cabor.nama} className="rounded-xl border transition-all duration-200"
                    style={{
                      border:`1px solid ${isExpanded?`${ACCENT}30`:'rgba(255,255,255,0.06)'}`,
                      background: isExpanded?'rgba(56,189,248,0.04)':'rgba(255,255,255,0.02)',
                    }}>

                    {/* Accordion header */}
                    <div className="p-4 flex items-center justify-between cursor-pointer select-none"
                      onClick={()=>setExpandedCabor(isExpanded?null:cabor.nama)}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg"
                          style={{background:cabor.pending>0?'rgba(251,191,36,0.1)':'rgba(56,189,248,0.1)',
                            color:cabor.pending>0?'#fbbf24':ACCENT}}>
                          <Activity size={16}/>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-zinc-100">{cabor.nama}</h3>
                          <div className="text-[10px] font-mono mt-0.5" style={{color:'rgba(255,255,255,0.3)'}}>
                            {cabor.total} atlet
                            {cabor.nonLokal>0 && <span className="text-orange-400 ml-2">· {cabor.nonLokal} non-lokal</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex gap-2">
                          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg"
                            style={{background:'rgba(74,222,128,0.1)',color:'#22d3ee',border:'1px solid rgba(74,222,128,0.15)'}}>
                            <CheckCircle size={10}/> {cabor.verified}
                          </span>
                          {cabor.pending>0 && (
                            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg"
                              style={{background:'rgba(251,191,36,0.1)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.15)'}}>
                              <Clock size={10}/> {cabor.pending}
                            </span>
                          )}
                          {cabor.posted>0 && (
                            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg"
                              style={{background:'rgba(96,165,250,0.1)',color:'#60a5fa',border:'1px solid rgba(96,165,250,0.15)'}}>
                              <FileCheck size={10}/> {cabor.posted}
                            </span>
                          )}
                          {cabor.ditolak>0 && (
                            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg"
                              style={{background:'rgba(248,113,113,0.1)',color:'#f87171',border:'1px solid rgba(248,113,113,0.15)'}}>
                              <XCircle size={10}/> {cabor.ditolak}
                            </span>
                          )}
                        </div>
                        <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded?'rotate-180':''}`}
                          style={{color:isExpanded?ACCENT:'rgba(255,255,255,0.3)'}}/>
                      </div>
                    </div>

                    {/* Accordion body */}
                    {isExpanded && (
                      <div className="border-t px-4 pb-4" style={{borderColor:'rgba(255,255,255,0.06)'}}>
                        <div className="mt-3 max-h-[420px] overflow-y-auto rounded-xl"
                          style={{scrollbarWidth:'thin',scrollbarColor:`${ACCENT}25 transparent`}}>
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="text-[9px] uppercase tracking-widest sticky top-0 z-10"
                                style={{background:'rgba(2,10,20,0.95)',color:'rgba(255,255,255,0.3)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                                <th className="px-3 py-2.5 font-bold w-10 text-center">ID</th>
                                <th className="px-3 py-2.5 font-bold">Nama & NIK</th>
                                <th className="px-3 py-2.5 font-bold">Usia & Gender</th>
                                <th className="px-3 py-2.5 font-bold">Asal Daerah</th>
                                <th className="px-3 py-2.5 font-bold">Status</th>
                                <th className="px-3 py-2.5 font-bold text-center">Skor Fisik</th>
                                <th className="px-3 py-2.5 font-bold text-center">Aksi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cabor.atlets.map(a=>{
                                const umur  = hitungUmur(a.tgl_lahir)
                                const nonLk = isNonLokal(a.kode_asal_daerah)
                                const st    = STATUS_CFG[a.status_registrasi]??STATUS_CFG['Draft']
                                const Icon  = st.icon
                                return (
                                  <tr key={a.id} className="border-b transition-colors"
                                    style={{borderColor:'rgba(255,255,255,0.04)'}}
                                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.02)'}
                                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                                    <td className="px-3 py-2.5 text-center text-[10px] font-mono" style={{color:'rgba(255,255,255,0.2)'}}>{a.id}</td>
                                    <td className="px-3 py-2.5">
                                      <div className="text-sm font-bold text-zinc-200">{a.nama_lengkap}</div>
                                      <div className="text-[10px] font-mono mt-0.5" style={{color:'rgba(255,255,255,0.25)'}}>{a.no_ktp}</div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <span className={`text-[11px] font-bold ${umur>30?'text-amber-400':'text-zinc-300'}`}>{umur}th</span>
                                      <span className="text-[10px] ml-1.5" style={{color:'rgba(255,255,255,0.3)'}}>({a.gender||'-'})</span>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      {nonLk ? (
                                        <span className="flex items-center gap-1 text-[9px] font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded-lg w-fit border border-orange-500/20">
                                          <MapPin size={8}/> {a.nama_asal_daerah||'Luar Daerah'}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold" style={{color:`${ACCENT}60`}}>Lokal KBR</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold uppercase border ${st.bg} ${st.text} ${st.border}`}>
                                        <Icon size={9}/> {st.label}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      {a.tes_fisik ? (
                                        <button
                                          onClick={()=>{ setSelectedAtlet(a); setModalTab('fisik') }}
                                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
                                          style={{
                                            background: `${KATEGORI_COLOR[a.tes_fisik.kesimpulan_kategori || ''] || ACCENT}20`,
                                            color:      KATEGORI_COLOR[a.tes_fisik.kesimpulan_kategori || ''] || ACCENT,
                                            border:     `1px solid ${KATEGORI_COLOR[a.tes_fisik.kesimpulan_kategori || ''] || ACCENT}40`,
                                          }}>
                                          <Activity size={9}/>
                                          {a.tes_fisik.kesimpulan_persen != null ? `${a.tes_fisik.kesimpulan_persen}%` : '—'}
                                        </button>
                                      ) : (
                                        <span className="text-[10px] font-bold" style={{color:'rgba(255,255,255,0.2)'}}>
                                          Belum tes
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      <button onClick={()=>{setSelectedAtlet(a); setModalTab('profil')}}
                                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                                        style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.5)'}}
                                        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=ACCENT;(e.currentTarget as HTMLElement).style.color=ACCENT}}
                                        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.1)';(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.5)'}}>
                                        Buka Dossier
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                          {cabor.atlets.length===0 && (
                            <div className="py-6 text-center text-[11px]" style={{color:'rgba(255,255,255,0.2)'}}>
                              Tidak ada atlet yang cocok dengan filter
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {groupedCabors.length === 0 && (
                <div className="py-12 text-center rounded-xl" style={{border:'1px dashed rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.2)'}}>
                  <Search size={24} className="mx-auto mb-3 opacity-30"/>
                  <p className="text-sm">Tidak ada hasil ditemukan</p>
                </div>
              )}

              {/* Expand / Collapse – hanya tampil kalau ada lebih dari 10 cabor */}
              {groupedCabors.length > 10 && (
                <button
                  onClick={() => setCaborListExpanded(s => !s)}
                  className="w-full mt-1 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${caborListExpanded ? `${ACCENT}30` : 'rgba(255,255,255,0.08)'}`,
                    color: caborListExpanded ? ACCENT : 'rgba(255,255,255,0.35)',
                  }}>
                  <ChevronDown size={14}
                    className={`transition-transform duration-200 ${caborListExpanded ? 'rotate-180' : ''}`}
                    style={{color: caborListExpanded ? ACCENT : 'rgba(255,255,255,0.35)'}}/>
                  {caborListExpanded
                    ? 'Sembunyikan'
                    : `Tampilkan ${groupedCabors.length - 10} Cabor Lainnya`}
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── BACKDROP ── */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${selectedAtlet?'opacity-100':'opacity-0 pointer-events-none'}`}
        style={{background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)'}}
        onClick={()=>setSelectedAtlet(null)}/>

      {/* ── DOSSIER SLIDE-OUT ── */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-[480px] z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${selectedAtlet?'translate-x-0':'translate-x-full'}`}
        style={{background:'#03101c',borderLeft:'1px solid rgba(56,189,248,0.15)'}}>
        {selectedAtlet && (
          <>
            {/* Dossier header */}
            <div className="flex items-center justify-between p-6 border-b" style={{borderColor:'rgba(56,189,248,0.1)',background:'rgba(56,189,248,0.04)'}}>
              <div>
                <div className="text-[10px] font-mono mb-1 uppercase tracking-widest" style={{color:ACCENT}}>Dossier Intelijen</div>
                <h2 className="text-xl font-bold text-white">{selectedAtlet.nama_lengkap}</h2>
                <div className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>{selectedAtlet.cabor_nama_raw} · {selectedAtlet.gender}</div>
              </div>
              <button onClick={()=>setSelectedAtlet(null)}
                className="p-2 rounded-xl transition-all"
                style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.4)'}}>
                <X size={16}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5"
              style={{scrollbarWidth:'thin',scrollbarColor:`${ACCENT}25 transparent`}}>

              {/* Tab Navigation */}
              <div className="flex gap-1 p-1 rounded-xl"
                style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)'}}>
                <button
                  onClick={()=>setModalTab('profil')}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: modalTab==='profil' ? `${ACCENT}20` : 'transparent',
                    color:      modalTab==='profil' ? ACCENT : 'rgba(255,255,255,0.4)',
                  }}>
                  <User size={12}/> Profil & Verifikasi
                </button>
                <button
                  onClick={()=>setModalTab('fisik')}
                  disabled={!selectedAtlet.tes_fisik}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: modalTab==='fisik' ? 'rgba(16,185,129,0.2)' : 'transparent',
                    color:      modalTab==='fisik' ? '#0ea5e9' : 'rgba(255,255,255,0.4)',
                  }}>
                  <Activity size={12}/> Tes Fisik
                  {!selectedAtlet.tes_fisik && <span className="text-[9px] font-normal">(N/A)</span>}
                </button>
              </div>

              {/* ── TAB: TES FISIK ── */}
              {modalTab === 'fisik' && selectedAtlet.tes_fisik && (() => {
                const tf = selectedAtlet.tes_fisik
                const items = tf.items || []
                const radarData = items.map(i => ({
                  komponen: i.komponen,
                  capaian:  i.capaian_persen,
                  fullMark: 100,
                }))
                const sorted = [...items].sort((a,b) => a.capaian_persen - b.capaian_persen)
                const weakest = sorted.filter(i => i.capaian_persen < 100).slice(0, 3)
                const strongest = [...sorted].reverse().slice(0, 3)
                const kategoriColor = KATEGORI_COLOR[tf.kesimpulan_kategori || ''] || '#0ea5e9'

                return (
                  <>
                    {/* Summary */}
                    <div className="rounded-xl p-4 relative overflow-hidden"
                      style={{background:`${kategoriColor}10`, border:`1px solid ${kategoriColor}30`}}>
                      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20"
                        style={{background: kategoriColor}}/>
                      <div className="relative flex items-center justify-between">
                        <div>
                          <div className="text-[10px] uppercase tracking-widest font-bold" style={{color: kategoriColor}}>
                            Skor Overall
                          </div>
                          <div className="text-4xl font-black mt-1" style={{color: kategoriColor}}>
                            {tf.kesimpulan_persen}<span className="text-lg">%</span>
                          </div>
                          <div className="text-xs font-bold mt-1" style={{color: kategoriColor}}>
                            {tf.kesimpulan_kategori}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase text-zinc-500">BMI</div>
                          <div className="text-2xl font-black text-white">
                            {tf.bmi != null ? tf.bmi.toFixed(1) : '—'}
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            {tf.berat_badan}kg / {tf.tinggi_badan}cm
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Radar */}
                    {radarData.length > 2 && (
                      <div className="rounded-xl p-4"
                        style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)'}}>
                        <div className="text-[10px] uppercase tracking-widest font-bold text-sky-400 mb-3 flex items-center gap-2">
                          <Target size={12}/> Profil Komponen Fisik
                        </div>
                        <ResponsiveContainer width="100%" height={220}>
                          <RadarChart data={radarData}>
                            <PolarGrid stroke="#1e293b"/>
                            <PolarAngleAxis dataKey="komponen" tick={{fill:'#94a3b8',fontSize:10}}/>
                            <PolarRadiusAxis angle={90} domain={[0,100]} tick={{fill:'#475569',fontSize:9}}/>
                            <Radar dataKey="capaian" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.4}/>
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Strengths & Weakness */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl p-3"
                        style={{background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)'}}>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-sky-400 mb-2">
                          🏆 Top 3 Terkuat
                        </div>
                        {strongest.map((c,i) => (
                          <div key={i} className="flex justify-between text-[11px] mb-1">
                            <span className="text-zinc-300 truncate">{c.komponen}</span>
                            <span className="text-sky-400 font-bold ml-2">{c.capaian_persen}%</span>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-xl p-3"
                        style={{background:'rgba(249,115,22,0.06)', border:'1px solid rgba(249,115,22,0.15)'}}>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-orange-400 mb-2">
                          🎯 Perlu Latihan
                        </div>
                        {weakest.length > 0 ? weakest.map((c,i) => (
                          <div key={i} className="flex justify-between text-[11px] mb-1">
                            <span className="text-zinc-300 truncate">{c.komponen}</span>
                            <span className="text-orange-400 font-bold ml-2">{c.capaian_persen}%</span>
                          </div>
                        )) : (
                          <div className="text-[11px] text-sky-300 italic">
                            🎉 Semua excellent!
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CTA — link ke full detail KONIDA */}
                    <button
                      onClick={()=>{
                        window.open(`/konida/Premiumreport/kabbandung/tes-fisik`, '_blank')
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                      style={{
                        background:'rgba(16,185,129,0.1)',
                        color:'#0ea5e9',
                        border:'1px solid rgba(16,185,129,0.3)',
                      }}>
                      <Eye size={12}/> Lihat Dashboard Tes Biomotorik Lengkap
                    </button>

                    {/* Test metadata */}
                    <div className="text-[10px] text-zinc-500 text-center font-mono pt-2">
                      Tahap 3 · {tf.matching_method} · {items.length} item tes
                    </div>
                  </>
                )
              })()}

              {/* ── TAB: PROFIL (original content) ── */}
              {modalTab === 'profil' && <>

              {/* Status alert */}
              {selectedAtlet.status_registrasi==='Menunggu Admin' && (
                <div className="p-3.5 rounded-xl flex gap-3 items-start"
                  style={{background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.2)'}}>
                  <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5"/>
                  <div>
                    <div className="text-sm font-bold text-amber-400 mb-0.5">Menunggu Verifikasi</div>
                    <div className="text-xs text-amber-400/60">Pastikan NIK KTP dan dokumen fisik sesuai.</div>
                  </div>
                </div>
              )}
              {selectedAtlet.catatan_verifikasi && (
                <div className="p-3.5 rounded-xl flex gap-3 items-start"
                  style={{background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.2)'}}>
                  <XCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5"/>
                  <div>
                    <div className="text-sm font-bold text-rose-400 mb-0.5">Histori Penolakan</div>
                    <div className="text-xs text-rose-400/70 font-mono">"{selectedAtlet.catatan_verifikasi}"</div>
                  </div>
                </div>
              )}

              {/* Profil kependudukan */}
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest pb-2 mb-3"
                  style={{color:'rgba(255,255,255,0.3)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                  <User size={12}/> Profil Kependudukan
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    {l:'NIK / KTP',     v:selectedAtlet.no_ktp||'-',           icon:CreditCard },
                    {l:'Tgl Lahir',     v:selectedAtlet.tgl_lahir ? `${selectedAtlet.tgl_lahir} (${hitungUmur(selectedAtlet.tgl_lahir)}th)` : '-', icon:User },
                    {l:'Asal Daerah',   v:selectedAtlet.nama_asal_daerah||'-', icon:MapPin,    alert:isNonLokal(selectedAtlet.kode_asal_daerah) },
                    {l:'No Reg KONI',   v:selectedAtlet.no_registrasi_koni?`#${selectedAtlet.no_registrasi_koni}`:'—', icon:Hash },
                  ].map(f=>(
                    <div key={f.l} className="rounded-xl p-3"
                      style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                      <div className="flex items-center gap-1.5 text-[9px] uppercase text-zinc-500 mb-1.5">
                        <f.icon size={10}/> {f.l}
                      </div>
                      <div className={`text-sm font-bold ${'alert' in f && f.alert ? 'text-orange-400' : 'text-zinc-200'}`}>
                        {String(f.v)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Apparel */}
              {(selectedAtlet.ukuran_kemeja||selectedAtlet.ukuran_sepatu) && (
                <div>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest pb-2 mb-3"
                    style={{color:'rgba(255,255,255,0.3)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                    <Shirt size={12}/> Data Apparel
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                      <div className="text-[9px] text-zinc-500 uppercase mb-1.5">Ukuran Kemeja</div>
                      <div className="text-sm font-bold text-zinc-200">{selectedAtlet.ukuran_kemeja||'—'}</div>
                    </div>
                    <div className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                      <div className="text-[9px] text-zinc-500 uppercase mb-1.5">Ukuran Sepatu</div>
                      <div className="text-sm font-bold text-zinc-200">{selectedAtlet.ukuran_sepatu||'—'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Rekening bank */}
              {(selectedAtlet.nama_bank||selectedAtlet.no_rekening) && (
                <div>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest pb-2 mb-3"
                    style={{color:'rgba(255,255,255,0.3)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                    <Banknote size={12}/> Data Perbankan
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                      <div className="text-[9px] text-zinc-500 uppercase mb-1.5">Bank</div>
                      <div className="text-sm font-bold text-zinc-200">{selectedAtlet.nama_bank||'—'}</div>
                    </div>
                    <div className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                      <div className="text-[9px] text-zinc-500 uppercase mb-1.5">No. Rekening</div>
                      <div className="text-sm font-bold font-mono text-zinc-200">{selectedAtlet.no_rekening||'—'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status saat ini */}
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest pb-2 mb-3"
                  style={{color:'rgba(255,255,255,0.3)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                  <Activity size={12}/> Status Registrasi
                </div>
                {(()=>{
                  const st = STATUS_CFG[selectedAtlet.status_registrasi]??STATUS_CFG['Draft']
                  const Icon = st.icon
                  return (
                    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border ${st.bg} ${st.text} ${st.border}`}>
                      <Icon size={14}/> {selectedAtlet.status_registrasi}
                    </div>
                  )
                })()}
              </div>

              {/* Action buttons */}
              {selectedAtlet.status_registrasi!=='Verified' && (
                <div className="pt-4 border-t" style={{borderColor:'rgba(255,255,255,0.06)'}}>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2 block">
                    Catatan Penolakan (Opsional)
                  </label>
                  <textarea value={rejectNote} onChange={e=>setRejectNote(e.target.value)}
                    placeholder="Misal: KTP buram, data tidak lengkap..." disabled={isUpdating}
                    className="w-full rounded-xl p-3 text-sm text-zinc-300 resize-none h-20 mb-4 disabled:opacity-50 outline-none"
                    style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)'}}
                    onFocus={e=>e.target.style.borderColor='rgba(248,113,113,0.4)'}
                    onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
                  <div className="flex gap-3">
                    <button onClick={()=>handleVerify(selectedAtlet.id,'Ditolak Admin')}
                      disabled={isUpdating}
                      className="flex-1 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                      style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.25)',color:'#f87171'}}>
                      {isUpdating?'...':'❌ REJECT'}
                    </button>
                    <button onClick={()=>handleVerify(selectedAtlet.id,'Verified')}
                      disabled={isUpdating}
                      className="flex-[2] py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{background:'rgba(56,189,248,0.15)',border:`1px solid ${ACCENT}40`,color:ACCENT}}>
                      {isUpdating?<Loader2 className="animate-spin" size={16}/>:<FileCheck size={16}/>}
                      {isUpdating?'MEMPROSES...':'✅ APPROVE VALID'}
                    </button>
                  </div>
                </div>
              )}
              </>}
            </div>
          </>
        )}
      </div>

      {/* ── EXPORT MODAL — di luar semua div ── */}
      {showExport && (
        <ExportModal data={data} onClose={()=>setShowExport(false)}/>
      )}
    </div>
  )
}