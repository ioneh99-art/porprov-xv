'use client'
// Data Gateway — Multi-module CRUD hub for PORPROV XV global database
// Tabs: Import Atlet | Klasemen Medali | Master Cabor | Statistik DB

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import ImporTemplate from '@/components/konida/gateway/ImporTemplate'
import RiwayatImpor from '@/components/konida/gateway/RiwayatImpor'
import {
  Database, Download, UploadCloud, FileSpreadsheet,
  CheckCircle, XCircle, AlertTriangle, RefreshCw,
  ArrowRight, Eye, Loader2, Info, FileText,
  Zap, Shield, ChevronDown, ChevronUp, Check,
  Upload, Table, Play, RotateCcw, Medal, Layers,
  Edit3, Plus, Trash2, ToggleLeft, ToggleRight,
  Save, X,
  History,
} from 'lucide-react'
import { lengkapiPii } from '@/lib/atlet-pii-klien'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const KONTINGEN_ID = 4
const ACCENT       = '#38bdf8'

type Tab = 'identitas' | 'perlengkapan' | 'biomotorik' | 'lainnya' | 'import' | 'riwayat'

// ── Validasi import atlet ─────────────────────────────────
const REQUIRED_COLS = ['nama_lengkap','no_ktp','tgl_lahir','gender','cabor_nama_raw']
const OPTIONAL_COLS = ['kode_asal_daerah','nama_asal_daerah','ukuran_kemeja','ukuran_sepatu','nama_bank','no_rekening']
const ALL_TEMPLATE_COLS = [...REQUIRED_COLS, ...OPTIONAL_COLS]

interface ValidationResult {
  row: number; data: Record<string,string>; errors: string[]; warnings: string[]; status: 'OK'|'WARNING'|'ERROR'
}

function validateRow(row: Record<string,string>, existingNIK: Set<string>, rowIndex: number): ValidationResult {
  const errors: string[] = [], warnings: string[] = []
  if (!row.nama_lengkap?.trim())   errors.push('Nama lengkap kosong')
  if (!row.no_ktp?.trim())         errors.push('No KTP kosong')
  else if (row.no_ktp.trim().length !== 16) errors.push(`NIK harus 16 digit (saat ini: ${row.no_ktp.trim().length})`)
  if (!row.tgl_lahir?.trim())      errors.push('Tanggal lahir kosong')
  if (!row.gender?.trim())         errors.push('Gender kosong')
  else if (!['L','P','l','p','Laki-laki','Perempuan'].includes(row.gender.trim())) errors.push('Gender harus L atau P')
  if (!row.cabor_nama_raw?.trim()) errors.push('Cabor kosong')
  const nik = row.no_ktp?.trim()
  if (nik && nik.length===16) {
    if (existingNIK.has(nik)) errors.push('NIK duplikat dalam file ini')
    else existingNIK.add(nik)
  }
  if (!row.ukuran_kemeja?.trim()) warnings.push('Ukuran kemeja belum diisi')
  if (!row.nama_bank?.trim())     warnings.push('Rekening bank belum diisi')
  if (!row.kode_asal_daerah?.trim()) warnings.push('Kode asal daerah kosong')
  if (row.tgl_lahir && !/^\d{4}-\d{2}-\d{2}$/.test(row.tgl_lahir.trim()))
    warnings.push('Format tgl lahir sebaiknya YYYY-MM-DD')
  return { row: rowIndex, data: row, errors, warnings, status: errors.length>0?'ERROR':warnings.length>0?'WARNING':'OK' }
}

// ── Shared helpers ────────────────────────────────────────
function Spinner({ size=16, color=ACCENT }: { size?: number; color?: string }) {
  return <Loader2 size={size} className="animate-spin" style={{ color }}/>
}

function Card({ children, className='' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  )
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-3.5 border-b flex items-center gap-2"
      style={{ borderColor:'rgba(255,255,255,0.07)', background:'rgba(2,10,20,0.5)' }}>
      {children}
    </div>
  )
}

// ════════════════════════════════════════════════════════
// TAB 1: IMPORT ATLET
// ════════════════════════════════════════════════════════
function ImportTab({ existingAtletCount }: { existingAtletCount: number }) {
  const [existingNIKs, setExistingNIKs]   = useState<Set<string>>(new Set())
  const [dragActive,   setDragActive]     = useState(false)
  const [fileName,     setFileName]       = useState<string|null>(null)
  const [parsing,      setParsing]        = useState(false)
  const [validations,  setValidations]    = useState<ValidationResult[]>([])
  const [step,         setStep]           = useState<'idle'|'parsed'|'confirmed'|'done'>('idle')
  const [importing,    setImporting]      = useState(false)
  const [importResult, setImportResult]   = useState<{ok:number;err:number}|null>(null)
  const [showAll,      setShowAll]        = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ;(async () => {
      // Daftar NIK yang sudah terdaftar, untuk mendeteksi impor ganda.
      // Diambil dari rute bergerbang sesi — NIK tidak lagi bisa dibaca kunci
      // anon langsung dari tabel atlet.
      const r = await fetch('/api/konida/atlet-pii')
      if (!r.ok) return
      const d = await r.json()
      const nik = Object.values(d?.pii ?? {}).map((x: any) => x?.no_ktp || '').filter(Boolean)
      setExistingNIKs(new Set(nik as string[]))
    })()
  }, [])

  const stats = useMemo(() => {
    const ok   = validations.filter(v=>v.status==='OK').length
    const warn = validations.filter(v=>v.status==='WARNING').length
    const err  = validations.filter(v=>v.status==='ERROR').length
    return { ok, warn, err, total: validations.length, canImport: err===0 && validations.length>0 }
  }, [validations])

  async function parseFile(file: File) {
    setParsing(true); setFileName(file.name); setStep('idle'); setValidations([])
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb     = XLSX.read(buffer, { type:'array', cellDates:true })
      const ws     = wb.Sheets[wb.SheetNames[0]]
      const raw    = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' }) as any[][]
      if (raw.length < 2) throw new Error('File kosong atau hanya header')
      const header = (raw[0] as string[]).map(h=>String(h).trim().toLowerCase().replace(/\s+/g,'_'))
      const missingCols = REQUIRED_COLS.filter(c=>!header.includes(c))
      if (missingCols.length > 0) { alert(`Kolom wajib tidak ditemukan: ${missingCols.join(', ')}`); setParsing(false); return }
      const nikSet  = new Set(existingNIKs)
      const results: ValidationResult[] = []
      for (let i=1; i<raw.length; i++) {
        const rowArr = raw[i] as any[]
        if (rowArr.every(c=>!c)) continue
        const rowObj: Record<string,string> = {}
        header.forEach((h,j) => {
          let val = rowArr[j]
          if (val instanceof Date) {
            val = `${val.getFullYear()}-${String(val.getMonth()+1).padStart(2,'0')}-${String(val.getDate()).padStart(2,'0')}`
          }
          rowObj[h] = String(val??'').trim()
        })
        rowObj.kontingen_id = String(KONTINGEN_ID)
        rowObj.status_registrasi = rowObj.status_registrasi || 'Draft'
        const nik = rowObj.no_ktp
        if (nik && nik.length===16 && existingNIKs.has(nik)) {
          results.push({ row:i, data:rowObj, errors:[`NIK ${nik} SUDAH ADA di database`], warnings:[], status:'ERROR' })
          continue
        }
        results.push(validateRow(rowObj, nikSet, i))
      }
      setValidations(results); setStep('parsed')
    } catch(e: any) { alert(`Error parsing: ${e.message}`) }
    finally { setParsing(false) }
  }

  async function handleImport() {
    if (!stats.canImport) return
    setImporting(true)
    const validRows = validations.filter(v=>v.status!=='ERROR')
    try {
      // Impor via server (validasi + service key). Insert anon dari browser dihapus.
      const res = await fetch('/api/atlet/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows.map(v => v.data), kontingen_id: KONTINGEN_ID }),
      })
      const out = await res.json().catch(()=>({}))
      if (!res.ok) throw new Error(out?.error || 'Impor gagal')
      setImportResult({ ok: out.ok ?? 0, err: out.err ?? 0 }); setStep('done')
    } catch (e: any) {
      alert(`Impor gagal: ${e.message}`)
    } finally { setImporting(false) }
  }

  async function downloadTemplate() {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([ALL_TEMPLATE_COLS,
      ['Budi Santoso','3204011234567890','1998-05-14','L','Hockey','3204','Kab. Bandung','M','42','BRI','1234567890'],
      ['Sari Dewi','3204016789012345','2001-11-20','P','Renang','3204','Kab. Bandung','S','37','BCA','0987654321'],
    ])
    ws['!cols'] = ALL_TEMPLATE_COLS.map(()=>({wch:20}))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template Import Atlet')
    XLSX.writeFile(wb, 'Template_Import_Atlet_KabBandung.xlsx')
  }

  async function exportMasterDump() {
    let data: any[] = []
    for (let p = 0; ; p++) {
      const { data: pg } = await sb.from('atlet_umum').select('*').eq('kontingen_id', KONTINGEN_ID)
        .order('cabor_nama_raw',{ascending:true}).order('nama_lengkap',{ascending:true}).range(p * 1000, (p + 1) * 1000 - 1)
      if (!pg || pg.length === 0) break
      data = data.concat(pg)
      if (pg.length < 1000) break
    }
    // NIK & rekening ditempelkan lewat rute bergerbang sesi — tidak lagi ikut
    // terbawa dari tabel, sebab kunci anon sudah tidak boleh membacanya.
    data = await lengkapiPii(data)
    if (!data.length) return
    const XLSX = await import('xlsx')
    const header = ['ID','Nama Lengkap','No KTP','Tgl Lahir','Gender','Cabor','Kode Asal','Asal Daerah','Status','No Reg KONI','Kemeja','Sepatu','Bank','Rekening']
    const rows = (data as any[]).map(a=>[a.id,a.nama_lengkap,a.no_ktp,a.tgl_lahir,a.gender,a.cabor_nama_raw,a.kode_asal_daerah,a.nama_asal_daerah,a.status_registrasi,a.no_registrasi_koni,a.ukuran_kemeja,a.ukuran_sepatu,a.nama_bank,a.no_rekening])
    const ws = XLSX.utils.aoa_to_sheet([header,...rows])
    ws['!cols'] = header.map(()=>({wch:18}))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Master Data Atlet')
    XLSX.writeFile(wb, `MasterDump_KabBandung_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  function reset() {
    setStep('idle'); setValidations([]); setFileName(null); setImportResult(null); setShowAll(false)
    if (fileRef.current) fileRef.current.value=''
  }

  const displayed = showAll ? validations : validations.slice(0, 20)

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="rounded-2xl p-4 flex items-start gap-3"
        style={{ background:`${ACCENT}05`, border:`1px solid ${ACCENT}15` }}>
        <Info size={14} style={{ color:ACCENT, flexShrink:0, marginTop:2 }}/>
        <div>
          <div className="text-sm font-bold text-white mb-1.5">Cara Kerja Import Atlet</div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {[
              {l:'1. Download Template',c:ACCENT},{l:'→',c:'rgba(255,255,255,0.3)'},
              {l:'2. Isi Data Excel',c:'rgba(255,255,255,0.6)'},{l:'→',c:'rgba(255,255,255,0.3)'},
              {l:'3. Upload ke sini',c:'#60a5fa'},{l:'→',c:'rgba(255,255,255,0.3)'},
              {l:'4. Validasi Otomatis',c:'#fbbf24'},{l:'→',c:'rgba(255,255,255,0.3)'},
              {l:'5. Preview & Inject DB',c:'#22d3ee'},
            ].map((s,i) => <span key={i} className="font-bold" style={{color:s.c}}>{s.l}</span>)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Import jalur */}
        <Card>
          <CardHeader>
            <UploadCloud size={14} style={{ color:'#60a5fa' }}/>
            <span className="text-sm font-bold text-white">Import Data Massal</span>
            {step!=='idle' && (
              <button onClick={reset} className="ml-auto flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)' }}>
                <RotateCcw size={10}/> Reset
              </button>
            )}
          </CardHeader>
          <div className="p-5 space-y-5">
            {/* Step 1 */}
            <StepRow n="1" color={ACCENT}>
              <div className="text-xs font-bold text-white mb-1">Download Template Excel</div>
              <div className="text-[10px] text-zinc-500 mb-2">Format kolom benar + contoh data + instruksi</div>
              <button onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                style={{ background:`${ACCENT}12`, border:`1px solid ${ACCENT}25`, color:ACCENT }}>
                <Download size={13}/> Template_Import_Atlet.xlsx
              </button>
            </StepRow>

            <Divider/>

            {/* Step 2: upload */}
            <StepRow n={step!=='idle'?'✓':'2'} color={step!=='idle'?'#22d3ee':'#60a5fa'}>
              <div className="text-xs font-bold text-white mb-1">Upload File Excel / CSV</div>
              {step==='idle' ? (
                <div
                  className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all"
                  style={{ borderColor:dragActive?ACCENT:'rgba(255,255,255,0.12)', background:dragActive?`${ACCENT}05`:'rgba(255,255,255,0.02)' }}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e=>{e.preventDefault();setDragActive(true)}}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={e=>{e.preventDefault();setDragActive(false);const f=e.dataTransfer.files[0];if(f)parseFile(f)}}>
                  {parsing
                    ? <div className="flex flex-col items-center gap-2"><Spinner size={24}/><p className="text-xs font-bold" style={{color:ACCENT}}>Memproses...</p></div>
                    : <><Upload size={22} className="mx-auto mb-2" style={{color:'rgba(255,255,255,0.2)'}}/><p className="text-xs text-zinc-400">Seret & lepas atau klik untuk pilih</p><p className="text-[10px] text-zinc-600 mt-1">.xlsx atau .csv</p></>
                  }
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)' }}>
                  <FileSpreadsheet size={18} className="text-green-400"/>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-green-400 truncate">{fileName}</div>
                    <div className="text-[10px] text-zinc-500">{validations.length} baris terdeteksi</div>
                  </div>
                  <CheckCircle size={14} className="text-green-400"/>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls" onChange={e=>{const f=e.target.files?.[0];if(f)parseFile(f)}} className="hidden"/>
            </StepRow>

            {/* Step 3: validasi */}
            {step==='parsed' && (
              <>
                <Divider/>
                <StepRow n="3" color="#fbbf24">
                  <div className="text-xs font-bold text-white mb-2">Hasil Validasi Otomatis</div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[{l:'✅ OK',v:stats.ok,c:'#22d3ee'},{l:'⚠ Warning',v:stats.warn,c:'#fbbf24'},{l:'❌ Error',v:stats.err,c:'#f87171'}]
                      .map(s => (
                        <div key={s.l} className="rounded-xl p-3 text-center" style={{background:`${s.c}10`,border:`1px solid ${s.c}20`}}>
                          <div className="text-xl font-black" style={{color:s.c}}>{s.v}</div>
                          <div className="text-[9px] text-zinc-500">{s.l}</div>
                        </div>
                      ))}
                  </div>
                  {stats.err>0 && (
                    <div className="p-3 rounded-xl mb-3 flex items-start gap-2"
                      style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)' }}>
                      <AlertTriangle size={12} style={{ color:'#f87171', flexShrink:0, marginTop:1 }}/>
                      <span className="text-[10px] text-rose-400">{stats.err} baris error tidak akan diimport.</span>
                    </div>
                  )}
                  {stats.canImport
                    ? <button onClick={()=>setStep('confirmed')}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                        style={{ background:`${ACCENT}15`, border:`1px solid ${ACCENT}30`, color:ACCENT }}>
                        <Eye size={15}/> Preview & Konfirmasi ({stats.ok+stats.warn} baris)
                      </button>
                    : <div className="text-center text-xs text-zinc-500 py-2">Perbaiki semua error dulu</div>
                  }
                </StepRow>
              </>
            )}

            {/* Step 4: konfirmasi */}
            {step==='confirmed' && (
              <>
                <Divider/>
                <StepRow n="4" color="#22d3ee">
                  <div className="text-xs font-bold text-white mb-2">Konfirmasi Import ke Database</div>
                  <div className="p-3 rounded-xl mb-3 text-[11px] text-zinc-400 space-y-1"
                    style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)' }}>
                    <div>• <strong className="text-white">{stats.ok+stats.warn}</strong> baris akan diimport</div>
                    <div>• Kontingen: <strong style={{color:ACCENT}}>Kab. Bandung (ID={KONTINGEN_ID})</strong></div>
                    <div>• Status awal: <strong className="text-zinc-300">Draft</strong> (perlu verifikasi admin)</div>
                    <div>• NIK duplikat sudah <strong className="text-green-400">difilter</strong></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>setStep('parsed')}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                      style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)' }}>
                      Kembali
                    </button>
                    <button onClick={handleImport} disabled={importing}
                      className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                      style={{ background:'rgba(74,222,128,0.15)', border:'1px solid rgba(74,222,128,0.35)', color:'#22d3ee' }}>
                      {importing ? <><Spinner size={14}/> Mengimport...</> : <><Zap size={14}/> INJECT KE DATABASE</>}
                    </button>
                  </div>
                </StepRow>
              </>
            )}

            {/* Done */}
            {step==='done' && importResult && (
              <div className="rounded-xl p-5 text-center"
                style={{ background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.25)' }}>
                <CheckCircle size={32} className="mx-auto mb-3 text-green-400"/>
                <div className="text-lg font-black text-green-400 mb-1">Import Selesai!</div>
                <div className="text-sm text-zinc-300 mb-4">
                  <strong className="text-green-400">{importResult.ok} baris</strong> berhasil
                  {importResult.err>0 && <>, <strong className="text-red-400">{importResult.err} gagal</strong></>}
                </div>
                <button onClick={reset}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background:`${ACCENT}15`, border:`1px solid ${ACCENT}30`, color:ACCENT }}>
                  Import File Lain
                </button>
              </div>
            )}
          </div>
        </Card>

        {/* Export jalur */}
        <Card>
          <CardHeader>
            <Download size={14} style={{ color:'#a78bfa' }}/>
            <span className="text-sm font-bold text-white">Export & Template</span>
          </CardHeader>
          <div className="p-5 space-y-3">
            {[
              { l:'Template Import Atlet',  d:'File Excel kosong dengan format + instruksi', icon:FileSpreadsheet, c:'#22d3ee', badge:'FORMAT RESMI', action: downloadTemplate },
              { l:'Master Dump Database',   d:`Export semua atlet Kab. Bandung — ${existingAtletCount} records`, icon:Database, c:ACCENT, badge:`${existingAtletCount} REC`, action: exportMasterDump },
              { l:'Export Atlet Verified',  d:'Hanya Verified/Posted — untuk SK Bupati', icon:Shield, c:'#60a5fa', badge:'SK KONTINGEN',
                action: async () => {
                  let data: any[] = []
                  for (let p = 0; ; p++) {
                    const { data: pg } = await sb.from('atlet_umum').select('*').eq('kontingen_id',KONTINGEN_ID).in('status_registrasi',['Verified','Posted']).order('cabor_nama_raw',{ascending:true}).range(p * 1000, (p + 1) * 1000 - 1)
                    if (!pg || pg.length === 0) break
                    data = data.concat(pg)
                    if (pg.length < 1000) break
                  }
                  // NIK & rekening ditempelkan lewat rute bergerbang sesi — tidak lagi ikut
                  // terbawa dari tabel, sebab kunci anon sudah tidak boleh membacanya.
                  data = await lengkapiPii(data)
                  if (!data.length) return
                  const XLSX = await import('xlsx')
                  const cols = ['No','Nama','NIK','Tgl Lahir','Gender','Cabor','Asal','Status','No KONI']
                  const rows = (data as any[]).map((a,i)=>[i+1,a.nama_lengkap,a.no_ktp,a.tgl_lahir,a.gender,a.cabor_nama_raw,a.nama_asal_daerah||'Lokal',a.status_registrasi,a.no_registrasi_koni||'-'])
                  const ws = XLSX.utils.aoa_to_sheet([cols,...rows])
                  ws['!cols']=cols.map(()=>({wch:18}))
                  const wb=XLSX.utils.book_new()
                  XLSX.utils.book_append_sheet(wb,ws,'Atlet Verified')
                  XLSX.writeFile(wb,`SK_Kontingen_KabBandung_${new Date().toISOString().slice(0,10)}.xlsx`)
                },
              },
            ].map(r => (
              <div key={r.l}
                className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all group"
                style={{ background:'rgba(255,255,255,0.025)', border:`1px solid ${r.c}15` }}
                onClick={r.action}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor=`${r.c}35`}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor=`${r.c}15`}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background:`${r.c}12`, border:`1px solid ${r.c}25` }}>
                  <r.icon size={20} style={{ color:r.c }}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="text-sm font-bold text-zinc-200">{r.l}</div>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background:`${r.c}15`, color:r.c }}>{r.badge}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500">{r.d}</div>
                </div>
                <ArrowRight size={14} style={{ color:r.c, flexShrink:0 }} className="group-hover:translate-x-1 transition-transform"/>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Validation table */}
      {validations.length > 0 && (
        <Card>
          <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor:'rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-3">
              <Table size={14} style={{ color:ACCENT }}/>
              <span className="text-sm font-bold text-white">Detail Validasi per Baris</span>
              <span className="text-[11px]" style={{ color:'rgba(255,255,255,0.3)' }}>{validations.length} baris · tampil {displayed.length}</span>
            </div>
            <div className="flex gap-2">
              {[{l:`✅ ${stats.ok}`,c:'#22d3ee'},{l:`⚠ ${stats.warn}`,c:'#fbbf24'},{l:`❌ ${stats.err}`,c:'#f87171'}].map(s => (
                <div key={s.l} className="text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ background:`${s.c}12`, color:s.c }}>{s.l}</div>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto" style={{ scrollbarWidth:'thin', scrollbarColor:`${ACCENT}25 transparent` }}>
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="sticky top-0" style={{ background:'rgba(2,10,20,0.98)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  {['Baris','Status','Nama','NIK','Cabor','Gender','Issues'].map(c => (
                    <th key={c} className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest" style={{ color:'rgba(255,255,255,0.3)' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map(v => {
                  const stc = v.status==='OK'?'#22d3ee':v.status==='WARNING'?'#fbbf24':'#f87171'
                  const issues = [...v.errors,...v.warnings]
                  return (
                    <tr key={v.row} className="border-b" style={{ borderColor:'rgba(255,255,255,0.04)' }}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.02)'}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                      <td className="px-4 py-2.5 text-[10px] font-mono" style={{ color:'rgba(255,255,255,0.3)' }}>{v.row}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background:`${stc}15`, color:stc }}>{v.status}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-200 font-bold">{v.data.nama_lengkap||'—'}</td>
                      <td className="px-4 py-2.5 text-[10px] font-mono" style={{ color:'rgba(255,255,255,0.4)' }}>{v.data.no_ktp||'—'}</td>
                      <td className="px-4 py-2.5 text-[10px] text-zinc-400">{v.data.cabor_nama_raw||'—'}</td>
                      <td className="px-4 py-2.5 text-[10px]" style={{ color:v.data.gender==='L'?ACCENT:'#f472b6' }}>{v.data.gender||'—'}</td>
                      <td className="px-4 py-2.5">
                        {issues.length>0
                          ? <div className="space-y-0.5">{issues.slice(0,2).map((iss,j)=><div key={j} className="text-[9px]" style={{color:v.errors.includes(iss)?'#f87171':'#fbbf24'}}>{v.errors.includes(iss)?'❌':'⚠'} {iss}</div>)}{issues.length>2&&<div className="text-[9px] text-zinc-600">+{issues.length-2} lainnya</div>}</div>
                          : <span className="text-[9px] text-green-400">Semua valid</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {validations.length > 20 && (
            <div className="px-5 py-3 flex items-center justify-between border-t" style={{ borderColor:'rgba(255,255,255,0.05)' }}>
              <span className="text-[11px]" style={{ color:'rgba(255,255,255,0.25)' }}>Menampilkan {displayed.length} dari {validations.length}</span>
              <button onClick={()=>setShowAll(v=>!v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                style={{ background:`${ACCENT}10`, color:ACCENT, border:`1px solid ${ACCENT}20` }}>
                {showAll ? <><ChevronUp size={12}/> Sembunyikan</> : <><ChevronDown size={12}/> Tampilkan semua {validations.length} baris</>}
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════
// TAB 2: KLASEMEN MEDALI
// ════════════════════════════════════════════════════════
function StepRow({ n, color, children }: { n: string|number; color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5"
        style={{ background:`${color}20`, color, border:`1px solid ${color}30` }}>
        {n}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function Divider() {
  return <div className="border-l-2 ml-3 h-3" style={{ borderColor:'rgba(255,255,255,0.08)' }}/>
}

function LoadingSkel() {
  return (
    <div className="space-y-3 py-8">
      {[1,2,3].map(i => (
        <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background:'rgba(255,255,255,0.04)' }}/>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════
/** Tiga pemasukan data yang punya halamannya sendiri. Dipindah ke bawah gerbang
 *  ini supaya operator hanya perlu mengingat satu tempat untuk memasukkan data. */
function SumberLain() {
  const ITEM = [
    { href:'/konida/atlet/kabbandung/foto', judul:'Tarik Pasfoto Atlet',
      ket:'Dari folder hasil unduhan Google Drive. Dicocokkan per cabor, dikecilkan di peramban.' },
    { href:'/konida/rekonsiliasi', judul:'Rekonsiliasi Peserta',
      ket:'Berkas rekapitulasi KONI. Menghasilkan daftar peserta sah dan tiga angka selisih.' },
    { href:'/konida/intel', judul:'Target Medali (KBAAS)',
      ket:'Berkas analisis strategis. Target emas dua lapis dan proyeksi per atlet.' },
  ]
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-slate-500">
        Ketiganya memakai alur yang sama: unggah → pratinjau → konfirmasi → simpan.
        Bedanya hanya sumber berkasnya.
      </p>
      {ITEM.map(i => (
        <Link key={i.href} href={i.href}
          className="block rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06] transition-colors">
          <div className="text-white font-bold text-sm mb-1">{i.judul}</div>
          <div className="text-[12px] text-slate-500">{i.ket}</div>
        </Link>
      ))}
    </div>
  )
}

export default function DataGatewayPage() {
  const [tab,           setTab]           = useState<Tab>('identitas')
  const [atletCount,    setAtletCount]    = useState(0)
  const [animIn,        setAnimIn]        = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimIn(true), 60)
    sb.from('atlet_umum').select('id', { count:'exact', head:true }).eq('kontingen_id', KONTINGEN_ID)
      .then(({ count }) => { if (count !== null) setAtletCount(count) })
    return () => clearTimeout(t)
  }, [])

  // Gerbang tunggal: semua pemasukan data lewat sini. Tab lama yang menyentuh
  // data lintas kontingen dipisah ke kelompok terkunci superadmin.
  const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
    { id:'identitas',    label:'Identitas Atlet', icon:UploadCloud, desc:'Excel' },
    { id:'perlengkapan', label:'Perlengkapan',    icon:UploadCloud, desc:'Excel' },
    { id:'biomotorik',   label:'Tes Biomotorik',  icon:UploadCloud, desc:'Excel berkala' },
    { id:'lainnya',      label:'Sumber Lain',     icon:Database,    desc:'Foto · Rekonsiliasi · Target' },
    { id:'import',       label:'Import Atlet Baru', icon:UploadCloud, desc:'Excel → DB' },
    { id:'riwayat',      label:'Riwayat',         icon:History,     desc:'Siapa · kapan · apa' },
  ]

  return (
    <div className="min-h-screen text-zinc-300 font-sans" style={{ background:'linear-gradient(135deg,#020a14 0%,#020c18 100%)' }}>
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage:`linear-gradient(${ACCENT}03 1px,transparent 1px),linear-gradient(90deg,${ACCENT}03 1px,transparent 1px)`, backgroundSize:'24px 24px', zIndex:0 }}/>

      {/* HEADER */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl px-6 py-4"
        style={{ background:'rgba(2,10,20,0.95)', borderColor:`${ACCENT}12` }}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background:`${ACCENT}12`, border:`1px solid ${ACCENT}25` }}>
              <Database size={20} style={{ color:ACCENT }}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Data Gateway</h1>
              <p className="text-[11px] font-mono mt-0.5" style={{ color:'rgba(255,255,255,0.35)' }}>
                Manajemen Database Global PORPROV XV · Kab. Bandung
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)' }}>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
            <span className="text-[11px] font-mono font-bold text-green-400">DB ONLINE · {atletCount.toLocaleString('id')} atlet</span>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative z-10 space-y-5"
        style={{ opacity: animIn?1:0, transform: animIn?'translateY(0)':'translateY(12px)', transition:'all 0.5s ease' }}>

        {/* TAB SWITCHER */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: tab===t.id ? `${ACCENT}18` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${tab===t.id ? `${ACCENT}40` : 'rgba(255,255,255,0.08)'}`,
                color: tab===t.id ? ACCENT : 'rgba(255,255,255,0.45)',
              }}>
              <t.icon size={14}/>
              {t.label}
              <span className="text-[9px] font-normal px-1.5 py-0.5 rounded"
                style={{ background: tab===t.id ? `${ACCENT}20` : 'rgba(255,255,255,0.06)', color: tab===t.id ? ACCENT : 'rgba(255,255,255,0.3)' }}>
                {t.desc}
              </span>
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        {tab === 'identitas'    && <ImporTemplate jenis="identitas"    accent={ACCENT}/>}
        {tab === 'perlengkapan' && <ImporTemplate jenis="perlengkapan" accent={ACCENT}/>}
        {tab === 'biomotorik'   && <ImporTemplate jenis="biomotorik"   accent={ACCENT}/>}
        {tab === 'lainnya'      && <SumberLain/>}
        {tab === 'import'   && <ImportTab existingAtletCount={atletCount}/>}
        {tab === 'riwayat'  && <RiwayatImpor accent={ACCENT}/>}
      </main>
    </div>
  )
}
