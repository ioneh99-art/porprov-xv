'use client'

import { useState, useRef } from 'react'
import {
  Upload, Download, CheckCircle2, XCircle, AlertCircle, Loader2,
  FileSpreadsheet, Shield, Trash2, Sparkles, ChevronDown, ChevronRight,
} from 'lucide-react'

const DISCIPLINE_LABEL: Record<string, string> = {
  fencing_ranking: 'Fencing Ranking',
  fencing_de:      'Fencing DE',
  swimming:        'Swimming',
  obstacle:        'Obstacle',
  laserrun:        'Laser Run',
}

export default function CrossValidateClient() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<any | null>(null)
  const [running, setRunning] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showOnly, setShowOnly] = useState<'all' | 'match' | 'mismatch' | 'error'>('all')

  const handleFile = (f: File | undefined | null) => {
    if (!f) return
    if (!f.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
      setErrorMsg('File harus Excel (.xlsx atau .xls)')
      return
    }
    setFile(f)
    setErrorMsg(null)
    setResult(null)
  }

  const runValidation = async () => {
    if (!file) return
    setRunning(true); setErrorMsg(null); setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/pentascore/cross-validate', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setResult(json)
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setRunning(false)
    }
  }

  const filteredRows = result?.rows?.filter((r: any) => {
    if (showOnly === 'match') return r.match
    if (showOnly === 'mismatch') return !r.match && !r.error
    if (showOnly === 'error') return !!r.error
    return true
  }) ?? []

  const exportCsv = () => {
    if (!result?.rows) return
    const headers = ['row','athlete','discipline','input','uipm_pts','computed_pts','diff','match','error']
    const csv = [
      headers.join(','),
      ...result.rows.map((r: any) => [
        r.rowNum, q(r.athlete), r.discipline,
        q(JSON.stringify(r.input ?? '')),
        r.uipm_pts ?? '',
        r.computed_pts ?? '',
        r.diff ?? '',
        r.match ? 'YES' : 'NO',
        q(r.error ?? ''),
      ].join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cross_validation_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  const q = (s: any) => `"${String(s).replace(/"/g, '""')}"`

  return (
    <div className="space-y-6">
      {/* Intro panel */}
      <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-5">
        <h2 className="text-sm font-bold text-amber-200 mb-2 flex items-center gap-2">
          <Shield size={14} /> Defense Layer L2 — Independent Verification
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Upload Excel berisi data resmi UIPM (atau hasil pertandingan manual yang sudah diverifikasi).
          Tool akan re-compute pakai engine <code className="text-amber-300">pentascore_v1.ts</code> dan
          membandingkan cell-by-cell. Output: accuracy %, max diff, daftar mismatch.
        </p>
        <p className="text-xs text-slate-400 mt-2">
          <strong>Sprint 1 baseline:</strong> 1,248/1,254 cells = <strong className="text-amber-300">99.52%</strong> match vs UIPM 2026 Bonn.
        </p>
      </div>

      {!result && (
        <>
          {/* Template download */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-amber-300 mb-1">📋 Need a template?</div>
              <div className="text-xs text-slate-400">
                Download contoh Excel dengan columns yang tepat
              </div>
            </div>
            <a
              href="/api/pentascore/cross-validate/template"
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
            >
              <Download size={12} /> Download Template
            </a>
          </div>

          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); handleFile(e.dataTransfer.files?.[0]) }}
            className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${
              file ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-700 hover:border-amber-500/40 bg-slate-900/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => handleFile(e.target.files?.[0])}
            />
            {file ? (
              <div>
                <FileSpreadsheet size={32} className="mx-auto mb-3 text-amber-400" />
                <div className="text-amber-200 font-bold">{file.name}</div>
                <div className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</div>
                <button
                  onClick={e => { e.stopPropagation(); setFile(null) }}
                  className="mt-3 text-xs text-red-400 hover:underline flex items-center gap-1 mx-auto"
                >
                  <Trash2 size={11} /> Remove
                </button>
              </div>
            ) : (
              <div>
                <Upload size={32} className="mx-auto mb-3 text-slate-500" />
                <div className="text-slate-300 font-semibold">Drag & drop UIPM Excel file</div>
                <div className="text-xs text-slate-500 mt-1">atau klik untuk pilih</div>
                <div className="text-[10px] text-slate-600 mt-3">Max 5000 rows · .xlsx atau .xls</div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
              <AlertCircle size={14} /> {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              onClick={runValidation}
              disabled={!file || running}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold rounded-lg flex items-center gap-2 transition disabled:opacity-50"
            >
              {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Run Cross-Validation
            </button>
          </div>
        </>
      )}

      {/* RESULT */}
      {result && (
        <>
          {/* Summary stats */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 size={14} /> Validation Report
              </h2>
              <code className="text-[10px] text-slate-500">{result.formula_version}</code>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <BigStat label="Total Rows"   value={result.summary.total} color="slate" />
              <BigStat label="Matched"      value={result.summary.matched} color="green" />
              <BigStat label="Mismatched"   value={result.summary.evaluable - result.summary.matched} color={result.summary.evaluable === result.summary.matched ? 'slate' : 'red'} />
              <BigStat label="Errors"       value={result.summary.with_error} color={result.summary.with_error > 0 ? 'red' : 'slate'} />
              <BigStat label="Accuracy"     value={`${result.summary.accuracy_pct}%`} color="amber" big />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded bg-slate-950/40 border border-slate-800">
                <div className="text-slate-500 text-[10px] uppercase mb-1">Max Diff</div>
                <div className="text-amber-300 font-mono text-lg">{result.summary.max_diff}</div>
              </div>
              <div className="p-3 rounded bg-slate-950/40 border border-slate-800">
                <div className="text-slate-500 text-[10px] uppercase mb-1">Avg Diff (mismatched)</div>
                <div className="text-amber-300 font-mono text-lg">{result.summary.avg_diff}</div>
              </div>
            </div>

            {/* Per-discipline breakdown */}
            {Object.keys(result.by_discipline).length > 1 && (
              <div className="mt-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">By Discipline</div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {Object.entries(result.by_discipline).map(([disc, stats]: any) => {
                    const pct = stats.total > 0 ? (stats.match / stats.total * 100).toFixed(1) : '0'
                    return (
                      <div key={disc} className="p-2 rounded bg-slate-950/40 border border-slate-800 text-center">
                        <div className="text-[10px] text-slate-400">{DISCIPLINE_LABEL[disc] ?? disc}</div>
                        <div className="text-amber-300 font-bold font-mono text-sm">{pct}%</div>
                        <div className="text-[9px] text-slate-500">{stats.match}/{stats.total}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { k: 'all',      label: `All (${result.rows.length})` },
              { k: 'match',    label: `✓ Match (${result.summary.matched})` },
              { k: 'mismatch', label: `✗ Mismatch (${result.summary.evaluable - result.summary.matched})` },
              { k: 'error',    label: `⚠ Error (${result.summary.with_error})` },
            ].map(b => (
              <button
                key={b.k}
                onClick={() => setShowOnly(b.k as any)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                  showOnly === b.k
                    ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-transparent'
                }`}
              >
                {b.label}
              </button>
            ))}
            <button
              onClick={exportCsv}
              className="ml-auto px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded transition flex items-center gap-1.5"
            >
              <Download size={11} /> CSV
            </button>
            <button
              onClick={() => { setResult(null); setFile(null) }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded transition"
            >
              New Validation
            </button>
          </div>

          {/* Rows table */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase w-8">#</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase w-8"></th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Athlete</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Discipline</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Input</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-500 uppercase">UIPM</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-500 uppercase">Computed</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold text-amber-400 uppercase">Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredRows.map((r: any) => (
                    <tr
                      key={r.rowNum}
                      className={
                        r.error ? 'bg-red-500/5' :
                        !r.match ? 'bg-yellow-500/5' :
                        ''
                      }
                    >
                      <td className="px-3 py-2 text-slate-500 font-mono">{r.rowNum}</td>
                      <td className="px-3 py-2">
                        {r.error
                          ? <AlertCircle size={12} className="text-red-400" />
                          : r.match
                            ? <CheckCircle2 size={12} className="text-green-400" />
                            : <XCircle size={12} className="text-yellow-400" />}
                      </td>
                      <td className="px-3 py-2 text-white">{r.athlete}</td>
                      <td className="px-3 py-2 text-slate-400 text-[10px]">{DISCIPLINE_LABEL[r.discipline] ?? r.discipline}</td>
                      <td className="px-3 py-2 text-slate-400 text-[10px] font-mono max-w-[200px] truncate">
                        {r.error
                          ? <span className="text-red-300">{r.error}</span>
                          : <span title={JSON.stringify(r.input)}>{compactInput(r.input)}</span>}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300 font-mono">{r.uipm_pts ?? '—'}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {r.computed_pts != null
                          ? <span className={r.match ? 'text-green-300' : 'text-yellow-300'}>{r.computed_pts}</span>
                          : <span className="text-slate-700">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold">
                        {r.diff != null
                          ? <span className={r.diff === 0 ? 'text-green-400' : Math.abs(r.diff) <= 1 ? 'text-yellow-400' : 'text-red-400'}>
                              {r.diff > 0 ? '+' : ''}{r.diff}
                            </span>
                          : <span className="text-slate-700">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredRows.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">
                No rows match the current filter
              </div>
            )}
          </div>

          {/* Verdict banner */}
          <div className={`p-4 rounded-xl border ${
            result.summary.accuracy_pct >= 99
              ? 'bg-green-500/10 border-green-500/40'
              : result.summary.accuracy_pct >= 95
                ? 'bg-amber-500/10 border-amber-500/40'
                : 'bg-red-500/10 border-red-500/40'
          }`}>
            <div className="flex items-center gap-3">
              {result.summary.accuracy_pct >= 99
                ? <Shield size={18} className="text-green-400" />
                : <AlertCircle size={18} className="text-amber-400" />}
              <div>
                <div className={`text-sm font-bold ${
                  result.summary.accuracy_pct >= 99 ? 'text-green-300' :
                  result.summary.accuracy_pct >= 95 ? 'text-amber-300' : 'text-red-300'
                }`}>
                  {result.summary.accuracy_pct >= 99
                    ? `✓ PASS: Engine verified ${result.summary.accuracy_pct}% accurate`
                    : result.summary.accuracy_pct >= 95
                      ? `⚠ REVIEW NEEDED: ${result.summary.accuracy_pct}% (target ≥99%)`
                      : `✗ FAIL: ${result.summary.accuracy_pct}% (engine needs investigation)`}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Sprint 1 baseline: 99.52% · Formula: <code className="text-amber-300">{result.formula_version}</code>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {errorMsg && result && (
        <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={14} /> {errorMsg}
        </div>
      )}
    </div>
  )
}

function compactInput(input: any): string {
  if (!input) return ''
  if (typeof input !== 'object') return String(input)
  const parts: string[] = []
  if (input.V != null) parts.push(`V=${input.V}/${input.totalBouts}`)
  if (input.de_position != null) parts.push(`pos=${input.de_position}`)
  if (input.time_str) parts.push(input.time_str)
  if (input.redCards) parts.push(`RC=${input.redCards}`)
  if (input.penalty) parts.push(`pen=${input.penalty}`)
  return parts.join(' · ') || JSON.stringify(input)
}

function BigStat({ label, value, color, big }: any) {
  const colors: Record<string, string> = {
    slate:  'bg-slate-800/50 text-slate-300 border-slate-700',
    green:  'bg-green-500/10 text-green-300 border-green-500/30',
    red:    'bg-red-500/10 text-red-300 border-red-500/30',
    amber:  'bg-amber-500/10 text-amber-300 border-amber-500/30',
  }
  return (
    <div className={`text-center p-3 rounded border ${colors[color]}`}>
      <div className={big ? 'text-3xl font-bold font-mono' : 'text-2xl font-bold font-mono'}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-70 mt-0.5">{label}</div>
    </div>
  )
}
