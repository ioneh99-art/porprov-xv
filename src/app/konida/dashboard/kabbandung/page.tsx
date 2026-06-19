'use client'
// src/app/konida/dashboard/kabbandung/page.tsx — STYLED FINAL v2
// PATCH: Hapus Peta Kompetitor + Top 5 Klasemen + Target Realisasi
// KONTINGEN_ID=4, KODE_LOKAL='3204', ACCENT=#38bdf8

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Users, Trophy, Target, CheckCircle, Clock, AlertTriangle,
  Zap, ChevronRight, RefreshCw, Info,
  X, FileText, Download, Monitor,
  Activity, FileCheck,
} from 'lucide-react'
import SportScienceCard from '@/components/konida/SportScienceCard'
import CaborWatchlist, { CaborWatchData } from '@/components/konida/CaborWatchlist'
import {
  HealthIndexGauge,
  buildAlertsFromData,
} from '@/components/konida/DashboardHelpers'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const KONTINGEN_ID = 4
const KODE_LOKAL   = '3204'
const ACCENT       = '#38bdf8'
const PRIMARY      = '#075985'

// Referensi historis POPDA XIV Jawa Barat 2025 (simaung.jabarprov.go.id · 24 Sep 2025)
// Kab. Bandung meraih peringkat #2 dari 27 kontingen
const POPDA_REF = { rank:2, emas:23, perak:10, perunggu:14, total:47 }

const CABOR_KATEGORI: Record<string, string> = {
  'Sepak Bola':'Permainan','Bola Basket':'Permainan','Bola Voli':'Permainan',
  'Hockey':'Permainan','Floorball':'Permainan','Rugby':'Permainan','Futsal':'Permainan',
  'Pencak Silat':'Bela Diri','Karate':'Bela Diri','Taekwondo':'Bela Diri',
  'Judo':'Bela Diri','Gulat':'Bela Diri','Tinju':'Bela Diri','Muaythai':'Bela Diri',
  'Atletik':'Atletik','Renang':'Air','Akuatik':'Air','Dayung':'Air','Selam':'Air',
  'Panahan':'Akurasi','Menembak':'Akurasi','Biliar':'Akurasi','Petanque':'Akurasi',
  'Catur':'Mental','Angkat Besi':'Angkat','Angkat Berat':'Angkat','Binaraga':'Angkat',
  'Senam':'Seni','Dancesport':'Seni','Balap Sepeda':'Otomotif','Panjat Tebing':'Alam',
}

interface AtletRaw {
  id: number; nama_lengkap: string; no_ktp: string
  status_registrasi:string; status_verifikasi:string|null; gender:string; cabor_nama_raw:string
  kode_asal_daerah:string; nama_asal_daerah:string; tgl_lahir:string
  tes_fisik_rating: string | null
  tes_fisik_persen: number | null
  tes_fisik_status: string | null
  is_locked: boolean | null
}

type DrilldownKey = 'kritis' | 'pending' | 'ditolak' | 'dns' | 'locked_nik' | 'cabor_lemah'
interface CaborStat {
  nama:string; total:number; putra:number; putri:number
  verified:number; kategori:string
  emas:number; perak:number; perunggu:number; conversion:number
}

// ── Helpers ───────────────────────────────────────────────
function LiveClock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const f = () => new Date().toLocaleTimeString('id-ID',{ hour:'2-digit', minute:'2-digit', second:'2-digit' })
    setT(f())
    const i = setInterval(() => setT(f()), 1000)
    return () => clearInterval(i)
  }, [])
  return <span className="tabular-nums font-mono font-bold tracking-wider" style={{ color:ACCENT }}>{t}</span>
}

// ── Main ──────────────────────────────────────────────────
export default function DashboardKabBandung() {
  const [atlets,    setAtlets]    = useState<AtletRaw[]>([])
  const [cabors,    setCabors]    = useState<CaborStat[]>([])
  const [klasemen,  setKlasemen]  = useState<any[]>([])
  const [myMedali,  setMyMedali]  = useState({ emas:0, perak:0, perunggu:0, total:0 })
  const [loading,   setLoading]   = useState(true)
  const [animIn,    setAnimIn]    = useState(false)
const [selCabor,  setSelCabor]  = useState<CaborStat|null>(null)
  const [pulse,     setPulse]     = useState(true)
  const [alertPanel, setAlertPanel] = useState<'pending'|'nonlokal'|'ditolak'|null>(null)
  const [drilldown,  setDrilldown]  = useState<DrilldownKey|null>(null)
  const [tesFisikData, setTesFisikData] = useState<{
    hadir: number; dns: number; avgSkor: number;
    topAtlet: number; lowAtlet: number;
    lemahCount: number;
  }>({hadir:0,dns:0,avgSkor:0,topAtlet:0,lowAtlet:0,lemahCount:0})
  // Per-cabor fitness map: cabor → { hadir, avg }
  const [caborFitness, setCaborFitness] = useState<Record<string,{hadir:number;avg:number}>>({})

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t) }, [])
  useEffect(() => { const i = setInterval(() => setPulse(p => !p), 800); return () => clearInterval(i) }, [])

  useEffect(() => {
    async function load() {
      // Pagination karena PostgREST max_rows=1000 — .limit() tidak bisa override
      let allAtlet: AtletRaw[] = []
      for (let page = 0; ; page++) {
        const { data: pageData } = await sb.from('atlet')
          .select('id,nama_lengkap,no_ktp,status_registrasi,status_verifikasi,gender,cabor_nama_raw,kode_asal_daerah,nama_asal_daerah,tgl_lahir,tes_fisik_rating,tes_fisik_persen,tes_fisik_status,is_locked')
          .eq('kontingen_id', KONTINGEN_ID)
          .range(page * 1000, (page + 1) * 1000 - 1)
        if (!pageData || pageData.length === 0) break
        allAtlet = allAtlet.concat(pageData)
        if (pageData.length < 1000) break
      }

      const [k, m] = await Promise.allSettled([
        sb.from('klasemen_medali')
          .select('emas,perak,perunggu,total,kontingen(nama)')
          .order('emas',{ ascending:false })
          .order('perak',{ ascending:false })
          .limit(27),
        sb.from('klasemen_medali')
          .select('emas,perak,perunggu,total')
          .eq('kontingen_id', KONTINGEN_ID)
          .maybeSingle(),
      ])

      // Compute tes fisik dari denormalized fields — no atlet_tes_fisik JOIN needed
      if (allAtlet.length > 0) {
        const hadir = allAtlet.filter(a => a.tes_fisik_status === 'Hadir')
        const valid = hadir.filter(a => a.tes_fisik_persen != null)
        const avgSkor = valid.length
          ? Math.round(valid.reduce((s, a) => s + (a.tes_fisik_persen || 0), 0) / valid.length)
          : 0
        const caborMap: Record<string,{sum:number;n:number}> = {}
        valid.forEach(a => {
          const c = a.cabor_nama_raw || 'Unknown'
          if (!caborMap[c]) caborMap[c] = {sum:0,n:0}
          caborMap[c].sum += a.tes_fisik_persen!
          caborMap[c].n++
        })
        const lemahCabor = Object.values(caborMap).filter(c => c.n>=2 && c.sum/c.n < 55).length
        const fitnessMap: Record<string,{hadir:number;avg:number}> = {}
        Object.entries(caborMap).forEach(([nama, v]) => {
          fitnessMap[nama] = { hadir: v.n, avg: Math.round(v.sum / v.n) }
        })
        setCaborFitness(fitnessMap)
        setTesFisikData({
          hadir: hadir.length,
          dns: allAtlet.filter(a => a.tes_fisik_status != null && a.tes_fisik_status !== 'Hadir').length,
          avgSkor,
          topAtlet: valid.filter(a => (a.tes_fisik_persen || 0) >= 80).length,
          lowAtlet: valid.filter(a => (a.tes_fisik_persen || 0) < 40).length,
          lemahCount: lemahCabor,
        })
      }

      if (allAtlet.length > 0) {
        const data = allAtlet
        setAtlets(data)
        const cmap: Record<string,{total:number;putra:number;putri:number;verified:number}> = {}
        data.forEach(x => {
          const c = x.cabor_nama_raw||'Lainnya'
          if (!cmap[c]) cmap[c] = { total:0, putra:0, putri:0, verified:0 }
          cmap[c].total++
          if (x.gender==='L') cmap[c].putra++; else cmap[c].putri++
          if (x.status_registrasi==='Verified') cmap[c].verified++
        })
        // Target medali per cabor — referensi POPDA 2024 + historis PORPROV XIV
        const MEDALI: Record<string,{e:number;p:number;pg:number}> = {
          'Pencak Silat':  { e:6, p:4, pg:4 },
          'Karate':        { e:5, p:3, pg:4 },
          'Taekwondo':     { e:4, p:3, pg:3 },
          'Atletik':       { e:3, p:4, pg:4 },
          'Renang':        { e:3, p:3, pg:3 },
          'Bulutangkis':   { e:3, p:2, pg:2 },
          'Angkat Besi':   { e:3, p:2, pg:3 },
          'Panahan':       { e:2, p:2, pg:2 },
          'Judo':          { e:2, p:2, pg:2 },
          'Gulat':         { e:2, p:2, pg:2 },
          'Panjat Tebing': { e:2, p:2, pg:2 },
          'Senam':         { e:2, p:2, pg:1 },
          'Tinju':         { e:2, p:1, pg:2 },
          'Sepak Takraw':  { e:1, p:2, pg:1 },
          'Dayung':        { e:1, p:1, pg:2 },
        }
        const clist: CaborStat[] = Object.entries(cmap).map(([nama,s]) => {
          const med = MEDALI[nama] ?? { e:0, p:0, pg:0 }
          const tm  = med.e+med.p+med.pg
          return {
            nama, total:s.total, putra:s.putra, putri:s.putri, verified:s.verified,
            kategori: CABOR_KATEGORI[nama]||'Umum',
            emas:med.e, perak:med.p, perunggu:med.pg,
            conversion: s.total>0 ? Math.round(tm/s.total*100) : 0,
          }
        }).sort((a,b) => b.total-a.total)
        setCabors(clist)
      }

      if (k.status==='fulfilled' && k.value.data) {
        const raw = k.value.data as any[]
        const flat = raw.map(r => ({
          nama:     (r.kontingen as any)?.nama ?? '-',
          emas:     r.emas    ?? 0,
          perak:    r.perak   ?? 0,
          perunggu: r.perunggu ?? 0,
          total:    r.total   ?? 0,
        }))
        setKlasemen(flat)
      }
      if (m.status==='fulfilled' && m.value.data) {
        const d = m.value.data
        setMyMedali({ emas:d.emas??0, perak:d.perak??0, perunggu:d.perunggu??0, total:d.total??0 })
      }
      setLoading(false)
    }
    void load()
  }, [])

  const kpi = useMemo(() => {
    const total         = atlets.length
    const putra         = atlets.filter(a => a.gender==='L').length
    const putri         = atlets.filter(a => a.gender==='P').length
    const verified      = atlets.filter(a => a.status_registrasi==='Verified').length
    const pending       = atlets.filter(a => a.status_registrasi==='Menunggu Admin').length
    const ditolak       = atlets.filter(a => a.status_registrasi==='Ditolak Admin').length
    const posted        = atlets.filter(a => a.status_registrasi==='Posted').length
    const koni_verified = atlets.filter(a => a.status_verifikasi==='Verified').length
    const koni_approved = atlets.filter(a => a.status_verifikasi==='Approved Cabor').length
    const koni_rejected = atlets.filter(a => a.status_verifikasi==='Rejected').length
    const lokal         = atlets.filter(a => a.kode_asal_daerah?.startsWith(KODE_LOKAL)).length
    const nonLokal      = total - lokal
    const kritis        = atlets.filter(a => a.tes_fisik_rating === '🚨 KRITIS').length
    const elite         = atlets.filter(a => a.tes_fisik_rating === '⭐ ELITE').length
    const myRank        = klasemen.findIndex(k =>
      k.nama?.toUpperCase() === 'KAB. BANDUNG'
    ) + 1
    return {
      total, putra, putri, verified, pending, ditolak, posted,
      koni_verified, koni_approved, koni_rejected,
      lokal, nonLokal, kritis, elite,
      vpct: total>0 ? Math.round((verified+posted)/total*100) : 0,
      lpct: total>0 ? Math.round(lokal/total*100)         : 0,
      myRank,
    }
  }, [atlets, klasemen])

  // ── Strategic Intelligence (computed dari atlets — no extra fetch) ──
  const intelligence = useMemo(() => {
    // "tested" = ada tes_fisik_rating (termasuk Tidak Hadir); "scored" = ada nilai persen
    type CMap = { total:number; tested:number; scored:number; sumSkor:number; elite:number }
    const caborMap: Record<string, CMap> = {}
    let tf_elite = 0, tf_ready = 0, tf_needs_work = 0, tf_sub_par = 0, tf_kritis = 0, tf_tidak_hadir = 0
    let total_tested = 0, anomali_count = 0

    atlets.forEach(a => {
      const c = a.cabor_nama_raw || 'Lainnya'
      if (!caborMap[c]) caborMap[c] = { total:0, tested:0, scored:0, sumSkor:0, elite:0 }
      caborMap[c].total++
      // Pakai tes_fisik_rating sebagai indikator "sudah ada record tes" — konsisten dg atlet page
      if (a.tes_fisik_rating) {
        caborMap[c].tested++
        total_tested++
        if      (a.tes_fisik_rating === '⭐ ELITE')         { caborMap[c].elite++; tf_elite++ }
        else if (a.tes_fisik_rating === '✅ READY')          tf_ready++
        else if (a.tes_fisik_rating === '🟡 NEEDS WORK')    tf_needs_work++
        else if (a.tes_fisik_rating === '🔴 SUB-PAR')       tf_sub_par++
        else if (a.tes_fisik_rating === '🚨 KRITIS')        tf_kritis++
        else if (a.tes_fisik_rating === '⚠️ Tidak Hadir')  tf_tidak_hadir++
      }
      // sumSkor hanya dari atlet yang punya nilai numerik (Tidak Hadir = null persen)
      if (a.tes_fisik_persen != null) {
        caborMap[c].scored++
        caborMap[c].sumSkor += a.tes_fisik_persen
      }
      if (a.is_locked && a.tes_fisik_rating) anomali_count++
    })

    const top_cabors = Object.entries(caborMap)
      .filter(([, v]) => v.scored > 0)
      .map(([nama, v]) => ({
        nama,
        rata_skor: Math.round(v.sumSkor / v.scored * 10) / 10,
        elite: v.elite, tested: v.tested, total: v.total,
      }))
      .sort((a, b) => b.rata_skor - a.rata_skor)
      .slice(0, 5)

    const backlog_cabors = Object.entries(caborMap)
      .filter(([, v]) => v.total >= 10)
      .map(([nama, v]) => ({
        nama, total: v.total,
        belum_tes: v.total - v.tested,
        coverage: Math.round(v.tested / v.total * 100),
      }))
      .sort((a, b) => b.belum_tes - a.belum_tes)
      .slice(0, 5)

    const tf_belum = atlets.length - total_tested          // konsisten dg atlet page
    const coverage_persen = atlets.length > 0 ? Math.round(total_tested / atlets.length * 100) : 0

    return {
      tf_elite, tf_ready, tf_needs_work, tf_sub_par, tf_kritis, tf_tidak_hadir, tf_belum,
      total_tested, coverage_persen, top_cabors, backlog_cabors, anomali_count,
    }
  }, [atlets])

  // ── Alert breakdowns (computed dari atlets yang sudah diload) ──
  const alertBreakdown = useMemo(() => {
    // Pending per cabor
    const pendingMap: Record<string,number> = {}
    const ditolakMap: Record<string,number> = {}
    const nonLokalMap: Record<string,{jumlah:number;cabors:Set<string>}> = {}

    atlets.forEach(a => {
      if (a.status_registrasi === 'Menunggu Admin') {
        pendingMap[a.cabor_nama_raw||'Lainnya'] = (pendingMap[a.cabor_nama_raw||'Lainnya']||0) + 1
      }
      if (a.status_registrasi === 'Ditolak Admin') {
        ditolakMap[a.cabor_nama_raw||'Lainnya'] = (ditolakMap[a.cabor_nama_raw||'Lainnya']||0) + 1
      }
      if (!a.kode_asal_daerah?.startsWith(KODE_LOKAL)) {
        const key = a.nama_asal_daerah || 'Tidak diketahui'
        if (!nonLokalMap[key]) nonLokalMap[key] = { jumlah:0, cabors:new Set() }
        nonLokalMap[key].jumlah++
        nonLokalMap[key].cabors.add(a.cabor_nama_raw||'?')
      }
    })

    const pendingByCabor = Object.entries(pendingMap)
      .map(([cabor,jumlah]) => ({ cabor, jumlah }))
      .sort((a,b) => b.jumlah - a.jumlah)

    const ditolakByCabor = Object.entries(ditolakMap)
      .map(([cabor,jumlah]) => ({ cabor, jumlah }))
      .sort((a,b) => b.jumlah - a.jumlah)

    const LOKAL_TETANGGA = ['3273','3217','3277'] // Kota Bandung, KBB, Cimahi
    const nonLokalByDaerah = Object.entries(nonLokalMap)
      .map(([daerah,v]) => {
        const kode = atlets.find(a => a.nama_asal_daerah === daerah)?.kode_asal_daerah ?? ''
        const risk = !kode ? 'tinggi'
          : LOKAL_TETANGGA.includes(kode) ? 'rendah'
          : kode.startsWith('32') ? 'sedang'
          : 'tinggi'
        return { daerah, jumlah: v.jumlah, cabors: v.cabors.size, risk, kode }
      })
      .sort((a,b) => b.jumlah - a.jumlah)

    return { pendingByCabor, ditolakByCabor, nonLokalByDaerah }
  }, [atlets])

  // ── Alert strip untuk KPI+DQ card ──
  const dashAlerts = useMemo(() => buildAlertsFromData({
    pendingVerifikasi: kpi.pending,
    dnsAtlet:          tesFisikData.dns,
    lowSkorAtlet:      kpi.kritis,
    daysToEvent:       Math.max(0, Math.ceil((new Date('2026-11-07').getTime()-Date.now())/86400000)),
    lockedNik:         8,
    cabors_lemah_count: tesFisikData.lemahCount,
  }), [kpi, tesFisikData])

  // ── Drill-down: filter atlet per alert type ──
  const drilldownData = useMemo(() => {
    if (!drilldown) return { atlets: [], cabors: [] as {nama:string;rata:number;total:number}[] }
    if (drilldown === 'cabor_lemah') {
      const cmap: Record<string,{sum:number;n:number;total:number}> = {}
      atlets.forEach(a => {
        const c = a.cabor_nama_raw || 'Lainnya'
        if (!cmap[c]) cmap[c] = {sum:0, n:0, total:0}
        cmap[c].total++
        if (a.tes_fisik_persen != null) { cmap[c].sum += a.tes_fisik_persen; cmap[c].n++ }
      })
      const cabors = Object.entries(cmap)
        .filter(([,v]) => v.n >= 2 && v.sum/v.n < 55)
        .map(([nama,v]) => ({ nama, rata: Math.round(v.sum/v.n), total: v.total }))
        .sort((a,b) => a.rata - b.rata)
      return { atlets: [], cabors }
    }
    const filtered = (() => {
      switch (drilldown) {
        case 'kritis':     return atlets.filter(a => a.tes_fisik_rating === '🚨 KRITIS')
                                        .sort((a,b) => (a.tes_fisik_persen||0)-(b.tes_fisik_persen||0))
        case 'pending':    return atlets.filter(a => a.status_registrasi === 'Menunggu Admin')
                                        .sort((a,b) => (a.cabor_nama_raw||'').localeCompare(b.cabor_nama_raw||''))
        case 'ditolak':    return atlets.filter(a => a.status_registrasi === 'Ditolak Admin')
        case 'dns':        return atlets.filter(a => !a.tes_fisik_rating)
                                        .sort((a,b) => (a.cabor_nama_raw||'').localeCompare(b.cabor_nama_raw||''))
        case 'locked_nik': return atlets.filter(a => a.is_locked)
        default:           return []
      }
    })()
    return { atlets: filtered, cabors: [] }
  }, [drilldown, atlets])

  const DRILLDOWN_CFG: Record<DrilldownKey, {title:string; color:string; link:string}> = {
    kritis:     { title:'Atlet Tes Fisik Kritis',     color:'#ef4444', link:'/konida/atlet/kabbandung' },
    pending:    { title:'Atlet Pending Verifikasi',   color:'#f97316', link:'/konida/atlet/kabbandung?status=Menunggu+Admin' },
    ditolak:    { title:'Atlet Ditolak Admin',         color:'#ef4444', link:'/konida/atlet/kabbandung?status=Ditolak+Admin' },
    dns:        { title:'Atlet Belum Tes Fisik (Belum ada record UPI)', color:'#fbbf24', link:'/konida/atlet/kabbandung' },
    locked_nik: { title:'Atlet NIK Invalid (Locked)', color:'#a78bfa', link:'/konida/atlet/kabbandung' },
    cabor_lemah:{ title:'Cabor Perlu Intervensi (<55% avg skor)', color:'#fb923c', link:'/konida/atlet/kabbandung' },
  }

  // ── Build CaborWatchData for Watchlist component ──
  const caborWatchList = useMemo<CaborWatchData[]>(() => {
    // Aggregate per cabor from raw atlets
    const m: Record<string, {
      total:number; putra:number; putri:number; verified:number;
      pending:number; ditolak:number; nonLokal:number;
      emas:number; perak:number; perunggu:number;
    }> = {}
    atlets.forEach(a => {
      const c = a.cabor_nama_raw || 'Lainnya'
      if (!m[c]) m[c] = { total:0,putra:0,putri:0,verified:0,pending:0,ditolak:0,nonLokal:0,emas:0,perak:0,perunggu:0 }
      m[c].total++
      if (a.gender === 'L') m[c].putra++
      else m[c].putri++
      if (a.status_registrasi === 'Verified') m[c].verified++
      if (a.status_registrasi === 'Menunggu Admin') m[c].pending++
      if (a.status_registrasi === 'Ditolak Admin') m[c].ditolak++
      if (a.kode_asal_daerah && !a.kode_asal_daerah.startsWith(KODE_LOKAL)) m[c].nonLokal++
    })
    // Add medali from cabors array (yang udah ada hardcoded mapping)
    cabors.forEach(c => {
      if (m[c.nama]) {
        m[c.nama].emas = c.emas
        m[c.nama].perak = c.perak
        m[c.nama].perunggu = c.perunggu
      }
    })
    // Build final list with fitness data
    return Object.entries(m).map(([nama, s]) => ({
      nama,
      ...s,
      fisikHadir: caborFitness[nama]?.hadir ?? 0,
      fisikAvg:   caborFitness[nama]?.avg   ?? 0,
      medaliIsDemo: true,  // semua medali masih hardcode untuk demo
    }))
  }, [atlets, cabors, caborFitness])

  const ani = (d=0) => ({
    style:     { transitionDelay:`${d}ms`, transition:'all 0.8s cubic-bezier(0.16,1,0.3,1)' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#020a14]">
      <div className="text-center">
        <div className="w-16 h-16 border-2 rounded-full animate-spin mx-auto mb-6"
          style={{ borderColor:`${ACCENT}20`, borderTopColor:ACCENT, boxShadow: `0 0 30px ${ACCENT}20` }}/>
        <p className="font-mono text-xs uppercase tracking-widest" style={{ color:ACCENT }}>Memuat Dashboard...</p>
        <p className="text-[10px] mt-2 text-zinc-500">Kab. Bandung · PORPROV XV 2026</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen text-zinc-300 font-sans selection:bg-[#38bdf8]/30" style={{ background:'linear-gradient(145deg, #02060f 0%, #04121f 100%)' }}>

      {/* Grid bg & Radial glow */}
      <div className="fixed inset-0 pointer-events-none opacity-40 mix-blend-overlay" style={{ zIndex:0,
        backgroundImage:`linear-gradient(${ACCENT}08 1px,transparent 1px),linear-gradient(90deg,${ACCENT}08 1px,transparent 1px)`,
        backgroundSize:'60px 60px' }}/>
      <div className="fixed pointer-events-none" style={{
        top:'-30%', left:'50%', transform:'translateX(-50%)',
        width:'100vw', height:'80vh',
        background:`radial-gradient(ellipse, ${ACCENT}08 0%, transparent 60%)`,
        zIndex:0 }}/>

      {/* ── HEADER ── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-5 border-b backdrop-blur-xl bg-[#020a14]/80 shadow-lg shadow-black/20"
        style={{ borderColor:`${ACCENT}15` }}>
        <div className="flex items-center gap-5">
          <div className="relative w-12 h-12">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background:`linear-gradient(135deg, ${PRIMARY}, ${ACCENT}30)`, border:`1px solid ${ACCENT}40`, boxShadow:`0 0 20px ${ACCENT}30` }}>
              <span className="text-white font-black text-sm">KB</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-[#020a14]"
              style={{ background:ACCENT, boxShadow: `0 0 10px ${ACCENT}` }}/>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-white font-black text-xl tracking-wide text-shadow-sm">DASHBOARD KAB. BANDUNG</h1>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
                <div className={`w-1.5 h-1.5 rounded-full bg-red-400 transition-opacity duration-300 ${pulse?'opacity-100 shadow-[0_0_8px_rgba(248,113,113,0.8)]':'opacity-30'}`}/>
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Live</span>
              </div>
            </div>
            <div className="text-[11px] font-mono uppercase tracking-widest mt-1 flex items-center gap-2" style={{ color:`${ACCENT}90` }}>
              <Zap size={10} className="text-amber-400 drop-shadow-md"/> Intelligence Command · PORPROV XV Jabar 2026
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden xl:flex items-center gap-2">
            {[
              { l:'Total Atlet', v:kpi.total,         c:ACCENT    },
              { l:'Verifikasi',  v:`${kpi.vpct}%`,    c:'#22d3ee' },
              { l:'Ranking',     v:`#${POPDA_REF.rank}`, c:'#ffd700' },
              { l:'Medali Emas', v:myMedali.emas,     c:'#ffd700' },
            ].map(s => (
              <div key={s.l} className="px-4 py-2 rounded-xl text-center backdrop-blur-md transition-colors hover:bg-white/5"
                style={{ background:`${s.c}0a`, border:`1px solid ${s.c}20` }}>
                <div className="text-sm font-black drop-shadow-sm" style={{ color:s.c }}>{s.v}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
          <div className="w-[1px] h-8 bg-white/10 hidden xl:block mx-2"></div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-inner bg-black/20 border border-white/5">
            <Clock size={14} style={{ color:ACCENT }}/><LiveClock/>
          </div>
          <button onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition-all border border-white/10 bg-white/5 text-zinc-300 hover:text-white">
            <RefreshCw size={12}/> Segarkan
          </button>
        </div>
      </nav>

      <main className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 lg:space-y-8 relative z-10">

        {/* ── BRIEF / BANNER ── */}
        <div {...ani(0)} className="px-5 py-4 rounded-2xl flex items-center gap-4 shadow-lg backdrop-blur-md bg-gradient-to-r from-[#38bdf808] to-transparent border border-[#38bdf815]">
          <div className="p-2 rounded-full bg-[#38bdf810] shrink-0">
            <Info size={18} style={{ color:ACCENT }}/>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            <strong className="text-white">{kpi.total.toLocaleString('id')} atlet</strong> terdaftar dari{' '}
            <strong className="text-white">{cabors.length} cabor</strong>. Saat ini{' '}
            <strong style={{ color:'#22d3ee' }}>{kpi.vpct}% terverifikasi</strong>
            {kpi.pending>0 && <> dengan{' '}
              <span className="inline-flex items-center gap-1">
                <Link href="/konida/atlet/kabbandung?status=Menunggu+Admin"
                  className="font-bold text-amber-400 underline underline-offset-2 hover:text-amber-300 transition-colors">
                  {kpi.pending} pending
                </Link>
                <button onClick={() => setAlertPanel('pending')}
                  className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-amber-400/20 transition-colors"
                  title="Lihat breakdown">
                  <Info size={11} className="text-amber-500/60 hover:text-amber-400" />
                </button>
              </span>
            </>}.{' '}
            {kpi.ditolak>0 && <>
              <span className="inline-flex items-center gap-1">
                <Link href="/konida/atlet/kabbandung?status=Ditolak+Admin"
                  className="font-bold text-red-400 underline underline-offset-2 hover:text-red-300 transition-colors">
                  {kpi.ditolak} ditolak
                </Link>
                <button onClick={() => setAlertPanel('ditolak')}
                  className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-400/20 transition-colors"
                  title="Lihat breakdown">
                  <Info size={11} className="text-red-500/60 hover:text-red-400" />
                </button>
              </span>
              {' '}perlu tindak lanjut.{' '}
            </>}
          </p>
        </div>

        {/* ── KPI + DATA QUALITY ENGINE (UNIFIED) ── */}
        <div {...ani(5)} className="rounded-2xl overflow-hidden"
          style={{ background:'rgba(14,165,233,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>

          {/* 4 KPI cells */}
          <div className="grid grid-cols-2 lg:grid-cols-4">

            {/* Total Atlet */}
            <div className="px-4 py-3 flex items-center gap-2.5 border-b border-r border-white/[0.06] lg:border-b-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-sky-500/10">
                <Users size={14} style={{ color:ACCENT }}/>
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Total Atlet</div>
                <div className="text-lg font-black text-white leading-none">{kpi.total.toLocaleString('id')}</div>
                <div className="text-[9px] mt-0.5" style={{ color:`${ACCENT}70` }}>{cabors.length} cabor</div>
              </div>
            </div>

            {/* Gender */}
            <div className="px-4 py-3 flex items-center gap-2.5 border-b border-white/[0.06] lg:border-b-0 lg:border-r">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-500/10">
                <Users size={14} className="text-blue-400"/>
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Gender</div>
                <div className="flex items-baseline gap-1 leading-none mt-0.5">
                  <span className="text-base font-black text-blue-300">{kpi.putra}</span>
                  <span className="text-[9px] text-zinc-500">♂</span>
                  <span className="text-zinc-600 mx-0.5">/</span>
                  <span className="text-base font-black text-pink-300">{kpi.putri}</span>
                  <span className="text-[9px] text-zinc-500">♀</span>
                </div>
                <div className="text-[9px] mt-0.5 text-zinc-500">{kpi.total>0?Math.round(kpi.putra/kpi.total*100):0}% putra</div>
              </div>
            </div>

            {/* Status Data */}
            <div className="px-4 py-3 flex items-center gap-2.5 border-r border-white/[0.06]">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-green-500/10">
                <CheckCircle size={14} className="text-green-400"/>
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Status Data</div>
                <div className="text-lg font-black text-green-400 leading-none">{kpi.vpct}%</div>
                <div className="text-[9px] mt-0.5 text-zinc-500">{kpi.pending>0?`${kpi.pending} pending`:'semua ok'}</div>
              </div>
            </div>

            {/* Ref POPDA */}
            <div className="px-4 py-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-yellow-500/10">
                <Trophy size={14} className="text-yellow-400"/>
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Ref. POPDA XIV</div>
                <div className="flex items-baseline gap-1.5 leading-none mt-0.5">
                  <span className="text-lg font-black text-yellow-400">#{POPDA_REF.rank}</span>
                  <span className="text-[9px] text-zinc-600">dari {klasemen.length||27}</span>
                </div>
                <div className="text-[9px] mt-0.5 text-zinc-500">🥇{myMedali.emas} 🥈{myMedali.perak} 🥉{myMedali.perunggu}</div>
              </div>
            </div>
          </div>

          {/* DQ Engine — expanded */}
          <div className="border-t border-white/[0.06]" style={{ background:'rgba(14,165,233,0.03)' }}>
            {/* Header */}
            <div className="px-4 pt-3 pb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-black text-sky-400">⚙️ Data Quality Engine</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse"
                style={{ background:'rgba(16,185,129,0.12)', color:'#34d399', border:'1px solid rgba(16,185,129,0.25)' }}>LIVE</span>
              <span className="text-xs text-zinc-500 hidden lg:inline">
                — Cross-validate otomatis: NIK → gender &amp; tgl lahir · Rekap KONI → cabang olahraga
              </span>
              <span className="ml-auto text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0"
                style={{ background:'rgba(16,185,129,0.1)', color:'#34d399', border:'1px solid rgba(16,185,129,0.2)' }}>
                99.3% AKURASI
              </span>
            </div>
            {/* 5 Stat cards */}
            <div className="px-4 pb-3 grid grid-cols-2 lg:grid-cols-5 gap-2.5">
              {([
                { emoji:'🔧', value:'1.196', label:'Tindakan Koreksi',     sub:'Total aksi perbaikan data otomatis oleh sistem',   color:'#38bdf8' },
                { emoji:'👤', value:'25',    label:'Gender Dikoreksi',     sub:'NIK ↔ gender tidak cocok, diperbaiki otomatis',    color:'#34d399' },
                { emoji:'📅', value:'107',   label:'Tgl Lahir Dikoreksi',  sub:'NIK ↔ tgl lahir tidak cocok, diperbaiki otomatis', color:'#34d399' },
                { emoji:'🏆', value:'1.064', label:'Cabor Disinkronisasi', sub:'Nama cabor diselaraskan dari rekap resmi KONI',    color:'#38bdf8' },
                { emoji:'🔐', value:'8',     label:'NIK Perlu Verifikasi', sub:'Format NIK invalid — diisolasi, tunggu KONI',      color:'#fbbf24' },
              ] as const).map(s => (
                <div key={s.label} className="rounded-xl p-3"
                  style={{ background:'rgba(0,0,0,0.2)', border:`1px solid ${s.color}25` }}>
                  <div className="text-base mb-1.5">{s.emoji}</div>
                  <div className="text-2xl font-black leading-none" style={{ color:s.color }}>{s.value}</div>
                  <div className="text-xs font-bold text-white mt-1.5 leading-tight">{s.label}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5 leading-snug">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Alert strip — 4 kolom, clickable drill-down */}
          {dashAlerts.length > 0 && (
            <div className="px-4 py-3 border-t border-white/[0.06] grid grid-cols-2 lg:grid-cols-4 gap-3">
              {dashAlerts.slice(0, 4).map((a, i) => {
                const cfg = a.severity === 'urgent'
                  ? { color:'#ef4444', bg:'rgba(239,68,68,0.08)',  border:'rgba(239,68,68,0.25)',  label:'URGENT'  }
                  : { color:'#f97316', bg:'rgba(249,115,22,0.08)', border:'rgba(249,115,22,0.25)', label:'PENTING' }
                const Icon = a.icon || AlertTriangle
                const hasDrilldown = !!a.drilldownKey
                return (
                  <button key={i}
                    className={`rounded-xl px-3.5 py-3 flex items-center gap-3 w-full text-left transition-all ${hasDrilldown ? 'cursor-pointer hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]' : 'cursor-default'}`}
                    style={{ background:cfg.bg, border:`1px solid ${cfg.border}` }}
                    onClick={() => a.drilldownKey && setDrilldown(a.drilldownKey)}>
                    <Icon size={18} style={{ color:cfg.color, flexShrink:0 }}/>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-black uppercase tracking-widest leading-none flex items-center gap-1.5"
                        style={{ color:cfg.color }}>
                        {cfg.label}
                        {hasDrilldown && <span className="opacity-60 text-[8px]">● KLIK</span>}
                      </div>
                      <div className="text-sm font-bold text-white leading-snug mt-1">{a.title}</div>
                    </div>
                    {hasDrilldown && <ChevronRight size={14} style={{color:cfg.color, opacity:0.6, flexShrink:0}}/>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── KOMPOSISI SKOR ── */}
        <div {...ani(8)}>
          <HealthIndexGauge
            primary={ACCENT}
            dimensions={[
              { label:'Registrasi',  score: Math.min(100, Math.round((kpi.total/1102)*100)), weight: 0.20, icon: Users     },
              { label:'Verifikasi',  score: kpi.vpct,                          weight: 0.25, icon: FileCheck },
              { label:'Fisik UPI',   score: tesFisikData.avgSkor,              weight: 0.30, icon: Activity  },
              { label:'Partisipasi', score: tesFisikData.hadir > 0 ? Math.round((tesFisikData.hadir/(tesFisikData.hadir+tesFisikData.dns))*100) : 0, weight: 0.15, icon: Trophy    },
              { label:'Cabor Sehat', score: cabors.length>0 ? Math.max(0, Math.round(100 - (tesFisikData.lemahCount/cabors.length)*100)) : 0, weight: 0.10, icon: Target },
            ]}
          />
        </div>

        {/* ── SPORT SCIENCE OVERVIEW ── */}
        <div {...ani(9)}>
          <SportScienceCard kontingenId={4} tenantSlug="kabbandung" primary="#0ea5e9"/>
        </div>

        {/* ═══ STRATEGIC INTELLIGENCE ═══ */}
        {atlets.length > 0 && (
        <div {...ani(9)} className="rounded-2xl p-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.07) 0%,rgba(14,165,233,0.05) 50%,rgba(16,185,129,0.06) 100%)', border: '1px solid rgba(139,92,246,0.2)' }}>

          <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'rgba(139,92,246,0.10)' }} />

          <div className="relative">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <span>🎯</span> Strategic Intelligence
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Insight dari Data Quality Engine + Tes Biomotorik FPOK UPI
                </p>
              </div>
              <a href="/konida/intelligence/kabbandung"
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.35)' }}>
                Detail Lengkap →
              </a>
            </div>

            {/* 4 KPI cards */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {([
                { emoji:'⭐', value: intelligence.tf_elite,             label:'Atlet ELITE',      sub:'Skor ≥80% (backbone)',                                  col:'rgba(251,191,36,0.15)',  bord:'rgba(251,191,36,0.3)',  txt:'#fcd34d', dk: null        },
                { emoji:'📊', value:`${intelligence.coverage_persen}%`, label:'Coverage Tes Fisik', sub:`${intelligence.total_tested} dari ${atlets.length} atlet`, col:'rgba(14,165,233,0.1)', bord:'rgba(14,165,233,0.25)', txt:'#38bdf8', dk: null        },
                { emoji:'⏳', value: intelligence.tf_belum,             label:'Belum Tes Fisik',  sub:'Belum ada record UPI',                                  col:'rgba(139,92,246,0.1)',  bord:'rgba(139,92,246,0.25)', txt:'#c4b5fd', dk: 'dns' as DrilldownKey },
                { emoji:'🚨', value: intelligence.tf_kritis,            label:'Skor KRITIS',      sub:'Perlu evaluasi medis',                                  col:'rgba(244,63,94,0.1)',   bord:'rgba(244,63,94,0.25)',  txt:'#fb7185', dk: 'kritis' as DrilldownKey },
              ]).map(s => (
                <button key={s.label}
                  className={`p-4 rounded-xl text-left w-full transition-all ${s.dk ? 'cursor-pointer hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]' : 'cursor-default'}`}
                  style={{ background: s.col, border: `1px solid ${s.bord}` }}
                  onClick={() => s.dk && setDrilldown(s.dk)}>
                  <div className="flex items-start justify-between">
                    <div className="text-xl mb-1">{s.emoji}</div>
                    {s.dk && <span className="text-[7px] font-black uppercase tracking-widest opacity-40" style={{color:s.txt}}>KLIK</span>}
                  </div>
                  <div className="text-2xl font-black" style={{ color: s.txt }}>{s.value}</div>
                  <div className="text-[11px] text-zinc-300 mt-0.5">{s.label}</div>
                  <div className="text-[10px] text-zinc-600">{s.sub}</div>
                </button>
              ))}
            </div>

            {/* Two columns: Top Cabor + Backlog */}
            <div className="grid grid-cols-2 gap-4">

              {/* Top 5 Cabor */}
              <div className="p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <p className="text-xs font-bold text-emerald-400 mb-3 flex items-center gap-1.5">
                  <span>🏅</span> Top 5 Cabor Unggulan
                </p>
                <div className="space-y-2.5">
                  {intelligence.top_cabors.map((c, i) => (
                    <div key={c.nama} className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-600 w-4 shrink-0 text-center font-mono">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-white truncate font-medium text-[11px]">{c.nama}</span>
                          <span className="text-emerald-400 text-[9px] shrink-0">⭐{c.elite}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full" style={{ width:`${c.rata_skor}%`, background:'linear-gradient(90deg,#10b981,#34d399)' }}/>
                        </div>
                      </div>
                      <span className="text-emerald-300 font-mono text-[11px] shrink-0 w-11 text-right">{c.rata_skor}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Backlog Priority */}
              <div className="p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <p className="text-xs font-bold text-purple-400 mb-3 flex items-center gap-1.5">
                  <span>⚡</span> Prioritas Penjadwalan Tes
                </p>
                <div className="space-y-2.5">
                  {intelligence.backlog_cabors.map(c => (
                    <div key={c.nama} className="flex items-center gap-2 text-xs">
                      <span className={`text-[9px] px-1 py-0.5 rounded font-bold shrink-0 ${c.coverage < 20 ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
                        {c.coverage < 20 ? '🔴' : '⚠️'}
                      </span>
                      <span className="text-white flex-1 truncate font-medium text-[11px]">{c.nama}</span>
                      <span className="text-zinc-500 text-[10px] shrink-0">{c.belum_tes}/{c.total}</span>
                      <span className="text-purple-300 font-mono text-[10px] w-9 text-right shrink-0">{c.coverage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Anomali alert */}
            {intelligence.anomali_count > 0 && (
              <div className="mt-4 p-3 rounded-xl flex items-center gap-3"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <span className="text-lg shrink-0">🔬</span>
                <div className="flex-1 text-xs">
                  <span className="text-amber-300 font-semibold">{intelligence.anomali_count} anomali:</span>
                  <span className="text-amber-500/80 ml-1">atlet dengan tes fisik valid tapi NIK perlu verifikasi KONI</span>
                </div>
                <a href="/konida/intelligence/kabbandung"
                  className="text-xs text-amber-300 hover:underline shrink-0">Lihat →</a>
              </div>
            )}
          </div>
        </div>
        )}

{/* ════════════════════════════════════════════════════════════════ */}
        {/* PATCH v2: PETA KOMPETITOR + TOP 5 KLASEMEN + TARGET REALISASI    */}
        {/*          DIPINDAH ke War Room — section ini dihapus dari sini    */}
        {/* ════════════════════════════════════════════════════════════════ */}

        {/* ── CABOR WATCHLIST (pengganti Intel Cabor) ── */}
        {/* Operational tracker per cabor: status verifikasi + fitness UPI + alert demo */}
        <div {...ani(120)}>
          <CaborWatchlist
            cabors={caborWatchList}
            primary={ACCENT}
            onClickCabor={(nama) => {
              // Open detail panel sama kayak Intel Cabor lama
              const target = cabors.find(c => c.nama === nama)
              if (target) setSelCabor(target)
            }}
          />
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div {...ani(160)} className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { l:'War Room Live', d:'Monitoring perolehan medali & prediksi', icon:Monitor,  c:ACCENT,    href:'/konida/warroom/kabbandung'          },
            { l:'Laporan Tanding',d:'Jurnal dan hasil rekap harian lapangan',    icon:FileText, c:'#3b82f6', href:'/konida/lappertandingan/kabbandung' },
            { l:'Premium Report', d:'Cetak SPJ, Piagam, dan Dokumen Resmi',      icon:Download, c:'#f59e0b', href:'/konida/Premiumreport/kabbandung'   },
          ].map(a => (
            <a key={a.l} href={a.href}
              className="flex items-center justify-between p-5 rounded-3xl transition-all duration-300 group relative overflow-hidden"
              style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${a.c}20` }}>
              
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background:`linear-gradient(to right, ${a.c}0a, transparent)` }} />
                
              <div className="flex items-center gap-4 relative z-10">
                <div className="p-3.5 rounded-2xl shadow-inner transition-transform group-hover:scale-110" 
                  style={{ background:`${a.c}15`, border:`1px solid ${a.c}30` }}>
                  <a.icon size={22} style={{ color:a.c }}/>
                </div>
                <div>
                  <div className="font-bold text-white text-sm tracking-wide">{a.l}</div>
                  <div className="text-xs text-zinc-400 mt-1">{a.d}</div>
                </div>
              </div>
              <div className="relative z-10 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors border border-white/5">
                <ChevronRight size={16} style={{ color:a.c }} className="group-hover:translate-x-0.5 transition-transform"/>
              </div>
            </a>
          ))}
        </div>
      </main>

      {/* ── SLIDE-OUT CABOR DETAIL ── */}
      {selCabor && (
        <div className="fixed inset-0 z-[100]" onClick={() => setSelCabor(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"/>
          <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] overflow-y-auto transform transition-transform duration-300 shadow-2xl"
            style={{ background:'#02060f', borderLeft:`1px solid ${ACCENT}25` }}
            onClick={e => e.stopPropagation()}>
            <div className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2 px-2 py-1 rounded-md inline-block" style={{ background:`${ACCENT}15`, color:ACCENT }}>Detail Analisis Cabor</div>
                  <h2 className="text-3xl font-black text-white tracking-tight">{selCabor.nama}</h2>
                  <div className="text-sm text-zinc-400 mt-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                    {selCabor.kategori}
                  </div>
                </div>
                <button onClick={() => setSelCabor(null)}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                  <X size={18}/>
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { l:'Total Atlet Terdaftar', v:selCabor.total,   c:ACCENT, icon:Users },
                    { l:'Verifikasi Valid',      v:selCabor.verified, c:'#22d3ee', icon:CheckCircle },
                    { l:'Atlet Putra',           v:selCabor.putra,    c:ACCENT, icon:null },
                    { l:'Atlet Putri',           v:selCabor.putri,    c:'#f472b6', icon:null },
                  ].map((s, i) => (
                    <div key={s.l} className="rounded-2xl p-4 border shadow-inner"
                      style={{ background:'rgba(255,255,255,0.02)', borderColor: i < 2 ? `${s.c}20` : 'rgba(255,255,255,0.05)' }}>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                        {s.icon && <s.icon size={12} style={{ color:s.c }}/>} {s.l}
                      </div>
                      <div className="text-3xl font-light" style={{ color:s.c }}>{s.v}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl p-6 bg-gradient-to-br from-[#ffd70010] to-transparent border border-[#ffd70020] shadow-lg">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-yellow-500 uppercase tracking-widest mb-5">
                    <Trophy size={14}/> Perolehan Medali
                  </div>
                  <div className="flex gap-4">
                    {[
                      { l:'Emas',    v:selCabor.emas,     c:'#ffd700', bg:'#ffd70015' },
                      { l:'Perak',   v:selCabor.perak,    c:'#e2e8f0', bg:'#e2e8f015' },
                      { l:'Perunggu',v:selCabor.perunggu, c:'#cd7f32', bg:'#cd7f3215' },
                    ].map(m => (
                      <div key={m.l} className="flex-1 text-center bg-black/20 rounded-xl py-3 border border-white/5">
                        <div className="text-3xl font-black drop-shadow-sm mb-1" style={{ color:m.c }}>{m.v}</div>
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider">{m.l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 border-t border-white/10 flex justify-between items-center text-sm bg-black/10 px-4 py-2.5 rounded-xl">
                    <span className="text-zinc-400 font-medium">Conversion Rate</span>
                    <span className="font-black text-lg"
                      style={{ color:selCabor.conversion>=25?'#22d3ee':'#f87171' }}>
                      {selCabor.conversion}%
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl p-5 border border-[#38bdf815] bg-[#38bdf805]">
                  <div className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest mb-3">Sistem Intelijen Merangkum</div>
                  <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                    {selCabor.conversion>=50?'✅ Efisiensi tingkat dewa. Ini adalah cabang olahraga unggulan penyumbang medali utama kontingen.'
                    :selCabor.conversion>=25?'🔥 Efisiensi tergolong baik. Return on Investment (ROI) pembinaan atlet positif.'
                    :selCabor.total>30?'⚠️ Warning: Jumlah atlet masif namun konversi medali minim. Perlu evaluasi program pembinaan.'
                    :'📋 Data historis masih terbatas, perlu pengawasan dan pendampingan lebih lanjut.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ALERT DETAIL PANEL ── */}
      {alertPanel && (
        <div className="fixed inset-0 z-[110]" onClick={() => setAlertPanel(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="absolute right-0 top-0 h-full w-full sm:w-[480px] overflow-y-auto shadow-2xl"
            style={{ background:'#02060f', borderLeft:'1px solid rgba(56,189,248,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div className="p-7">

              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  {alertPanel === 'pending' && <>
                    <div className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md inline-block mb-2" style={{ background:'rgba(251,191,36,0.12)', color:'#fbbf24' }}>Analisa Pending</div>
                    <h2 className="text-2xl font-black text-white">{kpi.pending} Atlet Menunggu Verifikasi</h2>
                    <p className="text-xs text-zinc-500 mt-1">Breakdown per cabang olahraga</p>
                  </>}
                  {alertPanel === 'nonlokal' && <>
                    <div className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md inline-block mb-2" style={{ background:'rgba(251,113,133,0.12)', color:'#fb7185' }}>Analisa Non-Lokal</div>
                    <h2 className="text-2xl font-black text-white">{kpi.nonLokal} Atlet Non-Lokal</h2>
                    <p className="text-xs text-zinc-500 mt-1">Klasifikasi risiko by daerah asal</p>
                  </>}
                  {alertPanel === 'ditolak' && <>
                    <div className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md inline-block mb-2" style={{ background:'rgba(248,113,113,0.12)', color:'#f87171' }}>Analisa Ditolak</div>
                    <h2 className="text-2xl font-black text-white">{kpi.ditolak} Atlet Ditolak</h2>
                    <p className="text-xs text-zinc-500 mt-1">Breakdown per cabang olahraga</p>
                  </>}
                </div>
                <button onClick={() => setAlertPanel(null)}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors mt-1">
                  <X size={18} />
                </button>
              </div>

              {/* ── PENDING CONTENT ── */}
              {alertPanel === 'pending' && (
                <div className="space-y-5">
                  <div className="rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-start gap-2.5">
                      <Info size={14} className="text-amber-400 mt-0.5 shrink-0" />
                      <div className="text-xs text-amber-200/80 leading-relaxed">
                        <strong className="text-amber-300">Konteks:</strong> Status "Menunggu Admin" berarti atlet sudah submit pendaftaran dan menunggu approval KONI. Pada fase demo ini, semua syarat administrasi (NIK, biodata, dll.) sudah diisi — pending bukan karena data kurang, melainkan karena proses approval belum dijalankan oleh KONI Jabar.
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Distribusi per Cabor</div>
                    <div className="space-y-1.5">
                      {alertBreakdown.pendingByCabor.length === 0 ? (
                        <div className="text-xs text-zinc-600 py-4 text-center">Tidak ada data pending</div>
                      ) : alertBreakdown.pendingByCabor.map(row => {
                        const pct = kpi.pending > 0 ? Math.round(row.jumlah / kpi.pending * 100) : 0
                        return (
                          <div key={row.cabor} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs text-white font-medium truncate">{row.cabor}</div>
                              <div className="h-1 rounded-full bg-slate-800 mt-1.5 overflow-hidden">
                                <div className="h-full rounded-full bg-amber-400/60" style={{ width:`${Math.min(pct*3,100)}%` }} />
                              </div>
                            </div>
                            <div className="text-sm font-bold text-amber-400 tabular-nums w-8 text-right">{row.jumlah}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <Link href="/konida/atlet/kabbandung?status=Menunggu+Admin"
                    onClick={() => setAlertPanel(null)}
                    className="flex items-center justify-between w-full px-5 py-3.5 rounded-2xl transition-colors font-semibold text-sm"
                    style={{ background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.3)', color:'#fbbf24' }}>
                    Lihat & proses atlet pending
                    <ChevronRight size={16} />
                  </Link>
                </div>
              )}

              {/* ── NON-LOKAL CONTENT ── */}
              {alertPanel === 'nonlokal' && (
                <div className="space-y-5">
                  {/* Risk legend */}
                  <div className="flex gap-3 flex-wrap">
                    {[
                      { label:'Risiko Rendah', color:'#22c55e', desc:'Kab/Kota tetangga (Kota Bdg, KBB, Cimahi)' },
                      { label:'Risiko Sedang', color:'#f59e0b', desc:'Dalam Jawa Barat (non-tetangga)' },
                      { label:'Risiko Tinggi', color:'#ef4444', desc:'Luar Jawa Barat' },
                    ].map(r => (
                      <div key={r.label} className="flex items-start gap-2 text-[11px]">
                        <span className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0" style={{ background:r.color }} />
                        <div>
                          <div className="font-bold" style={{ color:r.color }}>{r.label}</div>
                          <div className="text-zinc-600 text-[10px]">{r.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl p-4 border border-rose-500/20 bg-rose-500/5">
                    <div className="flex items-start gap-2.5">
                      <Info size={14} className="text-rose-400 mt-0.5 shrink-0" />
                      <div className="text-xs text-rose-200/80 leading-relaxed">
                        Atlet non-lokal berpotensi pindah ke kontingen asal saat event PORPROV berlangsung. Prioritaskan komunikasi dengan atlet dari luar Jabar (risiko tinggi) sejak dini.
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Daerah Asal Atlet</div>
                    <div className="space-y-1.5">
                      {alertBreakdown.nonLokalByDaerah.length === 0 ? (
                        <div className="text-xs text-zinc-600 py-4 text-center">Tidak ada atlet non-lokal terdeteksi</div>
                      ) : alertBreakdown.nonLokalByDaerah.map(row => {
                        const riskColor = row.risk === 'rendah' ? '#22c55e' : row.risk === 'sedang' ? '#f59e0b' : '#ef4444'
                        return (
                          <div key={row.daerah} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background:riskColor }} />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs text-white font-medium truncate">{row.daerah || 'Tidak diketahui'}</div>
                              <div className="text-[10px] text-zinc-600">{row.cabors} cabor</div>
                            </div>
                            <div className="text-sm font-bold tabular-nums w-8 text-right" style={{ color:riskColor }}>{row.jumlah}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <Link href="/konida/atlet/kabbandung"
                    onClick={() => setAlertPanel(null)}
                    className="flex items-center justify-between w-full px-5 py-3.5 rounded-2xl transition-colors font-semibold text-sm"
                    style={{ background:'rgba(251,113,133,0.1)', border:'1px solid rgba(251,113,133,0.3)', color:'#fb7185' }}>
                    Cek dossier atlet non-lokal
                    <ChevronRight size={16} />
                  </Link>
                </div>
              )}

              {/* ── DITOLAK CONTENT ── */}
              {alertPanel === 'ditolak' && (
                <div className="space-y-5">
                  <div className="rounded-2xl p-4 border border-red-500/30 bg-red-500/8">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                      <div className="text-xs text-red-200/80 leading-relaxed">
                        <strong className="text-red-300">Perhatian Kritis:</strong> Seluruh 53 atlet yang berstatus "Ditolak Admin" tidak memiliki <code className="px-1 bg-red-900/40 rounded text-[10px]">catatan_verifikasi</code>. Artinya, atlet dan operator Kab. Bandung tidak tahu alasan penolakan — ini adalah gap proses di level KONI Jabar yang perlu segera dikomunikasikan.
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Distribusi per Cabor</div>
                    <div className="space-y-1.5">
                      {alertBreakdown.ditolakByCabor.length === 0 ? (
                        <div className="text-xs text-zinc-600 py-4 text-center">Tidak ada data ditolak</div>
                      ) : alertBreakdown.ditolakByCabor.map(row => {
                        const pct = kpi.ditolak > 0 ? Math.round(row.jumlah / kpi.ditolak * 100) : 0
                        return (
                          <div key={row.cabor} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs text-white font-medium truncate">{row.cabor}</div>
                              <div className="h-1 rounded-full bg-slate-800 mt-1.5 overflow-hidden">
                                <div className="h-full rounded-full bg-red-400/60" style={{ width:`${Math.min(pct*4,100)}%` }} />
                              </div>
                            </div>
                            <div className="text-sm font-bold text-red-400 tabular-nums w-8 text-right">{row.jumlah}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <Link href="/konida/atlet/kabbandung?status=Ditolak+Admin"
                    onClick={() => setAlertPanel(null)}
                    className="flex items-center justify-between w-full px-5 py-3.5 rounded-2xl transition-colors font-semibold text-sm"
                    style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', color:'#f87171' }}>
                    Lihat semua atlet ditolak
                    <ChevronRight size={16} />
                  </Link>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── DRILL-DOWN MODAL ── */}
      {drilldown && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(6px)'}}
          onClick={() => setDrilldown(null)}>
          <div className="w-full max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            style={{background:'#040d18', border:`1px solid ${DRILLDOWN_CFG[drilldown].color}30`}}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
              style={{borderColor:'rgba(255,255,255,0.07)'}}>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest mb-1"
                  style={{color: DRILLDOWN_CFG[drilldown].color}}>DRILL-DOWN DETAIL</div>
                <div className="text-base font-black text-white">{DRILLDOWN_CFG[drilldown].title}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  {drilldown === 'cabor_lemah'
                    ? `${drilldownData.cabors.length} cabor teridentifikasi`
                    : `${drilldownData.atlets.length} atlet`}
                </div>
              </div>
              <button onClick={() => setDrilldown(null)}
                className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-colors">
                <X size={16}/>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-4"
              style={{scrollbarWidth:'thin',scrollbarColor:`${DRILLDOWN_CFG[drilldown].color}30 transparent`}}>

              {/* CABOR LEMAH — tampilkan per-cabor bukan per-atlet */}
              {drilldown === 'cabor_lemah' && (
                drilldownData.cabors.length === 0
                  ? <div className="py-8 text-center text-zinc-600 text-sm">Tidak ada cabor dengan rata-rata &lt;55%</div>
                  : <div className="space-y-2">
                      {drilldownData.cabors.map((c, i) => (
                        <div key={c.nama} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                          style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)'}}>
                          <span className="text-[11px] font-mono text-zinc-600 w-6 text-right shrink-0">{i+1}</span>
                          <span className="text-sm font-bold text-zinc-200 flex-1 truncate">{c.nama}</span>
                          <span className="text-xs text-zinc-500">{c.total} atlet</span>
                          <div className="w-24 h-2 rounded-full overflow-hidden shrink-0" style={{background:'rgba(255,255,255,0.06)'}}>
                            <div className="h-full rounded-full" style={{width:`${c.rata}%`, background: c.rata < 40 ? '#ef4444' : '#f97316'}}/>
                          </div>
                          <span className="text-sm font-black w-10 text-right shrink-0"
                            style={{color: c.rata < 40 ? '#ef4444' : '#fb923c'}}>{c.rata}%</span>
                        </div>
                      ))}
                    </div>
              )}

              {/* ATLET TABLE */}
              {drilldown !== 'cabor_lemah' && (
                drilldownData.atlets.length === 0
                  ? <div className="py-8 text-center text-zinc-600 text-sm">Tidak ada data</div>
                  : <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[9px] uppercase tracking-widest sticky top-0 z-10"
                          style={{background:'#040d18', color:'rgba(255,255,255,0.3)', borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                          <th className="px-2 py-2 font-bold w-8 text-center">#</th>
                          <th className="px-2 py-2 font-bold">Nama</th>
                          <th className="px-2 py-2 font-bold">Cabor</th>
                          {drilldown === 'kritis' && <>
                            <th className="px-2 py-2 font-bold text-center">Skor</th>
                            <th className="px-2 py-2 font-bold text-center">Rating</th>
                          </>}
                          {drilldown === 'pending' && <th className="px-2 py-2 font-bold">Status</th>}
                          {drilldown === 'ditolak' && <th className="px-2 py-2 font-bold">Catatan</th>}
                          {drilldown === 'dns'     && <th className="px-2 py-2 font-bold text-center">Status Tes</th>}
                          {drilldown === 'locked_nik' && <th className="px-2 py-2 font-bold">NIK</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {drilldownData.atlets.map((a, i) => (
                          <tr key={a.id} className="border-b transition-colors"
                            style={{borderColor:'rgba(255,255,255,0.04)'}}
                            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.025)'}
                            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                            <td className="px-2 py-2 text-center text-[10px] font-mono text-zinc-700">{i+1}</td>
                            <td className="px-2 py-2">
                              <div className="text-sm font-bold text-zinc-200 leading-tight">{a.nama_lengkap}</div>
                              <div className="text-[9px] font-mono text-zinc-600">{a.no_ktp}</div>
                            </td>
                            <td className="px-2 py-2 text-xs text-zinc-400 max-w-[140px] truncate">{a.cabor_nama_raw||'-'}</td>
                            {drilldown === 'kritis' && <>
                              <td className="px-2 py-2 text-center">
                                <span className="text-sm font-black text-rose-400">{a.tes_fisik_persen ?? '—'}%</span>
                              </td>
                              <td className="px-2 py-2 text-center">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/25">
                                  {a.tes_fisik_rating}
                                </span>
                              </td>
                            </>}
                            {drilldown === 'pending' && (
                              <td className="px-2 py-2">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  Menunggu Admin
                                </span>
                              </td>
                            )}
                            {drilldown === 'ditolak' && (
                              <td className="px-2 py-2 text-[10px] text-zinc-500">—</td>
                            )}
                            {drilldown === 'dns' && (
                              <td className="px-2 py-2 text-center">
                                <span className="text-[10px] font-bold text-amber-500">Belum Tes</span>
                              </td>
                            )}
                            {drilldown === 'locked_nik' && (
                              <td className="px-2 py-2 text-[10px] font-mono text-purple-400">{a.no_ktp}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t shrink-0 flex items-center justify-between"
              style={{borderColor:'rgba(255,255,255,0.06)'}}>
              <span className="text-[11px] text-zinc-600">
                {drilldown === 'cabor_lemah'
                  ? `${drilldownData.cabors.length} cabor rata-rata skor <55%`
                  : `Menampilkan ${drilldownData.atlets.length} atlet`}
              </span>
              <Link href={DRILLDOWN_CFG[drilldown].link}
                onClick={() => setDrilldown(null)}
                className="text-xs font-bold transition-colors hover:opacity-80"
                style={{color: DRILLDOWN_CFG[drilldown].color}}>
                Lihat di Data Master Atlet →
              </Link>
            </div>
          </div>
        </div>
      )}

      <style>{`
        *{box-sizing:border-box}
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${ACCENT}40;border-radius:10px}
        ::-webkit-scrollbar-thumb:hover{background:${ACCENT}80}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>
    </div>
  )
}