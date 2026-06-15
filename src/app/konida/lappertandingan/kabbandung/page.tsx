'use client'
// src/app/konida/lappertandingan/kabbandung/page.tsx — v3
// PORPROV XV: 7-20 November 2026 (14 hari)
// Fitur: Demo data auto-seed (hari 1-7), 3-layer demo signal, filter Real/Demo,
//        bulk import + voice + photo placeholders, localStorage persist

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  FileText, Clock, Download, CheckCircle, Plus,
  ListOrdered, Trophy, X, Medal, Mic, Camera,
  RefreshCw, Printer, Save, Edit2, Trash2,
  Info, Calendar, AlertTriangle, Upload, Filter,
  Eye, EyeOff, Sparkles, Database,
} from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ACCENT = '#38bdf8'
const KONTINGEN_ID = 4

// ═════════ PORPROV XV: 7-20 November 2026 (14 hari) ═════════
const HARI_PORPROV = Array.from({length:14},(_,i)=>{
  const d = new Date('2026-11-07')
  d.setDate(d.getDate()+i)
  return {
    hari:   i+1,
    tanggal: d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}),
    iso:     d.toISOString().slice(0,10),
    dayName: d.toLocaleDateString('id-ID',{weekday:'short'}),
  }
})

interface JurnalLaga {
  id:      string
  waktu:   string
  cabor:   string
  hasil:   string
  medali:  'Emas'|'Perak'|'Perunggu'|'Tanpa Medali'
  catatan: string
  isDemo?: boolean        // ⚠ NEW: flag untuk membedakan demo vs real
}

const MEDALI_CFG = {
  'Emas':        { text:'#ffd700', bg:'rgba(255,215,0,0.1)',    border:'rgba(255,215,0,0.25)',    dot:'#ffd700', emoji:'🥇' },
  'Perak':       { text:'#c0c0c0', bg:'rgba(192,192,192,0.1)',  border:'rgba(192,192,192,0.25)',  dot:'#c0c0c0', emoji:'🥈' },
  'Perunggu':    { text:'#cd7f32', bg:'rgba(205,127,50,0.1)',   border:'rgba(205,127,50,0.25)',   dot:'#cd7f32', emoji:'🥉' },
  'Tanpa Medali':{ text:'#6b7280', bg:'rgba(107,114,128,0.06)', border:'rgba(107,114,128,0.1)',  dot:'#374151', emoji:'—' },
}

const EMPTY_FORM: Omit<JurnalLaga,'id'> = {
  waktu:'', cabor:'', hasil:'', medali:'Tanpa Medali', catatan:''
}

const LS_KEY = 'porprov_jurnal_v2'  // Bump version karena format berubah (tambah isDemo)

// TODO: isi data pertandingan real saat PORPROV mulai (7 Nov 2026)
// Format: { [hari: number]: JurnalLaga[] }
// Contoh entry: { id:'real-1-1', waktu:'08:00', cabor:'Hockey', hasil:'...', medali:'Emas', catatan:'...', isDemo:false }
function generateDemoData(): Record<number, JurnalLaga[]> {
  return {}
}

function loadFromLS(): Record<number, JurnalLaga[]> {
  try { return JSON.parse(localStorage.getItem(LS_KEY)||'{}') } catch { return {} }
}
function saveToLS(data: Record<number, JurnalLaga[]>) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

type FilterMode = 'all' | 'real' | 'demo'

export default function PageLapPertandingan() {
  const [selectedHari, setSelectedHari] = useState(1)
  const [jurnalData,   setJurnalData]   = useState<Record<number,JurnalLaga[]>>({})
  const [klasemen,     setKlasemen]     = useState<any>(null)
  const [showForm,     setShowForm]     = useState(false)
  const [editId,       setEditId]       = useState<string|null>(null)
  const [form,         setForm]         = useState<Omit<JurnalLaga,'id'>>(EMPTY_FORM)
  const [animIn,       setAnimIn]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [caborList,    setCaborList]    = useState<string[]>([])
  const [showAllHari,  setShowAllHari]  = useState(false)
  const [filterMode,   setFilterMode]   = useState<FilterMode>('all')
  const [showDemoBanner, setShowDemoBanner] = useState(true)

  useEffect(()=>{ const t=setTimeout(()=>setAnimIn(true),80); return()=>clearTimeout(t) },[])

  // Load + auto-seed demo kalau localStorage kosong
  useEffect(()=>{
    const stored = loadFromLS()
    if (Object.keys(stored).length === 0) {
      const demo = generateDemoData()
      setJurnalData(demo)
      saveToLS(demo)
    } else {
      setJurnalData(stored)
    }
  },[])

  // Fetch klasemen + cabor list
  useEffect(()=>{
    sb.from('klasemen_medali').select('emas,perak,perunggu,total').eq('kontingen_id',KONTINGEN_ID).maybeSingle()
      .then(({data})=>{ if(data) setKlasemen(data) })
    ;(async () => {
      let all: any[] = []
      for (let p = 0; ; p++) {
        const { data } = await sb.from('atlet').select('cabor_nama_raw').eq('kontingen_id',KONTINGEN_ID).eq('status_registrasi','Verified').range(p * 1000, (p + 1) * 1000 - 1)
        if (!data || data.length === 0) break
        all = all.concat(data)
        if (data.length < 1000) break
      }
      return { data: all }
    })()
      .then(({data})=>{
        if(data){
          const cabors = Array.from(new Set((data as any[]).map(a=>a.cabor_nama_raw).filter(Boolean))).sort()
          setCaborList(cabors)
        }
      })
  },[])

  // Filtered jurnal untuk hari aktif
  const jurnalRaw = jurnalData[selectedHari]??[]
  const jurnal = useMemo(()=>{
    if (filterMode === 'real') return jurnalRaw.filter(j => !j.isDemo)
    if (filterMode === 'demo') return jurnalRaw.filter(j => j.isDemo)
    return jurnalRaw
  }, [jurnalRaw, filterMode])

  // Summary per hari untuk sidebar (always show all, regardless of filter)
  const hariSummary = useMemo(()=>{
    const m: Record<number,{emas:number;total:number;laga:number;hasDemo:boolean;hasReal:boolean}> = {}
    Object.entries(jurnalData).forEach(([h,list])=>{
      const hi = Number(h)
      const arr = list as JurnalLaga[]
      m[hi] = {
        emas:    arr.filter(j=>j.medali==='Emas').length,
        total:   arr.filter(j=>j.medali!=='Tanpa Medali').length,
        laga:    arr.length,
        hasDemo: arr.some(j=>j.isDemo),
        hasReal: arr.some(j=>!j.isDemo),
      }
    })
    return m
  },[jurnalData])

  // Total counters
  const totalCounters = useMemo(()=>{
    let realEntries = 0, demoEntries = 0
    let realMedali = {e:0,p:0,pg:0}, demoMedali = {e:0,p:0,pg:0}
    Object.values(jurnalData).forEach(list=>{
      list.forEach(j=>{
        if (j.isDemo) {
          demoEntries++
          if(j.medali==='Emas') demoMedali.e++
          if(j.medali==='Perak') demoMedali.p++
          if(j.medali==='Perunggu') demoMedali.pg++
        } else {
          realEntries++
          if(j.medali==='Emas') realMedali.e++
          if(j.medali==='Perak') realMedali.p++
          if(j.medali==='Perunggu') realMedali.pg++
        }
      })
    })
    return { realEntries, demoEntries, realMedali, demoMedali }
  },[jurnalData])

  function openAdd() {
    setForm(EMPTY_FORM); setEditId(null); setShowForm(true)
  }
  function openEdit(j: JurnalLaga) {
    setForm({waktu:j.waktu,cabor:j.cabor,hasil:j.hasil,medali:j.medali,catatan:j.catatan})
    setEditId(j.id); setShowForm(true)
  }

  function handleSave() {
    if (!form.cabor||!form.hasil) return
    const newData = {...jurnalData}
    if (!newData[selectedHari]) newData[selectedHari]=[]
    if (editId) {
      // Preserve isDemo flag pas edit
      const existing = newData[selectedHari].find(j => j.id === editId)
      newData[selectedHari] = newData[selectedHari].map(j=>
        j.id===editId
          ? { ...form, id:editId, isDemo: existing?.isDemo }
          : j
      )
    } else {
      // Entry baru = REAL data (bukan demo)
      newData[selectedHari] = [...newData[selectedHari], { ...form, id:Date.now().toString(), isDemo: false }]
    }
    newData[selectedHari].sort((a,b)=>a.waktu.localeCompare(b.waktu))
    setJurnalData(newData)
    saveToLS(newData)
    setShowForm(false); setForm(EMPTY_FORM); setEditId(null)
    setSaved(true); setTimeout(()=>setSaved(false),2000)
  }

  function handleDelete(id: string) {
    if (!confirm('Hapus entry ini?')) return
    const newData = {...jurnalData}
    newData[selectedHari] = (newData[selectedHari]||[]).filter(j=>j.id!==id)
    setJurnalData(newData); saveToLS(newData)
  }

  function clearAllDemo() {
    if (!confirm('Hapus SEMUA data demo? (Data real tetap aman)')) return
    const newData: Record<number,JurnalLaga[]> = {}
    Object.entries(jurnalData).forEach(([h,list])=>{
      const filtered = (list as JurnalLaga[]).filter(j => !j.isDemo)
      if (filtered.length > 0) newData[Number(h)] = filtered
    })
    setJurnalData(newData); saveToLS(newData)
    setShowDemoBanner(false)
  }

  function reseedDemo() {
    if (!confirm('Reset ke data demo awal? (Data real akan tetap, demo lama diganti)')) return
    const realOnly: Record<number,JurnalLaga[]> = {}
    Object.entries(jurnalData).forEach(([h,list])=>{
      const filtered = (list as JurnalLaga[]).filter(j => !j.isDemo)
      if (filtered.length > 0) realOnly[Number(h)] = filtered
    })
    const demo = generateDemoData()
    // Merge demo + real
    const merged: Record<number,JurnalLaga[]> = {...demo}
    Object.entries(realOnly).forEach(([h,list])=>{
      const hi = Number(h)
      merged[hi] = [...(merged[hi]||[]), ...list].sort((a,b)=>a.waktu.localeCompare(b.waktu))
    })
    setJurnalData(merged); saveToLS(merged)
  }

  function printJurnal() {
    const hari = HARI_PORPROV[selectedHari-1]
    const html = `<!DOCTYPE html><html><head><title>Jurnal Hari ${selectedHari}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:24px}
      h2{font-size:15px;margin-bottom:2px}p{color:#666;font-size:10px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse}
      th{background:#075985;color:#fff;padding:6px 10px;text-align:left;font-size:10px}
      td{padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:10px;vertical-align:top}
      tr:nth-child(even){background:#f9fafb}
      tr.demo{background:#fef3c7 !important}
      tr.demo td:first-child::after{content:" ⚠";color:#d97706}
      .emas{color:#b45309;font-weight:800} .perak{color:#64748b;font-weight:700}
      .perunggu{color:#92400e;font-weight:700} .none{color:#9ca3af}
      .demobadge{background:#fbbf24;color:#7c2d12;padding:1px 5px;border-radius:3px;font-size:8px;font-weight:bold}
      .summary{margin-top:16px;padding:12px;background:#f0f9ff;border:1px solid #bbf7d0;border-radius:8px}
      @media print{button{display:none}}
    </style></head><body>
    <h2>📋 Jurnal Hasil Pertandingan Harian</h2>
    <p>Hari ke-${selectedHari} · ${hari.tanggal} · Kontingen Kab. Bandung · PORPROV XV Jawa Barat 2026</p>
    <button onclick="window.print()" style="margin-bottom:16px;padding:6px 16px;background:#075985;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨 Print</button>
    <table>
      <thead><tr><th>#</th><th>Waktu</th><th>Cabor</th><th>Hasil</th><th>Medali</th><th>Type</th><th>Catatan</th></tr></thead>
      <tbody>
        ${jurnal.map((j,i)=>`<tr class="${j.isDemo?'demo':''}">
          <td>${i+1}</td>
          <td>${j.waktu||'—'} WIB</td>
          <td><strong>${j.cabor}</strong></td>
          <td>${j.hasil}</td>
          <td class="${j.medali==='Emas'?'emas':j.medali==='Perak'?'perak':j.medali==='Perunggu'?'perunggu':'none'}">${j.medali==='Emas'?'🥇 Emas':j.medali==='Perak'?'🥈 Perak':j.medali==='Perunggu'?'🥉 Perunggu':'—'}</td>
          <td>${j.isDemo?'<span class="demobadge">DEMO</span>':'<span style="color:#0ea5e9;font-weight:bold">REAL</span>'}</td>
          <td>${j.catatan||'—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="summary">
      <strong>Rekap Hari Ini:</strong>
      🥇 ${jurnal.filter(j=>j.medali==='Emas').length} Emas &nbsp;
      🥈 ${jurnal.filter(j=>j.medali==='Perak').length} Perak &nbsp;
      🥉 ${jurnal.filter(j=>j.medali==='Perunggu').length} Perunggu &nbsp;|&nbsp;
      Total ${jurnal.filter(j=>j.medali!=='Tanpa Medali').length} Medali dari ${jurnal.length} Pertandingan
    </div>
    </body></html>`
    const w = window.open('','_blank')
    w?.document.write(html); w?.document.close()
  }

  function placeholderFeature(name: string) {
    alert(`🚧 Fitur "${name}" akan tersedia di update berikutnya.\n\nSaat ini masih dalam tahap development. Stay tuned!`)
  }

  const ani=(d=0)=>({
    style:{transitionDelay:`${d}ms`,transition:'all 0.5s ease'},
    className:animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-4',
  })

  const displayedHari = showAllHari ? HARI_PORPROV : HARI_PORPROV.slice(0,7)

  return (
    <div className="min-h-screen text-zinc-300 flex flex-col"
      style={{background:'linear-gradient(135deg,#020a14 0%,#03101c 100%)'}}>

      <div className="fixed inset-0 pointer-events-none"
        style={{backgroundImage:`linear-gradient(${ACCENT}03 1px,transparent 1px),linear-gradient(90deg,${ACCENT}03 1px,transparent 1px)`,backgroundSize:'32px 32px',zIndex:0}}/>

      {/* HEADER */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl px-6 py-4"
        style={{background:'rgba(2,10,20,0.95)',borderColor:`${ACCENT}12`}}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{background:`${ACCENT}12`,border:`1px solid ${ACCENT}25`}}>
              <FileText size={20} style={{color:ACCENT}}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Jurnal Hasil Pertandingan Harian</h1>
              <p className="text-[11px] font-mono mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>
                7-20 November 2026 · Kab. Bandung · PORPROV XV Jabar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {klasemen && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{background:'rgba(255,215,0,0.08)',border:'1px solid rgba(255,215,0,0.2)'}}>
                <span className="text-sm font-black text-yellow-400">🥇{klasemen.emas}</span>
                <span className="text-sm text-zinc-400">🥈{klasemen.perak}</span>
                <span className="text-sm text-orange-400">🥉{klasemen.perunggu}</span>
                <div className="w-px h-4 bg-zinc-700 mx-1"/>
                <span className="text-xs font-bold text-zinc-400">{klasemen.total} total</span>
              </div>
            )}
            {jurnal.length>0 && (
              <button onClick={printJurnal}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
                style={{background:`${ACCENT}12`,border:`1px solid ${ACCENT}25`,color:ACCENT}}>
                <Printer size={13}/> Print
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 p-5 max-w-[1600px] w-full mx-auto relative z-10">

        {/* ════════ DEMO BANNER ════════ */}
        {showDemoBanner && totalCounters.demoEntries > 0 && (
          <div {...ani(0)} className="mb-4 rounded-2xl p-4 relative overflow-hidden"
            style={{
              background:'linear-gradient(135deg, rgba(251,191,36,0.06) 0%, rgba(245,158,11,0.04) 100%)',
              border:'1px solid rgba(251,191,36,0.25)',
            }}>
            {/* Diagonal stripes pattern */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, #fbbf24 0, #fbbf24 1px, transparent 1px, transparent 12px)`,
              }}/>
            <div className="relative flex items-start gap-3 flex-wrap">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{background:'rgba(251,191,36,0.15)',border:'1px solid rgba(251,191,36,0.3)'}}>
                <AlertTriangle size={16} className="text-amber-400"/>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="text-sm font-black text-amber-300 mb-1 flex items-center gap-2 flex-wrap">
                  Mode Preview Demo
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest"
                    style={{background:'rgba(251,191,36,0.2)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.4)'}}>
                    {totalCounters.demoEntries} entries
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Halaman ini berisi <strong>{totalCounters.demoEntries} data demo</strong> untuk hari 1-7 (preview gambaran). Saat PORPROV dimulai 7 November 2026, input data real akan menggantikan demo secara bertahap.
                  {totalCounters.realEntries > 0 && (
                    <> · Sudah ada <strong className="text-sky-400">{totalCounters.realEntries} data REAL</strong> tercatat.</>
                  )}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setShowDemoBanner(false)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.1)'}}>
                  Sembunyikan
                </button>
                <button onClick={clearAllDemo}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{background:'rgba(239,68,68,0.1)',color:'#ef4444',border:'1px solid rgba(239,68,68,0.25)'}}>
                  🗑 Hapus Semua Demo
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

          {/* SIDEBAR */}
          <div className="lg:col-span-1">

            {/* Akumulasi separated Real + Demo */}
            <div {...ani(0)} className="rounded-2xl p-4 mb-3"
              style={{background:`${ACCENT}06`,border:`1px solid ${ACCENT}18`}}>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Trophy size={10} style={{color:ACCENT}}/> Akumulasi Jurnal
              </div>

              {/* REAL data */}
              {totalCounters.realEntries > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <CheckCircle size={9} className="text-sky-400"/>
                    <span className="text-[9px] font-black uppercase tracking-widest text-sky-400">REAL DATA</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[
                      {v:totalCounters.realMedali.e, c:'#ffd700', e:'🥇'},
                      {v:totalCounters.realMedali.p, c:'#c0c0c0', e:'🥈'},
                      {v:totalCounters.realMedali.pg,c:'#cd7f32', e:'🥉'},
                    ].map((m,i)=>(
                      <div key={i} className="flex-1 text-center rounded-lg py-1.5"
                        style={{background:`${m.c}10`,border:`1px solid ${m.c}25`}}>
                        <div className="text-xs">{m.e}</div>
                        <div className="text-sm font-black" style={{color:m.c}}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[9px] mt-1 text-center text-sky-400/60">
                    {totalCounters.realEntries} pertandingan
                  </div>
                </div>
              )}

              {/* DEMO data */}
              {totalCounters.demoEntries > 0 && (
                <div className="pt-3" style={{borderTop:'1px dashed rgba(255,255,255,0.08)'}}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle size={9} className="text-amber-400"/>
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">DEMO DATA</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[
                      {v:totalCounters.demoMedali.e, c:'#ffd700', e:'🥇'},
                      {v:totalCounters.demoMedali.p, c:'#c0c0c0', e:'🥈'},
                      {v:totalCounters.demoMedali.pg,c:'#cd7f32', e:'🥉'},
                    ].map((m,i)=>(
                      <div key={i} className="flex-1 text-center rounded-lg py-1.5 relative overflow-hidden"
                        style={{background:`${m.c}06`,border:`1px dashed ${m.c}30`}}>
                        <div className="text-xs opacity-60">{m.e}</div>
                        <div className="text-sm font-black opacity-70" style={{color:m.c}}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[9px] mt-1 text-center text-amber-400/60">
                    {totalCounters.demoEntries} pertandingan
                  </div>
                </div>
              )}

              {saved && (
                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-green-400 justify-center py-1.5 rounded-lg"
                  style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)'}}>
                  <CheckCircle size={10}/> Tersimpan!
                </div>
              )}
            </div>

            {/* Nice-to-have actions */}
            <div {...ani(40)} className="space-y-1.5 mb-4">
              <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest px-1 mb-1.5">
                Quick Input
              </div>
              {[
                { icon:Mic,    label:'Voice Input',  color:'#8b5cf6', action:() => placeholderFeature('Voice Input') },
                { icon:Camera, label:'Foto Hasil',   color:'#3b82f6', action:() => placeholderFeature('Photo Upload') },
                { icon:Upload, label:'Bulk Import',  color:'#f59e0b', action:() => placeholderFeature('Bulk Import Excel') },
                { icon:Database, label:'Reload Demo', color:'#94a3b8', action:reseedDemo },
              ].map(a=>(
                <button key={a.label} onClick={a.action}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold transition-all hover:scale-[1.02]"
                  style={{background:`${a.color}08`,border:`1px solid ${a.color}18`,color:`${a.color}cc`}}>
                  <a.icon size={11}/>
                  <span className="flex-1 text-left">{a.label}</span>
                  <span className="text-[8px] uppercase tracking-widest opacity-50">
                    {a.label === 'Reload Demo' ? 'Reset' : 'Soon'}
                  </span>
                </button>
              ))}
            </div>

            {/* Day list */}
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono px-1 mb-2">
              Pilih Hari · 14 Hari
            </div>
            <div className="space-y-1.5">
              {displayedHari.map(h=>{
                const s       = hariSummary[h.hari]
                const isAct   = selectedHari===h.hari
                const hasData = s && s.laga>0
                return (
                  <button key={h.hari} onClick={()=>setSelectedHari(h.hari)}
                    className="w-full p-3 rounded-xl text-left transition-all"
                    style={{
                      background: isAct?`${ACCENT}10`:'rgba(255,255,255,0.02)',
                      border:`1px solid ${isAct?`${ACCENT}25`:'rgba(255,255,255,0.06)'}`,
                    }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold"
                        style={{color:isAct?ACCENT:'rgba(255,255,255,0.5)'}}>
                        Hari {h.hari}
                      </span>
                      {hasData && (
                        <div className="flex gap-1">
                          {s.hasReal && <div className="w-1.5 h-1.5 rounded-full bg-sky-400" title="Ada data real"/>}
                          {s.hasDemo && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Ada data demo"/>}
                        </div>
                      )}
                    </div>
                    <div className="text-[9px]" style={{color:'rgba(255,255,255,0.3)'}}>
                      {h.dayName}, {h.tanggal}
                    </div>
                    {hasData && (
                      <div className="flex gap-1.5 mt-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                          style={{background:'rgba(255,215,0,0.1)',color:'#ffd700'}}>
                          {s.emas}🥇
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                          style={{background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.35)'}}>
                          {s.laga} laga
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            {HARI_PORPROV.length>7 && (
              <button onClick={()=>setShowAllHari(v=>!v)}
                className="w-full mt-2 py-2 rounded-xl text-[10px] font-bold"
                style={{background:`${ACCENT}08`,color:ACCENT,border:`1px solid ${ACCENT}15`}}>
                {showAllHari?'Sembunyikan':'Lihat semua 14 hari'}
              </button>
            )}
          </div>

          {/* MAIN — Jurnal timeline */}
          <div {...ani(60)} className="lg:col-span-3">
            <div className="rounded-2xl overflow-hidden"
              style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)'}}>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b flex-wrap gap-3"
                style={{borderColor:'rgba(255,255,255,0.07)'}}>
                <div className="flex items-center gap-3">
                  <ListOrdered size={14} style={{color:ACCENT}}/>
                  <div>
                    <span className="text-sm font-bold text-white">
                      Hari ke-{selectedHari} · {HARI_PORPROV[selectedHari-1].tanggal}
                    </span>
                    <div className="text-[10px] mt-0.5" style={{color:'rgba(255,255,255,0.3)'}}>
                      {jurnal.length} pertandingan tampil ·{' '}
                      {jurnal.filter(j=>j.medali!=='Tanpa Medali').length} medali
                      {filterMode !== 'all' && (
                        <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold"
                          style={{
                            background: filterMode === 'real' ? 'rgba(16,185,129,0.1)' : 'rgba(251,191,36,0.1)',
                            color:      filterMode === 'real' ? '#0ea5e9' : '#fbbf24',
                          }}>
                          filter: {filterMode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Filter */}
                  <div className="flex items-center gap-1 px-1 py-1 rounded-lg"
                    style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                    <Filter size={10} className="text-zinc-500 ml-1.5"/>
                    {([
                      { k:'all',  l:`Semua (${jurnalRaw.length})`,                                    c:ACCENT   },
                      { k:'real', l:`✅ Real (${jurnalRaw.filter(j=>!j.isDemo).length})`,             c:'#0ea5e9' },
                      { k:'demo', l:`⚠ Demo (${jurnalRaw.filter(j=>j.isDemo).length})`,              c:'#fbbf24' },
                    ] as const).map(f => (
                      <button key={f.k} onClick={()=>setFilterMode(f.k as FilterMode)}
                        className="px-2.5 py-1 rounded text-[10px] font-bold transition-all"
                        style={{
                          background: filterMode === f.k ? `${f.c}15` : 'transparent',
                          color:      filterMode === f.k ? f.c : 'rgba(255,255,255,0.4)',
                          border:     filterMode === f.k ? `1px solid ${f.c}30` : '1px solid transparent',
                        }}>
                        {f.l}
                      </button>
                    ))}
                  </div>
                  <button onClick={openAdd}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                    style={{background:`${ACCENT}15`,border:`1px solid ${ACCENT}30`,color:ACCENT}}>
                    <Plus size={13}/> Input Hasil
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div className="p-5">
                {jurnal.length===0 ? (
                  <div className="py-16 text-center">
                    <Calendar size={32} className="mx-auto mb-3 opacity-15"/>
                    <div className="text-sm font-bold text-zinc-600 mb-1">
                      {filterMode !== 'all' ? `Tidak ada data ${filterMode}` : 'Belum ada hasil pertandingan'}
                    </div>
                    <p className="text-xs text-zinc-700 mb-4">
                      {filterMode === 'all'
                        ? 'Klik "Input Hasil" untuk menambah jurnal hari ini'
                        : `Ubah filter untuk lihat data lain`}
                    </p>
                    <button onClick={openAdd}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold mx-auto"
                      style={{background:`${ACCENT}12`,border:`1px solid ${ACCENT}25`,color:ACCENT}}>
                      <Plus size={14}/> Input Hasil Pertandingan
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-5 top-0 bottom-0 w-px"
                      style={{background:'rgba(56,189,248,0.1)'}}/>
                    <div className="space-y-4">
                      {jurnal.map((j,i)=>{
                        const mc = MEDALI_CFG[j.medali]
                        const isDemo = j.isDemo
                        return (
                          <div key={j.id} className="relative pl-14">
                            {/* Timeline dot */}
                            <div className="absolute left-[17px] top-3.5 w-7 h-7 rounded-full flex items-center justify-center z-10"
                              style={{
                                background:mc.bg,
                                border:`2px solid ${mc.dot}`,
                                boxShadow:`0 0 8px ${mc.dot}40`,
                              }}>
                              <span className="text-xs">{mc.emoji}</span>
                            </div>

                            <div className="rounded-xl p-4 group relative overflow-hidden"
                              style={{
                                background: isDemo ? 'rgba(251,191,36,0.025)' : 'rgba(255,255,255,0.025)',
                                border: `1px solid ${isDemo ? 'rgba(251,191,36,0.2)' : mc.border}`,
                              }}>
                              {/* Diagonal stripes pattern untuk demo */}
                              {isDemo && (
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                                  style={{
                                    backgroundImage:`repeating-linear-gradient(45deg, #fbbf24 0, #fbbf24 1px, transparent 1px, transparent 10px)`,
                                  }}/>
                              )}

                              <div className="relative flex items-start justify-between gap-3 mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    {j.waktu && (
                                      <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                                        <Clock size={9}/> {j.waktu} WIB
                                      </span>
                                    )}
                                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"
                                      style={{background:mc.bg,color:mc.text,border:`1px solid ${mc.border}`}}>
                                      {j.medali}
                                    </span>
                                    {/* DATA TYPE BADGE */}
                                    {isDemo ? (
                                      <span className="text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest flex items-center gap-1"
                                        style={{background:'rgba(251,191,36,0.15)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.35)'}}>
                                        <AlertTriangle size={8}/> DEMO
                                      </span>
                                    ) : (
                                      <span className="text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest flex items-center gap-1"
                                        style={{background:'rgba(16,185,129,0.15)',color:'#0ea5e9',border:'1px solid rgba(16,185,129,0.35)'}}>
                                        <CheckCircle size={8}/> REAL
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="text-base font-black text-zinc-100">{j.cabor}</h3>
                                </div>
                                <div className="flex gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={()=>openEdit(j)}
                                    className="p-1.5 rounded-lg"
                                    style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.4)'}}>
                                    <Edit2 size={12}/>
                                  </button>
                                  <button onClick={()=>handleDelete(j.id)}
                                    className="p-1.5 rounded-lg"
                                    style={{background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.2)',color:'#f87171'}}>
                                    <Trash2 size={12}/>
                                  </button>
                                </div>
                              </div>

                              <div className="relative text-sm font-semibold text-zinc-300 p-3 rounded-lg mb-2"
                                style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.06)'}}>
                                {j.hasil}
                              </div>

                              {j.catatan && (
                                <div className="relative pl-3 border-l-2"
                                  style={{borderColor: isDemo ? 'rgba(251,191,36,0.25)' : 'rgba(56,189,248,0.2)'}}>
                                  <span className="text-[9px] font-mono text-zinc-600 uppercase block mb-0.5">Catatan:</span>
                                  <p className="text-[11px] text-zinc-400 leading-relaxed">{j.catatan}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* INPUT FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(6px)'}}>
          <div className="w-full max-w-[500px] rounded-2xl overflow-hidden"
            style={{background:'#03101c',border:`1px solid ${ACCENT}20`,boxShadow:'0 25px 60px rgba(0,0,0,0.8)'}}>

            <div className="flex items-center justify-between px-6 py-4 border-b"
              style={{borderColor:`${ACCENT}12`,background:`${ACCENT}04`}}>
              <div className="text-white font-bold flex items-center gap-2">
                {editId?'Edit Hasil Pertandingan':'Input Hasil Pertandingan'}
                {!editId && (
                  <span className="text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest"
                    style={{background:'rgba(16,185,129,0.15)',color:'#0ea5e9',border:'1px solid rgba(16,185,129,0.35)'}}>
                    ✅ REAL
                  </span>
                )}
              </div>
              <button onClick={()=>setShowForm(false)} className="p-2 rounded-xl"
                style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.4)'}}>
                <X size={15}/>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-[11px] px-3 py-2 rounded-lg"
                style={{background:`${ACCENT}06`,border:`1px solid ${ACCENT}12`,color:`${ACCENT}80`}}>
                Hari ke-{selectedHari} · {HARI_PORPROV[selectedHari-1].tanggal}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Waktu (WIB)</label>
                  <input type="time" value={form.waktu} onChange={e=>setForm(f=>({...f,waktu:e.target.value}))}
                    className="w-full rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none"
                    style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)'}}
                    onFocus={e=>e.target.style.borderColor=ACCENT}
                    onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Cabor *</label>
                  <select value={form.cabor} onChange={e=>setForm(f=>({...f,cabor:e.target.value}))}
                    className="w-full rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none"
                    style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)'}}>
                    <option value="" style={{background:'#03101c'}}>Pilih cabor...</option>
                    {caborList.map(c=><option key={c} value={c} style={{background:'#03101c'}}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Hasil Pertandingan *</label>
                <input value={form.hasil} onChange={e=>setForm(f=>({...f,hasil:e.target.value}))}
                  placeholder="Contoh: Juara 1 Final — Menang vs Kota Bandung"
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none"
                  style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)'}}
                  onFocus={e=>e.target.style.borderColor=ACCENT}
                  onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Medali Diraih</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Emas','Perak','Perunggu','Tanpa Medali'] as const).map(m=>{
                    const mc = MEDALI_CFG[m]
                    return (
                      <button key={m} onClick={()=>setForm(f=>({...f,medali:m}))}
                        className="py-2.5 rounded-xl text-[11px] font-bold text-center transition-all"
                        style={{
                          background: form.medali===m?mc.bg:'rgba(255,255,255,0.03)',
                          color:      form.medali===m?mc.text:'rgba(255,255,255,0.4)',
                          border:     form.medali===m?`1px solid ${mc.border}`:'1px solid rgba(255,255,255,0.07)',
                        }}>
                        {mc.emoji} {m==='Tanpa Medali'?'Tanpa':''}
                        {m!=='Tanpa Medali'?m:'Medali'}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Catatan Tim</label>
                <textarea value={form.catatan} onChange={e=>setForm(f=>({...f,catatan:e.target.value}))}
                  rows={3} placeholder="Evaluasi performa, highlight, atau hal yang perlu ditindaklanjuti..."
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none resize-none"
                  style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)'}}
                  onFocus={e=>e.target.style.borderColor=ACCENT}
                  onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={()=>setShowForm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.4)'}}>
                Batal
              </button>
              <button onClick={handleSave} disabled={!form.cabor||!form.hasil}
                className="flex-[2] py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                style={{background:`${ACCENT}15`,border:`1px solid ${ACCENT}30`,color:ACCENT}}>
                <Save size={15}/> {editId?'Simpan Perubahan':'Simpan Jurnal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}