'use client'
// src/app/konida/exportpdf/page.tsx — v2
// Data Gateway: Import Excel → Validasi → Preview → Inject DB
// + Export Template + Master Dump

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Database, Download, UploadCloud, FileSpreadsheet,
  CheckCircle, XCircle, AlertTriangle, RefreshCw,
  ArrowRight, Eye, Loader2, Info, X, FileText,
  Zap, Shield, ChevronDown, ChevronUp, Check,
  Upload, Table, Play, RotateCcw,
} from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const KONTINGEN_ID = 1
const ACCENT       = '#00ffaa'

// ── Kolom wajib untuk import atlet ───────────────────────
const REQUIRED_COLS = [
  'nama_lengkap','no_ktp','tgl_lahir','gender','cabor_nama_raw'
]
const OPTIONAL_COLS = [
  'kode_asal_daerah','nama_asal_daerah','ukuran_kemeja',
  'ukuran_sepatu','nama_bank','no_rekening'
]
const ALL_TEMPLATE_COLS = [...REQUIRED_COLS, ...OPTIONAL_COLS]

// ── Validasi per baris ────────────────────────────────────
interface ValidationResult {
  row:     number
  data:    Record<string,string>
  errors:  string[]
  warnings:string[]
  status:  'OK'|'WARNING'|'ERROR'
}

function validateRow(row: Record<string,string>, existingNIK: Set<string>, rowIndex: number): ValidationResult {
  const errors:   string[] = []
  const warnings: string[] = []

  // Wajib ada
  if (!row.nama_lengkap?.trim())   errors.push('Nama lengkap kosong')
  if (!row.no_ktp?.trim())         errors.push('No KTP kosong')
  else if (row.no_ktp.trim().length !== 16) errors.push(`NIK harus 16 digit (saat ini: ${row.no_ktp.trim().length})`)
  if (!row.tgl_lahir?.trim())      errors.push('Tanggal lahir kosong')
  if (!row.gender?.trim())         errors.push('Gender kosong')
  else if (!['L','P','l','p','Laki-laki','Perempuan'].includes(row.gender.trim())) errors.push('Gender harus L atau P')
  if (!row.cabor_nama_raw?.trim()) errors.push('Cabor kosong')

  // Duplikat NIK dalam file
  const nik = row.no_ktp?.trim()
  if (nik && nik.length===16) {
    if (existingNIK.has(nik)) errors.push('NIK duplikat dalam file ini')
    else existingNIK.add(nik)
  }

  // Warnings
  if (!row.ukuran_kemeja?.trim()) warnings.push('Ukuran kemeja belum diisi')
  if (!row.nama_bank?.trim())     warnings.push('Rekening bank belum diisi')
  if (!row.kode_asal_daerah?.trim()) warnings.push('Kode asal daerah kosong')

  // Format tanggal
  if (row.tgl_lahir && !/^\d{4}-\d{2}-\d{2}$/.test(row.tgl_lahir.trim())) {
    warnings.push('Format tgl lahir sebaiknya YYYY-MM-DD')
  }

  return {
    row:    rowIndex,
    data:   row,
    errors,
    warnings,
    status: errors.length>0 ? 'ERROR' : warnings.length>0 ? 'WARNING' : 'OK',
  }
}

function Bar({value,max,color,h=4}:{value:number;max:number;color:string;h?:number}) {
  return (
    <div className="rounded-full overflow-hidden" style={{height:h,background:'rgba(255,255,255,0.06)'}}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{width:`${max>0?Math.min(value/max*100,100):0}%`,background:color}}/>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────
export default function PageDataGateway() {
  const [atlets,       setAtlets]       = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)
  const [dragActive,   setDragActive]   = useState(false)
  const [fileName,     setFileName]     = useState<string|null>(null)
  const [parsing,      setParsing]      = useState(false)
  const [validations,  setValidations]  = useState<ValidationResult[]>([])
  const [step,         setStep]         = useState<'idle'|'parsed'|'confirmed'|'done'>('idle')
  const [importing,    setImporting]    = useState(false)
  const [importResult, setImportResult] = useState<{ok:number;err:number}|null>(null)
  const [showAll,      setShowAll]      = useState(false)
  const [animIn,       setAnimIn]       = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(()=>{ const t=setTimeout(()=>setAnimIn(true),80); return()=>clearTimeout(t) },[])

  // Fetch existing atlet untuk cek duplikat NIK di DB
  useEffect(()=>{
    async function load() {
      const { data } = await sb.from('atlet').select('no_ktp').eq('kontingen_id',KONTINGEN_ID)
      if (data) setAtlets(data)
      setLoading(false)
    }
    void load()
  },[])

  const existingNIKs = useMemo(()=>new Set(atlets.map((a:any)=>a.no_ktp||'')),[atlets])

  // Stats validasi
  const stats = useMemo(()=>{
    const ok   = validations.filter(v=>v.status==='OK').length
    const warn = validations.filter(v=>v.status==='WARNING').length
    const err  = validations.filter(v=>v.status==='ERROR').length
    return { ok, warn, err, total: validations.length, canImport: err===0 && validations.length>0 }
  },[validations])

  // ── Parse Excel / CSV ─────────────────────────────────────
  async function parseFile(file: File) {
    setParsing(true)
    setFileName(file.name)
    setStep('idle')
    setValidations([])

    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb     = XLSX.read(buffer, { type:'array', cellDates:true })
      const ws     = wb.Sheets[wb.SheetNames[0]]
      const raw    = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' }) as any[][]

      if (raw.length < 2) throw new Error('File kosong atau hanya header')

      // Deteksi header
      const header = (raw[0] as string[]).map(h=>String(h).trim().toLowerCase().replace(/\s+/g,'_'))

      // Validasi kolom wajib ada
      const missingCols = REQUIRED_COLS.filter(c=>!header.includes(c))
      if (missingCols.length > 0) {
        alert(`Kolom wajib tidak ditemukan: ${missingCols.join(', ')}\n\nDownload template untuk format yang benar.`)
        setParsing(false)
        return
      }

      const nikSet  = new Set(existingNIKs) // copy existing, tambah saat validasi
      const results: ValidationResult[] = []

      for (let i=1; i<raw.length; i++) {
        const rowArr = raw[i] as any[]
        if (rowArr.every(c=>!c)) continue // skip baris kosong

        const rowObj: Record<string,string> = {}
        header.forEach((h,j)=>{
          let val = rowArr[j]
          // Handle date dari Excel
          if (val instanceof Date) {
            const yyyy = val.getFullYear()
            const mm   = String(val.getMonth()+1).padStart(2,'0')
            const dd   = String(val.getDate()).padStart(2,'0')
            val = `${yyyy}-${mm}-${dd}`
          }
          rowObj[h] = String(val??'').trim()
        })

        // Tambah kolom default
        rowObj.kontingen_id = String(KONTINGEN_ID)
        rowObj.status_registrasi = rowObj.status_registrasi || 'Draft'

        // Cek duplikat dengan DB
        const nik = rowObj.no_ktp
        if (nik && nik.length===16 && existingNIKs.has(nik)) {
          results.push({
            row: i, data: rowObj,
            errors: [`NIK ${nik} SUDAH ADA di database (kemungkinan duplikat)`],
            warnings: [], status: 'ERROR',
          })
          continue
        }

        results.push(validateRow(rowObj, nikSet, i))
      }

      setValidations(results)
      setStep('parsed')
    } catch(e: any) {
      alert(`Error parsing file: ${e.message}`)
    } finally {
      setParsing(false)
    }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault(); setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  // ── Import ke DB via Supabase ─────────────────────────────
  async function handleImport() {
    if (!stats.canImport) return
    setImporting(true)
    let ok=0, err=0

    const validRows = validations.filter(v=>v.status!=='ERROR')

    // Batch insert 50 baris sekaligus
    const BATCH = 50
    for (let i=0; i<validRows.length; i+=BATCH) {
      const batch = validRows.slice(i,i+BATCH).map(v=>{
        const d = {...v.data}
        delete d.kontingen_id // nanti di-set manual
        return {
          nama_lengkap:       d.nama_lengkap,
          no_ktp:             d.no_ktp,
          tgl_lahir:          d.tgl_lahir||null,
          gender:             d.gender?.toUpperCase()==='L'||d.gender==='Laki-laki'?'L':'P',
          cabor_nama_raw:     d.cabor_nama_raw,
          kode_asal_daerah:   d.kode_asal_daerah||null,
          nama_asal_daerah:   d.nama_asal_daerah||null,
          ukuran_kemeja:      d.ukuran_kemeja||null,
          ukuran_sepatu:      d.ukuran_sepatu||null,
          nama_bank:          d.nama_bank||null,
          no_rekening:        d.no_rekening||null,
          kontingen_id:       KONTINGEN_ID,
          status_registrasi:  'Draft',
        }
      })

      const { error } = await sb.from('atlet').insert(batch)
      if (error) { err += batch.length; console.error(error) }
      else ok += batch.length
    }

    setImportResult({ ok, err })
    setStep('done')
    setImporting(false)
  }

  // ── Download template Excel ───────────────────────────────
  async function downloadTemplate() {
    const XLSX = await import('xlsx')
    const header = ALL_TEMPLATE_COLS
    const example = [
      ['Budi Santoso','3201011234567890','1998-05-14','L','Hockey',
       '3201','Kab. Bogor','M','42','BRI','1234567890'],
      ['Sari Dewi','3201016789012345','2001-11-20','P','Renang',
       '3201','Kab. Bogor','S','37','BCA','0987654321'],
    ]
    const ws = XLSX.utils.aoa_to_sheet([header, ...example])
    ws['!cols'] = header.map(()=>({wch:20}))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template Import Atlet')

    // Sheet instruksi
    const instruksi = [
      ['INSTRUKSI PENGISIAN TEMPLATE IMPORT ATLET'],
      [''],
      ['KOLOM WAJIB (harus diisi):'],
      ['nama_lengkap','Nama lengkap sesuai KTP'],
      ['no_ktp','NIK 16 digit'],
      ['tgl_lahir','Format: YYYY-MM-DD (contoh: 1998-05-14)'],
      ['gender','L untuk Laki-laki, P untuk Perempuan'],
      ['cabor_nama_raw','Nama cabor sesuai daftar resmi (contoh: Hockey, Renang)'],
      [''],
      ['KOLOM OPSIONAL (sebaiknya diisi):'],
      ['kode_asal_daerah','Kode BPS wilayah (contoh: 3201 untuk Kab. Bogor)'],
      ['nama_asal_daerah','Nama kabupaten/kota asal (contoh: Kab. Bogor)'],
      ['ukuran_kemeja','S / M / L / XL / XXL / XXXL'],
      ['ukuran_sepatu','Nomor sepatu (contoh: 42)'],
      ['nama_bank','Nama bank (contoh: BRI, BCA, Mandiri)'],
      ['no_rekening','Nomor rekening tanpa spasi/strip'],
      [''],
      ['CATATAN:'],
      ['- Jangan ubah nama kolom header (baris pertama)'],
      ['- Satu baris = satu atlet'],
      ['- File akan divalidasi sebelum masuk database'],
      ['- NIK duplikat akan otomatis ditolak sistem'],
    ]
    const wsInstruksi = XLSX.utils.aoa_to_sheet(instruksi)
    wsInstruksi['!cols'] = [{wch:25},{wch:60}]
    XLSX.utils.book_append_sheet(wb, wsInstruksi, 'Instruksi')

    XLSX.writeFile(wb, 'Template_Import_Atlet_KabBogor.xlsx')
  }

  // ── Export master dump ────────────────────────────────────
  async function exportMasterDump() {
    const { data } = await sb.from('atlet')
      .select('*')
      .eq('kontingen_id', KONTINGEN_ID)
      .order('cabor_nama_raw',{ascending:true})
      .order('nama_lengkap',{ascending:true})

    if (!data) return
    const XLSX = await import('xlsx')
    const header = ['ID','Nama Lengkap','No KTP','Tgl Lahir','Gender','Cabor',
      'Kode Asal','Asal Daerah','Status','No Reg KONI','Kemeja','Sepatu','Bank','Rekening']
    const rows = (data as any[]).map(a=>[
      a.id, a.nama_lengkap, a.no_ktp, a.tgl_lahir, a.gender, a.cabor_nama_raw,
      a.kode_asal_daerah, a.nama_asal_daerah, a.status_registrasi,
      a.no_registrasi_koni, a.ukuran_kemeja, a.ukuran_sepatu, a.nama_bank, a.no_rekening
    ])
    const ws = XLSX.utils.aoa_to_sheet([header,...rows])
    ws['!cols'] = header.map(()=>({wch:18}))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Master Data Atlet')
    XLSX.writeFile(wb, `MasterDump_KabBogor_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  function reset() {
    setStep('idle'); setValidations([]); setFileName(null)
    setImportResult(null); setShowAll(false)
    if (fileRef.current) fileRef.current.value=''
  }

  const ani=(d=0)=>({
    style:{transitionDelay:`${d}ms`,transition:'all 0.5s ease'},
    className:animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-4',
  })

  const displayed = showAll ? validations : validations.slice(0,20)

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
              <Database size={20} style={{color:ACCENT}}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Data Gateway & Import Hub</h1>
              <p className="text-[11px] font-mono mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>
                Jembatan data instansi eksternal → Database PORPROV XV · {atlets.length} atlet aktif
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{background:'rgba(74,222,128,0.08)',border:'1px solid rgba(74,222,128,0.2)'}}>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
            <span className="text-[11px] font-mono font-bold text-green-400">DB ONLINE · {atlets.length.toLocaleString('id')} records</span>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative z-10 space-y-5">

        {/* KONSEP GATEWAY */}
        <div {...ani(0)} className="rounded-2xl p-5 flex items-start gap-4"
          style={{background:`${ACCENT}05`,border:`1px solid ${ACCENT}15`}}>
          <Info size={15} style={{color:ACCENT,flexShrink:0,marginTop:2}}/>
          <div>
            <div className="text-sm font-bold text-white mb-2">Cara Kerja Data Gateway</div>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {[
                {l:'1. Download Template', c:ACCENT},
                {l:'→', c:'rgba(255,255,255,0.3)'},
                {l:'2. Isi Data di Excel', c:'rgba(255,255,255,0.6)'},
                {l:'→', c:'rgba(255,255,255,0.3)'},
                {l:'3. Upload ke sini', c:'#60a5fa'},
                {l:'→', c:'rgba(255,255,255,0.3)'},
                {l:'4. Sistem Validasi', c:'#fbbf24'},
                {l:'→', c:'rgba(255,255,255,0.3)'},
                {l:'5. Preview Hasil', c:'#a78bfa'},
                {l:'→', c:'rgba(255,255,255,0.3)'},
                {l:'6. Inject ke DB', c:'#4ade80'},
              ].map((s,i)=>(
                <span key={i} className="font-bold" style={{color:s.c}}>{s.l}</span>
              ))}
            </div>
            <p className="text-[11px] mt-2" style={{color:'rgba(255,255,255,0.4)'}}>
              Pengurus cabor / instansi kirim data Excel → upload di sini → sistem validasi otomatis (NIK, duplikat, format) → preview → inject massal ke database
            </p>
          </div>
        </div>

        {/* 2 KOLOM UTAMA */}
        <div {...ani(40)} className="grid grid-cols-2 gap-5">

          {/* IMPORT JALUR */}
          <div className="rounded-2xl overflow-hidden"
            style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)'}}>

            <div className="px-5 py-4 border-b flex items-center justify-between"
              style={{borderColor:'rgba(255,255,255,0.07)',background:'rgba(2,13,6,0.5)'}}>
              <div className="flex items-center gap-2">
                <UploadCloud size={14} style={{color:'#60a5fa'}}/>
                <span className="text-sm font-bold text-white">Import Data Massal</span>
              </div>
              {step!=='idle' && (
                <button onClick={reset} className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
                  style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.4)'}}>
                  <RotateCcw size={10}/> Reset
                </button>
              )}
            </div>

            <div className="p-5 space-y-4">
              {/* Step 1: Download template */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5"
                  style={{background:`${ACCENT}20`,color:ACCENT,border:`1px solid ${ACCENT}30`}}>1</div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-white mb-1">Download Template Excel</div>
                  <div className="text-[10px] text-zinc-500 mb-2">Format kolom yang benar + contoh data + instruksi pengisian</div>
                  <button onClick={downloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                    style={{background:`${ACCENT}12`,border:`1px solid ${ACCENT}25`,color:ACCENT}}>
                    <Download size={13}/> Template_Import_Atlet.xlsx
                  </button>
                </div>
              </div>

              <div className="border-l-2 ml-3 h-3" style={{borderColor:'rgba(255,255,255,0.08)'}}/>

              {/* Step 2: Upload */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5"
                  style={{background:step!=='idle'?'rgba(74,222,128,0.2)':'rgba(96,165,250,0.2)',
                    color:step!=='idle'?'#4ade80':'#60a5fa',
                    border:`1px solid ${step!=='idle'?'rgba(74,222,128,0.3)':'rgba(96,165,250,0.3)'}`}}>
                  {step!=='idle'?<Check size={10}/>:'2'}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-white mb-1">Upload File Excel / CSV</div>
                  <div className="text-[10px] text-zinc-500 mb-2">Seret file atau klik untuk pilih</div>

                  {step==='idle' ? (
                    <div
                      className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all"
                      style={{
                        borderColor: dragActive?ACCENT:'rgba(255,255,255,0.12)',
                        background:  dragActive?`${ACCENT}05`:'rgba(255,255,255,0.02)',
                      }}
                      onClick={()=>fileRef.current?.click()}
                      onDragOver={e=>{e.preventDefault();setDragActive(true)}}
                      onDragLeave={()=>setDragActive(false)}
                      onDrop={handleFileDrop}>
                      {parsing
                        ? <div className="flex flex-col items-center gap-2">
                            <Loader2 size={24} className="animate-spin" style={{color:ACCENT}}/>
                            <p className="text-xs font-bold" style={{color:ACCENT}}>Memproses file...</p>
                          </div>
                        : <>
                            <Upload size={24} className="mx-auto mb-2" style={{color:'rgba(255,255,255,0.2)'}}/>
                            <p className="text-xs font-bold text-zinc-400">Seret & lepas file Excel di sini</p>
                            <p className="text-[10px] text-zinc-600 mt-1">.xlsx atau .csv · Maks 10MB</p>
                          </>
                      }
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{background:'rgba(74,222,128,0.08)',border:'1px solid rgba(74,222,128,0.2)'}}>
                      <FileSpreadsheet size={18} className="text-green-400 flex-shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-green-400 truncate">{fileName}</div>
                        <div className="text-[10px] text-zinc-500">{validations.length} baris terdeteksi</div>
                      </div>
                      <CheckCircle size={14} className="text-green-400 flex-shrink-0"/>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls"
                    onChange={handleFileInput} className="hidden"/>
                </div>
              </div>

              {/* Step 3: Validasi summary */}
              {step==='parsed' && (
                <>
                  <div className="border-l-2 ml-3 h-3" style={{borderColor:'rgba(255,255,255,0.08)'}}/>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5"
                      style={{background:'rgba(251,191,36,0.2)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.3)'}}>3</div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white mb-2">Hasil Validasi Otomatis</div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                          {l:'✅ OK',      v:stats.ok,   c:'#4ade80'},
                          {l:'⚠ Warning',  v:stats.warn, c:'#fbbf24'},
                          {l:'❌ Error',   v:stats.err,  c:'#f87171'},
                        ].map(s=>(
                          <div key={s.l} className="rounded-xl p-3 text-center"
                            style={{background:`${s.c}10`,border:`1px solid ${s.c}20`}}>
                            <div className="text-xl font-black" style={{color:s.c}}>{s.v}</div>
                            <div className="text-[9px] text-zinc-500">{s.l}</div>
                          </div>
                        ))}
                      </div>

                      {stats.err > 0 && (
                        <div className="p-3 rounded-xl mb-3 flex items-start gap-2"
                          style={{background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.2)'}}>
                          <AlertTriangle size={12} style={{color:'#f87171',flexShrink:0,marginTop:1}}/>
                          <span className="text-[10px] text-rose-400">
                            {stats.err} baris error tidak akan diimport. Perbaiki data lalu upload ulang.
                          </span>
                        </div>
                      )}

                      {stats.canImport ? (
                        <button onClick={()=>setStep('confirmed')}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                          style={{background:`${ACCENT}15`,border:`1px solid ${ACCENT}30`,color:ACCENT}}>
                          <Eye size={15}/> Preview & Konfirmasi Import ({stats.ok+stats.warn} baris)
                        </button>
                      ) : (
                        <div className="text-center text-xs text-zinc-500 py-2">
                          Perbaiki semua error terlebih dahulu sebelum bisa import
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Step 4: Konfirmasi & Import */}
              {step==='confirmed' && (
                <>
                  <div className="border-l-2 ml-3 h-3" style={{borderColor:'rgba(255,255,255,0.08)'}}/>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5"
                      style={{background:'rgba(74,222,128,0.2)',color:'#4ade80',border:'1px solid rgba(74,222,128,0.3)'}}>4</div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white mb-2">Konfirmasi Import ke Database</div>
                      <div className="p-3 rounded-xl mb-3"
                        style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)'}}>
                        <div className="text-[11px] text-zinc-400 space-y-1">
                          <div>• <strong className="text-white">{stats.ok+stats.warn}</strong> baris akan diimport</div>
                          <div>• Kontingen ID: <strong style={{color:ACCENT}}>{KONTINGEN_ID} (Kab. Bogor)</strong></div>
                          <div>• Status awal: <strong className="text-zinc-300">Draft</strong></div>
                          <div>• NIK duplikat sudah <strong className="text-green-400">difilter otomatis</strong></div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>setStep('parsed')}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                          style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.5)'}}>
                          Kembali
                        </button>
                        <button onClick={handleImport} disabled={importing}
                          className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                          style={{background:'rgba(74,222,128,0.15)',border:'1px solid rgba(74,222,128,0.35)',color:'#4ade80'}}>
                          {importing
                            ? <><Loader2 size={14} className="animate-spin"/> Mengimport...</>
                            : <><Zap size={14}/> INJECT KE DATABASE</>
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Done */}
              {step==='done' && importResult && (
                <div className="rounded-xl p-5 text-center"
                  style={{background:'rgba(74,222,128,0.08)',border:'1px solid rgba(74,222,128,0.25)'}}>
                  <CheckCircle size={32} className="mx-auto mb-3 text-green-400"/>
                  <div className="text-lg font-black text-green-400 mb-1">Import Selesai!</div>
                  <div className="text-sm text-zinc-300 mb-1">
                    <strong className="text-green-400">{importResult.ok} baris</strong> berhasil diimport
                    {importResult.err>0 && <>, <strong className="text-red-400">{importResult.err} baris</strong> gagal</>}
                  </div>
                  <div className="text-[11px] text-zinc-500 mb-4">
                    Data masuk dengan status <strong>Draft</strong> — perlu verifikasi admin
                  </div>
                  <button onClick={reset}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold"
                    style={{background:`${ACCENT}15`,border:`1px solid ${ACCENT}30`,color:ACCENT}}>
                    Import File Lain
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* EXPORT JALUR */}
          <div className="rounded-2xl overflow-hidden"
            style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)'}}>

            <div className="px-5 py-4 border-b"
              style={{borderColor:'rgba(255,255,255,0.07)',background:'rgba(2,13,6,0.5)'}}>
              <div className="flex items-center gap-2">
                <Download size={14} style={{color:'#a78bfa'}}/>
                <span className="text-sm font-bold text-white">Export & Template</span>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {[
                {
                  id:'template',
                  l:'Template Import Atlet',
                  d:'File Excel kosong dengan format kolom benar + instruksi pengisian',
                  icon:FileSpreadsheet, c:'#4ade80',
                  badge:'WAJIB DOWNLOAD DULU',
                  action: downloadTemplate,
                },
                {
                  id:'master',
                  l:'Master Dump Database',
                  d:'Export semua atlet Kab. Bogor — semua kolom, semua status',
                  icon:Database, c:ACCENT,
                  badge:`${atlets.length} records`,
                  action: exportMasterDump,
                },
                {
                  id:'verified',
                  l:'Export Atlet Verified',
                  d:'Hanya atlet status Verified/Posted — siap untuk SK Bupati',
                  icon:Shield, c:'#60a5fa',
                  badge:'SK KONTINGEN',
                  action: async ()=>{
                    const {data}= await sb.from('atlet').select('*').eq('kontingen_id',KONTINGEN_ID)
                      .in('status_registrasi',['Verified','Posted']).order('cabor_nama_raw',{ascending:true})
                    if (!data) return
                    const XLSX = await import('xlsx')
                    const cols = ['No','Nama Lengkap','NIK','Tgl Lahir','Gender','Cabor','Asal','Status','No KONI']
                    const rows = (data as any[]).map((a,i)=>[
                      i+1,a.nama_lengkap,a.no_ktp,a.tgl_lahir,a.gender,
                      a.cabor_nama_raw,a.nama_asal_daerah||'Lokal',a.status_registrasi,a.no_registrasi_koni||'-'
                    ])
                    const ws = XLSX.utils.aoa_to_sheet([cols,...rows])
                    ws['!cols']=cols.map(()=>({wch:18}))
                    const wb=XLSX.utils.book_new()
                    XLSX.utils.book_append_sheet(wb,ws,'Atlet Verified')
                    XLSX.writeFile(wb,`SK_Kontingen_KabBogor_${new Date().toISOString().slice(0,10)}.xlsx`)
                  },
                },
              ].map(r=>(
                <div key={r.id} className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all group"
                  style={{background:'rgba(255,255,255,0.025)',border:`1px solid ${r.c}15`}}
                  onClick={r.action}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor=`${r.c}35`}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor=`${r.c}15`}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{background:`${r.c}12`,border:`1px solid ${r.c}25`}}>
                    <r.icon size={20} style={{color:r.c}}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="text-sm font-bold text-zinc-200">{r.l}</div>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                        style={{background:`${r.c}15`,color:r.c}}>{r.badge}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500">{r.d}</div>
                  </div>
                  <ArrowRight size={15} style={{color:r.c,flexShrink:0}}
                    className="group-hover:translate-x-1 transition-transform"/>
                </div>
              ))}

              {/* Info laporan lanjutan */}
              <div className="mt-4 p-4 rounded-xl"
                style={{background:`${ACCENT}04`,border:`1px solid ${ACCENT}10`}}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{color:ACCENT}}>
                  💡 Laporan Lengkap
                </div>
                <p className="text-[10px] text-zinc-500 mb-2">
                  Untuk laporan SK Kontingen, Apparel, Rekening, dan Audit NIK yang lebih detail — buka menu Laporan.
                </p>
                <a href="/konida/laporan"
                  className="flex items-center gap-1.5 text-[11px] font-bold"
                  style={{color:ACCENT}}>
                  Buka Pusat Laporan <ArrowRight size={11}/>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* DETAIL VALIDASI TABLE */}
        {validations.length > 0 && (
          <div {...ani(80)} className="rounded-2xl overflow-hidden"
            style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)'}}>

            <div className="flex items-center justify-between px-5 py-4 border-b"
              style={{borderColor:'rgba(255,255,255,0.07)'}}>
              <div className="flex items-center gap-3">
                <Table size={14} style={{color:ACCENT}}/>
                <span className="text-sm font-bold text-white">Detail Validasi per Baris</span>
                <span className="text-[11px]" style={{color:'rgba(255,255,255,0.3)'}}>
                  {validations.length} baris · tampil {displayed.length}
                </span>
              </div>
              <div className="flex gap-2">
                {[
                  {l:`✅ ${stats.ok} OK`, c:'#4ade80', f:'OK'},
                  {l:`⚠ ${stats.warn}`, c:'#fbbf24', f:'WARNING'},
                  {l:`❌ ${stats.err}`, c:'#f87171', f:'ERROR'},
                ].map(s=>(
                  <div key={s.f} className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
                    style={{background:`${s.c}12`,color:s.c,border:`1px solid ${s.c}20`}}>
                    {s.l}
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto max-h-[400px] overflow-y-auto"
              style={{scrollbarWidth:'thin',scrollbarColor:`${ACCENT}25 transparent`}}>
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="sticky top-0"
                    style={{background:'rgba(2,13,6,0.98)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                    {['Baris','Status','Nama','NIK','Cabor','Gender','Issues'].map(c=>(
                      <th key={c} className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest"
                        style={{color:'rgba(255,255,255,0.3)'}}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(v=>{
                    const stColor = v.status==='OK'?'#4ade80':v.status==='WARNING'?'#fbbf24':'#f87171'
                    const issues  = [...v.errors,...v.warnings]
                    return (
                      <tr key={v.row} className="border-b transition-colors"
                        style={{borderColor:'rgba(255,255,255,0.04)'}}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.02)'}
                        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                        <td className="px-4 py-2.5 text-[10px] font-mono" style={{color:'rgba(255,255,255,0.3)'}}>{v.row}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded"
                            style={{background:`${stColor}15`,color:stColor,border:`1px solid ${stColor}25`}}>
                            {v.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-zinc-200 font-bold">{v.data.nama_lengkap||'—'}</td>
                        <td className="px-4 py-2.5 text-[10px] font-mono" style={{color:'rgba(255,255,255,0.4)'}}>{v.data.no_ktp||'—'}</td>
                        <td className="px-4 py-2.5 text-[10px] text-zinc-400">{v.data.cabor_nama_raw||'—'}</td>
                        <td className="px-4 py-2.5 text-[10px]" style={{color:v.data.gender==='L'?ACCENT:'#f472b6'}}>{v.data.gender||'—'}</td>
                        <td className="px-4 py-2.5">
                          {issues.length>0 ? (
                            <div className="space-y-0.5">
                              {issues.slice(0,2).map((iss,j)=>(
                                <div key={j} className="text-[9px]"
                                  style={{color:v.errors.includes(iss)?'#f87171':'#fbbf24'}}>
                                  {v.errors.includes(iss)?'❌':'⚠'} {iss}
                                </div>
                              ))}
                              {issues.length>2&&<div className="text-[9px] text-zinc-600">+{issues.length-2} lainnya</div>}
                            </div>
                          ) : (
                            <span className="text-[9px] text-green-400">Semua valid</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {validations.length > 20 && (
              <div className="px-5 py-3 flex items-center justify-between border-t"
                style={{borderColor:'rgba(255,255,255,0.05)'}}>
                <span className="text-[11px]" style={{color:'rgba(255,255,255,0.25)'}}>
                  Menampilkan {displayed.length} dari {validations.length} baris
                </span>
                <button onClick={()=>setShowAll(v=>!v)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                  style={{background:`${ACCENT}10`,color:ACCENT,border:`1px solid ${ACCENT}20`}}>
                  {showAll
                    ? <><ChevronUp size={12}/> Sembunyikan</>
                    : <><ChevronDown size={12}/> Tampilkan semua {validations.length} baris</>}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}