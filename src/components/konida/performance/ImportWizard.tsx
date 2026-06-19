'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Download, Upload, CheckCircle2, AlertTriangle,
  ChevronRight, ArrowLeft, BarChart3, Info, X,
  FileSpreadsheet, Loader2, Trophy, Target,
} from 'lucide-react'
import { gapColor } from '@/lib/performance/import-parser'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExcelColumn { col: string; header: string; desc: string; required: boolean }

interface CaborOption {
  id: number
  cabor_nama: string
  sport_type: string
  normalized_field: string
  lower_is_better: boolean
  score_unit: string
  has_weight_class: boolean
  has_multi_periode: boolean
  excel_template_columns: ExcelColumn[]
  operator_notes: string
  weight_classes: string[]
  periode_options: string[]
}

interface ParsedRow {
  rowNum: number
  atlet_nama: string
  gender?: string
  event_name: string
  weight_class?: string
  periode: string
  score_raw?: string
  normalized_score?: number
  rekor_porprov?: number
  gap_percentage?: number
  target_medali_calc?: string
  target_medali_pelatih?: string
  warning?: string
}

interface ImportResult {
  success: boolean
  inserted: number
  notFound: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#6366f1'

const SPORT_TYPE_LABEL: Record<string, string> = {
  time_lower:           '⏱ Waktu — lebih cepat lebih baik',
  distance_higher:      '📏 Jarak — lebih jauh lebih baik',
  points_higher:        '🎯 Poin — lebih tinggi lebih baik',
  multi_lift:           '🏋️ Multi-angkatan (Squat + BP + DL)',
  weight_class_combat:  '🥋 Bela diri dengan kelas berat',
  head_to_head:         '🏸 Head-to-head / duel langsung',
  team_sport:           '⚽ Olahraga beregu / tim',
  rating_elo:           '♟️ Sistem rating (Elo)',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImportWizard({ cabors }: { cabors: CaborOption[] }) {
  const [step,        setStep]        = useState(1)
  const [selected,    setSelected]    = useState<CaborOption | null>(null)
  const [file,        setFile]        = useState<File | null>(null)
  const [dragging,    setDragging]    = useState(false)
  const [parsing,     setParsing]     = useState(false)
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [totalParsed, setTotalParsed] = useState(0)
  const [skipped,     setSkipped]     = useState(0)
  const [importing,   setImporting]   = useState(false)
  const [result,      setResult]      = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Step 1: Pilih Cabor ──
  function pickCabor(c: CaborOption) {
    setSelected(c)
    setStep(2)
    setFile(null)
    setPreviewRows([])
    setParseErrors([])
    setResult(null)
  }

  // ── Step 2: File handling ──
  const handleFile = useCallback((f: File) => { setFile(f) }, [])

  async function doPreview() {
    if (!file || !selected) return
    setParsing(true)
    setParseErrors([])
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('cabor_nama', selected.cabor_nama)
      fd.append('action', 'preview')
      const res = await fetch('/api/performance/import', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setParseErrors(json.errors ?? [json.error]); return }
      setPreviewRows(json.rows ?? [])
      setParseErrors(json.errors ?? [])
      setTotalParsed(json.totalRows ?? 0)
      setSkipped(json.skippedRows ?? 0)
      setStep(3)
    } catch (e) {
      setParseErrors(['Gagal parse file. Pastikan format Excel sesuai template.'])
    } finally {
      setParsing(false)
    }
  }

  async function doImport() {
    if (!file || !selected) return
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('cabor_nama', selected.cabor_nama)
      fd.append('action', 'import')
      const res = await fetch('/api/performance/import', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setParseErrors([json.error]); return }
      setResult(json)
      setStep(4)
    } catch (e) {
      setParseErrors(['Gagal import. Coba lagi.'])
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setStep(1); setSelected(null); setFile(null)
    setPreviewRows([]); setParseErrors([]); setResult(null)
  }

  const hasWarning = previewRows.some(r => r.warning)

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#020a14] text-white">
      <div className="max-w-5xl mx-auto p-6 lg:p-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
            <FileSpreadsheet size={20} style={{ color: ACCENT }}/>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: ACCENT }}>
              Performance Data
            </div>
            <h1 className="text-xl font-black text-white">Import Data Atlet</h1>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {['Pilih Cabor', 'Upload Excel', 'Preview', 'Selesai'].map((label, i) => {
            const s = i + 1
            const active  = s === step
            const done    = s < step
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                  active ? 'text-white' : done ? 'text-emerald-400' : 'text-slate-600'
                }`} style={active ? { background: `${ACCENT}30`, border: `1px solid ${ACCENT}60` } : {}}>
                  {done
                    ? <CheckCircle2 size={11} className="text-emerald-400"/>
                    : <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${active ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-600'}`}>{s}</span>
                  }
                  {label}
                </div>
                {i < 3 && <ChevronRight size={12} className="text-slate-700"/>}
              </div>
            )
          })}
        </div>

        {/* ── STEP 1: Pilih Cabor ── */}
        {step === 1 && (
          <div>
            <p className="text-sm text-zinc-400 mb-5">Pilih cabang olahraga yang datanya ingin diimport.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cabors.map(c => (
                <button key={c.id} onClick={() => pickCabor(c)}
                  className="group text-left rounded-2xl p-4 bg-slate-900/70 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/70 transition-all">
                  <div className="font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                    {c.cabor_nama}
                  </div>
                  <div className="text-[11px] text-zinc-500 mb-2">
                    {SPORT_TYPE_LABEL[c.sport_type] ?? c.sport_type}
                  </div>
                  {c.has_weight_class && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Kelas Berat
                    </span>
                  )}
                  {c.has_multi_periode && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 ml-1">
                      Multi Periode
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: Download Template + Upload ── */}
        {step === 2 && selected && (
          <div className="space-y-5">
            <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-1">
              <ArrowLeft size={14}/> Ganti Cabor
            </button>

            {/* Cabor info card */}
            <div className="rounded-2xl p-5 border border-slate-800 bg-slate-900/40">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="text-lg font-black text-white mb-1">{selected.cabor_nama}</div>
                  <div className="text-sm text-zinc-400 mb-3">{SPORT_TYPE_LABEL[selected.sport_type]}</div>
                  {selected.operator_notes && (
                    <div className="flex items-start gap-2 text-[11px] text-amber-400/80 rounded-lg p-2 bg-amber-500/5 border border-amber-500/15 max-w-lg">
                      <Info size={12} className="shrink-0 mt-0.5"/>
                      <span>{selected.operator_notes}</span>
                    </div>
                  )}
                </div>
                {/* Download template */}
                <a
                  href={`/api/performance/template?cabor=${encodeURIComponent(selected.cabor_nama)}`}
                  download
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: `${ACCENT}20`, color: ACCENT, border: `1px solid ${ACCENT}40` }}>
                  <Download size={15}/>
                  Download Template Excel
                </a>
              </div>

              {/* Column guide */}
              <details className="mt-4">
                <summary className="text-[11px] text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors select-none">
                  Lihat panduan kolom ({selected.excel_template_columns.length} kolom)
                </summary>
                <div className="mt-3 rounded-xl overflow-hidden border border-slate-800">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-slate-800/60">
                        <th className="text-left p-2 text-zinc-400 font-semibold w-8">Kol</th>
                        <th className="text-left p-2 text-zinc-400 font-semibold">Header</th>
                        <th className="text-left p-2 text-zinc-400 font-semibold">Keterangan</th>
                        <th className="text-left p-2 text-zinc-400 font-semibold w-16">Wajib?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.excel_template_columns.map(col => (
                        <tr key={col.col} className="border-t border-slate-800/60">
                          <td className="p-2 font-mono text-indigo-400">{col.col}</td>
                          <td className="p-2 text-white font-medium">{col.header}</td>
                          <td className="p-2 text-zinc-500">{col.desc}</td>
                          <td className="p-2">
                            {col.required
                              ? <span className="text-amber-400 font-bold">★ Ya</span>
                              : <span className="text-zinc-600">Tidak</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>

            {/* Upload zone */}
            <div>
              <p className="text-sm text-zinc-400 mb-3">
                Isi template yang sudah didownload, lalu upload di sini:
              </p>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => {
                  e.preventDefault(); setDragging(false)
                  const f = e.dataTransfer.files[0]
                  if (f) handleFile(f)
                }}
                className="rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all"
                style={{
                  borderColor: dragging ? ACCENT : file ? '#10b981' : '#334155',
                  background: dragging ? `${ACCENT}08` : file ? 'rgba(16,185,129,0.05)' : 'rgba(15,23,42,0.4)',
                }}>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}/>
                {file ? (
                  <>
                    <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400"/>
                    <div className="font-semibold text-emerald-300">{file.name}</div>
                    <div className="text-xs text-zinc-500 mt-1">{(file.size / 1024).toFixed(0)} KB · Klik untuk ganti</div>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="mx-auto mb-2 text-slate-600"/>
                    <div className="text-sm text-zinc-400">Drag & drop file Excel, atau klik untuk browse</div>
                    <div className="text-[11px] text-zinc-600 mt-1">.xlsx atau .xls</div>
                  </>
                )}
              </div>
            </div>

            {parseErrors.length > 0 && (
              <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {parseErrors.map((e, i) => <div key={i}>⚠ {e}</div>)}
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={doPreview} disabled={!file || parsing}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
                style={{ background: ACCENT, color: 'white' }}>
                {parsing ? <><Loader2 size={16} className="animate-spin"/> Memproses...</> : <>Lihat Preview <ChevronRight size={16}/></>}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Preview ── */}
        {step === 3 && (
          <div className="space-y-5">
            <button onClick={() => setStep(2)} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors">
              <ArrowLeft size={14}/> Kembali Upload
            </button>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-4 bg-slate-900/60 border border-slate-800 text-center">
                <div className="text-2xl font-black text-white">{totalParsed}</div>
                <div className="text-[10px] text-zinc-500 uppercase mt-0.5">Baris ditemukan</div>
              </div>
              <div className="rounded-xl p-4 bg-slate-900/60 border border-slate-800 text-center">
                <div className="text-2xl font-black text-zinc-500">{skipped}</div>
                <div className="text-[10px] text-zinc-500 uppercase mt-0.5">Baris dilewati</div>
              </div>
              <div className="rounded-xl p-4 bg-slate-900/60 border border-slate-800 text-center">
                <div className="text-2xl font-black" style={{ color: hasWarning ? '#f59e0b' : '#10b981' }}>
                  {previewRows.filter(r => r.warning).length}
                </div>
                <div className="text-[10px] text-zinc-500 uppercase mt-0.5">Dengan peringatan</div>
              </div>
            </div>

            {hasWarning && (
              <div className="flex items-start gap-2 rounded-xl p-3 bg-amber-500/8 border border-amber-500/20 text-sm text-amber-300">
                <AlertTriangle size={15} className="shrink-0 mt-0.5"/>
                <span>Beberapa baris punya peringatan — data tetap akan diimport, tapi gap% mungkin tidak dihitung. Periksa kolom rekor pembanding.</span>
              </div>
            )}

            {/* Preview table */}
            <div className="rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-slate-800/60 border-b border-slate-700">
                      <th className="text-left p-3 text-zinc-400 font-semibold">Atlet</th>
                      <th className="text-left p-3 text-zinc-400 font-semibold">Event</th>
                      <th className="text-left p-3 text-zinc-400 font-semibold">Score</th>
                      <th className="text-left p-3 text-zinc-400 font-semibold">Rekor</th>
                      <th className="text-left p-3 text-zinc-400 font-semibold">Gap%</th>
                      <th className="text-left p-3 text-zinc-400 font-semibold">Target</th>
                      <th className="text-left p-3 text-zinc-400 font-semibold">Periode</th>
                      <th className="p-3 text-zinc-400 font-semibold w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map(r => (
                      <tr key={r.rowNum} className={`border-t border-slate-800/50 ${r.warning ? 'bg-amber-500/4' : ''}`}>
                        <td className="p-3">
                          <div className="font-medium text-white">{r.atlet_nama}</div>
                          {r.gender && <div className="text-zinc-600">{r.gender}</div>}
                        </td>
                        <td className="p-3 text-zinc-300 max-w-[160px]">
                          <div className="truncate">{r.event_name}</div>
                          {r.weight_class && <div className="text-zinc-500">{r.weight_class}</div>}
                        </td>
                        <td className="p-3 font-mono text-zinc-200">{r.score_raw ?? '—'}</td>
                        <td className="p-3 font-mono text-zinc-500">{r.rekor_porprov ?? '—'}</td>
                        <td className="p-3 font-mono font-bold tabular-nums"
                          style={{ color: gapColor(r.gap_percentage) }}>
                          {r.gap_percentage !== undefined ? `${r.gap_percentage.toFixed(1)}%` : '—'}
                        </td>
                        <td className="p-3">
                          {(r.target_medali_pelatih ?? r.target_medali_calc) ? (
                            <span className="px-1.5 py-0.5 rounded font-bold text-[10px]"
                              style={{
                                background: r.target_medali_pelatih === 'Emas' || r.target_medali_calc === 'Emas'
                                  ? 'rgba(251,191,36,0.15)' : 'rgba(100,116,139,0.15)',
                                color: r.target_medali_pelatih === 'Emas' || r.target_medali_calc === 'Emas'
                                  ? '#fbbf24' : '#94a3b8',
                              }}>
                              {r.target_medali_pelatih ?? r.target_medali_calc}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="p-3 text-zinc-500">{r.periode}</td>
                        <td className="p-3 text-center">
                          {r.warning && (
                            <div title={r.warning}>
                              <AlertTriangle size={12} className="text-amber-400"/>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {parseErrors.length > 0 && (
              <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {parseErrors.map((e, i) => <div key={i}>⚠ {e}</div>)}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-600">
                Data akan disimpan ke tabel <span className="text-zinc-400 font-mono">atlet_performance_data</span>
              </div>
              <button onClick={doImport} disabled={importing || totalParsed === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
                style={{ background: '#10b981', color: 'white' }}>
                {importing
                  ? <><Loader2 size={16} className="animate-spin"/> Menyimpan...</>
                  : <><CheckCircle2 size={16}/> Import {totalParsed} Baris</>}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Selesai ── */}
        {step === 4 && result && (
          <div className="space-y-5">
            <div className="rounded-2xl p-8 bg-emerald-500/8 border border-emerald-500/20 text-center">
              <CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-400"/>
              <h2 className="text-2xl font-black text-white mb-1">Import Berhasil!</h2>
              <p className="text-zinc-400">
                <span className="text-emerald-300 font-bold text-xl">{result.inserted}</span> baris data {selected?.cabor_nama} berhasil disimpan.
              </p>
            </div>

            {result.notFound.length > 0 && (
              <div className="rounded-xl p-4 bg-amber-500/8 border border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm mb-2">
                  <AlertTriangle size={14}/>
                  {result.notFound.length} atlet tidak ditemukan di sistem
                </div>
                <p className="text-xs text-zinc-500 mb-2">
                  Data tetap tersimpan, tapi <span className="text-zinc-400 font-mono">atlet_id</span> akan null. Pastikan nama atlet di Excel sama persis dengan nama di database.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.notFound.map(n => (
                    <span key={n} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button onClick={reset}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-700 text-zinc-300 hover:border-slate-500 hover:text-white transition-all">
                Import Cabor Lain
              </button>
              <a href="/konida/performance/kabbandung"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: ACCENT, color: 'white' }}>
                <BarChart3 size={15}/> Lihat Performance
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
