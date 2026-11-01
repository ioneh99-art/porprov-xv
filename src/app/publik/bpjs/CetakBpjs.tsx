'use client'
// src/app/publik/bpjs/CetakBpjs.tsx — langkah: cari nama → masukkan NIK → lihat/unduh/cetak kartu.

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Download, KeyRound, Loader2, Printer, Search, ShieldCheck, X } from 'lucide-react'

interface Nama { id: number; nama: string }
interface Kartu { nama: string; kpj: string; berlaku: string | null; gambar_url: string; pdf_url: string }

export default function CetakBpjs() {
  const [q, setQ] = useState('')
  const [hasil, setHasil] = useState<Nama[] | null>(null)
  const [mencari, setMencari] = useState(false)
  const [pilih, setPilih] = useState<Nama | null>(null)
  const [nik, setNik] = useState('')
  const [memeriksa, setMemeriksa] = useState(false)
  const [galat, setGalat] = useState('')
  const [kartu, setKartu] = useState<Kartu | null>(null)
  const nikRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const s = q.trim()
    if (s.length < 3) { setHasil(null); return }
    setMencari(true)
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/publik/bpjs?q=${encodeURIComponent(s)}`)
        const d = await r.json()
        setHasil(r.ok ? d.hasil : [])
      } catch { setHasil([]) } finally { setMencari(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => { if (pilih) setTimeout(() => nikRef.current?.focus(), 50) }, [pilih])

  const ulang = () => { setPilih(null); setNik(''); setGalat(''); setKartu(null) }

  async function buka(e: React.FormEvent) {
    e.preventDefault()
    if (!pilih) return
    const n = nik.replace(/\D/g, '')
    if (n.length !== 16) { setGalat('NIK harus 16 angka, sesuai KTP.'); return }
    setMemeriksa(true); setGalat('')
    try {
      const r = await fetch('/api/publik/bpjs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pilih.id, nik: n }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setGalat(d.error || 'Gagal membuka kartu.'); return }
      setKartu(d); setNik('')
    } catch { setGalat('Koneksi terputus. Coba lagi.') } finally { setMemeriksa(false) }
  }

  return (
    <div className="min-h-screen bg-[#050d1a] text-slate-200">
      <style>{`@media print { @page { margin: 12mm } body * { visibility: hidden !important } #cetak-kartu, #cetak-kartu * { visibility: visible !important }
        #cetak-kartu { position: absolute; left: 0; top: 0; width: 85.6mm !important; max-width: none !important; box-shadow: none !important; border-radius: 3mm } }`}</style>
      <div className="absolute inset-x-0 top-0 h-72 -z-0 bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.18),transparent_65%)] pointer-events-none" />

      <main className="relative max-w-lg mx-auto px-4 pb-16">
        <header className="h-16 flex items-center gap-2.5">
          <a href="/" className="p-2 -ml-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10" aria-label="Kembali ke jadwal"><ArrowLeft size={18} /></a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/kab-bandung-256.png" alt="" className="w-8 h-8 object-contain" />
          <div className="min-w-0">
            <div className="text-white text-sm font-extrabold leading-tight">KONI Kabupaten Bandung</div>
            <div className="text-emerald-300/80 text-[10px] font-semibold tracking-wider leading-tight">KARTU BPJS KETENAGAKERJAAN</div>
          </div>
        </header>

        <h1 className="mt-4 text-2xl font-extrabold text-white leading-tight">Cetak kartu BPJS Anda</h1>
        <p className="mt-1.5 text-sm text-slate-400">Untuk atlet & official kontingen Kab. Bandung PORPROV XV 2026. Kartu hanya terbuka dengan NIK pemiliknya.</p>

        {!kartu && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            {/* Langkah 1 — nama */}
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">1 · Nama sesuai kartu</label>
            {pilih ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2.5">
                <span className="font-semibold text-white truncate">{pilih.nama}</span>
                <button onClick={ulang} className="shrink-0 p-1 text-slate-400 hover:text-white" aria-label="Ganti nama"><X size={16} /></button>
              </div>
            ) : (
              <>
                <div className="relative mt-2">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input value={q} onChange={e => setQ(e.target.value)} placeholder="Ketik minimal 3 huruf nama Anda" autoComplete="off"
                    className="w-full rounded-xl border border-white/15 bg-[#0b1628] pl-9 pr-9 py-3 text-[15px] text-white placeholder:text-slate-500 outline-none focus:border-emerald-400/60" />
                  {mencari && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-500" />}
                </div>
                {hasil && (
                  <div className="mt-2 space-y-1.5">
                    {hasil.length === 0 && !mencari && <p className="text-xs text-slate-500 px-1">Nama tidak ditemukan. Coba sebagian nama saja, atau hubungi KONI Kab. Bandung.</p>}
                    {hasil.map(h => (
                      <button key={h.id} onClick={() => { setPilih(h); setGalat('') }}
                        className="w-full text-left rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm font-semibold text-slate-100 hover:bg-white/10">
                        {h.nama}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Langkah 2 — NIK */}
            {pilih && (
              <form onSubmit={buka} className="mt-5">
                <label htmlFor="nik" className="text-[11px] font-bold uppercase tracking-wider text-slate-400">2 · NIK (16 angka di KTP)</label>
                <div className="relative mt-2">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input id="nik" ref={nikRef} value={nik} onChange={e => setNik(e.target.value.replace(/\D/g, '').slice(0, 16))}
                    type="password" inputMode="numeric" autoComplete="off" placeholder="••••••••••••••••"
                    className="w-full rounded-xl border border-white/15 bg-[#0b1628] pl-9 pr-14 py-3 text-[15px] tracking-widest text-white outline-none focus:border-emerald-400/60" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 tabular-nums">{nik.length}/16</span>
                </div>
                {galat && <p role="alert" className="mt-2 text-sm text-rose-300">{galat}</p>}
                <button disabled={memeriksa || nik.length !== 16}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-bold text-[#04210f] disabled:opacity-40 hover:bg-emerald-400">
                  {memeriksa ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Buka kartu
                </button>
              </form>
            )}
          </div>
        )}

        {/* Langkah 3 — kartu */}
        {kartu && (
          <div className="mt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img id="cetak-kartu" src={kartu.gambar_url} alt={`Kartu BPJS Ketenagakerjaan ${kartu.nama}`}
              className="w-full rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.45)]" />
            <div className="mt-3 text-center text-xs text-slate-400">
              {kartu.nama} · No. peserta {kartu.kpj}{kartu.berlaku ? ` · berlaku s.d. ${kartu.berlaku}` : ''}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <a href={kartu.pdf_url} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-bold text-[#04210f] hover:bg-emerald-400">
                <Download size={16} /> Unduh PDF
              </a>
              <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 py-3 font-bold text-white hover:bg-white/20">
                <Printer size={16} /> Cetak
              </button>
            </div>
            <p className="mt-3 text-[11px] text-slate-500 text-center">Tautan unduhan berlaku 5 menit. Setelah itu, masukkan NIK lagi.</p>
            <button onClick={ulang} className="mt-5 w-full text-sm text-slate-400 hover:text-white">Buka kartu lain</button>
          </div>
        )}

        <p className="mt-10 text-[11px] leading-relaxed text-slate-500">
          NIK Anda tidak disimpan oleh halaman ini dan hanya dipakai untuk mencocokkan dengan kartu. Jangan bagikan NIK kepada orang lain.
          Data kartu tidak sesuai? Hubungi KONI Kabupaten Bandung.
        </p>
      </main>
    </div>
  )
}
