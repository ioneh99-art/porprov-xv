'use client'

// Fase 1 — Rekonsiliasi Peserta Resmi (KONIDA). Upload File A → preview (dry-run) →
// konfirmasi bucket beda-ejaan → commit. Semua tulis lewat route server.
import { useEffect, useMemo, useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Loader2, Users, ClipboardCheck } from 'lucide-react'

type Row = {
  nama_file: string; nik_file: string | null; cabang_file: string; nomor_file: string
  atlet_id: number | null; atlet_nama: string | null
  match_method: string; match_score: number | null; status_peserta: string
  kandidat: { atlet_id: number; nama: string; score: number } | null
}
type Preview = { kontingen_id: number; nama_file: string; summary: any; selisih: any; rows: Row[] }

export default function RekonsiliasiPage() {
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [pv, setPv] = useState<Preview | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [done, setDone] = useState<{ batch_id: number; peserta_resmi: number } | null>(null)
  const [status, setStatus] = useState<{ peserta_resmi: number | null; total_atlet: number | null; terekonsiliasi: boolean } | null>(null)

  useEffect(() => { fetch('/api/rekonsiliasi/status').then(r => r.ok ? r.json() : null).then(setStatus).catch(() => {}) }, [done])

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setBusy('preview'); setErr(''); setPv(null); setDone(null)
    try {
      const fd = new FormData(); fd.append('file', f)
      const r = await fetch('/api/rekonsiliasi/preview', { method: 'POST', body: fd })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'Gagal preview')
      setPv(j); setRows(j.rows)
    } catch (e: any) { setErr(e.message) } finally { setBusy('') }
  }

  function resolve(i: number, accept: boolean) {
    setRows(prev => prev.map((r, idx) => {
      if (idx !== i) return r
      if (accept && r.kandidat) return { ...r, atlet_id: r.kandidat.atlet_id, atlet_nama: r.kandidat.nama, status_peserta: 'peserta_resmi', match_method: 'manual' }
      return { ...r, atlet_id: null, atlet_nama: null, status_peserta: 'tidak_ketemu', match_method: 'tidak_ketemu' }
    }))
  }
  // Terima borongan semua yang skornya di [min, max) dan masih perlu konfirmasi.
  function terimaBulk(min: number, max: number) {
    setRows(prev => prev.map(r => {
      const sc = r.kandidat?.score ?? 0
      if (r.status_peserta === 'perlu_konfirmasi' && r.kandidat && sc >= min && sc < max)
        return { ...r, atlet_id: r.kandidat.atlet_id, atlet_nama: r.kandidat.nama, status_peserta: 'peserta_resmi', match_method: 'manual' }
      return r
    }))
  }

  const tiers = useMemo(() => {
    const p = rows.map((r, i) => ({ r, i })).filter(x => x.r.status_peserta === 'perlu_konfirmasi')
    const sc = (x: any) => x.r.kandidat?.score ?? 0
    return {
      A: p.filter(x => sc(x) >= 0.90),
      B: p.filter(x => sc(x) >= 0.78 && sc(x) < 0.90),
      C: p.filter(x => sc(x) < 0.78),
      total: p.length,
    }
  }, [rows])
  // "Belum di DB" = tidak ketemu TAPI punya NIK dari portal → peserta resmi yg belum ada di database.
  const belumDB = useMemo(() => rows.filter(r => r.status_peserta === 'tidak_ketemu' && r.nik_file), [rows])
  const stat = useMemo(() => ({
    resmi: rows.filter(r => r.status_peserta === 'peserta_resmi').length,
    perlu: tiers.total,
    tdk: rows.filter(r => r.status_peserta === 'tidak_ketemu').length,
  }), [rows, tiers])

  async function commit() {
    if (!pv || tiers.total) return
    setBusy('commit'); setErr('')
    try {
      const r = await fetch('/api/rekonsiliasi/commit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama_file: pv.nama_file, summary: pv.summary, rows }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'Gagal commit')
      setDone({ batch_id: j.batch_id, peserta_resmi: j.peserta_resmi })
    } catch (e: any) { setErr(e.message) } finally { setBusy('') }
  }

  const Card = ({ label, value, sub, tone }: any) => (
    <div className={`rounded-2xl border p-4 ${tone || 'bg-white border-gray-200'}`}>
      <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">{label}</div>
      <div className="text-2xl font-light text-[#3c4858] mt-1">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#eeeeee] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <ClipboardCheck className="text-[#E84E0F]" size={22} />
          <h1 className="text-xl font-light text-[#3c4858]">Rekonsiliasi Peserta Resmi</h1>
        </div>
        <p className="text-xs text-gray-400 mb-4">Cocokkan file resmi KONI (Rekapitulasi) dengan database — pisahkan peserta resmi dari kolam atlet. Preview dulu, konfirmasi beda-ejaan, baru simpan.</p>

        {/* Status 2-angka (peserta resmi vs total) */}
        {status?.terekonsiliasi && (
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
              <span className="text-[11px] uppercase tracking-wider text-emerald-500 font-semibold">Peserta Resmi</span>
              <div className="text-xl font-light text-emerald-700">{status.peserta_resmi}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5">
              <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Total Atlet DB</span>
              <div className="text-xl font-light text-[#3c4858]">{status.total_atlet}</div>
            </div>
            <div className="text-xs text-gray-400">← peserta resmi sudah dipisah dari kolam atlet</div>
          </div>
        )}

        {err && <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{err}</div>}

        {done ? (
          <div className="bg-white rounded-2xl border border-emerald-200 p-6">
            <div className="flex items-center gap-2 text-emerald-600 font-semibold mb-2"><CheckCircle size={18} /> Rekonsiliasi tersimpan</div>
            <p className="text-sm text-gray-600"><b>{done.peserta_resmi}</b> peserta resmi ditetapkan (batch #{done.batch_id}). Dashboard kini bisa memisahkan Peserta Resmi vs Total Atlet.</p>
            <button onClick={() => { setPv(null); setRows([]); setDone(null) }} className="mt-4 text-sm text-[#E84E0F] hover:underline">Rekonsiliasi file lain</button>
          </div>
        ) : !pv ? (
          <label className="flex flex-col items-center justify-center gap-3 bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 cursor-pointer hover:border-[#E84E0F] transition-colors">
            {busy === 'preview' ? <Loader2 className="animate-spin text-[#E84E0F]" size={28} /> : <Upload className="text-gray-400" size={28} />}
            <div className="text-sm text-gray-500">{busy === 'preview' ? 'Memproses…' : 'Klik untuk unggah file Rekapitulasi (.xlsx)'}</div>
            <FileSpreadsheet size={14} className="text-gray-300" />
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} />
          </label>
        ) : (
          <>
            {/* Ringkasan */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <Card label="Reviu resmi" value={pv.summary.total_reviu} sub="dari file KONI" />
              <Card label="Data portal" value={pv.summary.total_portal} sub="ekspor portal" />
              <Card label="Total atlet DB" value={pv.summary.total_db} sub="kontingen ini" />
              <Card label="Cocok otomatis" value={`${pv.summary.auto}`} sub={`NIK ${pv.summary.nik} + exact ${pv.summary.nama_exact}`} tone="bg-emerald-50 border-emerald-200" />
            </div>

            {/* Selisih */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Card label="Kolam (bukan peserta)" value={pv.selisih.kolam} tone="bg-amber-50 border-amber-200" />
              <Card label="Tambahan pasca-ekspor" value={pv.selisih.pasca_ekspor} />
              <Card label="Hilang (portal→DB)" value={pv.selisih.hilang} tone="bg-red-50 border-red-200" />
            </div>

            {/* Status resolusi */}
            <div className="flex items-center gap-4 text-sm mb-3">
              <span className="text-emerald-600 flex items-center gap-1"><Users size={14} /> Peserta resmi: <b>{stat.resmi}</b></span>
              <span className="text-amber-600 flex items-center gap-1"><AlertTriangle size={14} /> Perlu konfirmasi: <b>{stat.perlu}</b></span>
              <span className="text-gray-400">Tidak ketemu: <b>{stat.tdk}</b></span>
            </div>

            {/* Panel konfirmasi bertingkat + borongan */}
            {tiers.total > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                  <div className="text-sm font-semibold text-[#3c4858]">Panel Konfirmasi ({tiers.total})</div>
                  <div className="flex gap-2">
                    {tiers.A.length > 0 && <button onClick={() => terimaBulk(0.90, 1.01)} className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium">Terima Tier A ({tiers.A.length})</button>}
                    {tiers.B.length > 0 && <button onClick={() => terimaBulk(0.78, 0.90)} className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium">Terima Tier B ({tiers.B.length})</button>}
                    {tiers.C.length > 0 && <button onClick={() => { if (confirm(`Terima ${tiers.C.length} baris Tier C (skor 0.55–0.78)? Pastikan sudah kamu cek.`)) terimaBulk(0, 0.78) }} className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg font-medium">Terima Tier C ({tiers.C.length})</button>}
                  </div>
                </div>
                <div className="max-h-96 overflow-auto">
                  {([['A. Hampir pasti sama (≥0.90)', tiers.A], ['B. Sangat mungkin (0.78–0.90)', tiers.B], ['C. Cek manual (0.55–0.78)', tiers.C]] as [string, any[]][]).map(([label, list]) => list.length > 0 && (
                    <div key={label}>
                      <div className="px-4 py-1.5 bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400 font-semibold">{label} · {list.length}</div>
                      {list.slice(0, 150).map(({ r, i }: any) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-2 text-sm border-b border-gray-50">
                          <div className="flex-1 min-w-0">
                            <div className="text-[#3c4858] truncate">{r.nama_file} <span className="text-gray-300">·</span> <span className="text-gray-400 text-xs">{r.cabang_file}</span></div>
                            <div className="text-xs text-gray-400 truncate">≈ {r.kandidat?.nama} <span className="text-amber-500">({r.kandidat?.score})</span></div>
                          </div>
                          <button onClick={() => resolve(i, true)} className="text-emerald-600 hover:bg-emerald-50 rounded-lg px-2.5 py-1.5 text-xs font-medium">Terima</button>
                          <button onClick={() => resolve(i, false)} className="text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg px-2.5 py-1.5 text-xs">Tolak</button>
                        </div>
                      ))}
                      {list.length > 150 && <div className="px-4 py-1.5 text-[11px] text-gray-400">…{list.length - 150} lagi (pakai "Terima" borongan di atas)</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Peserta resmi belum ada di DB (temuan) */}
            {belumDB.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                <div className="text-sm font-semibold text-red-700 mb-1 flex items-center gap-1"><AlertTriangle size={14} /> Peserta resmi belum ada di database ({belumDB.length})</div>
                <p className="text-xs text-red-500 mb-2">Punya NIK di file KONI tapi tidak ada di database — perlu ditambahkan / diklarifikasi ke KONI. (Tidak menghalangi simpan.)</p>
                <div className="max-h-40 overflow-auto text-xs text-red-600 space-y-0.5">
                  {belumDB.slice(0, 100).map((r, k) => <div key={k}>{r.nama_file} · <span className="text-red-400">{r.cabang_file}</span> · NIK {r.nik_file}</div>)}
                </div>
              </div>
            )}

            {/* Commit */}
            <div className="flex items-center gap-3">
              <button onClick={commit} disabled={tiers.total > 0 || busy === 'commit'}
                className="flex items-center gap-2 bg-[#E84E0F] hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-400 text-white font-semibold text-sm px-6 py-2.5 rounded-xl">
                {busy === 'commit' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Simpan Rekonsiliasi ({stat.resmi} peserta)
              </button>
              {tiers.total > 0 && <span className="text-xs text-amber-600">Selesaikan {tiers.total} konfirmasi dulu.</span>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
