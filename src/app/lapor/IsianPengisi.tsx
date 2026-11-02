'use client'
// "Siapa yang mengisi?" — wajib sebelum mengirim apa pun lewat kode PIC.
// Kode/tautan PIC bisa dipinjam orang lain di lapangan; nama & jabatan pengisi
// ikut tercatat di laporan. Isian diingat di HP ini supaya tidak mengetik ulang.

import { useEffect, useState } from 'react'
import { JABATAN_PENGISI } from '@/lib/pengisi'

export interface DataPengisi { pengisi_nama: string; pengisi_jabatan: string; pengisi_jabatan_lain: string }
const KUNCI = 'lapor-pengisi-v1'
const KOSONG: DataPengisi = { pengisi_nama: '', pengisi_jabatan: '', pengisi_jabatan_lain: '' }

/** Pengisi yang tersimpan di HP ini (dibagi oleh ketiga form). */
export function usePengisi() {
  const [p, setP] = useState<DataPengisi>(KOSONG)
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(KUNCI) ?? 'null'); if (s) setP({ ...KOSONG, ...s }) } catch { /* mode privat */ }
  }, [])
  const ubah = (b: Partial<DataPengisi>) => setP(v => {
    const baru = { ...v, ...b }
    try { localStorage.setItem(KUNCI, JSON.stringify(baru)) } catch { /* mode privat */ }
    return baru
  })
  /** Pesan kesalahan bila belum lengkap (diperiksa ulang di server). */
  const kurang = (): string => {
    if (p.pengisi_nama.trim().length < 3) return 'Tulis nama Anda di bagian "Siapa yang mengisi?".'
    if (!p.pengisi_jabatan) return 'Pilih jabatan Anda di bagian "Siapa yang mengisi?".'
    if (p.pengisi_jabatan === 'Lainnya' && p.pengisi_jabatan_lain.trim().length < 2) return 'Tulis jabatan Anda (pilihan "Lainnya").'
    return ''
  }
  return { pengisi: p, ubah, kurang }
}

export default function IsianPengisi({ pengisi, ubah, pemilikKode }: {
  pengisi: DataPengisi; ubah: (b: Partial<DataPengisi>) => void; pemilikKode?: string
}) {
  const kotak = 'w-full rounded-xl bg-slate-900/80 border border-slate-700 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none'
  return (
    <div className="rounded-2xl border-2 border-amber-400/50 bg-amber-500/10 p-4 space-y-3">
      <div>
        <div className="text-sm font-black uppercase tracking-wider text-amber-200">Siapa yang mengisi?</div>
        <p className="text-xs text-amber-100/80 mt-0.5">
          Wajib. Nama & jabatan Anda ikut tercatat di laporan{pemilikKode ? <> (kode PIC ini milik <b>{pemilikKode}</b>)</> : null}. Kalau HP dipinjam orang lain, ganti dulu.
        </p>
      </div>
      <div>
        <label htmlFor="pengisi-nama" className="block text-xs font-bold text-slate-300 mb-1">Nama pengisi</label>
        <input id="pengisi-nama" value={pengisi.pengisi_nama} onChange={e => ubah({ pengisi_nama: e.target.value })}
          placeholder="Nama lengkap Anda" autoComplete="name" maxLength={80} className={kotak} />
      </div>
      <div>
        <div className="block text-xs font-bold text-slate-300 mb-1">Jabatan</div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Jabatan pengisi">
          {JABATAN_PENGISI.map(j => {
            const aktif = pengisi.pengisi_jabatan === j
            return (
              <button key={j} type="button" role="radio" aria-checked={aktif} onClick={() => ubah({ pengisi_jabatan: j })}
                className={`rounded-full px-3 py-2 text-sm font-bold border ${aktif ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-900/70 text-slate-200 border-slate-600'}`}>
                {j}
              </button>
            )
          })}
        </div>
        {pengisi.pengisi_jabatan === 'Lainnya' && (
          <input value={pengisi.pengisi_jabatan_lain} onChange={e => ubah({ pengisi_jabatan_lain: e.target.value })}
            placeholder="Tulis jabatan Anda" maxLength={40} aria-label="Jabatan lainnya" className={`${kotak} mt-2`} />
        )}
      </div>
    </div>
  )
}
