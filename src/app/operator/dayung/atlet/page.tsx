'use client'
// src/app/operator/dayung/atlet/page.tsx — v2
// Fix: filter kontingen_id=4, tambah search nama, status Posted, dossier lengkap, export CSV

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Search, ShieldAlert, CheckCircle, Clock, X, User, MapPin,
  AlertTriangle, Download, FileCheck, XCircle, Loader2,
  ChevronDown, Activity, Users, Award, RefreshCw,
  CreditCard, Shirt, Banknote, Hash, Filter, FileSpreadsheet,
  Target, Heart, Flame, Eye,
} from 'lucide-react'
import { ExportModal } from '@/components/ExportModal'
import { CaborCardV2, classifyCabor, countByStatus, type CaborCardData, type CaborStatus } from '@/components/konida/CaborCardV2'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const KONTINGEN_ID = 4
const CABOR_ID     = 147   // Dayung (cabor_id di cabang_olahraga)
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
  tes_fisik?:          TesFisikInfo | null
  tes_fisik_status?:   string | null
  tes_fisik_kategori?: string | null
  tes_fisik_persen?:   number | null
  tes_fisik_rating?:   string | null
  tes_fisik_id?:       number | null
}

const RATING_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  '⭐ ELITE':       { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  '✅ READY':       { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  '🟡 NEEDS WORK':  { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/30'  },
  '🔴 SUB-PAR':     { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  '🚨 KRITIS':      { bg: 'bg-rose-500/10',   text: 'text-rose-400',   border: 'border-rose-500/30'   },
  '⚠️ Tidak Hadir': { bg: 'bg-slate-500/10',  text: 'text-slate-400',  border: 'border-slate-500/30'  },
}

const RATING_PRIORITY: Record<string, number> = {
  '⭐ ELITE': 1, '✅ READY': 2, '🟡 NEEDS WORK': 3,
  '🔴 SUB-PAR': 4, '🚨 KRITIS': 5, '⚠️ Tidak Hadir': 6,
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
  const searchParams = useSearchParams()
  const [data,         setData]         = useState<Atlet[]>([])
  const [loading,      setLoading]      = useState(true)
  const [searchCabor,  setSearchCabor]  = useState('')
  const [searchNama,   setSearchNama]   = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(() => {
    const s = searchParams.get('status')
    const valid: FilterStatus[] = ['semua','Verified','Menunggu Admin','Ditolak Admin','Posted']
    return valid.includes(s as FilterStatus) ? (s as FilterStatus) : 'semua'
  })
  const [filterTesFisik, setFilterTesFisik] = useState<'semua'|'sudah'|'belum'|'top'>('semua')
  const [filterRating,   setFilterRating]   = useState<string>('all')
  const [filterKesiapan, setFilterKesiapan] = useState<'semua'|'belum_tes'|'perlu_perhatian'|'siap_tanding'>('semua')
  const [expandedCabor,setExpandedCabor]= useState<string|null>(null)
  const [selectedAtlet,setSelectedAtlet]= useState<Atlet|null>(null)
  const [modalTab,     setModalTab]     = useState<'profil'|'fisik'>('profil')
  const [rejectNote,   setRejectNote]   = useState('')
  const [isUpdating,   setIsUpdating]   = useState(false)
  const [animIn,           setAnimIn]           = useState(false)
  const [showExport,          setShowExport]          = useState(false)
  const [caborListExpanded,   setCaborListExpanded]   = useState(false)
  type SortMode = 'urgency'|'total'|'coverage'|'avg_skor'|'pending'|'kritis'
  const [sortMode,        setSortMode]        = useState<SortMode>('urgency')
  const [filterCaborStat, setFilterCaborStat] = useState<'all'|CaborStatus>('all')

  useEffect(()=>{ const t=setTimeout(()=>setAnimIn(true),80); return()=>clearTimeout(t) },[])

  // ── Fetch — filter by kontingen_id + parallel fetch tes fisik ──
  useEffect(()=>{
    async function fetchAtlet() {
      try {
        // Step 1 — atlet + tes_fisik headers (parallel)
        const [atletRes, tesFisikRes] = await Promise.all([
          (async () => {
            let all: any[] = []
            for (let p = 0; ; p++) {
              const { data, error } = await sb.from('atlet')
                .select('id,nama_lengkap,no_ktp,tgl_lahir,gender,cabor_nama_raw,kode_asal_daerah,nama_asal_daerah,no_registrasi_koni,status_registrasi,status_verifikasi,ukuran_kemeja,ukuran_sepatu,nama_bank,no_rekening,catatan_verifikasi,kontingen_id,created_at,tes_fisik_status,tes_fisik_kategori,tes_fisik_persen,tes_fisik_rating,tes_fisik_id')
                .eq('kontingen_id', KONTINGEN_ID)
                .eq('cabor_id', CABOR_ID)
                .order('cabor_nama_raw', { ascending: true })
                .order('nama_lengkap',   { ascending: true })
                .range(p * 1000, (p + 1) * 1000 - 1)
              if (error) return { data: null, error }
              if (!data || data.length === 0) break
              all = all.concat(data)
              if (data.length < 1000) break
            }
            return { data: all, error: null }
          })(),
          sb.from('atlet_tes_fisik')
            .select('id,atlet_id,bmi,berat_badan,tinggi_badan,kesimpulan_persen,kesimpulan_kategori,status_tes,cabor_nama,matching_method')
            .eq('kontingen_id', KONTINGEN_ID)
            .eq('tahap', 3),
        ])

        if (atletRes.error) throw atletRes.error
        const atlets = (atletRes.data || []) as Atlet[]
        const tesFisikList = tesFisikRes.data || []

        // Step 2 — items filtered by tes_fisik IDs (bukan fetch semua — kena limit 1000)
        const tesFisikIds = tesFisikList.map((tf: any) => tf.id)
        const { data: itemsRaw } = tesFisikIds.length > 0
          ? await sb.from('atlet_tes_fisik_item')
              .select('tes_fisik_id,komponen,item_tes,capaian_persen,kategori')
              .in('tes_fisik_id', tesFisikIds)
          : { data: [] as any[] }
        const itemsList = itemsRaw || []

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
    let total=0, verified=0, pending=0, ditolak=0, posted=0
    let koni_verified=0, koni_approved=0, koni_rejected=0
    let sudahTes=0, belumTes=0, totalSkor=0, topAtlet=0, lowAtlet=0
    const caborSkorMap: Record<string, {sum:number; n:number}> = {}
    data.forEach(a=>{
      total++
      if(a.status_registrasi==='Verified')       verified++
      if(a.status_registrasi==='Menunggu Admin') pending++
      if(a.status_registrasi==='Ditolak Admin')  ditolak++
      if(a.status_registrasi==='Posted')         posted++
      if(a.status_verifikasi==='Verified')       koni_verified++
      if(a.status_verifikasi==='Approved Cabor') koni_approved++
      if(a.status_verifikasi==='Rejected')       koni_rejected++
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
    return { total, verified, pending, ditolak, posted,
             koni_verified, koni_approved, koni_rejected,
             sudahTes, belumTes, avgSkor, topAtlet, lowAtlet, caborLemahCount }
  },[data])

  // ── Top 3 Performers (skor fisik tertinggi) ──────────────
  const topPerformers = useMemo(()=>{
    return [...data]
      .filter(a => a.tes_fisik?.kesimpulan_persen != null)
      .sort((a,b) => (b.tes_fisik?.kesimpulan_persen||0) - (a.tes_fisik?.kesimpulan_persen||0))
      .slice(0, 3)
  },[data])

  // ── Tes Fisik Rating Stats ────────────────────────────────
  const tesFisikStats = useMemo(()=>{
    const s = { elite:0, ready:0, needs_work:0, sub_par:0, kritis:0, tidak_hadir:0, belum_tes:0 }
    data.forEach(a => {
      if      (a.tes_fisik_rating === '⭐ ELITE')       s.elite++
      else if (a.tes_fisik_rating === '✅ READY')       s.ready++
      else if (a.tes_fisik_rating === '🟡 NEEDS WORK')  s.needs_work++
      else if (a.tes_fisik_rating === '🔴 SUB-PAR')     s.sub_par++
      else if (a.tes_fisik_rating === '🚨 KRITIS')      s.kritis++
      else if (a.tes_fisik_rating === '⚠️ Tidak Hadir') s.tidak_hadir++
      else                                               s.belum_tes++
    })
    return s
  }, [data])

  // ── Group by cabor + classify status v2 ──────────────────
  const groupedCabors = useMemo(()=>{
    let filtered = filterStatus==='semua'
      ? data
      : data.filter(a=>a.status_registrasi===filterStatus)

    if (filterTesFisik === 'sudah') filtered = filtered.filter(a => a.tes_fisik != null)
    else if (filterTesFisik === 'belum') filtered = filtered.filter(a => a.tes_fisik == null)
    else if (filterTesFisik === 'top')   filtered = filtered.filter(a => (a.tes_fisik?.kesimpulan_persen || 0) >= 80)

    if (filterRating !== 'all') {
      const ratingMap: Record<string, string | null> = {
        'elite':'⭐ ELITE', 'ready':'✅ READY', 'needs_work':'🟡 NEEDS WORK',
        'sub_par':'🔴 SUB-PAR', 'kritis':'🚨 KRITIS', 'tidak_hadir':'⚠️ Tidak Hadir', 'belum_tes':null,
      }
      const target = ratingMap[filterRating]
      filtered = filtered.filter(a =>
        target === null ? a.tes_fisik_rating == null : a.tes_fisik_rating === target
      )
    }

    if (filterKesiapan === 'belum_tes') {
      filtered = filtered.filter(a => !a.tes_fisik_rating)
    } else if (filterKesiapan === 'perlu_perhatian') {
      filtered = filtered.filter(a => ['🚨 KRITIS','🔴 SUB-PAR','🟡 NEEDS WORK'].includes(a.tes_fisik_rating||''))
    } else if (filterKesiapan === 'siap_tanding') {
      filtered = filtered.filter(a => ['⭐ ELITE','✅ READY'].includes(a.tes_fisik_rating||''))
    }

    const caborMap: Record<string, Atlet[]> = {}
    filtered.forEach(a => {
      const c = a.cabor_nama_raw || 'Belum Ditentukan'
      if (!caborMap[c]) caborMap[c] = []
      caborMap[c].push(a)
    })

    const URGENCY: Record<string, number> = {
      '🚨 KRITIS':0, '🔴 SUB-PAR':1, '🟡 NEEDS WORK':2,
      '⚠️ Tidak Hadir':3, '✅ READY':4, '⭐ ELITE':5,
    }
    const KODE_LOKAL = '3204'

    let list: (CaborCardData & { atlets: Atlet[] })[] = Object.entries(caborMap).map(([nama, atlets]) => {
      const total    = atlets.length
      const putra    = atlets.filter(a => a.gender === 'L').length
      const putri    = atlets.filter(a => a.gender === 'P').length
      const lokal    = atlets.filter(a => a.kode_asal_daerah?.startsWith(KODE_LOKAL)).length
      const nonLokal = total - lokal
      const verified = atlets.filter(a => a.status_registrasi === 'Verified').length
      const pending  = atlets.filter(a => a.status_registrasi === 'Menunggu Admin').length
      const ditolak  = atlets.filter(a => a.status_registrasi === 'Ditolak Admin').length
      const posted   = atlets.filter(a => a.status_registrasi === 'Posted').length

      // sudahTes pakai tes_fisik_rating (konsisten dg dashboard fix) — bukan tes_fisik_persen
      const sudahTes     = atlets.filter(a => !!a.tes_fisik_rating).length
      const belumTes     = total - sudahTes
      // avgSkor hanya dari atlet yang punya nilai numerik (Tidak Hadir = null)
      const withScore    = atlets.filter(a => a.tes_fisik_persen != null)
      const avgSkor      = withScore.length > 0
        ? Math.round(withScore.reduce((s, a) => s + (a.tes_fisik_persen!), 0) / withScore.length)
        : 0
      const kategoriAvg  =
        avgSkor === 0 ? '' :
        avgSkor >= 75 ? 'Baik Sekali' :
        avgSkor >= 60 ? 'Baik' :
        avgSkor >= 50 ? 'Cukup' :
        avgSkor >= 40 ? 'Kurang' : 'Kurang Sekali'

      const rating = {
        elite:      atlets.filter(a => a.tes_fisik_rating === '⭐ ELITE').length,
        ready:      atlets.filter(a => a.tes_fisik_rating === '✅ READY').length,
        needsWork:  atlets.filter(a => a.tes_fisik_rating === '🟡 NEEDS WORK').length,
        subPar:     atlets.filter(a => a.tes_fisik_rating === '🔴 SUB-PAR').length,
        kritis:     atlets.filter(a => a.tes_fisik_rating === '🚨 KRITIS').length,
        tidakHadir: atlets.filter(a => a.tes_fisik_rating === '⚠️ Tidak Hadir').length,
      }

      const coverage   = total > 0 ? Math.round((sudahTes / total) * 100) : 0
      const verifikasi = total > 0 ? Math.round(((verified + posted) / total) * 100) : 0

      const { status, urgencyScore } = classifyCabor({
        total, sudahTes, avgSkor,
        kritis: rating.kritis, subPar: rating.subPar, elite: rating.elite, pending,
      })

      const sortedAtlets = [...atlets].sort((a, b) => {
        const ua = a.tes_fisik_rating ? (URGENCY[a.tes_fisik_rating] ?? 3) : 3.5
        const ub = b.tes_fisik_rating ? (URGENCY[b.tes_fisik_rating] ?? 3) : 3.5
        return ua - ub
      })

      return {
        nama, status, urgencyScore,
        total, putra, putri, lokal, nonLokal,
        verified, pending, ditolak, posted,
        sudahTes, belumTes, avgSkor, kategoriAvg,
        rating, coverage, verifikasi,
        atlets: searchNama
          ? sortedAtlets.filter(a => a.nama_lengkap.toLowerCase().includes(searchNama.toLowerCase()))
          : sortedAtlets,
      }
    })

    // Filter by status klasifikasi
    if (filterCaborStat !== 'all') {
      list = list.filter(c => c.status === filterCaborStat)
    }

    // Filter by cabor name search
    if (searchCabor) {
      list = list.filter(c => c.nama.toLowerCase().includes(searchCabor.toLowerCase()))
    }

    // Hide empty cabors saat ada search nama
    if (searchNama) {
      list = list.filter(c => c.atlets.length > 0)
    }

    // Sort mode
    list.sort((a, b) => {
      switch (sortMode) {
        case 'urgency':  return b.urgencyScore - a.urgencyScore
        case 'total':    return b.total - a.total
        case 'coverage': return a.coverage - b.coverage
        case 'avg_skor': return b.avgSkor - a.avgSkor
        case 'pending':  return b.pending - a.pending
        case 'kritis':   return b.rating.kritis - a.rating.kritis
        default:         return 0
      }
    })

    return list
  },[data, searchCabor, searchNama, filterStatus, filterTesFisik, filterRating, filterKesiapan, filterCaborStat, sortMode])

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
      const res = await fetch('/api/atlet/edit', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, set: { status_registrasi: status, catatan_verifikasi: status==='Ditolak Admin'?rejectNote:null } }),
      })
      if (!res.ok) throw new Error('Gagal update status')
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
              <h1 className="text-xl font-black text-white tracking-tight">Data Master Atlet</h1>
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

        {/* ── KPI KESIAPAN TANDING ── */}
        <div {...ani(0)} className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Total Atlet */}
          <div className="rounded-2xl p-5 flex flex-col justify-between"
            style={{background:'rgba(56,189,248,0.05)',border:'1px solid rgba(56,189,248,0.15)'}}>
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3">
              <Users size={13} style={{color:ACCENT}}/> Total Atlet
            </div>
            <div className="text-4xl font-black text-white">{summary.total.toLocaleString('id')}</div>
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-zinc-500 mb-1.5">
                <span>Coverage tes fisik</span>
                <span style={{color:ACCENT}}>{summary.total>0?Math.round(summary.sudahTes/summary.total*100):0}%</span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{width:`${summary.total>0?summary.sudahTes/summary.total*100:0}%`,background:ACCENT}}/>
              </div>
              <div className="text-[10px] mt-1 text-zinc-600">{groupedCabors.length} cabor aktif</div>
            </div>
          </div>

          {/* Belum Tes Fisik */}
          <button className="rounded-2xl p-5 flex flex-col justify-between text-left relative overflow-hidden transition-all"
            style={{background: filterKesiapan==='belum_tes'?'rgba(251,191,36,0.12)':'rgba(251,191,36,0.05)',
              border: filterKesiapan==='belum_tes'?'1px solid rgba(251,191,36,0.5)':'1px solid rgba(251,191,36,0.2)'}}
            onClick={()=>setFilterKesiapan(filterKesiapan==='belum_tes'?'semua':'belum_tes')}>
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:'rgba(251,191,36,0.6)'}}/>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-widest">
                <Clock size={13}/> Belum Tes Fisik
              </div>
              {filterKesiapan==='belum_tes' && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400">AKTIF</span>}
            </div>
            <div className="text-4xl font-black text-amber-400">{summary.belumTes.toLocaleString('id')}</div>
            <div className="mt-3 text-[10px] text-zinc-500">{summary.total>0?Math.round(summary.belumTes/summary.total*100):0}% dari total belum mengikuti tes</div>
          </button>

          {/* Sudah Tes — distribusi rating */}
          <div className="rounded-2xl p-5 flex flex-col justify-between"
            style={{background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.15)'}}>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">
              <CheckCircle size={13}/> Sudah Tes Fisik
            </div>
            <div className="text-4xl font-black text-emerald-400">{summary.sudahTes.toLocaleString('id')}</div>
            <div className="mt-3 flex flex-wrap gap-1">
              {tesFisikStats.elite>0      && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-bold">⭐{tesFisikStats.elite}</span>}
              {tesFisikStats.ready>0      && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">✅{tesFisikStats.ready}</span>}
              {tesFisikStats.needs_work>0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold">🟡{tesFisikStats.needs_work}</span>}
              {tesFisikStats.sub_par>0    && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-bold">🔴{tesFisikStats.sub_par}</span>}
              {tesFisikStats.kritis>0     && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-bold">🚨{tesFisikStats.kritis}</span>}
              {tesFisikStats.tidak_hadir>0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-500/15 text-slate-400 font-bold">⚠️{tesFisikStats.tidak_hadir}</span>}
            </div>
          </div>

          {/* Perlu Perhatian */}
          <button className="rounded-2xl p-5 flex flex-col justify-between text-left relative overflow-hidden transition-all"
            style={{background: filterKesiapan==='perlu_perhatian'?'rgba(239,68,68,0.12)':'rgba(239,68,68,0.05)',
              border: filterKesiapan==='perlu_perhatian'?'1px solid rgba(239,68,68,0.5)':'1px solid rgba(239,68,68,0.2)'}}
            onClick={()=>setFilterKesiapan(filterKesiapan==='perlu_perhatian'?'semua':'perlu_perhatian')}>
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:'rgba(239,68,68,0.6)'}}/>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-widest">
                <AlertTriangle size={13}/> Tes Fisik Kritis
              </div>
              {filterKesiapan==='perlu_perhatian' && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-400">AKTIF</span>}
            </div>
            <div className="text-4xl font-black text-rose-400">{(tesFisikStats.kritis+tesFisikStats.sub_par+tesFisikStats.needs_work).toLocaleString('id')}</div>
            <div className="mt-3 text-[10px] text-zinc-500">KRITIS {tesFisikStats.kritis} · SUB-PAR {tesFisikStats.sub_par} · NEEDS WORK {tesFisikStats.needs_work}</div>
          </button>
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

          {/* Filter Rating Fisik */}
          <div className="flex items-center gap-2 pl-3 ml-1 border-l border-white/5">
            <select
              value={filterRating}
              onChange={e => setFilterRating(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold outline-none transition-all"
              style={{background:'rgba(255,255,255,0.04)',border:`1px solid ${filterRating!=='all'?'rgba(234,179,8,0.4)':'rgba(255,255,255,0.08)'}`,color:filterRating!=='all'?'#fbbf24':'rgba(255,255,255,0.4)'}}>
              <option value="all">Rating Fisik: Semua</option>
              <option value="elite">⭐ ELITE ({tesFisikStats.elite})</option>
              <option value="ready">✅ READY ({tesFisikStats.ready})</option>
              <option value="needs_work">🟡 NEEDS WORK ({tesFisikStats.needs_work})</option>
              <option value="sub_par">🔴 SUB-PAR ({tesFisikStats.sub_par})</option>
              <option value="kritis">🚨 KRITIS ({tesFisikStats.kritis})</option>
              <option value="tidak_hadir">⚠️ Tidak Hadir ({tesFisikStats.tidak_hadir})</option>
              <option value="belum_tes">— Belum Tes ({tesFisikStats.belum_tes})</option>
            </select>
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

        {/* ── TES FISIK ALERT BANNER ── */}
        {/* ── QUICK FILTER PILLS ── */}
        <div {...ani(55)} className="flex flex-wrap items-center gap-2">
          {([
            { key:'semua',           label:`Semua (${summary.total})`,                                                              color:'rgba(255,255,255,0.06)', active:'rgba(56,189,248,0.15)',  border:'rgba(255,255,255,0.1)',  activeBorder:'rgba(56,189,248,0.4)',  text:'text-zinc-400', activeText:'text-sky-300' },
            { key:'belum_tes',       label:`Belum Tes (${summary.belumTes})`,                                                       color:'rgba(251,191,36,0.08)',  active:'rgba(251,191,36,0.2)',   border:'rgba(251,191,36,0.2)',   activeBorder:'rgba(251,191,36,0.5)',  text:'text-amber-500', activeText:'text-amber-300' },
            { key:'perlu_perhatian', label:`Tes Fisik Kritis (${tesFisikStats.kritis+tesFisikStats.sub_par+tesFisikStats.needs_work})`, color:'rgba(239,68,68,0.08)',   active:'rgba(239,68,68,0.2)',    border:'rgba(239,68,68,0.2)',    activeBorder:'rgba(239,68,68,0.5)',   text:'text-rose-400',  activeText:'text-rose-300' },
            { key:'siap_tanding',    label:`Siap Tanding (${tesFisikStats.elite+tesFisikStats.ready})`,                             color:'rgba(16,185,129,0.08)',  active:'rgba(16,185,129,0.2)',   border:'rgba(16,185,129,0.2)',   activeBorder:'rgba(16,185,129,0.5)', text:'text-emerald-400', activeText:'text-emerald-300' },
          ] as const).map(p => {
            const isActive = filterKesiapan === p.key
            return (
              <button key={p.key}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isActive ? p.activeText : p.text}`}
                style={{background: isActive ? p.active : p.color, border: `1px solid ${isActive ? p.activeBorder : p.border}`}}
                onClick={()=>setFilterKesiapan(p.key as typeof filterKesiapan)}>
                {p.label}
              </button>
            )
          })}
          {filterKesiapan !== 'semua' && (
            <button onClick={()=>setFilterKesiapan('semua')}
              className="px-3 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
              style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              ✕ Reset filter
            </button>
          )}
        </div>


        {/* ── KLASIFIKASI PER CABOR v2 ── */}
        <div {...ani(80)} className="rounded-2xl p-5 shadow-xl"
          style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)' }}>

          {/* Title row */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Award size={16} style={{color:ACCENT}}/> Klasifikasi per Cabor
              <span className="text-[11px] font-normal text-zinc-500">({groupedCabors.length} cabor)</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Urutkan</span>
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="text-[11px] px-3 py-1.5 rounded-lg outline-none"
                style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.10)', color:'rgba(255,255,255,0.7)' }}>
                <option value="urgency">Urgensi (default)</option>
                <option value="total">Total Atlet</option>
                <option value="coverage">Coverage (rendah dulu)</option>
                <option value="avg_skor">Avg Skor</option>
                <option value="pending">Pending Approve</option>
                <option value="kritis">Atlet Kritis</option>
              </select>
            </div>
          </div>

          {/* Status summary strip */}
          {!loading && (() => {
            const counts = countByStatus(groupedCabors)
            const items: { key:'all'|CaborStatus; label:string; count:number; color:string; bg:string }[] = [
              { key:'all',        label:'Semua',      count:groupedCabors.length, color:'#94a3b8', bg:'rgba(148,163,184,0.10)' },
              { key:'critical',   label:'Critical',   count:counts.critical,      color:'#fca5a5', bg:'rgba(239,68,68,0.12)'   },
              { key:'watch',      label:'Watch',      count:counts.watch,         color:'#fbbf24', bg:'rgba(245,158,11,0.12)'  },
              { key:'stable',     label:'Stable',     count:counts.stable,        color:'#34d399', bg:'rgba(16,185,129,0.10)'  },
              { key:'excellence', label:'Excellence', count:counts.excellence,    color:'#c4b5fd', bg:'rgba(139,92,246,0.12)'  },
            ]
            return (
              <div className="flex gap-2 mb-4 flex-wrap">
                {items.map(item => {
                  const isActive = filterCaborStat === item.key
                  return (
                    <button key={item.key} onClick={() => setFilterCaborStat(item.key)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                      style={{
                        background: isActive ? item.bg  : 'rgba(255,255,255,0.03)',
                        color:      isActive ? item.color : 'rgba(255,255,255,0.4)',
                        border:     `1px solid ${isActive ? item.color+'40' : 'rgba(255,255,255,0.06)'}`,
                      }}>
                      {item.label} <span className="opacity-60 tabular-nums">({item.count})</span>
                    </button>
                  )
                })}
              </div>
            )
          })()}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center" style={{color:ACCENT}}>
              <Loader2 className="w-8 h-8 animate-spin mb-4"/>
              <p className="font-mono text-xs tracking-widest uppercase">Menganalisa Data...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(caborListExpanded ? groupedCabors : groupedCabors.slice(0, 10)).map((cabor) => {
                const isExpanded    = expandedCabor === cabor.nama
                const atletsInCabor = cabor.atlets

                return (
                  <div key={cabor.nama}>
                    <CaborCardV2
                      cabor={cabor}
                      isExpanded={isExpanded}
                      onToggle={() => setExpandedCabor(isExpanded ? null : cabor.nama)}
                      onAction={(action) => {
                        if (action === 'review_pending') {
                          setFilterStatus('Menunggu Admin')
                          setSearchCabor(cabor.nama)
                          setExpandedCabor(cabor.nama)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        } else if (action === 'lihat_tes') {
                          // Filter ke atlet yang sudah tes di cabor ini
                          setFilterTesFisik('sudah')
                          setSearchCabor(cabor.nama)
                          setExpandedCabor(cabor.nama)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        } else if (action === 'export') {
                          const rows = [
                            ['No','Nama','NIK','Gender','Status','Tes Fisik','Skor'],
                            ...atletsInCabor.map((a, i) => [
                              i+1, a.nama_lengkap, a.no_ktp, a.gender,
                              a.status_registrasi, a.tes_fisik_rating || '—',
                              a.tes_fisik_persen ?? '—',
                            ])
                          ]
                          const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
                          const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
                          const url  = URL.createObjectURL(blob)
                          const el   = document.createElement('a')
                          el.href     = url
                          el.download = `cabor_${cabor.nama.replace(/[^a-z0-9]/gi,'_').toLowerCase()}_${new Date().toISOString().slice(0,10)}.csv`
                          el.click()
                          URL.revokeObjectURL(url)
                        }
                      }}
                    />

                    {/* Expanded atlet table */}
                    {isExpanded && (
                      <div className="mt-2 rounded-xl overflow-hidden border"
                        style={{ background:'rgba(255,255,255,0.02)', borderColor:'rgba(255,255,255,0.06)' }}>
                        <div className="max-h-[420px] overflow-y-auto"
                          style={{scrollbarWidth:'thin',scrollbarColor:`${ACCENT}25 transparent`}}>
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="text-[9px] uppercase tracking-widest sticky top-0 z-10"
                                style={{background:'rgba(2,10,20,0.95)',color:'rgba(255,255,255,0.3)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                                <th className="px-3 py-2.5 font-bold w-10 text-center">ID</th>
                                <th className="px-3 py-2.5 font-bold">Nama &amp; NIK</th>
                                <th className="px-3 py-2.5 font-bold">Usia &amp; Gender</th>
                                <th className="px-3 py-2.5 font-bold">Asal Daerah</th>
                                <th className="px-3 py-2.5 font-bold">Status</th>
                                <th className="px-3 py-2.5 font-bold text-center">Skor Fisik</th>
                                <th className="px-3 py-2.5 font-bold text-center">Aksi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {atletsInCabor.map(a => {
                                const umur  = hitungUmur(a.tgl_lahir)
                                const nonLk = isNonLokal(a.kode_asal_daerah)
                                const st    = STATUS_CFG[a.status_registrasi] ?? STATUS_CFG['Draft']
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
                                      {a.tes_fisik_rating ? (
                                        <button
                                          onClick={() => { setSelectedAtlet(a); setModalTab('fisik') }}
                                          title={`${a.tes_fisik_kategori||''} · ${a.tes_fisik_persen??0}%`}
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all hover:opacity-80 ${RATING_COLOR[a.tes_fisik_rating]?.bg||'bg-slate-500/10'} ${RATING_COLOR[a.tes_fisik_rating]?.text||'text-slate-400'} ${RATING_COLOR[a.tes_fisik_rating]?.border||'border-slate-500/30'}`}>
                                          {a.tes_fisik_rating}
                                          {a.tes_fisik_persen != null && (
                                            <span className="opacity-75 ml-0.5">{a.tes_fisik_persen}%</span>
                                          )}
                                        </button>
                                      ) : (
                                        <span className="text-[10px] font-bold" style={{color:'rgba(255,255,255,0.2)'}}>— Belum Tes</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      <button onClick={() => { setSelectedAtlet(a); setModalTab('profil') }}
                                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                                        style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.5)'}}
                                        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=ACCENT;(e.currentTarget as HTMLElement).style.color=ACCENT}}
                                        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.1)';(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.5)'}}>
                                        Detail
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                          {atletsInCabor.length === 0 && (
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

              {groupedCabors.length > 10 && (
                <button onClick={() => setCaborListExpanded(s => !s)}
                  className="w-full mt-2 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-2"
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


      {/* ── MODAL DETAIL ATLET — centered, large, backdrop click to close ── */}
      {selectedAtlet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)'}}
          onClick={() => setSelectedAtlet(null)}>

          <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            style={{background:'#030e1a', border:`1px solid ${ACCENT}20`}}
            onClick={e => e.stopPropagation()}>

            {/* ── Modal Header ── */}
            <div className="flex items-center justify-between px-7 py-5 shrink-0"
              style={{background:'rgba(56,189,248,0.04)', borderBottom:`1px solid ${ACCENT}15`}}>
              <div className="flex items-center gap-4 min-w-0">
                {/* Avatar initial */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg font-black"
                  style={{background:`${ACCENT}15`, color:ACCENT}}>
                  {selectedAtlet.nama_lengkap.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-white leading-tight truncate">{selectedAtlet.nama_lengkap}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-zinc-400">{selectedAtlet.cabor_nama_raw}</span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-xs text-zinc-400">{selectedAtlet.gender === 'L' ? 'Putra' : 'Putri'}</span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-xs font-mono text-zinc-500">{selectedAtlet.no_ktp}</span>
                    {selectedAtlet.tes_fisik_rating && (
                      <>
                        <span className="text-zinc-600">·</span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${RATING_COLOR[selectedAtlet.tes_fisik_rating]?.bg||''} ${RATING_COLOR[selectedAtlet.tes_fisik_rating]?.text||''} ${RATING_COLOR[selectedAtlet.tes_fisik_rating]?.border||''}`}>
                          {selectedAtlet.tes_fisik_rating} {selectedAtlet.tes_fisik_persen != null ? `${selectedAtlet.tes_fisik_persen}%` : ''}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedAtlet(null)}
                className="p-2.5 rounded-xl transition-all shrink-0 ml-4"
                style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)'}}>
                <X size={16}/>
              </button>
            </div>

            {/* ── Tab Bar ── */}
            <div className="flex px-7 pt-4 gap-1 shrink-0">
              <button onClick={() => setModalTab('profil')}
                className="px-5 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: modalTab==='profil' ? `${ACCENT}18` : 'transparent',
                  color:      modalTab==='profil' ? ACCENT : 'rgba(255,255,255,0.35)',
                  borderBottom: modalTab==='profil' ? `2px solid ${ACCENT}` : '2px solid transparent',
                }}>
                <span className="flex items-center gap-2"><User size={12}/> Profil &amp; Verifikasi</span>
              </button>
              <button onClick={() => setModalTab('fisik')}
                disabled={!selectedAtlet.tes_fisik}
                className="px-5 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: modalTab==='fisik' ? 'rgba(16,185,129,0.12)' : 'transparent',
                  color:      modalTab==='fisik' ? '#34d399' : 'rgba(255,255,255,0.35)',
                  borderBottom: modalTab==='fisik' ? '2px solid #34d399' : '2px solid transparent',
                }}>
                <span className="flex items-center gap-2">
                  <Activity size={12}/> Tes Fisik {!selectedAtlet.tes_fisik && <span className="text-[9px] font-normal">(Belum Ada)</span>}
                </span>
              </button>
            </div>

            {/* ── Scrollable Content ── */}
            <div className="flex-1 overflow-y-auto px-7 py-5"
              style={{scrollbarWidth:'thin', scrollbarColor:`${ACCENT}25 transparent`}}>

              {/* ══ TAB: TES FISIK ══ */}
              {modalTab === 'fisik' && selectedAtlet.tes_fisik && (() => {
                const tf      = selectedAtlet.tes_fisik
                const items   = tf.items || []
                const radarData = items.map(i => ({ komponen:i.komponen, capaian:i.capaian_persen, fullMark:100 }))
                const sorted    = [...items].sort((a,b) => a.capaian_persen - b.capaian_persen)
                const weakest   = sorted.filter(i => i.capaian_persen < 100).slice(0, 3)
                const strongest = [...sorted].reverse().slice(0, 3)
                const kColor    = KATEGORI_COLOR[tf.kesimpulan_kategori || ''] || '#0ea5e9'

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Left col */}
                    <div className="space-y-4">
                      {/* Skor summary */}
                      <div className="rounded-2xl p-6 relative overflow-hidden"
                        style={{background:`${kColor}10`, border:`1px solid ${kColor}30`}}>
                        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-15" style={{background:kColor}}/>
                        <div className="relative flex items-center justify-between">
                          <div>
                            <div className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{color:kColor}}>Skor Overall</div>
                            <div className="text-6xl font-black leading-none" style={{color:kColor}}>
                              {tf.kesimpulan_persen}<span className="text-2xl">%</span>
                            </div>
                            <div className="text-sm font-bold mt-2" style={{color:kColor}}>{tf.kesimpulan_kategori}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase text-zinc-500 mb-1">BMI</div>
                            <div className="text-3xl font-black text-white">{tf.bmi != null ? tf.bmi.toFixed(1) : '—'}</div>
                            <div className="text-[10px] text-zinc-500 mt-1">{tf.berat_badan}kg · {tf.tinggi_badan}cm</div>
                          </div>
                        </div>
                        <div className="mt-4 h-2 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{width:`${tf.kesimpulan_persen||0}%`, background:kColor}}/>
                        </div>
                      </div>

                      {/* Strengths & Weakness */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl p-4" style={{background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)'}}>
                          <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 mb-3">🏆 Terkuat</div>
                          {strongest.map((c,i) => (
                            <div key={i} className="flex justify-between text-[11px] mb-1.5">
                              <span className="text-zinc-300 truncate">{c.komponen}</span>
                              <span className="text-emerald-400 font-bold ml-2 shrink-0">{c.capaian_persen}%</span>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-xl p-4" style={{background:'rgba(249,115,22,0.06)', border:'1px solid rgba(249,115,22,0.15)'}}>
                          <div className="text-[10px] uppercase tracking-wider font-bold text-orange-400 mb-3">🎯 Perlu Latihan</div>
                          {weakest.length > 0 ? weakest.map((c,i) => (
                            <div key={i} className="flex justify-between text-[11px] mb-1.5">
                              <span className="text-zinc-300 truncate">{c.komponen}</span>
                              <span className="text-orange-400 font-bold ml-2 shrink-0">{c.capaian_persen}%</span>
                            </div>
                          )) : <div className="text-[11px] text-emerald-300 italic">🎉 Semua excellent!</div>}
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="text-[10px] text-zinc-600 font-mono text-center py-1">
                        Tahap 3 · {tf.matching_method} · {items.length} komponen tes
                      </div>
                    </div>

                    {/* Right col — radar */}
                    <div className="space-y-4">
                      {radarData.length > 2 && (
                        <div className="rounded-2xl p-5" style={{background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)'}}>
                          <div className="text-[10px] uppercase tracking-widest font-bold mb-4 flex items-center gap-2" style={{color:ACCENT}}>
                            <Target size={12}/> Profil Komponen Fisik
                          </div>
                          <ResponsiveContainer width="100%" height={280}>
                            <RadarChart data={radarData}>
                              <PolarGrid stroke="#1e293b"/>
                              <PolarAngleAxis dataKey="komponen" tick={{fill:'#94a3b8', fontSize:10}}/>
                              <PolarRadiusAxis angle={90} domain={[0,100]} tick={{fill:'#475569', fontSize:9}}/>
                              <Radar dataKey="capaian" stroke={kColor} fill={kColor} fillOpacity={0.35}/>
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* All items table */}
                      {items.length > 0 && (
                        <div className="rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.07)'}}>
                          <table className="w-full text-left">
                            <thead>
                              <tr className="text-[9px] uppercase tracking-widest"
                                style={{background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.3)'}}>
                                <th className="px-4 py-2.5 font-bold">Komponen</th>
                                <th className="px-4 py-2.5 font-bold text-right">Capaian</th>
                                <th className="px-4 py-2.5 font-bold text-right">Kategori</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...items].sort((a,b)=>a.capaian_persen - b.capaian_persen).map((it,i) => (
                                <tr key={i} className="border-t" style={{borderColor:'rgba(255,255,255,0.04)'}}>
                                  <td className="px-4 py-2 text-[11px] text-zinc-300">{it.komponen}</td>
                                  <td className="px-4 py-2 text-right">
                                    <span className="text-sm font-black tabular-nums"
                                      style={{color: it.capaian_persen >= 75 ? '#34d399' : it.capaian_persen >= 50 ? '#fbbf24' : '#f87171'}}>
                                      {it.capaian_persen}%
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-right text-[10px] text-zinc-500">{it.kategori}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* ══ TAB: PROFIL ══ */}
              {modalTab === 'profil' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                  {/* Left col — data atlet */}
                  <div className="space-y-4">

                    {/* Alert banners */}
                    {selectedAtlet.status_registrasi === 'Menunggu Admin' && (
                      <div className="p-4 rounded-xl flex gap-3 items-start"
                        style={{background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)'}}>
                        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5"/>
                        <div>
                          <div className="text-sm font-bold text-amber-400 mb-0.5">Menunggu Verifikasi</div>
                          <div className="text-xs text-amber-400/60">Pastikan NIK KTP dan dokumen fisik sesuai.</div>
                        </div>
                      </div>
                    )}
                    {selectedAtlet.catatan_verifikasi && (
                      <div className="p-4 rounded-xl flex gap-3 items-start"
                        style={{background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)'}}>
                        <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5"/>
                        <div>
                          <div className="text-sm font-bold text-rose-400 mb-0.5">Histori Penolakan</div>
                          <div className="text-xs text-rose-400/70 font-mono">"{selectedAtlet.catatan_verifikasi}"</div>
                        </div>
                      </div>
                    )}

                    {/* Identitas */}
                    <div className="rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.07)'}}>
                      <div className="px-4 py-2.5 text-[9px] uppercase tracking-widest font-bold flex items-center gap-2"
                        style={{background:'rgba(255,255,255,0.03)', color:'rgba(255,255,255,0.3)', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                        <User size={10}/> Identitas
                      </div>
                      <div className="divide-y divide-white/5">
                        {[
                          {l:'NIK / KTP',    v:selectedAtlet.no_ktp||'—'},
                          {l:'Tgl Lahir',    v:selectedAtlet.tgl_lahir ? `${selectedAtlet.tgl_lahir}  (${hitungUmur(selectedAtlet.tgl_lahir)} tahun)` : '—'},
                          {l:'Gender',       v:selectedAtlet.gender === 'L' ? 'Laki-laki (Putra)' : selectedAtlet.gender === 'P' ? 'Perempuan (Putri)' : '—'},
                          {l:'Asal Daerah',  v:selectedAtlet.nama_asal_daerah||'—', alert:isNonLokal(selectedAtlet.kode_asal_daerah)},
                          {l:'No Reg KONI',  v:selectedAtlet.no_registrasi_koni ? `#${selectedAtlet.no_registrasi_koni}` : '—'},
                        ].map(f => (
                          <div key={f.l} className="flex items-center px-4 py-3">
                            <span className="text-[10px] text-zinc-500 w-32 shrink-0">{f.l}</span>
                            <span className={`text-sm font-semibold ${'alert' in f && f.alert ? 'text-orange-400' : 'text-zinc-200'}`}>
                              {f.v}
                              {'alert' in f && f.alert && <span className="ml-2 text-[9px] bg-orange-500/15 text-orange-400 px-1.5 py-0.5 rounded font-bold">Non-Lokal</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Apparel + Bank */}
                    {(selectedAtlet.ukuran_kemeja || selectedAtlet.ukuran_sepatu || selectedAtlet.nama_bank || selectedAtlet.no_rekening) && (
                      <div className="rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.07)'}}>
                        <div className="px-4 py-2.5 text-[9px] uppercase tracking-widest font-bold flex items-center gap-2"
                          style={{background:'rgba(255,255,255,0.03)', color:'rgba(255,255,255,0.3)', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                          <Shirt size={10}/> Apparel &amp; Perbankan
                        </div>
                        <div className="divide-y divide-white/5">
                          {selectedAtlet.ukuran_kemeja && (
                            <div className="flex items-center px-4 py-3">
                              <span className="text-[10px] text-zinc-500 w-32 shrink-0">Ukuran Kemeja</span>
                              <span className="text-sm font-semibold text-zinc-200">{selectedAtlet.ukuran_kemeja}</span>
                            </div>
                          )}
                          {selectedAtlet.ukuran_sepatu && (
                            <div className="flex items-center px-4 py-3">
                              <span className="text-[10px] text-zinc-500 w-32 shrink-0">Ukuran Sepatu</span>
                              <span className="text-sm font-semibold text-zinc-200">{selectedAtlet.ukuran_sepatu}</span>
                            </div>
                          )}
                          {selectedAtlet.nama_bank && (
                            <div className="flex items-center px-4 py-3">
                              <span className="text-[10px] text-zinc-500 w-32 shrink-0">Bank</span>
                              <span className="text-sm font-semibold text-zinc-200">{selectedAtlet.nama_bank}</span>
                            </div>
                          )}
                          {selectedAtlet.no_rekening && (
                            <div className="flex items-center px-4 py-3">
                              <span className="text-[10px] text-zinc-500 w-32 shrink-0">No. Rekening</span>
                              <span className="text-sm font-semibold font-mono text-zinc-200">{selectedAtlet.no_rekening}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right col — status + aksi verifikasi */}
                  <div className="space-y-4">

                    {/* Status registrasi */}
                    <div className="rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.07)'}}>
                      <div className="px-4 py-2.5 text-[9px] uppercase tracking-widest font-bold flex items-center gap-2"
                        style={{background:'rgba(255,255,255,0.03)', color:'rgba(255,255,255,0.3)', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                        <Activity size={10}/> Status Registrasi
                      </div>
                      <div className="p-4">
                        {(()=>{
                          const st   = STATUS_CFG[selectedAtlet.status_registrasi] ?? STATUS_CFG['Draft']
                          const Icon = st.icon
                          return (
                            <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border ${st.bg} ${st.text} ${st.border}`}>
                              <Icon size={14}/> {selectedAtlet.status_registrasi}
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Aksi verifikasi */}
                    {selectedAtlet.status_registrasi !== 'Verified' && (
                      <div className="rounded-xl p-5 space-y-4" style={{background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.08)'}}>
                        <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Aksi Verifikasi</div>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2 block">
                            Catatan Penolakan <span className="normal-case font-normal">(opsional)</span>
                          </label>
                          <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                            placeholder="Misal: KTP buram, data tidak lengkap..."
                            disabled={isUpdating}
                            className="w-full rounded-xl p-3 text-sm text-zinc-300 resize-none h-24 disabled:opacity-50 outline-none"
                            style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)'}}
                            onFocus={e => e.target.style.borderColor='rgba(248,113,113,0.4)'}
                            onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => handleVerify(selectedAtlet.id, 'Ditolak Admin')}
                            disabled={isUpdating}
                            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                            style={{background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.25)', color:'#f87171'}}>
                            {isUpdating ? '...' : '✗ Tolak'}
                          </button>
                          <button onClick={() => handleVerify(selectedAtlet.id, 'Verified')}
                            disabled={isUpdating}
                            className="flex-[2] py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            style={{background:'rgba(56,189,248,0.15)', border:`1px solid ${ACCENT}40`, color:ACCENT}}>
                            {isUpdating ? <Loader2 className="animate-spin" size={16}/> : <FileCheck size={16}/>}
                            {isUpdating ? 'Memproses...' : '✓ Approve Valid'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Tes fisik ringkas — quick view */}
                    {selectedAtlet.tes_fisik_rating && (
                      <div className="rounded-xl p-4 space-y-2" style={{background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)'}}>
                        <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3">Ringkasan Tes Fisik</div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-400">Rating</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${RATING_COLOR[selectedAtlet.tes_fisik_rating]?.bg||''} ${RATING_COLOR[selectedAtlet.tes_fisik_rating]?.text||''} ${RATING_COLOR[selectedAtlet.tes_fisik_rating]?.border||''}`}>
                            {selectedAtlet.tes_fisik_rating}
                          </span>
                        </div>
                        {selectedAtlet.tes_fisik_persen != null && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400">Skor</span>
                            <span className="text-sm font-black text-white">{selectedAtlet.tes_fisik_persen}%</span>
                          </div>
                        )}
                        {selectedAtlet.tes_fisik_kategori && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400">Kategori</span>
                            <span className="text-xs font-semibold text-zinc-300">{selectedAtlet.tes_fisik_kategori}</span>
                          </div>
                        )}
                        <button onClick={() => setModalTab('fisik')}
                          disabled={!selectedAtlet.tes_fisik}
                          className="w-full mt-2 py-2 rounded-lg text-[11px] font-bold transition-all hover:opacity-80 disabled:opacity-30"
                          style={{background:'rgba(16,185,129,0.1)', color:'#34d399', border:'1px solid rgba(16,185,129,0.25)'}}>
                          Lihat Detail Tes Fisik →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer hint ── */}
            <div className="px-7 py-3 shrink-0 text-center text-[10px] text-zinc-700"
              style={{borderTop:'1px solid rgba(255,255,255,0.05)'}}>
              Klik di luar modal untuk menutup
            </div>
          </div>
        </div>
      )}

      {/* ── EXPORT MODAL — di luar semua div ── */}
      {showExport && (
        <ExportModal
          data={data}
          onClose={()=>setShowExport(false)}
          kontingen="Kabupaten Bandung"
          kodeWilayahPrefix="3204"
          primaryColor="#38bdf8"
        />
      )}
    </div>
  )
}