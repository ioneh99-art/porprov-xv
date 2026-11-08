'use client'
// Medali cabor ini yang sudah dicatat pihak lain (KONI Kab. Bandung lewat Jalur Cepat, situs
// KONI Jabar, Input Langsung KONIDA) dan menunggu bukti PIC. PIC cukup menekan "Benar"
// (boleh dengan foto). Kalau datanya salah, "Ada yang salah" membuka formulir lapor biasa.

import { useState } from 'react'
import { kecilkanFoto } from './foto'

export interface MedaliKonfirmasi {
  id: number; nomor_teks: string; disiplin: string | null; hasil: 'emas' | 'perak' | 'perunggu'; tanggal: string
  nilai_teks: string | null; atlet_ids: number[]; atlet: string[]; oleh: string; ada_foto: boolean
}

const TAMPIL = {
  emas: { teks: '🥇 Emas', warna: '#facc15' },
  perak: { teks: '🥈 Perak', warna: '#cbd5e1' },
  perunggu: { teks: '🥉 Perunggu', warna: '#d08a4a' },
} as const

export default function KonfirmasiMedali({ daftar, pengisi, kurangPengisi, muat, sesiHabis, adaSalah }: {
  daftar: MedaliKonfirmasi[]
  pengisi: Record<string, string>
  kurangPengisi: () => string
  muat: () => Promise<unknown>
  sesiHabis: (pesan: string) => void
  adaSalah: (m: MedaliKonfirmasi) => void
}) {
  const [sibuk, setSibuk] = useState<number | null>(null)
  const [galat, setGalat] = useState<{ id: number; teks: string } | null>(null)
  const [selesai, setSelesai] = useState<string | null>(null)
  const [foto, setFoto] = useState<Record<number, Blob>>({})

  if (!daftar.length && !selesai) return null

  const benar = async (m: MedaliKonfirmasi) => {
    setGalat(null)
    const kurang = kurangPengisi()
    if (kurang) {
      setGalat({ id: m.id, teks: `${kurang} (di bagian bawah formulir)` })
      document.getElementById('isian-pengisi')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSibuk(m.id)
    try {
      const isi = JSON.stringify({ laporan_id: m.id, ...pengisi })
      let r: Response
      if (foto[m.id]) {
        const fd = new FormData()
        fd.append('isi', isi); fd.append('foto', foto[m.id], 'bukti.jpg')
        r = await fetch('/api/lapor/konfirmasi', { method: 'POST', body: fd })
      } else {
        r = await fetch('/api/lapor/konfirmasi', { method: 'POST', headers: { 'content-type': 'application/json' }, body: isi })
      }
      const j = await r.json().catch(() => ({}))
      if (r.status === 401) { sesiHabis(j.error ?? 'Sesi habis.'); return }
      if (!r.ok) { setGalat({ id: m.id, teks: j.error ?? 'Gagal mengirim konfirmasi.' }); if (r.status === 409) await muat(); return }
      setSelesai(`${TAMPIL[m.hasil].teks} ${m.nomor_teks} — terkonfirmasi ✓`)
      setTimeout(() => setSelesai(null), 6000)
      await muat()
    } catch { setGalat({ id: m.id, teks: 'Tidak ada sambungan. Konfirmasi BELUM terkirim, coba lagi.' }) } finally { setSibuk(null) }
  }

  const pilihFoto = async (id: number, berkas: File | undefined) => {
    if (!berkas) return
    try { const kecil = await kecilkanFoto(berkas); setFoto(f => ({ ...f, [id]: kecil })) }
    catch { setGalat({ id, teks: 'Foto itu tidak bisa dibaca. Coba ambil ulang, atau konfirmasi tanpa foto.' }) }
  }

  return (
    <section className="mt-5 rounded-2xl border-2 border-amber-400/60 bg-amber-500/10 p-3">
      <div className="text-sm font-black text-amber-200">Medali menunggu konfirmasi Anda ({daftar.length})</div>
      <p className="text-xs text-amber-100/80 mt-1">Hasil ini sudah dicatat lebih dulu. Cek — kalau benar, cukup tekan <b>Benar</b> (tidak perlu isi ulang). Konfirmasi Anda menjadi bukti resmi dari cabor.</p>
      {selesai && <div role="status" className="mt-2 rounded-lg bg-emerald-500/15 border border-emerald-400/40 px-3 py-2 text-sm font-bold text-emerald-300">{selesai}</div>}
      <div className="mt-3 space-y-2">
        {daftar.map(m => (
          <div key={m.id} className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-black" style={{ color: TAMPIL[m.hasil].warna }}>{TAMPIL[m.hasil].teks}</div>
                <div className="text-sm font-bold text-white">{m.nomor_teks}</div>
                <div className="text-xs text-slate-300 mt-0.5">{m.atlet.length ? m.atlet.join(', ') : 'Atlet belum tercantum'}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{m.tanggal.split('-').reverse().join('-')} · dicatat {m.oleh}{m.nilai_teks ? ` · ${m.nilai_teks}` : ''}</div>
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => benar(m)} disabled={sibuk != null}
                className="rounded-xl bg-emerald-500 py-3 text-sm font-black text-slate-950 disabled:opacity-40">
                {sibuk === m.id ? 'Mengirim…' : '✓ Benar'}
              </button>
              <button type="button" onClick={() => adaSalah(m)} disabled={sibuk != null}
                className="rounded-xl border-2 border-red-400/60 py-3 text-sm font-bold text-red-300 disabled:opacity-40">
                Ada yang salah
              </button>
            </div>
            <label className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 py-2 text-xs font-bold text-slate-300 cursor-pointer">
              📷 {foto[m.id] ? 'Foto terpasang — ganti' : m.ada_foto ? 'Tambah foto (opsional, sudah ada foto)' : 'Tambah foto bukti (opsional)'}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { pilihFoto(m.id, e.target.files?.[0]); e.target.value = '' }} />
            </label>
            {galat?.id === m.id && <p role="alert" className="mt-2 text-xs font-bold text-red-300">{galat.teks}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}
