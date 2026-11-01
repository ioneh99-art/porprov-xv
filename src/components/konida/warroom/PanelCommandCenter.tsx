'use client'
// PanelCommandCenter — dibuka dari War Room (juga dari HP): alamat layar command
// center dan saklar Mode Kunjungan. Mode disimpan di server, jadi semua monitor
// berganti tampilan bersamaan dalam beberapa detik.

import { useEffect, useState } from 'react'
import { Monitor, X } from 'lucide-react'
import { LAYAR } from '@/lib/command-center'

const Q = '?kontingen_id=4'

export default function PanelCommandCenter({ onTutup }: { onTutup: () => void }) {
  const [mode, setMode] = useState<{ mode_kunjungan: boolean; sambutan: string; diubah_oleh: string | null; updated_at: string | null } | null>(null)
  const [sambutan, setSambutan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')

  useEffect(() => {
    fetch(`/api/konida/command-center${Q}`, { cache: 'no-store' }).then(r => r.json()).then(j => { if (!j.error) { setMode(j); setSambutan(j.sambutan) } else setGalat(j.error) }).catch(() => setGalat('Gagal memuat.'))
  }, [])

  async function simpan(kunjungan: boolean) {
    setSibuk(true); setGalat('')
    try {
      const r = await fetch(`/api/konida/command-center${Q}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode_kunjungan: kunjungan, sambutan }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setGalat(j.error ?? 'Gagal menyimpan.'); return }
      setMode(j); setSambutan(j.sambutan)
    } finally { setSibuk(false) }
  }

  const asal = typeof window !== 'undefined' ? window.location.origin : ''
  return (
    <div className="fixed inset-0 z-[900] bg-black/70 flex items-end md:items-center justify-center p-3" onClick={onTutup}>
      <div className="w-full max-w-lg rounded-2xl bg-[#071423] border border-sky-500/30 p-5 text-zinc-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-white"><Monitor size={16} className="text-sky-300" /> Command Center · {LAYAR.length} layar</div>
          <button onClick={onTutup} aria-label="Tutup" className="text-zinc-400"><X size={18} /></button>
        </div>

        <div className={`mt-4 rounded-xl border p-4 ${mode?.mode_kunjungan ? 'border-yellow-400/60 bg-yellow-400/10' : 'border-white/10 bg-white/[0.03]'}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-black text-white">Mode Kunjungan {mode?.mode_kunjungan ? <span className="text-yellow-300">· MENYALA</span> : <span className="text-zinc-500">· mati</span>}</div>
              <div className="text-xs text-zinc-400 mt-0.5">Untuk tamu/Bupati: ucapan selamat datang, huruf lebih besar, data internal (antrean, catatan) disembunyikan.</div>
            </div>
            <button onClick={() => simpan(!mode?.mode_kunjungan)} disabled={sibuk || !mode}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-black disabled:opacity-50 ${mode?.mode_kunjungan ? 'bg-zinc-200 text-zinc-900' : 'bg-yellow-400 text-zinc-950'}`}>
              {sibuk ? '…' : mode?.mode_kunjungan ? 'Matikan' : 'Nyalakan'}
            </button>
          </div>
          <label className="block text-xs text-zinc-400 mt-3">Teks ucapan (tampil di Layar 2)
            <input value={sambutan} onChange={e => setSambutan(e.target.value)} maxLength={120}
              className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white" placeholder="Selamat datang, Bapak Bupati Bandung" />
          </label>
          {mode?.mode_kunjungan && <button onClick={() => simpan(true)} disabled={sibuk} className="mt-2 text-xs font-bold text-yellow-300 underline underline-offset-2">Simpan teks ucapan</button>}
          {mode?.diubah_oleh && <div className="text-[11px] text-zinc-500 mt-2">Terakhir diubah {mode.diubah_oleh}</div>}
          {galat && <div className="text-xs text-red-300 mt-2">{galat}</div>}
        </div>

        <div className="mt-4 space-y-2">
          {LAYAR.map(l => (
            <a key={l.no} href={`/konida/warroom/kabbandung/layar/${l.no}`} target="_blank" rel="noopener"
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 hover:border-sky-400/50">
              <span className="w-8 h-8 rounded-lg grid place-items-center font-black bg-sky-500/15 text-sky-300">{l.no}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-white">{l.judul}</span>
                <span className="block text-[11px] text-zinc-400 truncate">{l.isi}</span>
              </span>
              <span className="text-[10px] text-zinc-500 hidden md:block">{asal}/…/layar/{l.no}</span>
            </a>
          ))}
        </div>
        <p className="text-[11px] text-zinc-500 mt-3">Di komputer monitor: login KONIDA, buka alamat layar, lalu tekan F11 (layar penuh). Tombol 1 / 2 / 3 di papan ketik berpindah layar.</p>
      </div>
    </div>
  )
}
