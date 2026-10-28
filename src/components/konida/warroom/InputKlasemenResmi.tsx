'use client'
// InputKlasemenResmi — tim KONIDA mengetik klasemen resmi panitia (27 kontingen).
// Hanya baris yang berubah yang disimpan; setiap simpan tercatat di audit_logs.

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface Baris { kontingen_id: number; nama: string; emas: number; perak: number; perunggu: number; updated_at: string | null }

export default function InputKlasemenResmi({ onTutup, onTersimpan }: { onTutup: () => void; onTersimpan: () => void }) {
  const [baris, setBaris] = useState<Baris[] | null>(null)
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)

  useEffect(() => {
    fetch('/api/konida/klasemen-resmi', { cache: 'no-store' }).then(async r => {
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setGalat(j.error ?? 'Gagal memuat klasemen.'); return }
      setBaris(j.baris)
    }).catch(() => setGalat('Tidak ada sambungan.'))
  }, [])

  const ubah = (id: number, kolom: 'emas' | 'perak' | 'perunggu', v: string) =>
    setBaris(b => b?.map(x => x.kontingen_id === id ? { ...x, [kolom]: Math.max(0, Math.min(999, Number(v.replace(/\D/g, '')) || 0)) } : x) ?? null)

  const simpan = async () => {
    if (!baris) return
    setSibuk(true); setGalat('')
    try {
      const r = await fetch('/api/konida/klasemen-resmi', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ baris }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setGalat(j.error ?? 'Gagal menyimpan.'); return }
      onTersimpan(); onTutup()
    } catch { setGalat('Tidak ada sambungan. Belum tersimpan.') } finally { setSibuk(false) }
  }

  const terakhir = baris?.map(b => b.updated_at).filter(Boolean).sort().reverse()[0]
  return (
    <div className="fixed inset-0 z-[900] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onTutup}>
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-700 bg-[#07111c]" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-3">
          <div>
            <div className="text-white font-black">Klasemen resmi panitia</div>
            <div className="text-xs text-slate-400 mt-0.5">Salin dari klasemen resmi PORPROV. Angka Kab. Bandung otomatis memakai laporan lapangan yang disahkan.</div>
            {terakhir && <div className="text-[11px] text-slate-500 mt-1">Terakhir diperbarui {new Date(terakhir).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' })}</div>}
          </div>
          <button onClick={onTutup} aria-label="Tutup" className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {!baris && !galat && <p className="text-slate-400 text-sm py-6 text-center">Memuat…</p>}
          {baris && (
            <table className="w-full text-sm">
              <thead><tr className="text-[11px] text-slate-400"><th className="text-left py-1.5">Kontingen</th><th className="w-16">🥇</th><th className="w-16">🥈</th><th className="w-16">🥉</th></tr></thead>
              <tbody>
                {baris.map(b => (
                  <tr key={b.kontingen_id} className="border-t border-slate-800/70">
                    <td className={`py-1.5 pr-2 font-semibold ${b.nama.toUpperCase() === 'KAB. BANDUNG' ? 'text-sky-300' : 'text-slate-200'}`}>{b.nama}</td>
                    {(['emas', 'perak', 'perunggu'] as const).map(k => (
                      <td key={k} className="px-1"><input inputMode="numeric" value={b[k]} onChange={e => ubah(b.kontingen_id, k, e.target.value)} aria-label={`${k} ${b.nama}`}
                        className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-center text-white tabular-nums focus:outline-none focus:border-sky-400" /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {galat && <p role="alert" className="px-5 text-sm font-bold text-red-300">{galat}</p>}
        <div className="px-5 py-4 border-t border-slate-800 flex justify-end gap-2">
          <button onClick={onTutup} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300">Batal</button>
          <button onClick={simpan} disabled={!baris || sibuk} className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-black text-slate-950 disabled:opacity-40">{sibuk ? 'Menyimpan…' : 'Simpan klasemen'}</button>
        </div>
      </div>
    </div>
  )
}
