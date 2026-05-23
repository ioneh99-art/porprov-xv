'use client'
// src/app/konida/laporan/page.tsx — v2
// FULLY REAL: SK Kontingen, Apparel, Rekening, Audit NIK
// Data langsung dari tabel atlet DB

import { useState, useMemo, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  FileText, Download, Printer, Shirt, Users,
  CreditCard, ShieldCheck, FileSearch, PieChart,
  CheckCircle, RefreshCw, AlertTriangle, X,
  BarChart2, TrendingUp, Loader2, Info,
  MapPin, Building2, Hash, Eye,
} from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const KONTINGEN_ID = 1
const ACCENT       = '#00ffaa'
const NAMA_KAB     = 'KABUPATEN BOGOR'

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

// ── Preview Modal ─────────────────────────────────────────
function PreviewModal({
  title, data, columns, onClose, onExportCSV, onPrint
}:{
  title:string
  data:any[][]
  columns:string[]
  onClose:()=>void
  onExportCSV:()=>void
  onPrint:()=>void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{background:'rgba(0,0,0,0.8)',backdropFilter:'blur(6px)'}}>
      <div className="w-full max-w-[900px] rounded-2xl overflow-hidden flex flex-col"
        style={{background:'#040f08',border:`1px solid ${ACCENT}20`,maxHeight:'85vh',boxShadow:'0 25px 60px rgba(0,0,0,0.8)'}}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{borderColor:`${ACCENT}12`,background:`${ACCENT}04`}}>
          <div>
            <div className="text-white font-bold">{title}</div>
            <div className="text-[11px] mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>
              Preview {data.length} baris · {columns.length} kolom
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

        {/* Table */}
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
                <tr key={i} className="border-b transition-colors"
                  style={{borderColor:'rgba(255,255,255,0.04)'}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.02)'}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
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

// ── Main ──────────────────────────────────────────────────
export default function PageLaporan() {
  const [atlets,      setAtlets]      = useState<AtletDB[]>([])
  const [loading,     setLoading]     = useState(true)
  const [generating,  setGenerating]  = useState<string|null>(null)
  const [activeTab,   setActiveTab]   = useState<'Semua'|'Admin'|'Logistik'|'Keuangan'|'Audit'>('Semua')
  const [preview,     setPreview]     = useState<{title:string;data:any[][];columns:string[]}|null>(null)
  const [animIn,      setAnimIn]      = useState(false)

  useEffect(()=>{ const t=setTimeout(()=>setAnimIn(true),80); return()=>clearTimeout(t) },[])

  useEffect(()=>{
    async function load() {
      const { data, error } = await sb
        .from('atlet')
        .select('id,nama_lengkap,no_ktp,tgl_lahir,gender,cabor_nama_raw,kode_asal_daerah,nama_asal_daerah,no_registrasi_koni,status_registrasi,ukuran_kemeja,ukuran_sepatu,nama_bank,no_rekening')
        .eq('kontingen_id', KONTINGEN_ID)
        .order('cabor_nama_raw',{ascending:true})
        .order('nama_lengkap',{ascending:true})
      if (!error && data) setAtlets(data as AtletDB[])
      setLoading(false)
    }
    void load()
  },[])

  // ── Analytics real ────────────────────────────────────────
  const analytics = useMemo(()=>{
    const total      = atlets.length
    const verified   = atlets.filter(a=>a.status_registrasi==='Verified').length
    const hasApparel = atlets.filter(a=>a.ukuran_kemeja&&a.ukuran_sepatu).length
    const hasRek     = atlets.filter(a=>a.nama_bank&&a.no_rekening).length
    const hasNIK     = atlets.filter(a=>a.no_ktp&&a.no_ktp.length===16).length
    const lokal      = atlets.filter(a=>a.kode_asal_daerah?.startsWith('3201')).length
    const nonLokal   = total-lokal

    // Rekap ukuran kemeja
    const kemeja: Record<string,number> = {}
    atlets.forEach(a=>{ if(a.ukuran_kemeja) kemeja[a.ukuran_kemeja]=(kemeja[a.ukuran_kemeja]||0)+1 })

    // Rekap ukuran sepatu
    const sepatu: Record<string,number> = {}
    atlets.forEach(a=>{ if(a.ukuran_sepatu) sepatu[a.ukuran_sepatu]=(sepatu[a.ukuran_sepatu]||0)+1 })

    // Bank distribution
    const bank: Record<string,number> = {}
    atlets.filter(a=>a.nama_bank).forEach(a=>{ bank[a.nama_bank!]=(bank[a.nama_bank!]||0)+1 })

    // Asal daerah
    const asal: Record<string,number> = {}
    atlets.forEach(a=>{
      const key = a.kode_asal_daerah?.startsWith('3201') ? 'Lokal KBR' : (a.nama_asal_daerah||'Tidak Diketahui')
      asal[key]=(asal[key]||0)+1
    })

    return {
      total, verified, hasApparel, hasRek, hasNIK, lokal, nonLokal,
      kelengkapanAdmin:    total>0?Math.round(hasNIK/total*100):0,
      kelengkapanLogistik: total>0?Math.round(hasApparel/total*100):0,
      kelengkapanRekening: total>0?Math.round(hasRek/total*100):0,
      kelengkapanLokal:    total>0?Math.round(lokal/total*100):0,
      kemeja: Object.entries(kemeja).sort((a,b)=>b[1]-a[1]),
      sepatu: Object.entries(sepatu).sort((a,b)=>Number(a[0])-Number(b[0])),
      bank:   Object.entries(bank).sort((a,b)=>b[1]-a[1]),
      asal:   Object.entries(asal).sort((a,b)=>b[1]-a[1]),
    }
  },[atlets])

  // ── Generate data per laporan ─────────────────────────────
  const getLaporanData = useCallback((id: string): {title:string;columns:string[];data:any[][]} => {
    const verified = atlets.filter(a=>a.status_registrasi==='Verified'||a.status_registrasi==='Posted')
    const tanggal  = new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})

    switch(id) {

      case 'sk-kontingen': {
        const cols = ['No Reg KONI','Nama Lengkap','NIK / KTP','Tgl Lahir','Usia','Gender','Cabor','Asal Daerah','Status']
        const data = verified.map(a=>[
          a.no_registrasi_koni||'-',
          a.nama_lengkap,
          a.no_ktp||'-',
          a.tgl_lahir,
          hitungUmur(a.tgl_lahir)+' th',
          a.gender==='L'?'Laki-laki':'Perempuan',
          a.cabor_nama_raw,
          a.kode_asal_daerah?.startsWith('3201')?'Kab. Bogor (Lokal)':(a.nama_asal_daerah||'-'),
          a.status_registrasi,
        ])
        return { title:`Rekapitulasi SK Kontingen ${NAMA_KAB} — ${tanggal}`, columns:cols, data }
      }

      case 'logistik-apparel': {
        const cols = ['Nama Lengkap','Gender','Cabor','Ukuran Kemeja','Ukuran Sepatu','Status Apparel']
        const data = atlets.map(a=>[
          a.nama_lengkap,
          a.gender==='L'?'L':'P',
          a.cabor_nama_raw,
          a.ukuran_kemeja||'BELUM ISI',
          a.ukuran_sepatu||'BELUM ISI',
          a.ukuran_kemeja&&a.ukuran_sepatu?'Lengkap':'Belum Lengkap',
        ])
        return { title:`RAB Logistik & Apparel Kontingen ${NAMA_KAB} — ${tanggal}`, columns:cols, data }
      }

      case 'rekap-ukuran': {
        // Summary ukuran
        const cols = ['Ukuran Kemeja','Jumlah Atlet','%']
        const data = analytics.kemeja.map(([uk,n])=>[
          uk, n, `${Math.round(n/atlets.length*100)}%`
        ])
        return { title:`Rekap Ukuran Kemeja — ${tanggal}`, columns:cols, data }
      }

      case 'distribusi-bonus': {
        const cols = ['Nama Lengkap','Cabor','Bank','No Rekening','Atas Nama (Asumsi)','Status Rekening']
        const data = atlets.map(a=>[
          a.nama_lengkap,
          a.cabor_nama_raw,
          a.nama_bank||'BELUM ISI',
          a.no_rekening||'BELUM ISI',
          a.nama_lengkap, // asumsi atas nama sendiri
          a.nama_bank&&a.no_rekening?'Lengkap':'Belum Lengkap',
        ])
        return { title:`Daftar Rekening Atlet — Kontingen ${NAMA_KAB} — ${tanggal}`, columns:cols, data }
      }

      case 'audit-nik': {
        const cols = ['Nama Lengkap','NIK','Cabor','Kode Wilayah','Asal Daerah','Status Lokal','Panjang NIK','Valid?']
        const data = atlets.map(a=>[
          a.nama_lengkap,
          a.no_ktp||'-',
          a.cabor_nama_raw,
          a.kode_asal_daerah||'-',
          a.nama_asal_daerah||'-',
          a.kode_asal_daerah?.startsWith('3201')?'LOKAL':'NON-LOKAL',
          String(a.no_ktp||'').length,
          String(a.no_ktp||'').length===16?'✓ Valid':'✗ Invalid',
        ])
        return { title:`Laporan Audit NIK — Kontingen ${NAMA_KAB} — ${tanggal}`, columns:cols, data }
      }

      case 'kelengkapan': {
        // Per atlet: field mana yang sudah diisi
        const cols = ['Nama Lengkap','Cabor','NIK','Kemeja','Sepatu','Bank','Rekening','Score (%)']
        const data = atlets.map(a=>{
          const fields = [a.no_ktp,a.ukuran_kemeja,a.ukuran_sepatu,a.nama_bank,a.no_rekening]
          const filled = fields.filter(Boolean).length
          const pct    = Math.round(filled/fields.length*100)
          return [
            a.nama_lengkap, a.cabor_nama_raw,
            a.no_ktp?'✓':'✗',
            a.ukuran_kemeja?'✓':'✗',
            a.ukuran_sepatu?'✓':'✗',
            a.nama_bank?'✓':'✗',
            a.no_rekening?'✓':'✗',
            `${pct}%`,
          ]
        })
        return { title:`Laporan Kelengkapan Data — ${tanggal}`, columns:cols, data }
      }

      default:
        return { title:'', columns:[], data:[] }
    }
  },[atlets,analytics])

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
    const { title, columns, data } = getLaporanData(id)
    const html = `<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:10px;color:#111;padding:20px}
      h2{font-size:13px;margin-bottom:4px}p{color:#666;margin-bottom:14px;font-size:10px}
      table{width:100%;border-collapse:collapse}
      th{background:#065f46;color:#fff;padding:5px 8px;text-align:left;font-size:9px;text-transform:uppercase}
      td{padding:4px 8px;border-bottom:1px solid #e5e7eb;font-size:9px}
      tr:nth-child(even){background:#f9fafb}
      @media print{button{display:none}}
    </style></head><body>
    <h2>${title}</h2>
    <p>Kontingen Kabupaten Bogor · PORPROV XV Jawa Barat 2026 · Total: ${data.length} baris</p>
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
        const { title, columns, data } = getLaporanData(id)
        setPreview({ title, columns, data })
      } else if (mode==='csv') {
        exportCSV(id)
      } else {
        printLaporan(id)
      }
      setGenerating(null)
    }, 300)
  }

  const REPORTS = [
    {
      id:'sk-kontingen', title:'SK Kontingen', category:'Admin' as const,
      desc:'Daftar seluruh atlet & pelatih lolos verifikasi untuk lampiran SK Bupati.',
      icon:Users, color:'#4ade80',
      count: atlets.filter(a=>a.status_registrasi==='Verified'||a.status_registrasi==='Posted').length,
      countLabel:'atlet lolos',
      completion: analytics.kelengkapanAdmin,
      completionLabel:`${analytics.hasNIK} NIK valid`,
    },
    {
      id:'logistik-apparel', title:'RAB Logistik & Apparel', category:'Logistik' as const,
      desc:'Rekapitulasi ukuran kemeja & sepatu per cabor. Highlight atlet yang belum mengisi.',
      icon:Shirt, color:'#60a5fa',
      count: analytics.hasApparel,
      countLabel:'data lengkap',
      completion: analytics.kelengkapanLogistik,
      completionLabel:`${atlets.length-analytics.hasApparel} belum lengkap`,
    },
    {
      id:'distribusi-bonus', title:'Rekening & Keuangan', category:'Keuangan' as const,
      desc:'Daftar bank & nomor rekening atlet untuk keperluan uang saku dan bonus medali.',
      icon:CreditCard, color:'#fbbf24',
      count: analytics.hasRek,
      countLabel:'rekening terdata',
      completion: analytics.kelengkapanRekening,
      completionLabel:`${atlets.length-analytics.hasRek} belum isi`,
    },
    {
      id:'audit-nik', title:'Audit Integritas NIK', category:'Audit' as const,
      desc:'Analisa atlet lokal vs non-lokal berdasarkan kode wilayah KTP. Flag NIK tidak valid.',
      icon:ShieldCheck, color:'#f87171',
      count: analytics.lokal,
      countLabel:`lokal (${analytics.kelengkapanLokal}%)`,
      completion: analytics.kelengkapanLokal,
      completionLabel:`${analytics.nonLokal} non-lokal`,
    },
    {
      id:'kelengkapan', title:'Kelengkapan Data per Atlet', category:'Audit' as const,
      desc:'Score kelengkapan 5 field kritis per atlet: NIK, apparel, rekening.',
      icon:BarChart2, color:ACCENT,
      count: atlets.length,
      countLabel:'atlet diperiksa',
      completion: Math.round((analytics.kelengkapanAdmin+analytics.kelengkapanLogistik+analytics.kelengkapanRekening)/3),
      completionLabel:'avg kelengkapan',
    },
    {
      id:'rekap-ukuran', title:'Rekap Ukuran Kemeja', category:'Logistik' as const,
      desc:'Summary ukuran kemeja: jumlah S/M/L/XL/XXL/XXXL untuk pemesanan ke vendor.',
      icon:PieChart, color:'#a78bfa',
      count: analytics.kemeja.reduce((s,[,v])=>s+v,0),
      countLabel:'data ukuran',
      completion: analytics.kelengkapanLogistik,
      completionLabel:`${analytics.kemeja.length} ukuran berbeda`,
    },
  ]

  const filtered = REPORTS.filter(r=>activeTab==='Semua'||r.category===activeTab)

  const ani=(d=0)=>({
    style:{transitionDelay:`${d}ms`,transition:'all 0.5s ease'},
    className:animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-4',
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#020d06'}}>
      <div className="text-center">
        <div className="w-12 h-12 border-2 rounded-full animate-spin mx-auto mb-4"
          style={{borderColor:`${ACCENT}20`,borderTopColor:ACCENT}}/>
        <p className="font-mono text-xs uppercase tracking-widest" style={{color:ACCENT}}>Memuat Data Laporan...</p>
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
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{background:`${ACCENT}12`,border:`1px solid ${ACCENT}25`}}>
              <FileSearch size={20} style={{color:ACCENT}}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Pusat Laporan Kontingen</h1>
              <p className="text-[11px] font-mono mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>
                Otomatisasi Dokumen · Data Real dari DB · {atlets.length.toLocaleString('id')} atlet
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Tab filter */}
            <div className="flex gap-1 p-1 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              {(['Semua','Admin','Logistik','Keuangan','Audit'] as const).map(t=>(
                <button key={t} onClick={()=>setActiveTab(t)}
                  className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                  style={{
                    background: activeTab===t?`${ACCENT}18`:'transparent',
                    color:      activeTab===t?ACCENT:'rgba(255,255,255,0.4)',
                    border:     activeTab===t?`1px solid ${ACCENT}25`:'1px solid transparent',
                  }}>
                  {t}
                </button>
              ))}
            </div>
            <button onClick={()=>window.location.reload()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
              style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.4)'}}>
              <RefreshCw size={11}/> Refresh
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative z-10 space-y-5">

        {/* ANALYTICS DASHBOARD — 4 kartu */}
        <div {...ani(0)} className="grid grid-cols-4 gap-4">
          {[
            {
              l:'Kelengkapan Admin', v:analytics.kelengkapanAdmin, c:'#4ade80',
              sub:`${analytics.hasNIK} dari ${analytics.total} NIK valid`,
              icon:ShieldCheck,
            },
            {
              l:'Data Apparel', v:analytics.kelengkapanLogistik, c:'#60a5fa',
              sub:`${analytics.hasApparel} dari ${analytics.total} lengkap`,
              icon:Shirt,
            },
            {
              l:'Data Rekening', v:analytics.kelengkapanRekening, c:'#fbbf24',
              sub:`${analytics.hasRek} dari ${analytics.total} terdata`,
              icon:CreditCard,
            },
            {
              l:'Kemandirian Lokal', v:analytics.kelengkapanLokal, c:ACCENT,
              sub:`${analytics.lokal} lokal · ${analytics.nonLokal} non-lokal`,
              icon:MapPin,
            },
          ].map(s=>(
            <div key={s.l} className="rounded-2xl p-5 relative overflow-hidden"
              style={{background:'rgba(255,255,255,0.025)',border:`1px solid ${s.c}18`}}>
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:`${s.c}50`}}/>
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={13} style={{color:s.c}}/>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.l}</span>
              </div>
              <div className="text-3xl font-light mb-0.5" style={{color:s.c}}>{s.v}%</div>
              <div className="text-[10px] text-zinc-600 mb-3">{s.sub}</div>
              <Bar value={s.v} max={100} color={s.c} h={4}/>
            </div>
          ))}
        </div>

        {/* KELENGKAPAN DETAIL */}
        <div {...ani(40)} className="grid grid-cols-3 gap-4">

          {/* Ukuran kemeja */}
          <div className="rounded-2xl p-5"
            style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.07)'}}>
            <div className="flex items-center gap-2 mb-4">
              <Shirt size={13} style={{color:'#60a5fa'}}/>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Distribusi Ukuran Kemeja</span>
            </div>
            <div className="space-y-2">
              {analytics.kemeja.slice(0,6).map(([uk,n])=>(
                <div key={uk}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-zinc-300 font-bold">{uk}</span>
                    <span className="text-white font-mono">{n} pcs</span>
                  </div>
                  <Bar value={n} max={analytics.kemeja[0]?.[1]||1} color="#60a5fa" h={4}/>
                </div>
              ))}
              {analytics.kemeja.length===0 && (
                <div className="text-xs text-zinc-600 py-3 text-center">Data belum diisi atlet</div>
              )}
            </div>
          </div>

          {/* Bank distribution */}
          <div className="rounded-2xl p-5"
            style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.07)'}}>
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={13} style={{color:'#fbbf24'}}/>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Distribusi Bank</span>
            </div>
            <div className="space-y-2">
              {analytics.bank.slice(0,6).map(([bank,n])=>(
                <div key={bank}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-zinc-300 font-bold truncate flex-1 mr-2">{bank}</span>
                    <span className="text-white font-mono flex-shrink-0">{n}</span>
                  </div>
                  <Bar value={n} max={analytics.bank[0]?.[1]||1} color="#fbbf24" h={4}/>
                </div>
              ))}
              {analytics.bank.length===0 && (
                <div className="text-xs text-zinc-600 py-3 text-center">Data rekening belum diisi</div>
              )}
            </div>
          </div>

          {/* Asal daerah top */}
          <div className="rounded-2xl p-5"
            style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.07)'}}>
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={13} style={{color:ACCENT}}/>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Top Asal Daerah</span>
            </div>
            <div className="space-y-2">
              {analytics.asal.slice(0,6).map(([asal,n])=>{
                const isLok = asal==='Lokal KBR'
                return (
                  <div key={asal}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span style={{color:isLok?ACCENT:'#fb923c'}} className="font-bold truncate flex-1 mr-2">{asal}</span>
                      <span className="text-white font-mono flex-shrink-0">{n}</span>
                    </div>
                    <Bar value={n} max={analytics.asal[0]?.[1]||1} color={isLok?ACCENT:'#fb923c'} h={4}/>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* REPORT CARDS GRID */}
        <div {...ani(80)} className="grid grid-cols-2 gap-4">
          {filtered.map(r=>{
            const Icon = r.icon
            const isGen = generating===r.id
            return (
              <div key={r.id} className="rounded-2xl p-5 relative overflow-hidden group transition-all"
                style={{background:'rgba(255,255,255,0.025)',border:`1px solid ${r.color}18`}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor=`${r.color}35`}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor=`${r.color}18`}>

                {/* Decorative */}
                <div className="absolute top-0 left-0 right-0 h-0.5"
                  style={{background:`linear-gradient(90deg,transparent,${r.color}40,transparent)`}}/>
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                  <Icon size={100}/>
                </div>

                <div className="flex items-start gap-4">
                  {/* Icon + stats */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-2"
                      style={{background:`${r.color}12`,border:`1px solid ${r.color}25`}}>
                      <Icon size={22} style={{color:r.color}}/>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-black" style={{color:r.color}}>{r.count.toLocaleString('id')}</div>
                      <div className="text-[9px] text-zinc-600 leading-tight">{r.countLabel}</div>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest"
                        style={{color:`${r.color}80`}}>{r.category}</span>
                      <span className="text-[10px] font-bold" style={{color:r.color}}>{r.completion}%</span>
                    </div>
                    <h3 className="text-base font-bold text-white mb-1.5">{r.title}</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed mb-3">{r.desc}</p>

                    {/* Progress bar */}
                    <Bar value={r.completion} max={100} color={r.color} h={3}/>
                    <div className="text-[9px] mt-1 mb-4" style={{color:`${r.color}70`}}>{r.completionLabel}</div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button onClick={()=>handleGenerate(r.id,'preview')} disabled={isGen}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold transition-all disabled:opacity-50"
                        style={{background:`${r.color}10`,color:r.color,border:`1px solid ${r.color}25`}}>
                        {isGen ? <Loader2 size={12} className="animate-spin"/> : <Eye size={12}/>}
                        Preview
                      </button>
                      <button onClick={()=>handleGenerate(r.id,'csv')} disabled={isGen}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold transition-all disabled:opacity-50"
                        style={{background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.6)',border:'1px solid rgba(255,255,255,0.08)'}}>
                        <Download size={12}/> CSV
                      </button>
                      <button onClick={()=>handleGenerate(r.id,'print')} disabled={isGen}
                        className="flex items-center justify-center px-3 py-2 rounded-xl transition-all disabled:opacity-50"
                        style={{background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.4)',border:'1px solid rgba(255,255,255,0.08)'}}>
                        <Printer size={12}/>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* INFO — data yang belum tersedia */}
        <div {...ani(120)} className="rounded-2xl p-5 flex items-start gap-4"
          style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)'}}>
          <Info size={15} style={{color:ACCENT,flexShrink:0,marginTop:2}}/>
          <div className="w-full">
            <div className="text-sm font-bold text-white mb-3">📋 Laporan Yang Perlu Data Tambahan</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                {l:'SPJ Keuangan / RAB',    d:'Butuh tabel anggaran_kontingen + data harga satuan ATK, seragam, konsumsi, transport', status:'📋 Perlu Setup DB'},
                {l:'Absensi Latihan',       d:'Butuh tabel absensi_latihan. Siapkan QR scanner atau input manual per sesi latihan',    status:'📋 Perlu Setup DB'},
                {l:'Akomodasi & Transport', d:'Butuh tabel penginapan + bus_seat. Bisa diinput manual oleh admin kontingen',           status:'📋 Perlu Setup DB'},
              ].map(f=>(
                <div key={f.l} className="rounded-xl p-3"
                  style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                  <div className="text-xs font-bold text-zinc-300 mb-1">{f.l}</div>
                  <div className="text-[10px] text-zinc-500 leading-relaxed mb-2">{f.d}</div>
                  <div className="text-[9px] font-bold text-amber-400">{f.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      {preview && (
        <PreviewModal
          title={preview.title}
          data={preview.data}
          columns={preview.columns}
          onClose={()=>setPreview(null)}
          onExportCSV={()=>{ exportCSV(REPORTS.find(r=>getLaporanData(r.id).title===preview.title)?.id||''); setPreview(null) }}
          onPrint={()=>{ printLaporan(REPORTS.find(r=>getLaporanData(r.id).title===preview.title)?.id||'') }}
        />
      )}
    </div>
  )
}