'use client'

// Fase 1b — Dashboard KBAAS (target emas dua-lapis + proyeksi medali per atlet) + impor File B.
import { useEffect, useMemo, useState } from 'react'
import { Upload, Loader2, CheckCircle, Trophy, Target, Medal, AlertTriangle } from 'lucide-react'

type Row = { nama: string; cabang: string; target_medali: string | null; capaian_catatan: string; pesaing: string; analisis: string; atlet_id: number | null; match_method: string; match_score: number | null; kandidat: { atlet_id: number; nama: string; score: number } | null }

export default function IntelPage() {
  const [kbaas, setKbaas] = useState<any>(null)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [pv, setPv] = useState<any>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [done, setDone] = useState<any>(null)

  const loadKbaas = () => fetch('/api/rekonsiliasi/kbaas').then(r => r.ok ? r.json() : null).then(setKbaas).catch(() => {})
  useEffect(() => { loadKbaas() }, [done])

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setBusy('preview'); setErr(''); setPv(null); setDone(null)
    try {
      const fd = new FormData(); fd.append('file', f)
      const r = await fetch('/api/rekonsiliasi/preview-intel', { method: 'POST', body: fd })
      const j = await r.json(); if (!r.ok) throw new Error(j?.error || 'Gagal preview')
      setPv(j); setRows(j.rows)
    } catch (e: any) { setErr(e.message) } finally { setBusy('') }
  }
  function resolve(i: number, ok: boolean) {
    setRows(prev => prev.map((r, idx) => idx !== i ? r : ok && r.kandidat
      ? { ...r, atlet_id: r.kandidat.atlet_id, match_method: 'manual' }
      : { ...r, atlet_id: null, match_method: 'tidak_ketemu' }))
  }
  function bulk(min: number, max: number) {
    setRows(prev => prev.map(r => { const sc = r.kandidat?.score ?? 0; return (r.match_method === 'nama_fuzzy' && r.kandidat && sc >= min && sc < max) ? { ...r, atlet_id: r.kandidat.atlet_id, match_method: 'manual' } : r }))
  }
  const fuzzy = useMemo(() => rows.map((r, i) => ({ r, i })).filter(x => x.r.match_method === 'nama_fuzzy'), [rows])
  const tiers = useMemo(() => ({
    A: fuzzy.filter(x => (x.r.kandidat?.score ?? 0) >= 0.90),
    B: fuzzy.filter(x => { const s = x.r.kandidat?.score ?? 0; return s >= 0.78 && s < 0.90 }),
    C: fuzzy.filter(x => (x.r.kandidat?.score ?? 0) < 0.78),
  }), [fuzzy])

  async function commit() {
    if (!pv || fuzzy.length) return
    setBusy('commit'); setErr('')
    try {
      const r = await fetch('/api/rekonsiliasi/commit-intel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama_file: pv.nama_file, rows, cabang: pv.cabang }),
      })
      const j = await r.json(); if (!r.ok) throw new Error(j?.error || 'Gagal commit')
      setDone(j); setPv(null); setRows([])
    } catch (e: any) { setErr(e.message) } finally { setBusy('') }
  }

  const sum = kbaas?.summary
  const medalTone = (m: string | null) => m === 'emas' ? 'text-amber-600 bg-amber-50' : m === 'perak' ? 'text-slate-500 bg-slate-100' : m === 'perunggu' ? 'text-orange-700 bg-orange-50' : 'text-gray-300'

  return (
    <div className="min-h-screen bg-[#eeeeee] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-1"><Trophy className="text-amber-500" size={22} /><h1 className="text-xl font-light text-[#3c4858]">KBAAS — Target & Proyeksi Medali</h1></div>
        <p className="text-xs text-gray-400 mb-6">Target emas dua-lapis (Cabor vs KONI) + proyeksi medali per atlet, dari file Analisis Strategis KONI.</p>
        {err && <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{err}</div>}

        {/* Dashboard KBAAS */}
        {kbaas?.ada && sum && (
          <div className="grid grid-cols-5 gap-3 mb-6">
            <div className="col-span-1 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl p-4 text-white">
              <Target size={16} /><div className="text-[11px] uppercase tracking-wider mt-1 opacity-90">Target Cabor</div><div className="text-3xl font-light">{sum.total_target_cabor_emas ?? '—'}</div><div className="text-[11px] opacity-80">emas (optimistis)</div>
            </div>
            <div className="col-span-1 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl p-4 text-white">
              <Target size={16} /><div className="text-[11px] uppercase tracking-wider mt-1 opacity-90">Target KONI</div><div className="text-3xl font-light">{sum.total_target_koni_emas ?? '—'}</div><div className="text-[11px] opacity-80">emas (konservatif)</div>
            </div>
            {[['Emas', sum.atlet_target_emas, 'from-amber-400 to-amber-500'], ['Perak', sum.atlet_target_perak, 'from-slate-300 to-slate-400'], ['Perunggu', sum.atlet_target_perunggu, 'from-orange-300 to-orange-500']].map(([l, v, g]: any) => (
              <div key={l} className="bg-white border border-gray-200 rounded-2xl p-4">
                <Medal size={16} className="text-gray-300" /><div className="text-[11px] uppercase tracking-wider mt-1 text-gray-400">Atlet Target {l}</div><div className="text-2xl font-light text-[#3c4858]">{v ?? 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabel proyeksi per atlet */}
        {kbaas?.ada && kbaas.atlet?.length > 0 && !pv && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-[#3c4858]">Proyeksi Medali per Atlet ({kbaas.atlet.length})</div>
            <div className="max-h-[28rem] overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase text-gray-400 bg-gray-50 sticky top-0"><tr><th className="text-left px-4 py-2">Nama</th><th className="text-left px-4 py-2">Cabang</th><th className="text-left px-4 py-2">Target</th><th className="text-left px-4 py-2">Pesaing</th></tr></thead>
                <tbody>
                  {kbaas.atlet.map((a: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-4 py-2 text-[#3c4858]">{a.nama_file} {!a.atlet_id && <span className="text-[10px] text-red-400">(blm di DB)</span>}</td>
                      <td className="px-4 py-2 text-gray-400 text-xs">{a.cabang_file}</td>
                      <td className="px-4 py-2"><span className={`text-[11px] px-2 py-0.5 rounded-full capitalize ${medalTone(a.target_medali)}`}>{a.target_medali || '—'}</span>{a.capaian_catatan && a.capaian_catatan !== (a.target_medali || '').toUpperCase() && <span className="text-[10px] text-gray-400 ml-1" title={a.capaian_catatan}>ℹ</span>}</td>
                      <td className="px-4 py-2 text-gray-400 text-xs truncate max-w-[16rem]">{a.pesaing || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Impor File B */}
        {done && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 text-sm text-emerald-700"><CheckCircle size={16} className="inline mr-1" /> Analisis tersimpan: {done.atlet} atlet, {done.cabang} cabang (batch #{done.batch_id}).</div>}
        {!pv ? (
          <label className="flex items-center gap-2 bg-white border border-dashed border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:border-amber-400 w-fit text-sm text-gray-500">
            {busy === 'preview' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {kbaas?.ada ? 'Perbarui' : 'Impor'} file Analisis Strategis (.xlsx)
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} />
          </label>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="grid grid-cols-4 gap-3 mb-4 text-center">
              {[['Cabor emas', pv.summary.total_cabor_emas], ['KONI emas', pv.summary.total_koni_emas], ['Atlet', pv.summary.total_atlet], ['Cocok', pv.summary.auto]].map(([l, v]: any) => (
                <div key={l} className="bg-gray-50 rounded-xl py-2"><div className="text-[10px] uppercase text-gray-400">{l}</div><div className="text-lg font-light text-[#3c4858]">{v}</div></div>
              ))}
            </div>
            {fuzzy.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
                <div className="px-3 py-2 bg-gray-50 flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#3c4858]">Konfirmasi cocok nama ({fuzzy.length})</span>
                  <span className="flex gap-1.5">
                    {tiers.A.length > 0 && <button onClick={() => bulk(0.90, 1.01)} className="bg-emerald-500 text-white px-2 py-1 rounded">Terima A ({tiers.A.length})</button>}
                    {tiers.B.length > 0 && <button onClick={() => bulk(0.78, 0.90)} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded">B ({tiers.B.length})</button>}
                    {tiers.C.length > 0 && <button onClick={() => { if (confirm(`Terima ${tiers.C.length} Tier C?`)) bulk(0, 0.78) }} className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded">C ({tiers.C.length})</button>}
                  </span>
                </div>
                <div className="max-h-72 overflow-auto divide-y divide-gray-50">
                  {fuzzy.slice(0, 200).map(({ r, i }) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                      <div className="flex-1 min-w-0"><span className="text-[#3c4858]">{r.nama}</span> <span className="text-gray-300">·</span> <span className="text-gray-400">{r.cabang}</span> <span className="text-gray-400">≈ {r.kandidat?.nama} ({r.kandidat?.score})</span></div>
                      <button onClick={() => resolve(i, true)} className="text-emerald-600 px-2 py-0.5">Terima</button>
                      <button onClick={() => resolve(i, false)} className="text-gray-400 px-2 py-0.5">Tolak</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={commit} disabled={fuzzy.length > 0 || busy === 'commit'} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-semibold text-sm px-5 py-2.5 rounded-xl">
              {busy === 'commit' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Simpan Analisis Strategis
            </button>
            {fuzzy.length > 0 && <span className="text-xs text-amber-600 ml-2">Selesaikan {fuzzy.length} konfirmasi dulu.</span>}
          </div>
        )}
      </div>
    </div>
  )
}
