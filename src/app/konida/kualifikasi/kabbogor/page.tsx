'use client'
// src/app/konida/kualifikasi/page.tsx — v3
// + Accordion kuota, tabel collapse 15 baris, print modal filter

import { useState, useMemo, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  ShieldAlert, Download, Search, CheckCircle, AlertTriangle,
  Users, Target, Lock, Unlock, RefreshCw, X,
  MapPin, ChevronDown, ChevronUp, ChevronRight,
  Printer, FileSpreadsheet, Filter,
} from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const KONTINGEN_ID  = 1
const ACCENT        = '#00ffaa'
const ROWS_DEFAULT  = 15
const CABOR_DEFAULT = 6

const KUOTA_REGULASI: Record<string, number> = {
  'Hockey':76,'Dayung':30,'Akuatik':30,'Sepak Bola':23,'Floorball':20,
  'Bola Basket':15,'Menembak':20,'Angkat Besi':20,'Bola Voli':14,
  'Panahan':20,'Atletik':30,'Pencak Silat':20,'Taekwondo':15,'Karate':15,
  'Judo':10,'Gulat':10,'Tinju':10,'Renang':20,'Senam':10,'Bulutangkis':10,
  'Tenis Meja':8,'Catur':8,'Biliar':8,'Petanque':8,'Panjat Tebing':10,
  'Selam':10,'Muaythai':10,'Binaraga':8,'Angkat Berat':8,'Dancesport':6,
}

interface AtletRow {
  id:number; nama_lengkap:string; no_ktp:string; tgl_lahir:string
  gender:string; cabor_nama_raw:string; kode_asal_daerah:string
  nama_asal_daerah:string; status_registrasi:string; no_registrasi_koni:number|null
}
interface CaborKuota {
  nama:string; kuota:number; verified:number; pending:number
  ditolak:number; posted:number; total:number; pct:number
  status:'OPEN'|'PENUH'|'OVER'|'KRITIS'
}

type FilterStatus = 'Semua'|'Verified'|'Menunggu Admin'|'Ditolak Admin'|'Posted'
type PrintStatus  = 'Semua'|'Verified'|'Menunggu Admin'|'Ditolak Admin'|'Posted'

function Bar({value,max,color,h=5}:{value:number;max:number;color:string;h?:number}) {
  return (
    <div className="rounded-full overflow-hidden" style={{height:h,background:'rgba(255,255,255,0.06)'}}>
      <div className="h-full rounded-full transition-all duration-700" style={{width:`${max>0?Math.min(value/max*100,100):0}%`,background:color}}/>
    </div>
  )
}

function hitungUmur(tgl:string) {
  if (!tgl) return 0
  return Math.floor((Date.now()-new Date(tgl).getTime())/(365.25*24*3600*1000))
}

// ── Print Modal ───────────────────────────────────────────
function PrintModal({
  atlets, caborList, onClose
}:{
  atlets:AtletRow[]
  caborList:string[]
  onClose:()=>void
}) {
  const [pStatus, setPStatus]   = useState<PrintStatus>('Verified')
  const [pCabor,  setPCabor]    = useState('Semua')
  const [pFormat, setPFormat]   = useState<'csv'|'print'>('csv')
  const [done,    setDone]      = useState(false)

  const preview = useMemo(()=>atlets.filter(a=>{
    const s = pStatus==='Semua' || a.status_registrasi===pStatus
    const c = pCabor==='Semua' || a.cabor_nama_raw===pCabor
    return s && c
  }),[atlets,pStatus,pCabor])

  const perCabor = useMemo(()=>{
    const m: Record<string,number> = {}
    preview.forEach(a=>{ m[a.cabor_nama_raw]=(m[a.cabor_nama_raw]||0)+1 })
    return Object.entries(m).sort((a,b)=>b[1]-a[1])
  },[preview])

  function handleExport() {
    if (pFormat==='csv') {
      const rows = [
        ['No','Nama','NIK','Usia','Gender','Cabor','Asal','Status','No Reg KONI'],
        ...preview.map((a,i)=>[
          i+1,a.nama_lengkap,a.no_ktp,hitungUmur(a.tgl_lahir),a.gender,
          a.cabor_nama_raw,a.nama_asal_daerah,a.status_registrasi,a.no_registrasi_koni||''
        ])
      ]
      const csv  = rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n')
      const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'})
      const url  = URL.createObjectURL(blob)
      const el   = document.createElement('a')
      el.href=url
      el.download=`kualifikasi_${pStatus.replace(' ','_')}_${pCabor.replace(/[^a-zA-Z0-9]/g,'_')}_${new Date().toISOString().slice(0,10)}.csv`
      el.click(); URL.revokeObjectURL(url)
    } else {
      // Print — buka window baru
      const html = `<!DOCTYPE html><html><head><title>Kualifikasi Kab. Bogor</title>
      <style>body{font-family:system-ui;font-size:11px;color:#111}h2{font-size:14px;margin-bottom:4px}
      p{color:#666;margin-bottom:12px}table{width:100%;border-collapse:collapse}
      th{background:#065f46;color:#fff;padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase}
      td{padding:5px 8px;border-bottom:1px solid #e5e7eb}tr:nth-child(even){background:#f9fafb}
      .badge{padding:2px 8px;border-radius:4px;font-weight:700;font-size:9px}
      .v{background:#d1fae5;color:#065f46}.p{background:#fef3c7;color:#92400e}
      .d{background:#fee2e2;color:#991b1b}.po{background:#dbeafe;color:#1e40af}
      @media print{button{display:none}}</style></head><body>
      <h2>Daftar Kualifikasi — Kontingen Kab. Bogor</h2>
      <p>Filter: ${pStatus} · Cabor: ${pCabor} · Total: ${preview.length} atlet · Dicetak: ${new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}</p>
      <button onclick="window.print()" style="margin-bottom:12px;padding:6px 16px;background:#065f46;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨 Print</button>
      <table><thead><tr><th>#</th><th>Nama Lengkap</th><th>NIK</th><th>Usia</th><th>Gender</th><th>Cabor</th><th>Asal Daerah</th><th>Status</th><th>No Reg KONI</th></tr></thead>
      <tbody>${preview.map((a,i)=>`<tr><td>${i+1}</td><td>${a.nama_lengkap}</td><td>${a.no_ktp||'-'}</td><td>${hitungUmur(a.tgl_lahir)}th</td><td>${a.gender}</td><td>${a.cabor_nama_raw}</td><td>${a.nama_asal_daerah||'Lokal'}</td><td><span class="badge ${a.status_registrasi==='Verified'?'v':a.status_registrasi==='Menunggu Admin'?'p':a.status_registrasi==='Ditolak Admin'?'d':'po'}">${a.status_registrasi}</span></td><td>${a.no_registrasi_koni?'#'+a.no_registrasi_koni:'-'}</td></tr>`).join('')}
      </tbody></table></body></html>`
      const w = window.open('','_blank')
      w?.document.write(html); w?.document.close()
    }
    setDone(true)
    setTimeout(()=>{ setDone(false); if(pFormat==='csv') onClose() },1200)
  }

  const STATUS_OPTS: {v:PrintStatus,l:string,c:string}[] = [
    {v:'Semua',          l:`Semua (${atlets.length})`,                                                    c:'rgba(255,255,255,0.4)'},
    {v:'Verified',       l:`✅ Verified (${atlets.filter(a=>a.status_registrasi==='Verified').length})`,  c:'#4ade80'},
    {v:'Menunggu Admin', l:`⏳ Pending (${atlets.filter(a=>a.status_registrasi==='Menunggu Admin').length})`, c:'#fbbf24'},
    {v:'Posted',         l:`📌 Posted (${atlets.filter(a=>a.status_registrasi==='Posted').length})`,      c:'#60a5fa'},
    {v:'Ditolak Admin',  l:`❌ Ditolak (${atlets.filter(a=>a.status_registrasi==='Ditolak Admin').length})`, c:'#f87171'},
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(6px)'}}>
      <div className="w-full max-w-[560px] rounded-2xl overflow-hidden"
        style={{background:'#040f08',border:`1px solid ${ACCENT}25`,boxShadow:'0 25px 60px rgba(0,0,0,0.8)'}}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b"
          style={{borderColor:`${ACCENT}12`,background:`${ACCENT}04`}}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{background:`${ACCENT}12`,border:`1px solid ${ACCENT}25`}}>
              <Printer size={18} style={{color:ACCENT}}/>
            </div>
            <div>
              <div className="text-white font-bold">Cetak / Export Kualifikasi</div>
              <div className="text-[11px] mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>Pilih filter sebelum export</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl"
            style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.4)'}}>
            <X size={15}/>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Format */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{color:'rgba(255,255,255,0.4)'}}>Format Output</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                {v:'csv'   as const, l:'📊 Export CSV', d:'File Excel-compatible'},
                {v:'print' as const, l:'🖨 Cetak PDF',  d:'Buka dialog print browser'},
              ].map(f=>(
                <button key={f.v} onClick={()=>setPFormat(f.v)}
                  className="p-3 rounded-xl text-left transition-all"
                  style={{
                    background: pFormat===f.v?`${ACCENT}15`:'rgba(255,255,255,0.03)',
                    border:     pFormat===f.v?`1px solid ${ACCENT}30`:'1px solid rgba(255,255,255,0.07)',
                  }}>
                  <div className="text-sm font-bold" style={{color:pFormat===f.v?ACCENT:'rgba(255,255,255,0.7)'}}>{f.l}</div>
                  <div className="text-[10px] mt-0.5 text-zinc-500">{f.d}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Filter Status */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{color:'rgba(255,255,255,0.4)'}}>Filter Status</div>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTS.map(s=>(
                <button key={s.v} onClick={()=>setPStatus(s.v)}
                  className="px-3 py-2 rounded-xl text-left text-xs font-bold transition-all"
                  style={{
                    background: pStatus===s.v?`${s.c}18`:'rgba(255,255,255,0.03)',
                    color:      pStatus===s.v?s.c:'rgba(255,255,255,0.4)',
                    border:     pStatus===s.v?`1px solid ${s.c}30`:'1px solid rgba(255,255,255,0.07)',
                  }}>
                  {s.l}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Cabor */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{color:'rgba(255,255,255,0.4)'}}>Filter Cabor</div>
            <select value={pCabor} onChange={e=>setPCabor(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.8)'}}
              onFocus={e=>e.target.style.borderColor=ACCENT}
              onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}>
              {caborList.map(c=>(
                <option key={c} value={c} style={{background:'#040f08'}}>{c}</option>
              ))}
            </select>
          </div>

          {/* Preview */}
          <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.07)'}}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-bold uppercase tracking-widest" style={{color:'rgba(255,255,255,0.4)'}}>Preview</div>
              <div className="text-xs font-black" style={{color:ACCENT}}>{preview.length} atlet</div>
            </div>
            <div className="flex gap-3 mb-3 flex-wrap">
              {[
                {l:'Putra',    v:preview.filter(a=>a.gender==='L').length,                              c:ACCENT    },
                {l:'Putri',    v:preview.filter(a=>a.gender==='P').length,                              c:'#f472b6' },
                {l:'Lokal',    v:preview.filter(a=>a.kode_asal_daerah?.startsWith('3201')).length,      c:'#4ade80' },
                {l:'Non-Lokal',v:preview.filter(a=>!a.kode_asal_daerah?.startsWith('3201')).length,     c:'#fb923c' },
              ].map(s=>(
                <div key={s.l} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                  style={{background:`${s.c}12`,border:`1px solid ${s.c}20`}}>
                  <span className="font-bold text-sm" style={{color:s.c}}>{s.v}</span>
                  <span className="text-[10px]" style={{color:'rgba(255,255,255,0.35)'}}>{s.l}</span>
                </div>
              ))}
            </div>
            {/* Top cabor */}
            <div className="space-y-1.5 max-h-24 overflow-y-auto" style={{scrollbarWidth:'thin',scrollbarColor:`${ACCENT}20 transparent`}}>
              {perCabor.slice(0,5).map(([c,n])=>(
                <div key={c} className="flex items-center gap-3 text-xs">
                  <span className="text-zinc-400 flex-1 truncate">{c}</span>
                  <div className="w-20 h-1 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                    <div className="h-full rounded-full" style={{width:`${Math.round(n/preview.length*100)}%`,background:ACCENT}}/>
                  </div>
                  <span className="font-bold w-6 text-right" style={{color:ACCENT}}>{n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.4)'}}>
            Batal
          </button>
          <button onClick={handleExport} disabled={preview.length===0||done}
            className="flex-[2] py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{background:done?'rgba(74,222,128,0.15)':`${ACCENT}15`,border:`1px solid ${done?'rgba(74,222,128,0.4)':ACCENT+'35'}`,color:done?'#4ade80':ACCENT}}>
            {done
              ? <><CheckCircle size={15}/> Berhasil!</>
              : pFormat==='csv'
              ? <><FileSpreadsheet size={15}/> Export {preview.length} Atlet ke CSV</>
              : <><Printer size={15}/> Cetak {preview.length} Atlet</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────
export default function PageKualifikasi() {
  const [atlets,       setAtlets]       = useState<AtletRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('Semua')
  const [filterCabor,  setFilterCabor]  = useState('Semua')
  const [showAllCabor, setShowAllCabor] = useState(false)
  const [showAllAtlet, setShowAllAtlet] = useState(false)
  const [showPrint,    setShowPrint]    = useState(false)
  const [animIn,       setAnimIn]       = useState(false)
  // Accordion state per cabor
  const [expandedCabor, setExpandedCabor] = useState<string|null>(null)

  useEffect(()=>{ const t=setTimeout(()=>setAnimIn(true),80); return()=>clearTimeout(t) },[])

  useEffect(()=>{
    async function fetch() {
      const { data, error } = await sb
        .from('atlet')
        .select('id,nama_lengkap,no_ktp,tgl_lahir,gender,cabor_nama_raw,kode_asal_daerah,nama_asal_daerah,status_registrasi,no_registrasi_koni')
        .eq('kontingen_id', KONTINGEN_ID)
        .order('cabor_nama_raw',{ascending:true})
        .order('nama_lengkap',{ascending:true})
      if (!error && data) setAtlets(data as AtletRow[])
      setLoading(false)
    }
    void fetch()
  },[])

  const caborKuota = useMemo((): CaborKuota[] => {
    const map: Record<string,{verified:number;pending:number;ditolak:number;posted:number;total:number}> = {}
    atlets.forEach(a=>{
      const c=a.cabor_nama_raw||'Lainnya'
      if(!map[c]) map[c]={verified:0,pending:0,ditolak:0,posted:0,total:0}
      map[c].total++
      if(a.status_registrasi==='Verified')       map[c].verified++
      if(a.status_registrasi==='Menunggu Admin') map[c].pending++
      if(a.status_registrasi==='Ditolak Admin')  map[c].ditolak++
      if(a.status_registrasi==='Posted')         map[c].posted++
    })
    return Object.entries(map).map(([nama,s])=>{
      const kuota=KUOTA_REGULASI[nama]??20
      const aktif=s.verified+s.posted
      const pct=Math.round(aktif/kuota*100)
      const status: CaborKuota['status'] =
        aktif>kuota?'OVER':aktif>=kuota*0.9?'KRITIS':aktif>=kuota?'PENUH':'OPEN'
      return{nama,kuota,verified:s.verified,pending:s.pending,ditolak:s.ditolak,posted:s.posted,total:s.total,pct,status}
    }).sort((a,b)=>b.total-a.total)
  },[atlets])

  const kpi = useMemo(()=>{
    const totalKuota=caborKuota.reduce((s,c)=>s+c.kuota,0)
    const totalAktif=caborKuota.reduce((s,c)=>s+c.verified+c.posted,0)
    const over=caborKuota.filter(c=>c.status==='OVER').length
    const kritis=caborKuota.filter(c=>c.status==='KRITIS').length
    return{totalKuota,totalAktif,over,kritis,sisa:totalKuota-totalAktif,
      pct:totalKuota>0?Math.round(totalAktif/totalKuota*100):0}
  },[caborKuota])

  const filteredAtlet = useMemo(()=>atlets.filter(a=>{
    const ms = !search||a.nama_lengkap.toLowerCase().includes(search.toLowerCase())||a.no_ktp?.includes(search)
    const ss = filterStatus==='Semua'||a.status_registrasi===filterStatus
    const cs = filterCabor==='Semua'||a.cabor_nama_raw===filterCabor
    return ms&&ss&&cs
  }),[atlets,search,filterStatus,filterCabor])

  const caborList = useMemo(()=>['Semua', ...Array.from(new Set(atlets.map(a=>a.cabor_nama_raw||'Lainnya')))].sort(), [atlets])

  const displayedCabor = showAllCabor ? caborKuota : caborKuota.slice(0, CABOR_DEFAULT)
  const displayedAtlet = showAllAtlet ? filteredAtlet : filteredAtlet.slice(0, ROWS_DEFAULT)

  const ani=(d=0)=>({
    style:{transitionDelay:`${d}ms`,transition:'all 0.5s ease'},
    className:animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-4',
  })

  const STATUS_CFG: Record<string,{bg:string;text:string;border:string}> = {
    'Verified':       {bg:'rgba(74,222,128,0.1)', text:'#4ade80',border:'rgba(74,222,128,0.2)'},
    'Menunggu Admin': {bg:'rgba(251,191,36,0.1)', text:'#fbbf24',border:'rgba(251,191,36,0.2)'},
    'Ditolak Admin':  {bg:'rgba(248,113,113,0.1)',text:'#f87171',border:'rgba(248,113,113,0.2)'},
    'Posted':         {bg:'rgba(96,165,250,0.1)', text:'#60a5fa',border:'rgba(96,165,250,0.2)'},
    'Draft':          {bg:'rgba(255,255,255,0.05)',text:'#6b7280',border:'rgba(255,255,255,0.1)'},
  }

  if(loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#020d06'}}>
      <div className="text-center">
        <div className="w-12 h-12 border-2 rounded-full animate-spin mx-auto mb-4"
          style={{borderColor:`${ACCENT}20`,borderTopColor:ACCENT}}/>
        <p className="font-mono text-xs uppercase tracking-widest" style={{color:ACCENT}}>Memuat Data Kualifikasi...</p>
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
              <Target size={20} style={{color:ACCENT}}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Kontrol Kuota & Kualifikasi</h1>
              <p className="text-[11px] font-mono mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>
                Manajemen Tiket Babak Kualifikasi · Kontingen Kab. Bogor
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={()=>window.location.reload()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
              style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.4)'}}>
              <RefreshCw size={11}/> Refresh
            </button>
            <button onClick={()=>setShowPrint(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
              style={{background:`${ACCENT}12`,border:`1px solid ${ACCENT}30`,color:ACCENT}}>
              <Printer size={14}/> Cetak / Export
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative z-10 space-y-5">

        {/* KPI */}
        <div {...ani(0)} className="grid grid-cols-4 gap-4">
          <div className="col-span-2 rounded-2xl p-5 relative overflow-hidden"
            style={{background:`${ACCENT}06`,border:`1px solid ${ACCENT}18`}}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users size={13} style={{color:ACCENT}}/>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Kuota Kontingen</span>
                </div>
                <div className="text-5xl font-light text-white">{kpi.totalKuota.toLocaleString('id')}</div>
                <div className="text-[11px] mt-1" style={{color:`${ACCENT}70`}}>
                  {kpi.totalAktif} terpakai · {kpi.sisa} sisa
                </div>
              </div>
              <div className="flex-shrink-0 relative">
                <svg width="60" height="60" style={{transform:'rotate(-90deg)'}}>
                  <circle cx="30" cy="30" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
                  <circle cx="30" cy="30" r="22" fill="none" stroke={ACCENT} strokeWidth="5"
                    strokeDasharray={`${2*Math.PI*22*kpi.pct/100} ${2*Math.PI*22}`} strokeLinecap="round"/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-sm font-black" style={{color:ACCENT}}>{kpi.pct}%</div>
                </div>
              </div>
            </div>
            <Bar value={kpi.totalAktif} max={kpi.totalKuota} color={ACCENT} h={5}/>
          </div>
          {[
            {l:'Tiket Aktif',   v:kpi.totalAktif,      c:'#4ade80', sub:'Verified + Posted',              icon:CheckCircle  },
            {l:'Sisa Kuota',    v:kpi.sisa,             c:'#fbbf24', sub:'Slot masih tersedia',             icon:Unlock       },
            {l:'Alert Cabor',   v:kpi.over+kpi.kritis,  c:'#f87171', sub:`${kpi.over} over · ${kpi.kritis} kritis`, icon:AlertTriangle},
          ].map(s=>(
            <div key={s.l} className="rounded-2xl p-5 relative overflow-hidden"
              style={{background:'rgba(255,255,255,0.025)',border:`1px solid ${s.c}18`}}>
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:`${s.c}50`}}/>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                <s.icon size={12} style={{color:s.c}}/> {s.l}
              </div>
              <div className="text-4xl font-light" style={{color:s.c}}>{s.v}</div>
              <div className="text-[10px] text-zinc-600 mt-1.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* MONITOR KUOTA ACCORDION */}
        <div {...ani(50)} className="rounded-2xl overflow-hidden"
          style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)'}}>

          <div className="flex items-center justify-between px-5 py-4 border-b"
            style={{borderColor:'rgba(255,255,255,0.07)'}}>
            <div className="flex items-center gap-2">
              <Target size={14} style={{color:ACCENT}}/>
              <span className="text-sm font-bold text-white">Monitor Kuota per Cabor</span>
              <span className="text-[11px]" style={{color:'rgba(255,255,255,0.3)'}}>
                {caborKuota.length} cabor · tampil {displayedCabor.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Alert badges */}
              {kpi.over>0 && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                  style={{background:'rgba(248,113,113,0.1)',color:'#f87171',border:'1px solid rgba(248,113,113,0.2)'}}>
                  <AlertTriangle size={10}/> {kpi.over} Over Kuota
                </div>
              )}
              {kpi.kritis>0 && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                  style={{background:'rgba(251,191,36,0.1)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.2)'}}>
                  <AlertTriangle size={10}/> {kpi.kritis} Kritis
                </div>
              )}
            </div>
          </div>

          {/* Grid cabor — accordion */}
          <div className="p-4 grid grid-cols-3 gap-3">
            {displayedCabor.map(c=>{
              const aktif  = c.verified+c.posted
              const isExp  = expandedCabor===c.nama
              const barCol = c.status==='OVER'?'#f87171':c.status==='KRITIS'?'#fbbf24':c.status==='PENUH'?'#60a5fa':ACCENT
              const brdCol = c.status==='OVER'?'rgba(248,113,113,0.25)':c.status==='KRITIS'?'rgba(251,191,36,0.2)':c.status==='PENUH'?'rgba(96,165,250,0.2)':'rgba(255,255,255,0.06)'

              return (
                <div key={c.nama} className="rounded-xl overflow-hidden transition-all"
                  style={{border:`1px solid ${isExp?barCol:brdCol}`,background:isExp?`${barCol}06`:'rgba(255,255,255,0.02)'}}>

                  {/* Card header — selalu tampil */}
                  <div className="p-3.5 cursor-pointer"
                    onClick={()=>setExpandedCabor(isExp?null:c.nama)}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-zinc-200 truncate flex-1">{c.nama}</span>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{background:`${barCol}18`,color:barCol,border:`1px solid ${barCol}25`}}>
                          {c.status}
                        </span>
                        {isExp ? <ChevronUp size={13} style={{color:barCol}}/> : <ChevronDown size={13} style={{color:'rgba(255,255,255,0.3)'}}/>}
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] mb-1.5">
                      <span className="text-zinc-500">Aktif <strong style={{color:barCol}}>{aktif}</strong> / <strong className="text-white">{c.kuota}</strong></span>
                      <span style={{color:barCol,fontWeight:700}}>{c.pct}%</span>
                    </div>
                    <Bar value={aktif} max={c.kuota} color={barCol} h={4}/>
                  </div>

                  {/* Expanded detail */}
                  {isExp && (
                    <div className="px-3.5 pb-3.5 border-t" style={{borderColor:`${barCol}15`}}>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {[
                          {l:'Total Daftar', v:c.total,   c:'rgba(255,255,255,0.6)'},
                          {l:'Verified',     v:c.verified, c:'#4ade80'},
                          {l:'Posted',       v:c.posted,   c:'#60a5fa'},
                          {l:'Pending',      v:c.pending,  c:'#fbbf24'},
                          {l:'Ditolak',      v:c.ditolak,  c:'#f87171'},
                          {l:'Sisa Kuota',   v:Math.max(0,c.kuota-aktif), c:ACCENT},
                        ].map(s=>(
                          <div key={s.l} className="rounded-lg p-2.5"
                            style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)'}}>
                            <div className="text-[9px] text-zinc-500 uppercase">{s.l}</div>
                            <div className="text-lg font-bold mt-0.5" style={{color:s.c}}>{s.v}</div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={()=>{setFilterCabor(c.nama===filterCabor?'Semua':c.nama);setExpandedCabor(null)}}
                        className="mt-3 w-full py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
                        style={{
                          background: filterCabor===c.nama?`${barCol}20`:`${ACCENT}10`,
                          color:      filterCabor===c.nama?barCol:ACCENT,
                          border:     `1px solid ${filterCabor===c.nama?barCol:ACCENT}25`,
                        }}>
                        <Filter size={11}/>
                        {filterCabor===c.nama?'Hapus Filter Ini':'Filter Tabel Atlet →'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Show more / less */}
          {caborKuota.length > CABOR_DEFAULT && (
            <div className="px-4 pb-4 flex justify-center border-t" style={{borderColor:'rgba(255,255,255,0.05)',paddingTop:12}}>
              <button onClick={()=>setShowAllCabor(v=>!v)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all"
                style={{background:`${ACCENT}10`,color:ACCENT,border:`1px solid ${ACCENT}20`}}>
                {showAllCabor
                  ? <><ChevronUp size={13}/> Tutup ({caborKuota.length-CABOR_DEFAULT} cabor)</>
                  : <><ChevronDown size={13}/> Buka {caborKuota.length-CABOR_DEFAULT} cabor lainnya</>
                }
              </button>
            </div>
          )}
        </div>

        {/* TABEL ATLET */}
        <div {...ani(100)} className="rounded-2xl overflow-hidden"
          style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)'}}>

          {/* Toolbar */}
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
                  style={{background:`${ACCENT}15`,color:ACCENT,border:`1px solid ${ACCENT}25`}}>
                  <Filter size={10}/> {filterCabor}
                  <button onClick={()=>setFilterCabor('Semua')} className="ml-1"><X size={9}/></button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status filter */}
              <div className="flex gap-1">
                {(['Semua','Verified','Menunggu Admin','Ditolak Admin','Posted'] as FilterStatus[]).map(s=>(
                  <button key={s} onClick={()=>setFilterStatus(s)}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                    style={{
                      background: filterStatus===s?`${ACCENT}18`:'rgba(255,255,255,0.04)',
                      color:      filterStatus===s?ACCENT:'rgba(255,255,255,0.35)',
                      border:     filterStatus===s?`1px solid ${ACCENT}25`:'1px solid transparent',
                    }}>
                    {s==='Semua'?`Semua`
                    :s==='Verified'?`✅ ${atlets.filter(a=>a.status_registrasi===s).length}`
                    :s==='Menunggu Admin'?`⏳ ${atlets.filter(a=>a.status_registrasi===s).length}`
                    :s==='Ditolak Admin'?`❌ ${atlets.filter(a=>a.status_registrasi===s).length}`
                    :`📌 ${atlets.filter(a=>a.status_registrasi===s).length}`}
                  </button>
                ))}
              </div>
              {/* Search + cabor */}
              <div className="relative">
                <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama / NIK..."
                  className="bg-transparent border rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 outline-none w-40"
                  style={{borderColor:'rgba(255,255,255,0.1)'}}
                  onFocus={e=>e.target.style.borderColor=ACCENT}
                  onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
                {search&&<button onClick={()=>setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"><X size={10}/></button>}
              </div>
              <select value={filterCabor} onChange={e=>setFilterCabor(e.target.value)}
                className="rounded-xl px-3 py-1.5 text-xs text-zinc-200 outline-none"
                style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)'}}>
                {caborList.map(c=>(
                  <option key={c} value={c} style={{background:'#040f08'}}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[9px] uppercase tracking-widest"
                style={{background:'rgba(2,13,6,0.98)',color:'rgba(255,255,255,0.3)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
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
                const umur  = hitungUmur(a.tgl_lahir)
                const nonLk = a.kode_asal_daerah && !a.kode_asal_daerah.startsWith('3201')
                const st    = STATUS_CFG[a.status_registrasi]??STATUS_CFG['Draft']
                return (
                  <tr key={a.id} className="border-b transition-colors"
                    style={{borderColor:'rgba(255,255,255,0.04)'}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.02)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
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
                          <MapPin size={8}/> {a.nama_asal_daerah||'Luar Daerah'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold" style={{color:`${ACCENT}60`}}>Lokal KBR</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono" style={{color:a.no_registrasi_koni?ACCENT:'rgba(255,255,255,0.2)'}}>
                        {a.no_registrasi_koni?`#${a.no_registrasi_koni}`:'—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase"
                        style={{background:st.bg,color:st.text,border:`1px solid ${st.border}`}}>
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

          {/* Show more / less atlet */}
          {filteredAtlet.length > ROWS_DEFAULT && (
            <div className="p-4 flex items-center justify-between border-t"
              style={{borderColor:'rgba(255,255,255,0.05)'}}>
              <span className="text-[11px]" style={{color:'rgba(255,255,255,0.25)'}}>
                Menampilkan {displayedAtlet.length} dari {filteredAtlet.length} atlet
              </span>
              <button onClick={()=>setShowAllAtlet(v=>!v)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold"
                style={{background:`${ACCENT}10`,color:ACCENT,border:`1px solid ${ACCENT}20`}}>
                {showAllAtlet
                  ? <><ChevronUp size={13}/> Tutup — tampilkan {ROWS_DEFAULT} saja</>
                  : <><ChevronDown size={13}/> Buka semua {filteredAtlet.length} atlet</>
                }
              </button>
            </div>
          )}
        </div>
      </main>

      {/* PRINT MODAL */}
      {showPrint && (
        <PrintModal atlets={atlets} caborList={caborList} onClose={()=>setShowPrint(false)}/>
      )}
    </div>
  )
}