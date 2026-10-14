'use client'
// src/app/lapor/FormCatatan.tsx
// Catatan lapangan dari HP PIC: kejadian yang tidak sesuai aturan, masalah teknis,
// atau hal di luar teknis. Tidak mengubah angka apa pun — KONI yang menindaklanjuti.

import { useMemo, useState } from 'react'
import { CONTOH_JENIS, ISI_MIN, JENIS_CATATAN, LABEL_JENIS, LABEL_STATUS_CATATAN, type JenisCatatan, type StatusCatatan } from '@/lib/catatan'
import { kecilkanFoto } from './foto'

export interface CatatanSaya {
  id: number; jenis: JenisCatatan; mendesak: boolean; tanggal: string; jam: string | null; nomor_teks: string | null
  isi: string; status: StatusCatatan; tanggapan: string | null; created_at: string; ada_foto?: boolean
}
interface NomorPilihan { kunci: string; label: string; atlet_ids: number[] }

const WARNA_JENIS: Record<JenisCatatan, string> = { aturan: '#fbbf24', teknis: '#38bdf8', nonteknis: '#a78bfa' }
const WARNA_STATUS: Record<StatusCatatan, string> = { baru: '#fbbf24', ditangani: '#38bdf8', selesai: '#34d399', diabaikan: '#94a3b8' }

const kotak = 'w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3.5 text-base text-white placeholder-slate-500 focus:outline-none focus:border-sky-400'
const judulIsian = 'block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2'

export default function FormCatatan({ nomor, atlet, catatan, muat, sesiHabis }: {
  nomor: NomorPilihan[]
  atlet: { id: number; nama: string }[]
  catatan: CatatanSaya[]
  muat: () => Promise<boolean>
  sesiHabis: (pesan: string) => void
}) {
  const [jenis, setJenis] = useState<JenisCatatan | null>(null)
  const [mendesak, setMendesak] = useState(false)
  const [kunciNomor, setKunciNomor] = useState('')
  const [pilihan, setPilihan] = useState<number[]>([])
  const [jam, setJam] = useState('')
  const [isi, setIsi] = useState('')
  const [foto, setFoto] = useState<Blob | null>(null)
  const [pratinjau, setPratinjau] = useState('')
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [terkirim, setTerkirim] = useState<'' | 'biasa' | 'mendesak'>('')

  const namaAtlet = useMemo(() => new Map(atlet.map(a => [a.id, a.nama])), [atlet])
  const nomorPilih = nomor.find(n => n.kunci === kunciNomor) ?? null

  const buangFoto = () => { setFoto(null); setPratinjau(lama => { if (lama) URL.revokeObjectURL(lama); return '' }) }
  const pilihFoto = async (berkas: File | undefined) => {
    if (!berkas) return
    setGalat('')
    try {
      const kecil = await kecilkanFoto(berkas)
      buangFoto(); setFoto(kecil); setPratinjau(URL.createObjectURL(kecil))
    } catch { setGalat('Foto itu tidak bisa dibaca. Coba ambil ulang, atau kirim tanpa foto.') }
  }
  const kosongkan = () => { setJenis(null); setMendesak(false); setKunciNomor(''); setPilihan([]); setJam(''); setIsi(''); buangFoto() }

  const kirim = async () => {
    setGalat('')
    if (!jenis) return setGalat('Pilih jenis catatannya.')
    if (isi.trim().length < ISI_MIN) return setGalat(`Ceritakan kejadiannya sedikit lebih jelas (minimal ${ISI_MIN} huruf).`)
    setSibuk(true)
    try {
      const muatan = JSON.stringify({ jenis, mendesak, jam, nomor_teks: nomorPilih?.label ?? '', atlet_ids: pilihan, isi })
      let r: Response
      if (foto) {
        const fd = new FormData()
        fd.append('isi', muatan); fd.append('foto', foto, 'bukti.jpg')
        r = await fetch('/api/lapor/catatan', { method: 'POST', body: fd })
      } else {
        r = await fetch('/api/lapor/catatan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: muatan })
      }
      const j = await r.json().catch(() => ({}))
      if (r.status === 401) { sesiHabis(j.error ?? 'Sesi habis.'); return }
      if (!r.ok) { setGalat(j.error ?? 'Gagal mengirim.'); return }
      setTerkirim(mendesak ? 'mendesak' : 'biasa'); kosongkan()
      setTimeout(() => setTerkirim(''), mendesak ? 12000 : 4000)
      await muat(); window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch { setGalat('Tidak ada sambungan. Catatan BELUM terkirim, coba lagi.') } finally { setSibuk(false) }
  }

  return (
    <>
      {terkirim && (
        <div role="status" className={`mt-4 rounded-xl px-4 py-3 text-sm font-bold ${terkirim === 'mendesak' ? 'bg-red-500/15 border border-red-400/50 text-red-200' : 'bg-emerald-500/15 border border-emerald-400/40 text-emerald-300'}`}>
          {terkirim === 'mendesak'
            ? 'Catatan MENDESAK terkirim ke KONI. Bila perlu tindakan saat ini juga (misalnya batas waktu protes), telepon atau WA pengurus KONI sekarang.'
            : 'Catatan terkirim ke KONI.'}
        </div>
      )}

      <section className="mt-5 space-y-6">
        <div>
          <div className={judulIsian}>1 · Jenis catatan</div>
          <div className="space-y-2">
            {JENIS_CATATAN.map(j => {
              const aktif = jenis === j
              return (
                <button key={j} type="button" onClick={() => setJenis(j)} aria-pressed={aktif} aria-label={LABEL_JENIS[j]}
                  className="w-full text-left rounded-xl border-2 px-4 py-3"
                  style={{ borderColor: aktif ? WARNA_JENIS[j] : '#334155', background: aktif ? `${WARNA_JENIS[j]}1f` : 'rgba(15,23,42,0.7)' }}>
                  <div className="text-base font-black" style={{ color: aktif ? WARNA_JENIS[j] : '#e2e8f0' }}>{LABEL_JENIS[j]}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{CONTOH_JENIS[j]}</div>
                </button>
              )
            })}
          </div>
        </div>

        <label className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer ${mendesak ? 'border-red-400 bg-red-500/10' : 'border-slate-700 bg-slate-900/70'}`}>
          <input type="checkbox" checked={mendesak} onChange={e => setMendesak(e.target.checked)} aria-label="Perlu tindakan segera" className="mt-1 w-5 h-5 accent-red-500" />
          <span>
            <span className={`block text-base font-black ${mendesak ? 'text-red-300' : 'text-white'}`}>Perlu tindakan segera</span>
            <span className="block text-xs text-slate-400 mt-0.5">Misalnya harus protes sebelum batas waktu, atau atlet cedera berat. Catatan ini akan ditandai merah di KONI.</span>
          </span>
        </label>

        <div>
          <label htmlFor="c-nomor" className={judulIsian}>2 · Nomor pertandingan <span className="normal-case font-normal text-slate-500">(boleh kosong)</span></label>
          <select id="c-nomor" value={kunciNomor} onChange={e => { setKunciNomor(e.target.value); setPilihan([]) }} className={kotak}>
            <option value="">Tidak terkait nomor tertentu</option>
            {nomor.map(n => <option key={n.kunci} value={n.kunci}>{n.label}</option>)}
          </select>
          {nomorPilih && nomorPilih.atlet_ids.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-slate-400 mb-2">Atlet yang terkait <span className="text-slate-500">(ketuk untuk memilih, boleh kosong)</span></div>
              <div className="flex flex-wrap gap-2">
                {nomorPilih.atlet_ids.map(id => {
                  const aktif = pilihan.includes(id)
                  return (
                    <button key={id} type="button" aria-pressed={aktif}
                      onClick={() => setPilihan(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])}
                      className={`rounded-full border px-3 py-1.5 text-sm ${aktif ? 'bg-sky-500/20 border-sky-400/60 text-sky-100' : 'border-slate-700 text-slate-300'}`}>
                      {aktif ? '✓ ' : ''}{namaAtlet.get(id) ?? `Atlet ${id}`}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="c-jam" className={judulIsian}>3 · Jam kejadian <span className="normal-case font-normal text-slate-500">(boleh kosong)</span></label>
          <input id="c-jam" type="time" value={jam} onChange={e => setJam(e.target.value)} className={kotak} />
        </div>

        <div>
          <label htmlFor="c-isi" className={judulIsian}>4 · Apa yang terjadi?</label>
          <textarea id="c-isi" value={isi} onChange={e => setIsi(e.target.value)} rows={5} maxLength={1000}
            placeholder={jenis === 'aturan' ? 'Contoh: Kelas 60 kg digabung dengan 65 kg tanpa pemberitahuan. Pelatih sudah minta penjelasan ke panitia.'
              : jenis === 'nonteknis' ? 'Contoh: Bus jemputan ke venue terlambat 1 jam, atlet tiba mepet waktu timbang.'
              : 'Ceritakan singkat: apa, di mana, siapa yang terlibat, dan apa yang sudah dilakukan.'}
            className={kotak} />
          <div className="text-[11px] text-slate-500 mt-1 text-right">{isi.length}/1000</div>
        </div>

        <div>
          <div className={judulIsian}>5 · Foto <span className="normal-case font-normal text-slate-500">(boleh kosong)</span></div>
          {pratinjau ? (
            <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pratinjau} alt="Pratinjau foto" className="w-20 h-20 rounded-lg object-cover" />
              <div className="flex-1 text-sm text-slate-300">Foto siap dikirim{foto ? ` (${Math.max(1, Math.round(foto.size / 1024))} KB)` : ''}.</div>
              <button type="button" onClick={buangFoto} className="text-xs font-bold text-red-300 border border-red-500/40 rounded-lg px-3 py-2">Buang</button>
            </div>
          ) : (
            <label className="block w-full rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 px-4 py-5 text-center text-sm font-bold text-slate-300 cursor-pointer">
              Ambil foto kejadian, papan pengumuman, atau dokumen
              <input type="file" accept="image/*" capture="environment" className="sr-only"
                onChange={e => { pilihFoto(e.target.files?.[0]); e.target.value = '' }} />
            </label>
          )}
        </div>

        {galat && <p role="alert" className="rounded-xl bg-red-500/15 border border-red-400/40 px-4 py-3 text-sm font-bold text-red-300">{galat}</p>}

        <button type="button" onClick={kirim} disabled={sibuk}
          className={`w-full rounded-xl py-4 text-lg font-black disabled:opacity-40 ${mendesak ? 'bg-red-500 text-white' : 'bg-sky-500 text-slate-950'}`}>
          {sibuk ? 'Mengirim…' : mendesak ? 'Kirim Catatan Mendesak' : 'Kirim Catatan'}
        </button>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">Catatan saya ({catatan.length})</h2>
        {catatan.length === 0 && <p className="text-sm text-slate-500">Belum ada catatan.</p>}
        <div className="space-y-2">
          {catatan.map(c => (
            <div key={c.id} className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black" style={{ color: WARNA_JENIS[c.jenis] }}>{LABEL_JENIS[c.jenis]}{c.mendesak ? <span className="ml-2 text-red-300">· MENDESAK</span> : null}</span>
                <span className="shrink-0 text-xs font-bold" style={{ color: WARNA_STATUS[c.status] }}>{LABEL_STATUS_CATATAN[c.status]}</span>
              </div>
              {c.nomor_teks && <div className="text-xs text-slate-400 mt-1">{c.nomor_teks}</div>}
              <p className="text-sm text-white mt-1 whitespace-pre-line line-clamp-4">{c.isi}</p>
              {c.tanggapan && <p className="mt-2 text-xs text-sky-200">Tanggapan KONI: {c.tanggapan}</p>}
              <div className="mt-1.5 text-[11px] text-slate-500">{c.tanggal}{c.jam ? ` · ${c.jam}` : ''}{c.ada_foto ? ' · ada foto' : ''}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
