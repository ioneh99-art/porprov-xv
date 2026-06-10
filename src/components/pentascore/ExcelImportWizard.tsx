'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Upload, Download, CheckCircle2, XCircle, AlertCircle, ArrowRight,
  ArrowLeft, FileSpreadsheet, Trash2, Loader2, Database, Sparkles,
} from 'lucide-react'

type Tenant = { id: string; slug: string; nama: string; nama_pendek: string | null; color_primary: string }
type EventOpt = {
  id: string; tenant_id: string; nama: string; tanggal_mulai: string
  ps_tenants: { nama_pendek: string | null } | null
}

type Step = 'setup' | 'upload' | 'preview' | 'commit' | 'done'

export default function ExcelImportWizard({
  tenants, events, defaultEventId, defaultTenantId,
}: {
  tenants: Tenant[]
  events: EventOpt[]
  defaultEventId?: string
  defaultTenantId?: string
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('setup')
  const [tenantId, setTenantId] = useState<string>(defaultTenantId ?? tenants[0]?.id ?? '')
  const [eventId, setEventId] = useState<string>(defaultEventId ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any | null>(null)
  const [committing, setCommitting] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const filteredEvents = events.filter(e => e.tenant_id === tenantId)

  // ─────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────

  const handleFile = (f: File | undefined | null) => {
    if (!f) return
    if (!f.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
      setErrorMsg('File harus Excel (.xlsx atau .xls)')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setErrorMsg('File terlalu besar (max 5MB)')
      return
    }
    setFile(f)
    setErrorMsg(null)
  }

  const runPreview = async () => {
    if (!file || !tenantId) return
    setErrorMsg(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('tenant_id', tenantId)
    if (eventId) fd.append('event_id', eventId)
    fd.append('mode', 'preview')

    try {
      const res = await fetch('/api/pentascore/athletes/import', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Preview failed')
      }
      const json = await res.json()
      setPreview(json)
      setStep('preview')
    } catch (e: any) {
      setErrorMsg(e.message)
    }
  }

  const runCommit = async () => {
    if (!file || !tenantId) return
    setCommitting(true)
    setErrorMsg(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('tenant_id', tenantId)
    if (eventId) fd.append('event_id', eventId)
    fd.append('mode', 'commit')

    try {
      const res = await fetch('/api/pentascore/athletes/import', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Commit failed')
      setResult(json)
      setStep('done')
      router.refresh()
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setCommitting(false)
    }
  }

  const reset = () => {
    setStep('setup')
    setFile(null)
    setPreview(null)
    setResult(null)
    setErrorMsg(null)
    setEventId(defaultEventId ?? '')
  }

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Stepper */}
      <Stepper current={step} />

      {/* Step content */}
      {step === 'setup' && (
        <StepCard title="Step 1 — Setup Target" icon={Database}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Tenant *" hint="Atlet di-attach ke tenant ini">
              <select
                value={tenantId}
                onChange={e => { setTenantId(e.target.value); setEventId('') }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
              >
                {tenants.length === 0 && <option value="">No tenants available</option>}
                {tenants.map(t => <option key={t.id} value={t.id}>{t.nama_pendek ?? t.nama}</option>)}
              </select>
            </Field>
            <Field label="Event (Optional)" hint="Auto-enroll atlet ke event ini">
              <select
                value={eventId}
                onChange={e => setEventId(e.target.value)}
                disabled={!tenantId}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
              >
                <option value="">— Master only (no enrollment) —</option>
                {filteredEvents.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.nama} ({e.tanggal_mulai})
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {tenants.length === 0 && (
            <div className="mt-4 p-3 rounded bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
              <AlertCircle size={14} />
              <span>Belum ada tenant aktif. <Link href="/operator/pentascore/tenants" className="underline">Buat tenant dulu</Link>.</span>
            </div>
          )}

          <div className="flex items-center justify-end mt-6">
            <button
              onClick={() => setStep('upload')}
              disabled={!tenantId}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold rounded-lg flex items-center gap-2 transition disabled:opacity-50"
            >
              Next: Upload File <ArrowRight size={14} />
            </button>
          </div>
        </StepCard>
      )}

      {step === 'upload' && (
        <StepCard title="Step 2 — Download Template & Upload Excel" icon={FileSpreadsheet}>
          {/* Template download */}
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-amber-200 mb-1">📋 Belum punya file Excel?</div>
                <div className="text-xs text-slate-300">
                  Download template resmi PentaScore — udah ada contoh + petunjuk.
                </div>
              </div>
              <a
                href="/api/pentascore/athletes/template"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold rounded-lg flex items-center gap-2 transition"
              >
                <Download size={14} /> Download Template
              </a>
            </div>
          </div>

          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
            onDrop={e => {
              e.preventDefault(); e.stopPropagation()
              handleFile(e.dataTransfer.files?.[0])
            }}
            className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${
              file
                ? 'border-amber-500/50 bg-amber-500/5'
                : 'border-slate-700 hover:border-amber-500/40 bg-slate-900/30'
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
                <div className="text-xs text-slate-400 mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
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
                <div className="text-slate-300 font-semibold">Drag & drop file Excel di sini</div>
                <div className="text-xs text-slate-500 mt-1">atau klik untuk pilih file</div>
                <div className="text-[10px] text-slate-600 mt-3">
                  Supported: .xlsx, .xls · Max 5MB · Max 1000 rows
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="mt-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={14} /> {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setStep('setup')}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={runPreview}
              disabled={!file}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold rounded-lg flex items-center gap-2 transition disabled:opacity-50"
            >
              Next: Preview <ArrowRight size={14} />
            </button>
          </div>
        </StepCard>
      )}

      {step === 'preview' && preview && (
        <StepCard title="Step 3 — Preview & Validate" icon={Sparkles}>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <SummaryStat label="Total Rows" value={preview.rows_total} color="slate" />
            <SummaryStat label="Valid" value={preview.rows_valid} color="green" />
            <SummaryStat label="Errors" value={preview.rows_errors} color={preview.rows_errors > 0 ? 'red' : 'slate'} />
          </div>

          {/* Preview table */}
          <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden mb-4">
            <div className="px-4 py-2 border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
              Preview (first 50 rows)
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-900 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] text-slate-500 uppercase w-12">#</th>
                    <th className="px-3 py-2 text-left text-[10px] text-slate-500 uppercase w-8"></th>
                    <th className="px-3 py-2 text-left text-[10px] text-slate-500 uppercase">Nama</th>
                    <th className="px-3 py-2 text-left text-[10px] text-slate-500 uppercase">UIPM ID</th>
                    <th className="px-3 py-2 text-left text-[10px] text-slate-500 uppercase">G</th>
                    <th className="px-3 py-2 text-left text-[10px] text-slate-500 uppercase">Negara</th>
                    <th className="px-3 py-2 text-left text-[10px] text-slate-500 uppercase">Affiliation</th>
                    <th className="px-3 py-2 text-left text-[10px] text-slate-500 uppercase">#</th>
                    <th className="px-3 py-2 text-left text-[10px] text-slate-500 uppercase">Issue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {preview.preview.map((r: any) => (
                    <tr key={r.rowNum} className={r.errors.length > 0 ? 'bg-red-500/5' : r.warnings.length > 0 ? 'bg-yellow-500/5' : ''}>
                      <td className="px-3 py-2 text-slate-500 font-mono">{r.rowNum}</td>
                      <td className="px-3 py-2">
                        {r.errors.length > 0
                          ? <XCircle size={12} className="text-red-400" />
                          : r.warnings.length > 0
                            ? <AlertCircle size={12} className="text-yellow-400" />
                            : <CheckCircle2 size={12} className="text-green-400" />}
                      </td>
                      <td className="px-3 py-2 text-white">{r.data.nama_lengkap || <span className="text-slate-700">—</span>}</td>
                      <td className="px-3 py-2 text-slate-400 font-mono">{r.data.uipm_id || <span className="text-slate-700">—</span>}</td>
                      <td className="px-3 py-2">
                        {r.data.gender === 'L'
                          ? <span className="text-blue-300">L</span>
                          : r.data.gender === 'P'
                            ? <span className="text-pink-300">P</span>
                            : <span className="text-red-400">?</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-400">{r.data.negara_code || '—'}</td>
                      <td className="px-3 py-2 text-slate-400">{r.data.affiliation_nama || '—'}</td>
                      <td className="px-3 py-2 text-amber-400 font-mono">{r.data.start_number ?? '—'}</td>
                      <td className="px-3 py-2 text-[10px] text-red-300">
                        {[...r.errors, ...r.warnings.map((w: string) => `(warn) ${w}`)].join('; ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {preview.rows_errors > 0 && (
            <div className="p-3 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-xs flex items-center gap-2 mb-4">
              <AlertCircle size={14} />
              <span>
                {preview.rows_errors} baris akan di-skip karena error.
                {preview.rows_valid > 0
                  ? ` ${preview.rows_valid} baris valid akan tetap di-commit.`
                  : ' Tidak ada baris valid untuk di-commit.'}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={runCommit}
              disabled={committing || preview.rows_valid === 0}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold rounded-lg flex items-center gap-2 transition disabled:opacity-50"
            >
              {committing
                ? <><Loader2 size={14} className="animate-spin" /> Importing...</>
                : <>Commit Import ({preview.rows_valid} atlet) <ArrowRight size={14} /></>}
            </button>
          </div>
        </StepCard>
      )}

      {step === 'done' && result && (
        <StepCard title="✅ Import Complete" icon={CheckCircle2}>
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 mb-4">
              <CheckCircle2 size={32} className="text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-2">Import Successful</div>
            <div className="text-sm text-slate-400 mb-6">
              <strong className="text-green-400">{result.rows_inserted}</strong> atlet berhasil diimport
              {result.rows_failed > 0 && (
                <> · <strong className="text-red-400">{result.rows_failed}</strong> gagal</>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-6">
              <SummaryStat label="Total" value={result.rows_total} color="slate" />
              <SummaryStat label="Success" value={result.rows_inserted} color="green" />
              <SummaryStat label="Failed" value={result.rows_failed} color={result.rows_failed > 0 ? 'red' : 'slate'} />
            </div>

            {result.errors && result.errors.length > 0 && (
              <details className="max-w-2xl mx-auto text-left mb-6">
                <summary className="cursor-pointer text-sm text-amber-400 hover:underline">
                  Lihat {result.errors.length} error
                </summary>
                <div className="mt-2 bg-slate-900/50 rounded border border-slate-800 max-h-60 overflow-y-auto text-xs">
                  {result.errors.map((e: any, i: number) => (
                    <div key={i} className="px-3 py-2 border-b border-slate-800 last:border-0">
                      <span className="font-mono text-slate-500 mr-2">Row {e.row}:</span>
                      <span className="text-red-300">{e.message}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={reset}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-lg transition"
              >
                Import lagi
              </button>
              <Link
                href={eventId
                  ? `/operator/pentascore/athletes?event_id=${eventId}`
                  : '/operator/pentascore/athletes'}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold rounded-lg flex items-center gap-2 transition"
              >
                Lihat Atlet <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </StepCard>
      )}

      {errorMsg && step !== 'done' && (
        <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={14} /> {errorMsg}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

function Stepper({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'setup',   label: 'Setup' },
    { key: 'upload',  label: 'Upload' },
    { key: 'preview', label: 'Preview' },
    { key: 'done',    label: 'Done' },
  ]
  const currentIdx = steps.findIndex(s => s.key === current)
  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded transition ${
            i === currentIdx
              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200'
              : i < currentIdx
                ? 'text-green-400'
                : 'text-slate-500'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              i === currentIdx
                ? 'bg-amber-500 text-slate-900'
                : i < currentIdx
                  ? 'bg-green-500 text-slate-900'
                  : 'bg-slate-800 text-slate-500'
            }`}>
              {i < currentIdx ? '✓' : i + 1}
            </div>
            <span className="text-xs font-bold uppercase">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <ArrowRight size={12} className={i < currentIdx ? 'text-green-400' : 'text-slate-700'} />
          )}
        </div>
      ))}
    </div>
  )
}

function StepCard({ title, icon: Icon, children }: any) {
  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800">
        <Icon size={18} className="text-amber-400" />
        <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function SummaryStat({ label, value, color }: { label: string; value: number; color: 'slate' | 'green' | 'red' }) {
  const styles = {
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
    green: 'bg-green-500/10 text-green-300 border-green-500/30',
    red:   'bg-red-500/10 text-red-300 border-red-500/30',
  }
  return (
    <div className={`text-center p-3 rounded border ${styles[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>
      {children}
      {hint && <div className="text-[10px] text-slate-600 mt-1">{hint}</div>}
    </div>
  )
}
