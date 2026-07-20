'use client'

// P1g — Laporan kekompetitifan nomor: tandai nomor dgn < 4 kontingen (perlu ditinjau).
import { useEffect, useMemo, useState } from 'react'
import { Trophy, AlertTriangle } from 'lucide-react'

const MIN_KONTINGEN = 4

export default function LaporanKompetitifPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hanyaKurang, setHanyaKurang] = useState(true)

  useEffect(() => {
    ;(async () => {
      const r = await fetch('/api/superadmin/laporan-kompetitif')
      setRows(r.ok ? await r.json() : [])
      setLoading(false)
    })()
  }, [])

  const shown = useMemo(() => hanyaKurang ? rows.filter(r => r.jml_kontingen < MIN_KONTINGEN) : rows, [rows, hanyaKurang])
  const kurang = rows.filter(r => r.jml_kontingen < MIN_KONTINGEN).length
  const genderLabel = (g: string) => g === 'L' ? 'Putra' : g === 'P' ? 'Putri' : g

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="text-amber-400" size={22} />
          <div>
            <h1 className="text-xl font-light">Laporan Kekompetitifan Nomor</h1>
            <p className="text-xs text-slate-500">Nomor dengan kurang dari {MIN_KONTINGEN} kontingen peserta ditandai perlu ditinjau (indikasi tidak kompetitif).</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm">
            <span className="text-slate-500">Nomor ada peserta:</span> <b>{rows.length}</b>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-300">
            <AlertTriangle size={13} className="inline mr-1" /> Perlu ditinjau (&lt;{MIN_KONTINGEN} kontingen): <b>{kurang}</b>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
            <input type="checkbox" checked={hanyaKurang} onChange={e => setHanyaKurang(e.target.checked)} /> Tampilkan hanya yang perlu ditinjau
          </label>
        </div>

        {loading ? <div className="text-slate-500 text-sm">Memuat…</div> : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <tr><th className="text-left px-4 py-3">Cabor</th><th className="text-left px-4 py-3">Nomor</th><th className="text-left px-4 py-3">Gender</th><th className="text-right px-4 py-3">Kontingen</th><th className="text-right px-4 py-3">Atlet</th></tr>
              </thead>
              <tbody>
                {shown.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-600">Tidak ada nomor untuk ditampilkan.</td></tr>}
                {shown.map(r => { const flag = r.jml_kontingen < MIN_KONTINGEN; return (
                  <tr key={r.nomor_id} className="border-b border-slate-800/50">
                    <td className="px-4 py-3 text-slate-400">{r.cabor || '—'}</td>
                    <td className="px-4 py-3 font-medium">{r.nomor}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{genderLabel(r.gender)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${flag ? 'text-red-400' : 'text-emerald-400'}`}>
                      {flag && <AlertTriangle size={12} className="inline mr-1" />}{r.jml_kontingen}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">{r.jml_atlet}</td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
