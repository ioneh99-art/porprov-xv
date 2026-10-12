'use client'
// src/app/lapor/page.tsx
// Form lapor hasil pertandingan untuk PIC cabor di lapangan. Dirancang untuk HP:
// satu kolom, tombol besar, sesedikit mungkin mengetik.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HASIL, LABEL_HASIL, tulisHasil, type Hasil } from '@/lib/lapor'

interface Atlet { id: number; nama: string; gender: string | null }
interface Nomor { id: number; nama: string; gender: string | null; sub: string | null }
interface Laporan {
  id: number; nomor_teks: string; atlet_ids: number[]; hasil: Hasil; peringkat: number | null
  nilai_teks: string | null; keterangan: string | null; tanggal: string; status: string
  alasan_tolak: string | null; created_at: string; ada_foto?: boolean
}
interface Bahan { pic: { nama: string }; kontingen: string; cabor: string; atlet: Atlet[]; nomor: Nomor[]; laporan: Laporan[] }

const WARNA_HASIL: Record<Hasil, string> = {
  emas: '#facc15', perak: '#cbd5e1', perunggu: '#d08a4a', peringkat: '#38bdf8', lolos: '#34d399', gugur: '#94a3b8',
}
const STATUS_TAMPIL: Record<string, { teks: string; warna: string }> = {
  menunggu: { teks: 'Menunggu disahkan', warna: '#fbbf24' },
  disahkan: { teks: 'Disahkan', warna: '#34d399' },
  ditolak:  { teks: 'Ditolak', warna: '#f87171' },
}
const labelGender = (g: string | null) => g === 'L' ? 'Putra' : g === 'P' ? 'Putri' : g === 'MIX' ? 'Campuran' : g === 'OPEN' ? 'Open' : ''
const labelNomor = (n: Nomor) => [n.sub, n.nama].filter(Boolean).join(' · ')

const kotak = 'w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3.5 text-base text-white placeholder-slate-500 focus:outline-none focus:border-sky-400'
const judulIsian = 'block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2'

/**
 * Foto kamera HP bisa 5–10 MB. Dikecilkan di HP sebelum dikirim supaya tetap
 * terkirim di sinyal lemah — sisi terpanjang 1600 px sudah cukup untuk membaca lembar hasil.
 */
async function kecilkanFoto(berkas: File): Promise<Blob> {
  const gambar = await createImageBitmap(berkas)
  const skala = Math.min(1, 1600 / Math.max(gambar.width, gambar.height))
  const kanvas = document.createElement('canvas')
  kanvas.width = Math.round(gambar.width * skala)
  kanvas.height = Math.round(gambar.height * skala)
  kanvas.getContext('2d')!.drawImage(gambar, 0, 0, kanvas.width, kanvas.height)
  gambar.close()
  return new Promise((ok, gagal) => kanvas.toBlob(b => b ? ok(b) : gagal(new Error('gagal')), 'image/jpeg', 0.82))
}

export default function HalamanLapor() {
  const [tahap, setTahap] = useState<'memuat' | 'masuk' | 'form'>('memuat')
  const [bahan, setBahan] = useState<Bahan | null>(null)
  const [kode, setKode] = useState('')
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [terkirim, setTerkirim] = useState(false)

  const [nomorTeks, setNomorTeks] = useState('')
  const [nomorId, setNomorId] = useState<number | null>(null)
  const [bukaDaftar, setBukaDaftar] = useState(false)
  const [cariAtlet, setCariAtlet] = useState('')
  const [pilihan, setPilihan] = useState<number[]>([])
  const [hasil, setHasil] = useState<Hasil | null>(null)
  const [peringkat, setPeringkat] = useState('')
  const [nilai, setNilai] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [foto, setFoto] = useState<Blob | null>(null)
  const [pratinjau, setPratinjau] = useState('')

  const muat = useCallback(async () => {
    const r = await fetch('/api/lapor/data', { cache: 'no-store' })
    if (r.status === 401) { setBahan(null); setTahap('masuk'); return false }
    if (!r.ok) { setGalat('Gagal memuat data. Periksa sinyal lalu coba lagi.'); setTahap('masuk'); return false }
    setBahan(await r.json()); setTahap('form'); return true
  }, [])

  const masuk = useCallback(async (k: string) => {
    setSibuk(true); setGalat('')
    try {
      const r = await fetch('/api/lapor/masuk', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kode: k }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setGalat(j.error ?? 'Kode tidak dikenali.'); return }
      setKode(''); await muat()
    } catch { setGalat('Tidak ada sambungan. Coba lagi.') } finally { setSibuk(false) }
  }, [muat])

  const kosongkanRef = useRef<() => void>(() => {})

  useEffect(() => {
    // Kode boleh dibawa di belakang tanda # pada tautan WhatsApp. Bagian itu
    // tidak ikut terkirim ke server, jadi tidak tercatat di log mana pun.
    const prosesTautan = (pertamaKali: boolean) => {
      let dariTautan = ''
      try { dariTautan = decodeURIComponent(window.location.hash.slice(1)) } catch { /* tautan rusak: anggap tanpa kode */ }
      if (dariTautan) {
        history.replaceState(null, '', window.location.pathname)
        kosongkanRef.current()   // isian cabor sebelumnya tidak boleh terbawa ke cabor baru
        masuk(dariTautan).then(() => setTahap(t => t === 'memuat' ? 'masuk' : t))
      } else if (pertamaKali) {
        muat()
      }
    }
    prosesTautan(true)
    // Orang yang memegang dua cabor berpindah dengan mengetuk tautan cabor lain.
    // Kalau halaman ini sudah terbuka, browser hanya mengganti bagian # tanpa
    // memuat ulang — tanpa pendengar ini kode barunya tidak pernah diproses.
    const saatTautanBerganti = () => prosesTautan(false)
    window.addEventListener('hashchange', saatTautanBerganti)
    return () => window.removeEventListener('hashchange', saatTautanBerganti)
  }, [masuk, muat])

  // Saran muncul saat mengetik; daftar penuh hanya bila diminta, supaya isian
  // berikutnya tidak terdorong jauh ke bawah layar HP.
  const saranNomor = useMemo(() => {
    if (!bahan || nomorId != null) return []
    const q = nomorTeks.trim().toLowerCase()
    if (q) return bahan.nomor.filter(n => labelNomor(n).toLowerCase().includes(q)).slice(0, 8)
    return bukaDaftar ? bahan.nomor : []
  }, [bahan, nomorTeks, nomorId, bukaDaftar])

  const atletTampil = useMemo(() => {
    if (!bahan) return []
    const q = cariAtlet.trim().toLowerCase()
    return q ? bahan.atlet.filter(a => a.nama.toLowerCase().includes(q)) : bahan.atlet
  }, [bahan, cariAtlet])

  const namaAtlet = useMemo(() => new Map((bahan?.atlet ?? []).map(a => [a.id, a.nama])), [bahan])
  const ubahPilihan = (id: number) => setPilihan(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const kosongkan = () => {
    setNomorTeks(''); setNomorId(null); setBukaDaftar(false); setCariAtlet(''); setPilihan([]); setHasil(null)
    setPeringkat(''); setNilai(''); setKeterangan(''); buangFoto()
  }

  const buangFoto = () => { setFoto(null); setPratinjau(lama => { if (lama) URL.revokeObjectURL(lama); return '' }) }
  kosongkanRef.current = kosongkan
  const pilihFoto = async (berkas: File | undefined) => {
    if (!berkas) return
    setGalat('')
    try {
      const kecil = await kecilkanFoto(berkas)
      buangFoto(); setFoto(kecil); setPratinjau(URL.createObjectURL(kecil))
    } catch { setGalat('Foto itu tidak bisa dibaca. Coba ambil ulang, atau kirim tanpa foto.') }
  }

  const kirim = async () => {
    setGalat('')
    if (!nomorTeks.trim()) return setGalat('Nomor pertandingan belum diisi.')
    if (pilihan.length === 0) return setGalat('Pilih minimal satu atlet.')
    if (!hasil) return setGalat('Pilih hasil pertandingannya.')
    setSibuk(true)
    try {
      const isi = JSON.stringify({
        nomor_id: nomorId, nomor_teks: nomorTeks, atlet_ids: pilihan, hasil,
        peringkat: hasil === 'peringkat' ? Number(peringkat) : null, nilai_teks: nilai, keterangan,
      })
      let r: Response
      if (foto) {
        const fd = new FormData()
        fd.append('isi', isi); fd.append('foto', foto, 'bukti.jpg')
        r = await fetch('/api/lapor/kirim', { method: 'POST', body: fd })
      } else {
        r = await fetch('/api/lapor/kirim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: isi })
      }
      const j = await r.json().catch(() => ({}))
      if (r.status === 401) { setTahap('masuk'); setGalat(j.error ?? 'Sesi habis.'); return }
      if (!r.ok) { setGalat(j.error ?? 'Gagal mengirim.'); return }
      kosongkan(); setTerkirim(true); setTimeout(() => setTerkirim(false), 4000)
      await muat(); window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch { setGalat('Tidak ada sambungan. Laporan BELUM terkirim, coba lagi.') } finally { setSibuk(false) }
  }

  const keluar = async () => {
    await fetch('/api/lapor/keluar', { method: 'POST' })
    kosongkan(); setBahan(null); setTahap('masuk')
  }

  return (
    <div className="min-h-screen text-slate-200" style={{ background: 'linear-gradient(180deg,#0c1e3a,#0a1020)' }}>
      <div className="max-w-md mx-auto px-4 pb-16">
        <header className="pt-6 pb-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-300">PORPROV XV Jawa Barat 2026</div>
          <h1 className="text-2xl font-black text-white mt-1">Lapor Hasil Pertandingan</h1>
        </header>

        {tahap === 'memuat' && <p className="text-slate-400 py-10 text-center">Memuat…</p>}

        {tahap === 'masuk' && (
          <form onSubmit={e => { e.preventDefault(); masuk(kode) }} className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <label htmlFor="kode" className={judulIsian}>Kode lapor</label>
            <input id="kode" value={kode} onChange={e => setKode(e.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off"
              autoCorrect="off" spellCheck={false} placeholder="XXXX-XXXX" maxLength={12}
              className={`${kotak} text-center text-2xl font-mono tracking-[0.2em]`} />
            <p className="text-sm text-slate-400 mt-3">Kode dikirim KONI lewat WhatsApp. Satu kode berlaku untuk satu cabang olahraga.</p>
            {galat && <p role="alert" className="mt-3 text-sm font-semibold text-red-300">{galat}</p>}
            <button type="submit" disabled={sibuk || !kode.trim()}
              className="mt-5 w-full rounded-xl bg-sky-500 py-4 text-base font-black text-slate-950 disabled:opacity-40">
              {sibuk ? 'Memeriksa…' : 'Masuk'}
            </button>
          </form>
        )}

        {tahap === 'form' && bahan && (
          <>
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-black text-white truncate">{bahan.cabor}</div>
                <div className="text-xs text-slate-400 truncate">{bahan.kontingen} · {bahan.pic.nama}</div>
              </div>
              <button onClick={keluar} className="shrink-0 text-xs font-bold text-slate-400 border border-slate-700 rounded-lg px-3 py-2">Keluar</button>
            </div>

            {terkirim && (
              <div role="status" className="mt-4 rounded-xl bg-emerald-500/15 border border-emerald-400/40 px-4 py-3 text-sm font-bold text-emerald-300">
                Laporan terkirim. Menunggu disahkan KONI.
              </div>
            )}

            <section className="mt-5 space-y-6">
              <div>
                <label htmlFor="nomor" className={judulIsian}>1 · Nomor pertandingan</label>
                <input id="nomor" value={nomorTeks} placeholder={bahan.nomor.length ? 'Ketik untuk mencari, atau tulis sendiri' : 'Contoh: 53 kg Putri'}
                  onChange={e => { setNomorTeks(e.target.value); setNomorId(null) }} className={kotak} autoComplete="off" />
                {nomorId != null && <p className="text-xs text-emerald-300 mt-1.5">Dipilih dari daftar resmi.</p>}
                {nomorId == null && nomorTeks.trim() !== '' && saranNomor.length === 0 && bahan.nomor.length > 0 && (
                  <p className="text-xs text-amber-300 mt-1.5">Tidak ada di daftar. Tidak apa-apa: laporan dikirim sesuai yang Anda ketik.</p>
                )}
                {nomorId == null && !nomorTeks.trim() && bahan.nomor.length > 0 && (
                  <button type="button" onClick={() => setBukaDaftar(b => !b)} aria-expanded={bukaDaftar}
                    className="mt-2 text-sm font-bold text-sky-300 underline underline-offset-4">
                    {bukaDaftar ? 'Tutup daftar' : `Lihat daftar nomor (${bahan.nomor.length})`}
                  </button>
                )}
                {saranNomor.length > 0 && (
                  <div className="mt-2 rounded-xl border border-slate-700 divide-y divide-slate-800 max-h-72 overflow-y-auto">
                    {saranNomor.map(n => {
                      const label = labelNomor(n), g = labelGender(n.gender)
                      return (
                        <button key={n.id} type="button" onClick={() => { setNomorId(n.id); setNomorTeks(label); setBukaDaftar(false) }}
                          className="w-full text-left px-4 py-3 bg-slate-900/70 active:bg-slate-800">
                          <span className="text-sm text-white">{label}</span>
                          {/* Jenis kelamin hanya ditulis bila belum tersebut di nama nomornya. */}
                          {g && !label.toLowerCase().includes(g.toLowerCase()) && <span className="ml-2 text-xs text-slate-400">{g}</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className={judulIsian}>2 · Atlet {pilihan.length > 0 && <span className="text-sky-300">({pilihan.length} dipilih)</span>}</div>
                {pilihan.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {pilihan.map(id => (
                      <button key={id} type="button" onClick={() => ubahPilihan(id)}
                        className="rounded-full bg-sky-500/20 border border-sky-400/50 px-3 py-1.5 text-sm text-sky-100">
                        {namaAtlet.get(id)} <span aria-hidden className="ml-1 text-sky-300">×</span>
                      </button>
                    ))}
                  </div>
                )}
                {bahan.atlet.length > 8 && (
                  <input value={cariAtlet} onChange={e => setCariAtlet(e.target.value)} placeholder="Cari nama atlet" aria-label="Cari nama atlet"
                    className={`${kotak} mb-2`} autoComplete="off" />
                )}
                <div className="rounded-xl border border-slate-700 divide-y divide-slate-800 max-h-72 overflow-y-auto">
                  {atletTampil.length === 0 && <p className="px-4 py-4 text-sm text-slate-400">Tidak ada atlet dengan nama itu.</p>}
                  {atletTampil.map(a => {
                    const aktif = pilihan.includes(a.id)
                    return (
                      <button key={a.id} type="button" onClick={() => ubahPilihan(a.id)} aria-pressed={aktif}
                        className={`w-full flex items-center gap-3 text-left px-4 py-3 ${aktif ? 'bg-sky-500/15' : 'bg-slate-900/70'}`}>
                        <span className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center text-xs font-black ${aktif ? 'bg-sky-400 border-sky-400 text-slate-950' : 'border-slate-600'}`}>{aktif ? '✓' : ''}</span>
                        <span className="text-sm text-white flex-1">{a.nama}</span>
                        <span className="text-xs text-slate-500">{labelGender(a.gender)}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-1.5">Nomor beregu: pilih semua pemain. Tetap dihitung satu medali.</p>
              </div>

              <div>
                <div className={judulIsian}>3 · Hasil</div>
                <div className="grid grid-cols-3 gap-2">
                  {HASIL.map(h => {
                    const aktif = hasil === h
                    return (
                      <button key={h} type="button" onClick={() => setHasil(h)} aria-pressed={aktif}
                        className="rounded-xl border-2 px-2 py-4 text-sm font-black leading-tight"
                        style={{ borderColor: aktif ? WARNA_HASIL[h] : '#334155', background: aktif ? `${WARNA_HASIL[h]}22` : 'rgba(15,23,42,0.7)', color: aktif ? WARNA_HASIL[h] : '#cbd5e1' }}>
                        {h === 'lolos' ? 'Lolos' : LABEL_HASIL[h]}
                      </button>
                    )
                  })}
                </div>
                {hasil === 'lolos' && <p className="text-xs text-slate-400 mt-2">Lolos ke babak berikutnya (belum final).</p>}
                {hasil === 'peringkat' && (
                  <input value={peringkat} onChange={e => setPeringkat(e.target.value.replace(/\D/g, ''))} inputMode="numeric" aria-label="Peringkat ke berapa"
                    placeholder="Peringkat ke berapa? (4 ke atas)" className={`${kotak} mt-2`} />
                )}
              </div>

              <div>
                <label htmlFor="nilai" className={judulIsian}>4 · Catatan angka <span className="normal-case font-normal text-slate-500">(boleh kosong)</span></label>
                <input id="nilai" value={nilai} onChange={e => setNilai(e.target.value)} placeholder="Waktu, skor, atau total. Contoh: 159 kg" className={kotak} />
              </div>

              <div>
                <label htmlFor="ket" className={judulIsian}>5 · Keterangan <span className="normal-case font-normal text-slate-500">(boleh kosong)</span></label>
                <textarea id="ket" value={keterangan} onChange={e => setKeterangan(e.target.value)} rows={2} placeholder="Lawan, babak, atau hal penting lain" className={kotak} />
              </div>

              <div>
                <div className={judulIsian}>6 · Foto bukti <span className="normal-case font-normal text-slate-500">(boleh kosong)</span></div>
                {pratinjau ? (
                  <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pratinjau} alt="Pratinjau foto bukti" className="w-20 h-20 rounded-lg object-cover" />
                    <div className="flex-1 text-sm text-slate-300">Foto siap dikirim{foto ? ` (${Math.max(1, Math.round(foto.size / 1024))} KB)` : ''}.</div>
                    <button type="button" onClick={buangFoto} className="text-xs font-bold text-red-300 border border-red-500/40 rounded-lg px-3 py-2">Buang</button>
                  </div>
                ) : (
                  <label className="block w-full rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 px-4 py-5 text-center text-sm font-bold text-slate-300 cursor-pointer">
                    Ambil foto lembar hasil atau podium
                    <input type="file" accept="image/*" capture="environment" className="sr-only"
                      onChange={e => { pilihFoto(e.target.files?.[0]); e.target.value = '' }} />
                  </label>
                )}
              </div>

              {galat && <p role="alert" className="rounded-xl bg-red-500/15 border border-red-400/40 px-4 py-3 text-sm font-bold text-red-300">{galat}</p>}

              <button type="button" onClick={kirim} disabled={sibuk}
                className="w-full rounded-xl bg-sky-500 py-4 text-lg font-black text-slate-950 disabled:opacity-40">
                {sibuk ? 'Mengirim…' : 'Kirim Laporan'}
              </button>
            </section>

            <section className="mt-10">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">Laporan saya ({bahan.laporan.length})</h2>
              {bahan.laporan.length === 0 && <p className="text-sm text-slate-500">Belum ada laporan.</p>}
              <div className="space-y-2">
                {bahan.laporan.map(l => {
                  const st = STATUS_TAMPIL[l.status] ?? STATUS_TAMPIL.menunggu
                  return (
                    <div key={l.id} className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white">{l.nomor_teks}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{l.atlet_ids.map(id => namaAtlet.get(id) ?? `Atlet ${id}`).join(', ')}</div>
                        </div>
                        <span className="shrink-0 text-sm font-black" style={{ color: WARNA_HASIL[l.hasil] }}>{tulisHasil(l)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="font-bold" style={{ color: st.warna }}>{st.teks}</span>
                        <span className="text-slate-500">{l.tanggal}{l.nilai_teks ? ` · ${l.nilai_teks}` : ''}{l.ada_foto ? ' · ada foto' : ''}</span>
                      </div>
                      {l.status === 'ditolak' && l.alasan_tolak && <p className="mt-2 text-xs text-red-300">Alasan: {l.alasan_tolak}</p>}
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
