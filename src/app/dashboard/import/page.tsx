'use client'
import { useEffect, useState, useRef } from 'react'
import {
  Upload, FileSpreadsheet, CheckCircle,
  XCircle, AlertTriangle, Download, Loader2
} from 'lucide-react'

export default function ImportAtletPage() {
  const [kontingens, setKontingens] = useState<any[]>([])
  const [kontingenId, setKontingenId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/master/kontingens')
      .then(r => r.json())
      .then(setKontingens)
  }, [])

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      setError('File harus berformat .xlsx atau .xls')
      return
    }
    setFile(f)
    setError('')
    setResult(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleImport = async () => {
    if (!file) { setError('Pilih file Excel dulu'); return }
    if (!kontingenId) { setError('Pilih kontingen dulu'); return }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kontingen_id', kontingenId)

      const res = await fetch('/api/import', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)
      setResult(data.results)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
    setError('')
    setKontingenId('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-lg font-semibold text-white">Import Data Atlet</h1>
        <p className="text-slate-500 text-xs mt-0.5">
          Upload file Excel template PORPROV XV untuk import data atlet massal
        </p>
      </div>

      {/* Download template */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 mb-5 flex items-center justify-between">
        <div>
          <div className="text-blue-400 text-sm font-medium">Template Excel PORPROV XV</div>
          <div className="text-slate-500 text-xs mt-0.5">
            Gunakan template resmi untuk memastikan format data benar
          </div>
        </div>
        <a href="/template/TEMPLATE_DATA_ATLET_PORPROV_XV_2026.xlsx"
          download
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-lg transition-all font-semibold">
          <Download size={13} /> Download Template
        </a>
      </div>

      {/* Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-5">
        <div className="mb-5">
          <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
            Kontingen <span className="text-red-400">*</span>
          </label>
          <select value={kontingenId} onChange={e => setKontingenId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all">
            <option value="">-- Pilih Kontingen --</option>
            {kontingens.map((k: any) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${dragging ? 'border-blue-500 bg-blue-500/10' :
              file ? 'border-emerald-500/40 bg-emerald-500/5' :
              'border-slate-700 hover:border-blue-500/40 hover:bg-blue-500/5'}`}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

          {file ? (
            <div>
              <FileSpreadsheet size={32} className="text-emerald-400 mx-auto mb-3" />
              <div className="text-emerald-400 text-sm font-semibold">{file.name}</div>
              <div className="text-slate-500 text-xs mt-1">
                {(file.size / 1024).toFixed(0)} KB — Klik untuk ganti file
              </div>
            </div>
          ) : (
            <div>
              <Upload size={32} className="text-slate-600 mx-auto mb-3" />
              <div className="text-slate-300 text-sm font-medium">
                Drag & drop file Excel di sini
              </div>
              <div className="text-slate-600 text-xs mt-1">
                atau klik untuk pilih file · Format: .xlsx · Max: 10MB
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs">
            <AlertTriangle size={13} className="flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Tombol aksi */}
      {!result && (
        <div className="flex gap-3">
          <button onClick={handleImport}
            disabled={loading || !file || !kontingenId}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all disabled:cursor-not-allowed">
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Memproses...</>
              : <><Upload size={14} /> Import Sekarang</>}
          </button>
          {file && (
            <button onClick={handleReset}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-sm transition-all">
              Reset
            </button>
          )}
        </div>
      )}

      {/* Hasil Import */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Data', value: result.total, color: 'text-white', bg: 'bg-slate-800' },
              { label: 'Berhasil', value: result.sukses, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Gagal', value: result.gagal, color: 'text-red-400', bg: 'bg-red-500/10' },
              { label: 'Duplikat', value: result.duplikat, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} border border-slate-800 rounded-2xl p-4 text-center`}>
                <div className={`text-3xl font-bold ${color}`}>{value}</div>
                <div className="text-slate-500 text-xs mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Status */}
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border
            ${result.sukses > 0
              ? 'bg-emerald-500/5 border-emerald-500/20'
              : 'bg-red-500/5 border-red-500/20'}`}>
            {result.sukses > 0
              ? <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
              : <XCircle size={18} className="text-red-400 flex-shrink-0" />}
            <div>
              <div className={`text-sm font-medium ${result.sukses > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.sukses > 0
                  ? `${result.sukses} atlet berhasil diimport ke sistem!`
                  : 'Import gagal — tidak ada data yang berhasil diimport'}
              </div>
              {result.gagal > 0 || result.duplikat > 0 ? (
                <div className="text-slate-500 text-xs mt-0.5">
                  {result.gagal} data gagal · {result.duplikat} data duplikat — lihat detail di bawah
                </div>
              ) : null}
            </div>
          </div>

          {/* Preview data berhasil */}
          {result.preview?.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800">
                <div className="text-white text-sm font-medium">
                  Preview Data Berhasil ({result.preview.length} atlet)
                </div>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0">
                    <tr className="border-b border-slate-800 bg-slate-900">
                      {['NIK', 'Nama', 'Gender', 'No HP', 'Finansial', 'Perlengkapan'].map(h => (
                        <th key={h} className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-2">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.preview.slice(0, 50).map((p: any, i: number) => (
                      <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/20">
                        <td className="px-4 py-2 text-slate-400 text-xs font-mono">{p.nik}</td>
                        <td className="px-4 py-2 text-slate-200 text-xs">{p.nama}</td>
                        <td className="px-4 py-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium
                            ${p.gender === 'L' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}`}>
                            {p.gender === 'L' ? 'Putra' : 'Putri'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-400 text-xs">{p.no_hp}</td>
                        <td className="px-4 py-2 text-center">
                          {p.has_finansial
                            ? <CheckCircle size={12} className="text-emerald-400 mx-auto" />
                            : <XCircle size={12} className="text-slate-600 mx-auto" />}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {p.has_perlengkapan
                            ? <CheckCircle size={12} className="text-emerald-400 mx-auto" />
                            : <XCircle size={12} className="text-slate-600 mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Error list */}
          {result.errors?.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-400" />
                <div className="text-white text-sm font-medium">
                  Data Bermasalah ({result.errors.length})
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/50">
                {result.errors.map((e: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    <XCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-slate-300 text-xs font-medium">
                        {e.nama || e.nik || 'Data tidak dikenal'}
                      </div>
                      <div className="text-red-400 text-xs mt-0.5">{e.error}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tombol setelah import */}
          <div className="flex gap-3">
            <button onClick={handleReset}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
              <Upload size={13} /> Import File Lain
            </button>
            <a href="/dashboard/atlet"
              className="flex items-center gap-2 border border-slate-700 hover:border-slate-600 text-slate-300 text-sm px-5 py-2.5 rounded-xl transition-all">
              Lihat Data Atlet →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}