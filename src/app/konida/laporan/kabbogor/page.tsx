'use client'
// src/app/konida/laporan/page.tsx — v3
// REDESIGN: Tab kategori + Featured section + 16 laporan
// Mix Real data + Demo data dengan badge ⚠DEMO

import { useState, useMemo, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  FileText, Download, Printer, Shirt, Users, CreditCard, ShieldCheck,
  FileSearch, PieChart, CheckCircle, RefreshCw, AlertTriangle, X,
  BarChart2, Loader2, Info, MapPin, Building2, Eye, Activity,
  Trophy, Award, Heart, DollarSign, Bus, Calendar, TrendingUp,
  Flame, Target, Package, Zap, Star, XCircle, Clock,
} from 'lucide-react'
import { CriticalAlertsCard, type CriticalAlert } from '@/components/konida/DashboardHelpers'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const KONTINGEN_ID = 1
const ACCENT       = '#00ffaa'
const NAMA_KAB     = 'KABUPATEN BOGOR'

// ── Dummy nominal helpers ─────────────────────────────────
const formatRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID')
const DUMMY_RP = 'Rp xxx.xxx.xxx'

// Bonus by medali
const BONUS_NOMINAL: Record<string,number> = {
  'Emas':     50000000,
  'Perak':    30000000,
  'Perunggu': 15000000,
}
const UANG_SAKU_HARIAN = 250000  // per atlet per hari
const TOTAL_HARI_PORPROV = 14

interface AtletDB {
  id:                 number
  nama_lengkap:       string
  no_ktp:             string
  tgl_lahir:          string
  gender:             string
  cabor_nama_raw:     string
  kode_asal_daerah:   string
  nama_asal_daerah:   string
  no_registrasi_koni: number|null
  status_registrasi:  string
  ukuran_kemeja:      string|null
  ukuran_sepatu:      string|null
  nama_bank:          string|null
  no_rekening:        string|null
}

interface TesFisik {
  atlet_id: number
  bmi: number|null
  kesimpulan_persen: number|null
  kesimpulan_kategori: string|null
}

interface Perlengkapan {
  atlet_id: number
  ukuran_kemeja:        string|null
  ukuran_jaket:         string|null
  ukuran_kaos:          string|null
  ukuran_celana:        string|null
  ukuran_sepatu:        string|null
  ukuran_topi:          string|null
  ukuran_training_set:  string|null
}

interface Riwayat {
  atlet_id: number
  hasil: 'Emas'|'Perak'|'Perunggu'|'Juara 4'|'Peserta'
}

function hitungUmur(tgl: string) {
  if (!tgl) return 0
  return Math.floor((Date.now()-new Date(tgl).getTime())/(365.25*24*3600*1000))
}

function Bar({ value, max, color, h=5 }:{value:number;max:number;color:string;h?:number}) {
  return (
    <div className="rounded-full overflow-hidden" style={{height:h,background:'rgba(255,255,255,0.06)'}}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{width:`${max>0?Math.min(value/max*100,100):0}%`,background:color}}/>
    </div>
  )
}

type ReportCategory = 'Admin' | 'Logistik' | 'Keuangan' | 'Sport Science' | 'Audit' | 'Prestasi'
type TabFilter = 'Semua' | 'Featured' | ReportCategory

interface ReportDef {
  id:              string
  title:           string
  category:        ReportCategory
  desc:            string
  icon:            any
  color:           string
  count:           number
  countLabel:      string
  completion:      number
  completionLabel: string
  isDemo:          boolean
  isFeatured?:     boolean
}

// ── Preview Modal ─────────────────────────────────────────
function PreviewModal({
  title, data, columns, isDemo, onClose, onExportCSV, onPrint
}:{
  title:string
  data:any[][]
  columns:string[]
  isDemo:boolean
  onClose:()=>void
  onExportCSV:()=>void
  onPrint:()=>void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{background:'rgba(0,0,0,0.8)',backdropFilter:'blur(6px)'}}>
      <div className="w-full max-w-[1000px] rounded-2xl overflow-hidden flex flex-col"
        style={{background:'#040f08',border:`1px solid ${isDemo?'rgba(251,191,36,0.3)':`${ACCENT}20`}`,maxHeight:'85vh',boxShadow:'0 25px 60px rgba(0,0,0,0.8)'}}>

        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{borderColor:`${isDemo?'rgba(251,191,36,0.15)':`${ACCENT}12`}`,background:`${isDemo?'rgba(251,191,36,0.04)':`${ACCENT}04`}`}}>
          <div className="flex-1">
            <div className="text-white font-bold flex items-center gap-2 flex-wrap">
              {title}
              {isDemo && (
                <span className="text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest"
                  style={{background:'rgba(251,191,36,0.15)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.35)'}}>
                  ⚠ DEMO DATA
                </span>
              )}
            </div>
            <div className="text-[11px] mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>
              Preview {Math.min(data.length, 50)} dari {data.length} baris · {columns.length} kolom
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onExportCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
              style={{background:`${ACCENT}15`,border:`1px solid ${ACCENT}30`,color:ACCENT}}>
              <Download size={13}/> Export CSV
            </button>
            <button onClick={onPrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
              style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.6)'}}>
              <Printer size={13}/> Print
            </button>
            <button onClick={onClose} className="p-2 rounded-xl"
              style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.4)'}}>
              <X size={15}/>
            </button>
          </div>
        </div>

        {isDemo && (
          <div className="px-6 py-2.5 flex items-center gap-2 text-[11px]"
            style={{background:'rgba(251,191,36,0.06)',borderBottom:'1px solid rgba(251,191,36,0.15)',color:'#fbbf24'}}>
            <AlertTriangle size={12}/>
            <span>Laporan ini berisi data preview/dummy. Nominal & detail dapat berbeda dengan kondisi real.</span>
          </div>
        )}

        <div className="overflow-auto flex-1"
          style={{scrollbarWidth:'thin',scrollbarColor:`${ACCENT}25 transparent`}}>
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="sticky top-0" style={{background:'rgba(2,13,6,0.98)'}}>
                <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest"
                  style={{color:'rgba(255,255,255,0.3)',borderBottom:'1px solid rgba(255,255,255,0.06)',width:40}}>No</th>
                {columns.map(c=>(
                  <th key={c} className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap"
                    style={{color:'rgba(255,255,255,0.3)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0,50).map((row,i)=>(
                <tr key={i} className="border-b" style={{borderColor:'rgba(255,255,255,0.04)'}}>
                  <td className="px-4 py-2.5 text-[10px] font-mono" style={{color:'rgba(255,255,255,0.2)'}}>{i+1}</td>
                  {row.map((cell,j)=>(
                    <td key={j} className="px-4 py-2.5 text-xs text-zinc-300 whitespace-nowrap">{cell??'—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length>50 && (
            <div className="px-4 py-3 text-[11px] text-center" style={{color:'rgba(255,255,255,0.3)'}}>
              Preview menampilkan 50 dari {data.length} baris. Export CSV untuk data lengkap.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function PageLaporan() {
  const [atlets, setAtlets] = useState<AtletDB[]>([])
  const [tesFisikData, setTesFisikData] = useState<TesFisik[]>([])
  const [perlengkapanData, setPerlengkapanData] = useState<Perlengkapan[]>([])
  const [riwayatData, setRiwayatData] = useState<Riwayat[]>([])
  const [dokumenStats, setDokumenStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string|null>(null)
  const [activeTab, setActiveTab] = useState<TabFilter>('Featured')
  const [preview, setPreview] = useState<{title:string;data:any[][];columns:string[];isDemo:boolean}|null>(null)
  const [animIn, setAnimIn] = useState(false)

  useEffect(()=>{ const t=setTimeout(()=>setAnimIn(true),80); return()=>clearTimeout(t) },[])

  useEffect(()=>{
    async function load() {
      try {
        const [atletRes, tesRes, perlRes, riwayatRes, dokRes] = await Promise.all([
          sb.from('atlet')
            .select('id,nama_lengkap,no_ktp,tgl_lahir,gender,cabor_nama_raw,kode_asal_daerah,nama_asal_daerah,no_registrasi_koni,status_registrasi,ukuran_kemeja,ukuran_sepatu,nama_bank,no_rekening')
            .eq('kontingen_id', KONTINGEN_ID)
            .order('cabor_nama_raw',{ascending:true})
            .order('nama_lengkap',{ascending:true}),
          sb.from('atlet_tes_fisik')
            .select('atlet_id,bmi,kesimpulan_persen,kesimpulan_kategori')
            .eq('kontingen_id', KONTINGEN_ID),
          sb.from('atlet_perlengkapan').select('*'),
          sb.from('riwayat_prestasi').select('atlet_id,hasil'),
          sb.from('v_dokumen_stats').select('*'),
        ])
        if (atletRes.data)        setAtlets(atletRes.data as AtletDB[])
        if (tesRes.data)          setTesFisikData(tesRes.data as TesFisik[])
        if (perlRes.data)         setPerlengkapanData(perlRes.data as Perlengkapan[])
        if (riwayatRes.data)      setRiwayatData(riwayatRes.data as Riwayat[])
        if (dokRes.data)          setDokumenStats(dokRes.data as any[])
      } catch (e) {
        console.error('[Laporan] Load error:', e)
      } finally {
        setLoading(false)
      }
    }
    void load()
  },[])

  // ── Maps for quick lookup ─────────────────────────────────
  const tesFisikMap = useMemo(()=>{
    const m: Record<number, TesFisik> = {}
    tesFisikData.forEach(t => m[t.atlet_id] = t)
    return m
  },[tesFisikData])

  const perlengkapanMap = useMemo(()=>{
    const m: Record<number, Perlengkapan> = {}
    perlengkapanData.forEach(p => m[p.atlet_id] = p)
    return m
  },[perlengkapanData])

  // ── Analytics ─────────────────────────────────────────────
  const analytics = useMemo(()=>{
    const total       = atlets.length
    const verified    = atlets.filter(a=>a.status_registrasi==='Verified'||a.status_registrasi==='Posted').length
    const hasApparel  = atlets.filter(a=>a.ukuran_kemeja&&a.ukuran_sepatu).length
    const hasRek      = atlets.filter(a=>a.nama_bank&&a.no_rekening).length
    const hasNIK      = atlets.filter(a=>a.no_ktp&&a.no_ktp.length===16).length
    const lokal       = atlets.filter(a=>a.kode_asal_daerah?.startsWith('3201')).length
    const nonLokal    = total-lokal

    // Sport Science stats
    const sudahTes    = tesFisikData.length
    const skorTinggi  = tesFisikData.filter(t=>(t.kesimpulan_persen||0) >= 80).length
    const skorRendah  = tesFisikData.filter(t=>(t.kesimpulan_persen||0) < 50).length
    const avgSkor     = sudahTes > 0
      ? Math.round(tesFisikData.reduce((s,t)=>s+(t.kesimpulan_persen||0),0)/sudahTes)
      : 0

    // Prestasi
    const totalEmas    = riwayatData.filter(r=>r.hasil==='Emas').length
    const totalPerak   = riwayatData.filter(r=>r.hasil==='Perak').length
    const totalPerunggu= riwayatData.filter(r=>r.hasil==='Perunggu').length
    const atletDenganPrestasi = new Set(riwayatData.map(r=>r.atlet_id)).size

    // Perlengkapan
    const adaPerlengkapan = perlengkapanData.length

    // Dokumen
    const totalDokumen = dokumenStats.reduce((s,d)=>s+(d.verified||0),0)

    return {
      total, verified, hasApparel, hasRek, hasNIK, lokal, nonLokal,
      sudahTes, skorTinggi, skorRendah, avgSkor,
      totalEmas, totalPerak, totalPerunggu, atletDenganPrestasi,
      adaPerlengkapan, totalDokumen,
    }
  },[atlets, tesFisikData, riwayatData, perlengkapanData, dokumenStats])

  // ── Critical alerts untuk pusat laporan ──────────────────
  const keuanganAlerts = useMemo<CriticalAlert[]>(() => {
    const alerts: CriticalAlert[] = []
    const noRek       = analytics.total - analytics.hasRek
    const noNIK       = analytics.total - analytics.hasNIK
    // estimasi-bonus, uang-saku, prestasi-summary, manifest-akomodasi
    const demoLaporan = 4

    if (noRek > 0)
      alerts.push({
        severity: 'urgent',
        icon: CreditCard,
        title: 'Rekening Belum Terdata',
        message: `${noRek} atlet belum isi nama bank & no rekening — laporan keuangan & transfer bonus akan terhambat`,
        count: noRek,
        action: 'Buka Laporan Rekening',
      })
    if (noNIK > 0)
      alerts.push({
        severity: 'urgent',
        icon: XCircle,
        title: 'NIK Tidak Valid',
        message: `${noNIK} atlet NIK-nya bukan 16 digit — berisiko diskualifikasi di PORPROV XV`,
        count: noNIK,
        action: 'Audit NIK Sekarang',
      })
    if (analytics.nonLokal > 0)
      alerts.push({
        severity: 'important',
        icon: MapPin,
        title: 'Atlet Non-Lokal Terdeteksi',
        message: `${analytics.nonLokal} atlet KTP-nya bukan Kab. Bogor — perlu klarifikasi legalitas sebelum SK dicetak`,
        count: analytics.nonLokal,
      })
    if (demoLaporan > 0)
      alerts.push({
        severity: 'important',
        icon: AlertTriangle,
        title: `${demoLaporan} Laporan Masih Demo`,
        message: 'Data nominal Rupiah & akomodasi masih dummy — lengkapi data real agar laporan bisa diterbitkan',
        count: demoLaporan,
      })
    if (alerts.length === 0)
      alerts.push({
        severity: 'info',
        icon: CheckCircle,
        title: 'Data Keuangan & Legalitas Bersih',
        message: `Semua ${analytics.total} atlet punya NIK valid & rekening terdata`,
      })
    return alerts
  }, [analytics])

  const performaAlerts = useMemo<CriticalAlert[]>(() => {
    const alerts: CriticalAlert[] = []
    const belumTes  = analytics.total - analytics.sudahTes
    const noApparel = analytics.total - analytics.hasApparel

    if (analytics.skorRendah > 0)
      alerts.push({
        severity: 'urgent',
        icon: Activity,
        title: 'Atlet Risk Performance',
        message: `${analytics.skorRendah} atlet skor biomotorik < 50% — butuh program latihan intensif sebelum PORPROV`,
        count: analytics.skorRendah,
        action: 'Lihat Laporan Risk',
      })
    if (belumTes > 0)
      alerts.push({
        severity: 'important',
        icon: Clock,
        title: 'Belum Ikut Tes Fisik',
        message: `${belumTes} dari ${analytics.total} atlet belum ada data tes biomotorik — laporan sport science tidak lengkap`,
        count: belumTes,
      })
    if (noApparel > 0)
      alerts.push({
        severity: 'important',
        icon: Shirt,
        title: 'Ukuran Apparel Belum Lengkap',
        message: `${noApparel} atlet belum isi ukuran — Purchase Order tidak bisa dikunci ke supplier`,
        count: noApparel,
        action: 'Buka Laporan Logistik',
      })
    if (analytics.sudahTes > 0 && analytics.avgSkor < 60)
      alerts.push({
        severity: 'important',
        icon: TrendingUp,
        title: 'Rata-rata Skor Fisik Rendah',
        message: `Avg skor biomotorik kontingen ${analytics.avgSkor}% — di bawah benchmark 60%, perlu perhatian pelatih`,
      })
    if (alerts.length === 0)
      alerts.push({
        severity: 'info',
        icon: CheckCircle,
        title: 'Performa & Logistik Terkendali',
        message: `${analytics.skorTinggi} atlet elit (≥80%), apparel terdata lengkap`,
      })
    return alerts
  }, [analytics])

  // ── Generate data per laporan ─────────────────────────────
  const getLaporanData = useCallback((id: string): {title:string;columns:string[];data:any[][];isDemo:boolean} => {
    const verified = atlets.filter(a=>a.status_registrasi==='Verified'||a.status_registrasi==='Posted')
    const tanggal  = new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})

    switch(id) {

      // ════ KATEGORI ADMIN ════
      case 'sk-kontingen': {
        const cols = ['No Reg KONI','Nama Lengkap','NIK / KTP','Tgl Lahir','Usia','Gender','Cabor','Asal Daerah','Status']
        const data = verified.map(a=>[
          a.no_registrasi_koni||'-', a.nama_lengkap, a.no_ktp||'-', a.tgl_lahir,
          hitungUmur(a.tgl_lahir)+' th',
          a.gender==='L'?'Laki-laki':'Perempuan', a.cabor_nama_raw,
          a.kode_asal_daerah?.startsWith('3201')?'Kab. Bogor (Lokal)':(a.nama_asal_daerah||'-'),
          a.status_registrasi,
        ])
        return { title:`Rekapitulasi SK Kontingen ${NAMA_KAB} — ${tanggal}`, columns:cols, data, isDemo:false }
      }

      // ════ KATEGORI LOGISTIK ════
      case 'logistik-apparel': {
        const cols = ['Nama Lengkap','Gender','Cabor','Ukuran Kemeja','Ukuran Sepatu','Status Apparel']
        const data = atlets.map(a=>[
          a.nama_lengkap, a.gender==='L'?'L':'P', a.cabor_nama_raw,
          a.ukuran_kemeja||'BELUM ISI', a.ukuran_sepatu||'BELUM ISI',
          a.ukuran_kemeja&&a.ukuran_sepatu?'Lengkap':'Belum Lengkap',
        ])
        return { title:`RAB Logistik & Apparel Kontingen ${NAMA_KAB} — ${tanggal}`, columns:cols, data, isDemo:false }
      }

      case 'rekap-ukuran': {
        const kemeja: Record<string,number> = {}
        atlets.forEach(a=>{ if(a.ukuran_kemeja) kemeja[a.ukuran_kemeja]=(kemeja[a.ukuran_kemeja]||0)+1 })
        const cols = ['Ukuran Kemeja','Jumlah Atlet','%','Estimasi Biaya (Rp)']
        const data = Object.entries(kemeja).sort((a,b)=>b[1]-a[1]).map(([uk,n])=>[
          uk, n, `${Math.round(n/atlets.length*100)}%`, formatRp(n*180000),
        ])
        return { title:`Rekap Ukuran Kemeja — ${tanggal}`, columns:cols, data, isDemo:false }
      }

      case 'po-apparel-detail': {
        // PO untuk 7 item perlengkapan × ukuran
        const items = [
          {key:'ukuran_kemeja',label:'Kemeja',harga:180000},
          {key:'ukuran_jaket',label:'Jaket',harga:350000},
          {key:'ukuran_kaos',label:'Kaos',harga:120000},
          {key:'ukuran_celana',label:'Celana',harga:200000},
          {key:'ukuran_sepatu',label:'Sepatu',harga:450000},
          {key:'ukuran_topi',label:'Topi',harga:80000},
          {key:'ukuran_training_set',label:'Training Set',harga:280000},
        ]
        const cols = ['Item','Ukuran','Jumlah','Harga Satuan (Rp)','Subtotal (Rp)']
        const data: any[][] = []
        items.forEach(item=>{
          const dist: Record<string,number> = {}
          perlengkapanData.forEach(p=>{
            const val = (p as any)[item.key]
            if (val) dist[val] = (dist[val]||0)+1
          })
          Object.entries(dist).sort().forEach(([ukuran,n])=>{
            data.push([item.label, ukuran, n, formatRp(item.harga), formatRp(n * item.harga)])
          })
        })
        return { title:`Purchase Order Detail Apparel — ${tanggal}`, columns:cols, data, isDemo:false }
      }

      // ════ KATEGORI KEUANGAN ════
      case 'distribusi-bonus': {
        const cols = ['Nama Lengkap','Cabor','Bank','No Rekening','Atas Nama','Status']
        const data = atlets.map(a=>[
          a.nama_lengkap, a.cabor_nama_raw,
          a.nama_bank||'BELUM ISI', a.no_rekening||'BELUM ISI', a.nama_lengkap,
          a.nama_bank&&a.no_rekening?'Lengkap':'Belum Lengkap',
        ])
        return { title:`Daftar Rekening Atlet — ${NAMA_KAB}`, columns:cols, data, isDemo:false }
      }

      case 'estimasi-bonus': {
        // Berdasarkan riwayat prestasi (kalau ada) × bonus nominal
        const cols = ['Nama Lengkap','Cabor','Total Emas','Total Perak','Total Perunggu','Estimasi Bonus (Rp)','Catatan']
        const atletPrestasi: Record<number,{emas:number;perak:number;perunggu:number}> = {}
        riwayatData.forEach(r=>{
          if (!atletPrestasi[r.atlet_id]) atletPrestasi[r.atlet_id] = {emas:0,perak:0,perunggu:0}
          if (r.hasil==='Emas')     atletPrestasi[r.atlet_id].emas++
          if (r.hasil==='Perak')    atletPrestasi[r.atlet_id].perak++
          if (r.hasil==='Perunggu') atletPrestasi[r.atlet_id].perunggu++
        })
        const data: any[][] = []
        atlets.forEach(a=>{
          const p = atletPrestasi[a.id]
          if (!p) return  // Hanya tampilkan yang punya prestasi
          const bonus = p.emas*BONUS_NOMINAL.Emas + p.perak*BONUS_NOMINAL.Perak + p.perunggu*BONUS_NOMINAL.Perunggu
          data.push([
            a.nama_lengkap, a.cabor_nama_raw,
            p.emas, p.perak, p.perunggu,
            formatRp(bonus),
            'Berdasarkan prediksi & track record',
          ])
        })
        // Sort by bonus desc
        data.sort((a,b)=>{
          const ba = parseInt(String(a[5]).replace(/\D/g,''))
          const bb = parseInt(String(b[5]).replace(/\D/g,''))
          return bb-ba
        })
        return { title:`Estimasi Bonus Medali Atlet — ${tanggal}`, columns:cols, data, isDemo:true }
      }

      case 'uang-saku': {
        const cols = ['Nama Lengkap','Cabor','Tarif Harian (Rp)','Hari','Total Uang Saku (Rp)','Status']
        const data = verified.map(a=>[
          a.nama_lengkap, a.cabor_nama_raw,
          formatRp(UANG_SAKU_HARIAN), TOTAL_HARI_PORPROV,
          formatRp(UANG_SAKU_HARIAN * TOTAL_HARI_PORPROV),
          'Siap Distribusi',
        ])
        return { title:`Plan Uang Saku Harian Atlet — ${tanggal}`, columns:cols, data, isDemo:true }
      }

      // ════ KATEGORI SPORT SCIENCE ════
      case 'tes-biomotorik-cabor': {
        const cols = ['Cabor','Jumlah Atlet','Sudah Tes','Avg Skor (%)','Top Performer','Skor Tertinggi']
        const caborMap: Record<string,{total:number;tested:number;sumSkor:number;top:string;topSkor:number}> = {}
        atlets.forEach(a=>{
          const c = a.cabor_nama_raw||'Lainnya'
          if (!caborMap[c]) caborMap[c]={total:0,tested:0,sumSkor:0,top:'',topSkor:0}
          caborMap[c].total++
          const t = tesFisikMap[a.id]
          if (t?.kesimpulan_persen != null) {
            caborMap[c].tested++
            caborMap[c].sumSkor += t.kesimpulan_persen
            if (t.kesimpulan_persen > caborMap[c].topSkor) {
              caborMap[c].topSkor = t.kesimpulan_persen
              caborMap[c].top = a.nama_lengkap
            }
          }
        })
        const data = Object.entries(caborMap)
          .filter(([,v])=>v.tested>0)
          .map(([c,v])=>[
            c, v.total, v.tested,
            Math.round(v.sumSkor/v.tested) + '%',
            v.top||'-', v.topSkor+'%',
          ])
          .sort((a:any,b:any)=>parseInt(b[3])-parseInt(a[3]))
        return { title:`Laporan Tes Biomotorik per Cabor — ${tanggal}`, columns:cols, data, isDemo:false }
      }

      case 'top-elit': {
        const cols = ['Rank','Nama Lengkap','Cabor','Skor (%)','Kategori','BMI','Gender','Usia']
        const ranked = atlets
          .filter(a=>tesFisikMap[a.id]?.kesimpulan_persen != null)
          .sort((a,b)=>(tesFisikMap[b.id]!.kesimpulan_persen||0)-(tesFisikMap[a.id]!.kesimpulan_persen||0))
          .slice(0, 50)
        const data = ranked.map((a,i)=>{
          const t = tesFisikMap[a.id]!
          return [
            i+1, a.nama_lengkap, a.cabor_nama_raw,
            t.kesimpulan_persen+'%', t.kesimpulan_kategori||'-',
            t.bmi?.toFixed(1)||'-', a.gender, hitungUmur(a.tgl_lahir)+' th',
          ]
        })
        return { title:`Top 50 Atlet Elit — Skor Biomotorik — ${tanggal}`, columns:cols, data, isDemo:false }
      }

      case 'atlet-risk': {
        const cols = ['Nama Lengkap','Cabor','Skor (%)','Kategori','BMI','Rekomendasi']
        const data = atlets
          .filter(a=>{
            const t = tesFisikMap[a.id]
            return t?.kesimpulan_persen != null && t.kesimpulan_persen < 50
          })
          .map(a=>{
            const t = tesFisikMap[a.id]!
            return [
              a.nama_lengkap, a.cabor_nama_raw,
              t.kesimpulan_persen+'%', t.kesimpulan_kategori||'-',
              t.bmi?.toFixed(1)||'-',
              'Butuh latihan tambahan + monitoring',
            ]
          })
          .sort((a:any,b:any)=>parseInt(a[2])-parseInt(b[2]))
        return { title:`Laporan Atlet Risk — Skor < 50% — ${tanggal}`, columns:cols, data, isDemo:false }
      }

      // ════ KATEGORI AUDIT ════
      case 'audit-nik': {
        const cols = ['Nama','NIK','Cabor','Kode Wilayah','Asal','Status Lokal','Panjang','Valid?']
        const data = atlets.map(a=>[
          a.nama_lengkap, a.no_ktp||'-', a.cabor_nama_raw,
          a.kode_asal_daerah||'-', a.nama_asal_daerah||'-',
          a.kode_asal_daerah?.startsWith('3201')?'LOKAL':'NON-LOKAL',
          String(a.no_ktp||'').length,
          String(a.no_ktp||'').length===16?'✓ Valid':'✗ Invalid',
        ])
        return { title:`Laporan Audit NIK — ${NAMA_KAB}`, columns:cols, data, isDemo:false }
      }

      case 'kelengkapan': {
        const cols = ['Nama','Cabor','NIK','Kemeja','Sepatu','Bank','Rek','Score']
        const data = atlets.map(a=>{
          const fields = [a.no_ktp,a.ukuran_kemeja,a.ukuran_sepatu,a.nama_bank,a.no_rekening]
          const filled = fields.filter(Boolean).length
          return [
            a.nama_lengkap, a.cabor_nama_raw,
            a.no_ktp?'✓':'✗', a.ukuran_kemeja?'✓':'✗', a.ukuran_sepatu?'✓':'✗',
            a.nama_bank?'✓':'✗', a.no_rekening?'✓':'✗',
            `${Math.round(filled/fields.length*100)}%`,
          ]
        })
        return { title:`Laporan Kelengkapan Data — ${tanggal}`, columns:cols, data, isDemo:false }
      }

      case 'compliance-dokumen': {
        const cols = ['Jenis Dokumen','Mandatory?','Verified','Pending','Rejected','% Compliance']
        const data = dokumenStats.map(d=>[
          d.nama, d.is_mandatory?'WAJIB':'Opsional',
          d.verified||0, d.uploaded||0, d.rejected||0,
          `${Math.round(((d.verified||0)/(d.total_atlet||1))*100)}%`,
        ])
        return { title:`Compliance Dokumen Atlet — ${tanggal}`, columns:cols, data, isDemo:false }
      }

      // ════ KATEGORI PRESTASI ════
      case 'prestasi-summary': {
        const cols = ['Cabor','Atlet dengan Prestasi','Total Emas','Total Perak','Total Perunggu']
        const caborMap: Record<string,{atlets:Set<number>;e:number;p:number;pg:number}> = {}
        atlets.forEach(a=>{
          if (!caborMap[a.cabor_nama_raw]) {
            caborMap[a.cabor_nama_raw] = {atlets:new Set(),e:0,p:0,pg:0}
          }
        })
        riwayatData.forEach(r=>{
          const atlet = atlets.find(a=>a.id===r.atlet_id)
          if (!atlet) return
          const c = atlet.cabor_nama_raw
          if (!caborMap[c]) return
          caborMap[c].atlets.add(r.atlet_id)
          if (r.hasil==='Emas')     caborMap[c].e++
          if (r.hasil==='Perak')    caborMap[c].p++
          if (r.hasil==='Perunggu') caborMap[c].pg++
        })
        const data = Object.entries(caborMap)
          .filter(([,v])=>v.atlets.size>0)
          .map(([c,v])=>[c, v.atlets.size, v.e, v.p, v.pg])
          .sort((a:any,b:any)=>(b[2]+b[3]+b[4])-(a[2]+a[3]+a[4]))
        return { title:`Summary Prestasi per Cabor — ${tanggal}`, columns:cols, data, isDemo:false }
      }

      // ════ DEMO PLACEHOLDERS ════
      case 'manifest-akomodasi': {
        const cols = ['Atlet','Cabor','Hotel','No Kamar','Bus','Seat']
        const hotels = ['Hotel Permata','Hotel Pakuan','Hotel Royal Bogor','Wisma KONI']
        const data = verified.slice(0, 30).map((a,i)=>[
          a.nama_lengkap, a.cabor_nama_raw,
          hotels[i % hotels.length],
          `${Math.floor(i/4)+101}`,
          `Bus ${Math.floor(i/10)+1}`,
          `Seat ${(i%10)+1}`,
        ])
        return { title:`Manifest Akomodasi & Transport — ${tanggal}`, columns:cols, data, isDemo:true }
      }

      default:
        return { title:'', columns:[], data:[], isDemo:false }
    }
  },[atlets, tesFisikMap, perlengkapanData, riwayatData, dokumenStats])

  function exportCSV(id: string) {
    const { title, columns, data } = getLaporanData(id)
    const rows = [columns, ...data]
    const csv  = rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'})
    const url  = URL.createObjectURL(blob)
    const el   = document.createElement('a')
    el.href    = url
    el.download= `${id}_kabbogor_${new Date().toISOString().slice(0,10)}.csv`
    el.click(); URL.revokeObjectURL(url)
  }

  function printLaporan(id: string) {
    const { title, columns, data, isDemo } = getLaporanData(id)
    const html = `<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:10px;color:#111;padding:20px}
      h2{font-size:13px;margin-bottom:4px}p{color:#666;margin-bottom:14px;font-size:10px}
      table{width:100%;border-collapse:collapse}
      th{background:#065f46;color:#fff;padding:5px 8px;text-align:left;font-size:9px;text-transform:uppercase}
      td{padding:4px 8px;border-bottom:1px solid #e5e7eb;font-size:9px}
      tr:nth-child(even){background:#f9fafb}
      .demo{background:#fef3c7;color:#92400e;padding:6px 12px;border:1px solid #fbbf24;border-radius:4px;margin-bottom:12px;font-weight:bold}
      @media print{button{display:none}}
    </style></head><body>
    <h2>${title}</h2>
    <p>Kontingen ${NAMA_KAB} · PORPROV XV Jawa Barat 2026 · ${data.length} baris</p>
    ${isDemo?'<div class="demo">⚠ DATA DEMO/PREVIEW — Nominal & detail dapat berbeda dengan kondisi real</div>':''}
    <button onclick="window.print()" style="margin-bottom:12px;padding:6px 16px;background:#065f46;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px">🖨 Print</button>
    <table><thead><tr>${columns.map(c=>`<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${data.map(row=>`<tr>${row.map(c=>`<td>${c??'—'}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></body></html>`
    const w = window.open('','_blank')
    w?.document.write(html); w?.document.close()
  }

  function handleGenerate(id: string, mode: 'preview'|'csv'|'print') {
    setGenerating(id)
    setTimeout(()=>{
      if (mode==='preview') {
        const { title, columns, data, isDemo } = getLaporanData(id)
        setPreview({ title, columns, data, isDemo })
      } else if (mode==='csv') {
        exportCSV(id)
      } else {
        printLaporan(id)
      }
      setGenerating(null)
    }, 300)
  }

  // ── REPORT DEFINITIONS ────────────────────────────────────
  const REPORTS: ReportDef[] = [
    // FEATURED
    {
      id:'tes-biomotorik-cabor', title:'Tes Biomotorik per Cabor', category:'Sport Science',
      desc:'Average skor fisik + top performer per cabor (data FPOK UPI).',
      icon:Activity, color:'#10b981', isFeatured:true, isDemo:false,
      count:analytics.sudahTes, countLabel:'atlet tested',
      completion:analytics.total>0?Math.round(analytics.sudahTes/analytics.total*100):0,
      completionLabel:`avg skor ${analytics.avgSkor}%`,
    },
    {
      id:'estimasi-bonus', title:'Estimasi Bonus Medali', category:'Keuangan',
      desc:'Prediksi bonus Rp 50jt/emas, Rp 30jt/perak, Rp 15jt/perunggu × track record.',
      icon:DollarSign, color:'#fbbf24', isFeatured:true, isDemo:true,
      count:analytics.atletDenganPrestasi, countLabel:'atlet potensial',
      completion:analytics.total>0?Math.round(analytics.atletDenganPrestasi/analytics.total*100):0,
      completionLabel:`${analytics.totalEmas}🥇 ${analytics.totalPerak}🥈 ${analytics.totalPerunggu}🥉`,
    },
    {
      id:'compliance-dokumen', title:'Compliance Dokumen', category:'Audit',
      desc:'Status KTP/KK/Akta/Ijazah/Surat Sehat/Vaksin per atlet (10 jenis dokumen).',
      icon:ShieldCheck, color:'#3b82f6', isFeatured:true, isDemo:false,
      count:dokumenStats.length, countLabel:'jenis dokumen',
      completion:dokumenStats.length>0?Math.round((analytics.totalDokumen/(dokumenStats.length*analytics.total||1))*100):0,
      completionLabel:'verified compliance',
    },
    {
      id:'po-apparel-detail', title:'PO Apparel Detail', category:'Logistik',
      desc:'Purchase Order detail per 7 item × ukuran × harga untuk supplier.',
      icon:Package, color:'#a855f7', isFeatured:true, isDemo:false,
      count:analytics.adaPerlengkapan, countLabel:'atlet terisi',
      completion:analytics.total>0?Math.round(analytics.adaPerlengkapan/analytics.total*100):0,
      completionLabel:'data perlengkapan',
    },

    // ADMIN
    {
      id:'sk-kontingen', title:'SK Kontingen', category:'Admin',
      desc:'Daftar atlet lolos verifikasi untuk lampiran SK Bupati.',
      icon:Users, color:'#4ade80', isDemo:false,
      count:analytics.verified, countLabel:'atlet lolos',
      completion:analytics.total>0?Math.round(analytics.hasNIK/analytics.total*100):0,
      completionLabel:`${analytics.hasNIK} NIK valid`,
    },

    // LOGISTIK
    {
      id:'logistik-apparel', title:'RAB Logistik & Apparel', category:'Logistik',
      desc:'Rekap ukuran kemeja & sepatu per cabor.',
      icon:Shirt, color:'#60a5fa', isDemo:false,
      count:analytics.hasApparel, countLabel:'data lengkap',
      completion:analytics.total>0?Math.round(analytics.hasApparel/analytics.total*100):0,
      completionLabel:`${analytics.total-analytics.hasApparel} belum lengkap`,
    },
    {
      id:'rekap-ukuran', title:'Rekap Ukuran Kemeja', category:'Logistik',
      desc:'Summary S/M/L/XL/XXL untuk pemesanan vendor.',
      icon:PieChart, color:'#a78bfa', isDemo:false,
      count:analytics.hasApparel, countLabel:'data tersedia',
      completion:analytics.total>0?Math.round(analytics.hasApparel/analytics.total*100):0,
      completionLabel:'kelengkapan ukuran',
    },

    // KEUANGAN
    {
      id:'distribusi-bonus', title:'Rekening & Keuangan', category:'Keuangan',
      desc:'Daftar bank & nomor rekening atlet untuk transfer.',
      icon:CreditCard, color:'#fbbf24', isDemo:false,
      count:analytics.hasRek, countLabel:'rekening terdata',
      completion:analytics.total>0?Math.round(analytics.hasRek/analytics.total*100):0,
      completionLabel:`${analytics.total-analytics.hasRek} belum isi`,
    },
    {
      id:'uang-saku', title:'Plan Uang Saku Harian', category:'Keuangan',
      desc:`Rp ${UANG_SAKU_HARIAN.toLocaleString('id')}/hari × ${TOTAL_HARI_PORPROV} hari × atlet verified.`,
      icon:Calendar, color:'#f59e0b', isDemo:true,
      count:analytics.verified, countLabel:'atlet (uang saku)',
      completion:100, completionLabel:`Total ~${formatRp(analytics.verified*UANG_SAKU_HARIAN*TOTAL_HARI_PORPROV).replace('Rp ','Rp')}`,
    },

    // SPORT SCIENCE
    {
      id:'top-elit', title:'Top 50 Atlet Elit', category:'Sport Science',
      desc:'Ranking atlet berdasarkan skor biomotorik tertinggi.',
      icon:Star, color:'#fbbf24', isDemo:false,
      count:analytics.skorTinggi, countLabel:'atlet elit',
      completion:analytics.sudahTes>0?Math.round(analytics.skorTinggi/analytics.sudahTes*100):0,
      completionLabel:'skor ≥ 80%',
    },
    {
      id:'atlet-risk', title:'Atlet Risk Performance', category:'Sport Science',
      desc:'Atlet dengan skor < 50% — butuh latihan tambahan.',
      icon:AlertTriangle, color:'#ef4444', isDemo:false,
      count:analytics.skorRendah, countLabel:'atlet risk',
      completion:analytics.sudahTes>0?Math.round(analytics.skorRendah/analytics.sudahTes*100):0,
      completionLabel:'butuh attention',
    },

    // AUDIT
    {
      id:'audit-nik', title:'Audit Integritas NIK', category:'Audit',
      desc:'Analisa lokal vs non-lokal berdasarkan kode wilayah KTP.',
      icon:ShieldCheck, color:'#f87171', isDemo:false,
      count:analytics.lokal, countLabel:'atlet lokal',
      completion:analytics.total>0?Math.round(analytics.lokal/analytics.total*100):0,
      completionLabel:`${analytics.nonLokal} non-lokal`,
    },
    {
      id:'kelengkapan', title:'Kelengkapan Data per Atlet', category:'Audit',
      desc:'Score kelengkapan 5 field kritis per atlet.',
      icon:BarChart2, color:ACCENT, isDemo:false,
      count:analytics.total, countLabel:'atlet diperiksa',
      completion:Math.round((analytics.hasNIK+analytics.hasApparel+analytics.hasRek)/(3*analytics.total||1)*100),
      completionLabel:'avg kelengkapan',
    },

    // PRESTASI
    {
      id:'prestasi-summary', title:'Summary Prestasi per Cabor', category:'Prestasi',
      desc:'Akumulasi medali historis (PORPROV, PON, KEJURNAS).',
      icon:Trophy, color:'#fbbf24', isDemo:true,
      count:analytics.atletDenganPrestasi, countLabel:'atlet berprestasi',
      completion:analytics.total>0?Math.round(analytics.atletDenganPrestasi/analytics.total*100):0,
      completionLabel:`${analytics.totalEmas+analytics.totalPerak+analytics.totalPerunggu} medali`,
    },

    // DEMO ONLY
    {
      id:'manifest-akomodasi', title:'Manifest Akomodasi & Transport', category:'Logistik',
      desc:'Daftar hotel + nomor kamar + alokasi bus per atlet (placeholder).',
      icon:Bus, color:'#06b6d4', isDemo:true,
      count:0, countLabel:'butuh data hotel',
      completion:0, completionLabel:'belum tersedia',
    },
  ]

  const filtered = REPORTS.filter(r=>{
    if (activeTab === 'Semua') return true
    if (activeTab === 'Featured') return r.isFeatured
    return r.category === activeTab
  })

  const tabCounts: Record<TabFilter, number> = {
    'Semua':         REPORTS.length,
    'Featured':      REPORTS.filter(r=>r.isFeatured).length,
    'Admin':         REPORTS.filter(r=>r.category==='Admin').length,
    'Logistik':      REPORTS.filter(r=>r.category==='Logistik').length,
    'Keuangan':      REPORTS.filter(r=>r.category==='Keuangan').length,
    'Sport Science': REPORTS.filter(r=>r.category==='Sport Science').length,
    'Audit':         REPORTS.filter(r=>r.category==='Audit').length,
    'Prestasi':      REPORTS.filter(r=>r.category==='Prestasi').length,
  }

  const demoCount = REPORTS.filter(r=>r.isDemo).length

  const ani=(d=0)=>({
    style:{transitionDelay:`${d}ms`,transition:'all 0.5s ease'},
    className:animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-4',
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#020d06'}}>
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{color:ACCENT}}/>
        <p className="font-mono text-xs uppercase tracking-widest" style={{color:ACCENT}}>Memuat Pusat Laporan...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen text-zinc-300 font-sans flex flex-col"
      style={{background:'linear-gradient(135deg,#020d06 0%,#030e08 100%)'}}>

      <div className="fixed inset-0 pointer-events-none"
        style={{backgroundImage:`linear-gradient(${ACCENT}03 1px,transparent 1px),linear-gradient(90deg,${ACCENT}03 1px,transparent 1px)`,backgroundSize:'24px 24px',zIndex:0}}/>

      {/* HEADER */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl px-6 py-4"
        style={{background:'rgba(2,13,6,0.95)',borderColor:`${ACCENT}12`}}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{background:`${ACCENT}12`,border:`1px solid ${ACCENT}25`}}>
              <FileSearch size={20} style={{color:ACCENT}}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Pusat Laporan Kontingen</h1>
              <p className="text-[11px] font-mono mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>
                {REPORTS.length} laporan ({demoCount} demo) · Kab. Bogor · {analytics.total.toLocaleString('id')} atlet
              </p>
            </div>
          </div>
          <button onClick={()=>window.location.reload()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
            style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.4)'}}>
            <RefreshCw size={11}/> Refresh
          </button>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative z-10 space-y-5">

        {/* DEMO BANNER */}
        {demoCount > 0 && (
          <div {...ani(0)} className="rounded-2xl p-4 relative overflow-hidden"
            style={{
              background:'linear-gradient(135deg, rgba(251,191,36,0.06) 0%, rgba(245,158,11,0.04) 100%)',
              border:'1px solid rgba(251,191,36,0.25)',
            }}>
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{backgroundImage:`repeating-linear-gradient(45deg, #fbbf24 0, #fbbf24 1px, transparent 1px, transparent 12px)`}}/>
            <div className="relative flex items-start gap-3 flex-wrap">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{background:'rgba(251,191,36,0.15)',border:'1px solid rgba(251,191,36,0.3)'}}>
                <AlertTriangle size={16} className="text-amber-400"/>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="text-sm font-black text-amber-300 mb-1 flex items-center gap-2 flex-wrap">
                  Mode Preview — {demoCount} Laporan Demo
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest"
                    style={{background:'rgba(251,191,36,0.2)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.4)'}}>
                    Badge ⚠DEMO
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Sebagian laporan berisi data demo/dummy (nominal Rupiah, hotel, bus, dll) untuk preview. Saat data real masuk, laporan akan otomatis update.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ════════ CRITICAL ALERTS ════════ */}
        <div {...ani(10)} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CriticalAlertsCard
            primary={ACCENT}
            title="Legalitas & Keuangan"
            alerts={keuanganAlerts}
            maxShow={4}
          />
          <CriticalAlertsCard
            primary="#f97316"
            title="Performa & Logistik"
            alerts={performaAlerts}
            maxShow={4}
          />
        </div>

        {/* TAB FILTER */}
        <div {...ani(20)} className="flex items-center gap-2 flex-wrap p-1 rounded-2xl"
          style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.07)'}}>
          {(['Featured','Semua','Admin','Logistik','Keuangan','Sport Science','Audit','Prestasi'] as TabFilter[]).map(t=>(
            <button key={t} onClick={()=>setActiveTab(t)}
              className="px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5"
              style={{
                background: activeTab===t?`${ACCENT}18`:'transparent',
                color:      activeTab===t?ACCENT:'rgba(255,255,255,0.4)',
                border:     activeTab===t?`1px solid ${ACCENT}30`:'1px solid transparent',
              }}>
              {t==='Featured' && <Star size={11}/>}
              {t} ({tabCounts[t]})
            </button>
          ))}
        </div>

        {/* REPORT GRID */}
        <div {...ani(40)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r=>{
            const Icon = r.icon
            const isGen = generating===r.id
            return (
              <div key={r.id} className="rounded-2xl p-5 relative overflow-hidden group transition-all"
                style={{
                  background: r.isDemo?'rgba(251,191,36,0.025)':'rgba(255,255,255,0.025)',
                  border: `1px solid ${r.isDemo?'rgba(251,191,36,0.18)':r.color+'18'}`,
                }}>
                {/* Striped pattern untuk DEMO */}
                {r.isDemo && (
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{backgroundImage:`repeating-linear-gradient(45deg, #fbbf24 0, #fbbf24 1px, transparent 1px, transparent 10px)`}}/>
                )}

                {/* Top border accent */}
                <div className="absolute top-0 left-0 right-0 h-0.5"
                  style={{background:`linear-gradient(90deg,transparent,${r.color}40,transparent)`}}/>

                <div className="relative">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{background:`${r.color}12`,border:`1px solid ${r.color}25`}}>
                      <Icon size={22} style={{color:r.color}}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest"
                          style={{color:`${r.color}80`}}>{r.category}</span>
                        {r.isFeatured && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-black"
                            style={{background:'rgba(0,255,170,0.15)',color:ACCENT,border:`1px solid ${ACCENT}30`}}>
                            ⭐ FEATURED
                          </span>
                        )}
                        {r.isDemo && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-black flex items-center gap-1"
                            style={{background:'rgba(251,191,36,0.15)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.35)'}}>
                            <AlertTriangle size={7}/> DEMO
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white mb-1">{r.title}</h3>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">{r.desc}</p>
                    </div>
                  </div>

                  {/* Count + Completion */}
                  <div className="flex items-center justify-between mb-3 pt-2 border-t"
                    style={{borderColor:'rgba(255,255,255,0.05)'}}>
                    <div>
                      <div className="text-2xl font-light" style={{color:r.color}}>
                        {r.count.toLocaleString('id')}
                      </div>
                      <div className="text-[9px] text-zinc-600">{r.countLabel}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold" style={{color:r.color}}>{r.completion}%</div>
                      <div className="text-[9px] text-zinc-600 max-w-[120px] truncate">{r.completionLabel}</div>
                    </div>
                  </div>
                  <Bar value={r.completion} max={100} color={r.color} h={3}/>

                  {/* Actions */}
                  <div className="flex gap-1.5 mt-3">
                    <button onClick={()=>handleGenerate(r.id,'preview')} disabled={isGen}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold transition-all disabled:opacity-50"
                      style={{background:`${r.color}10`,color:r.color,border:`1px solid ${r.color}25`}}>
                      {isGen ? <Loader2 size={12} className="animate-spin"/> : <Eye size={12}/>}
                      Preview
                    </button>
                    <button onClick={()=>handleGenerate(r.id,'csv')} disabled={isGen}
                      className="flex items-center justify-center px-3 py-2 rounded-xl text-[11px] font-bold transition-all disabled:opacity-50"
                      style={{background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.6)',border:'1px solid rgba(255,255,255,0.08)'}}>
                      <Download size={12}/>
                    </button>
                    <button onClick={()=>handleGenerate(r.id,'print')} disabled={isGen}
                      className="flex items-center justify-center px-3 py-2 rounded-xl transition-all disabled:opacity-50"
                      style={{background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.4)',border:'1px solid rgba(255,255,255,0.08)'}}>
                      <Printer size={12}/>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm" style={{color:'rgba(255,255,255,0.2)'}}>
            <FileText size={40} className="mx-auto mb-3 opacity-20"/>
            Tidak ada laporan di kategori ini
          </div>
        )}

        {/* INFO ROADMAP */}
        <div {...ani(100)} className="rounded-2xl p-5"
          style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)'}}>
          <div className="flex items-start gap-3 mb-4">
            <Info size={15} style={{color:ACCENT,flexShrink:0,marginTop:2}}/>
            <div>
              <div className="text-sm font-bold text-white mb-1">🚀 Roadmap Laporan Lanjutan</div>
              <p className="text-[11px] text-zinc-500">
                Saat semua data siap, laporan-laporan ini bisa di-aktifkan:
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 ml-7">
            {[
              {l:'Daily Medal Report',     d:'Update medali per hari PORPROV (dari Jurnal Pertandingan)', s:'Saat PORPROV jalan'},
              {l:'SPJ Honor Pelatih',      d:'Butuh tabel pelatih + tarif',                                s:'Perlu data pelatih'},
              {l:'Realisasi vs Anggaran',  d:'Tracking real-time budget kontingen',                        s:'Perlu setup anggaran'},
              {l:'Absensi Latihan',        d:'QR scan atau input manual per sesi latihan',                 s:'Perlu setup DB'},
              {l:'Sertifikat Tes Fisik',   d:'Print individual per atlet (sertifikat resmi)',              s:'Tinggal template'},
              {l:'Laporan Akhir PORPROV',  d:'Compile semua data setelah event selesai',                   s:'End-of-event'},
            ].map(f=>(
              <div key={f.l} className="rounded-xl p-3"
                style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div className="text-xs font-bold text-zinc-300 mb-1">{f.l}</div>
                <div className="text-[10px] text-zinc-500 leading-relaxed mb-2">{f.d}</div>
                <div className="text-[9px] font-bold text-amber-400">📋 {f.s}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      {preview && (
        <PreviewModal
          title={preview.title}
          data={preview.data}
          columns={preview.columns}
          isDemo={preview.isDemo}
          onClose={()=>setPreview(null)}
          onExportCSV={()=>{
            const found = REPORTS.find(r=>getLaporanData(r.id).title===preview.title)
            if (found) exportCSV(found.id)
            setPreview(null)
          }}
          onPrint={()=>{
            const found = REPORTS.find(r=>getLaporanData(r.id).title===preview.title)
            if (found) printLaporan(found.id)
          }}
        />
      )}
    </div>
  )
}