// src/lib/klasemen-banding.ts
// War Room: klasemen resmi situs KONI Jabar dibandingkan dengan data kita (laporan yang
// disahkan KONIDA) untuk Kab. Bandung — selisih per jenis medali, tingkat akurasi, dan
// peringkat bila angka Kab. Bandung memakai data kita. Murni (npm run uji:klasemen-banding).

import { kontingenKita, susunKlasemen, type BarisKlasemenPublik } from './jadwal-publik'

export interface AngkaMedali { emas: number; perak: number; perunggu: number }
export const JENIS = ['emas', 'perak', 'perunggu'] as const

export interface BandingKlasemen {
  situs: AngkaMedali
  kita: AngkaMedali
  /** Data kita dikurangi situs (+ = situs belum mencatat, − = situs mencatat lebih banyak). */
  selisih: AngkaMedali
  /** Medali yang sama-sama tercatat (per jenis, yang lebih kecil). */
  cocok: number
  /** cocok ÷ jumlah terbesar dari kedua sisi, 0–100; null bila keduanya masih nol. */
  akurasi: number | null
  /** Peringkat di situs (null bila Kab. Bandung belum punya medali di situs — situs menulis "–"). */
  peringkatSitus: number | null
  /** Peringkat bila angka Kab. Bandung diganti data kita — null selama kontingen lain di situs masih nol semua (bukan "#1" palsu). */
  peringkatKita: number | null
  catatan: string[]
}

const total = (a: AngkaMedali) => a.emas + a.perak + a.perunggu
const nol: AngkaMedali = { emas: 0, perak: 0, perunggu: 0 }

/** Klasemen situs dengan baris Kab. Bandung memakai angka data kita (urut & peringkat dihitung ulang). */
export function klasemenDisesuaikan(baris: { nama: string; emas: number; perak: number; perunggu: number }[], kita: AngkaMedali): BarisKlasemenPublik[] {
  const ada = baris.some(b => kontingenKita(b.nama))
  const ganti = baris.map(b => kontingenKita(b.nama) ? { nama: b.nama, ...kita } : { nama: b.nama, emas: b.emas, perak: b.perak, perunggu: b.perunggu })
  return susunKlasemen(ada ? ganti : [...ganti, { nama: 'Kab. Bandung', ...kita }])
}

export function bandingKlasemen(baris: { nama: string; emas: number; perak: number; perunggu: number }[], kita: AngkaMedali): BandingKlasemen {
  const rSitus = baris.find(b => kontingenKita(b.nama))
  const situs: AngkaMedali = rSitus ? { emas: rSitus.emas, perak: rSitus.perak, perunggu: rSitus.perunggu } : nol
  const selisih = { emas: kita.emas - situs.emas, perak: kita.perak - situs.perak, perunggu: kita.perunggu - situs.perunggu }
  const cocok = JENIS.reduce((n, j) => n + Math.min(kita[j], situs[j]), 0)
  const besar = Math.max(total(kita), total(situs))
  const akurasi = besar ? Math.round((cocok / besar) * 100) : null

  const urutSitus = susunKlasemen(baris)
  const ks = urutSitus.find(b => b.kita)
  const kk = klasemenDisesuaikan(baris, kita).find(b => b.kita)

  const catatan: string[] = []
  for (const j of JENIS) {
    const d = selisih[j]
    if (d > 0) catatan.push(`${d} ${j} Kab. Bandung yang sudah disahkan KONIDA belum tercatat di situs panitia (menunggu verifikasi panitia).`)
    if (d < 0) catatan.push(`Situs panitia mencatat ${-d} ${j} lebih banyak dari data kita — kemungkinan ada laporan yang belum masuk/disahkan. Cek Antrean.`)
  }
  if (!catatan.length) catatan.push(besar ? 'Data kita dan situs panitia sama persis.' : 'Kedua sisi masih nol.')
  const lainMulai = baris.some(b => !kontingenKita(b.nama) && b.emas + b.perak + b.perunggu > 0)
  if (!lainMulai && total(kita) > 0) catatan.push('Kontingen lain di situs masih nol semua — peringkat baru bermakna setelah panitia mulai memverifikasi medali.')

  return {
    situs, kita, selisih, cocok, akurasi,
    peringkatSitus: ks && ks.total > 0 ? ks.peringkat : null,
    peringkatKita: kk && kk.total > 0 && lainMulai ? kk.peringkat : null,
    catatan,
  }
}
