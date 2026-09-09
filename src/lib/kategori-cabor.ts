// src/lib/kategori-cabor.ts
// Kategori sifat pertandingan menurut pengurus Kab. Bandung.
//
// Dipakai bersama oleh Data Atlet, Dokumen Atlet, dan Performance supaya
// warna dan urutannya tidak berbeda-beda antar halaman. Urutannya bukan
// abjad melainkan hasil Babak Kualifikasi — Beladiri menyumbang 35 dari 78
// emas, jadi ia berdiri paling depan.

export const KATEGORI_CABOR = ['BELADIRI', 'TERUKUR', 'PENILAIAN', 'PERMAINAN', 'BEREGU'] as const
export type KategoriCabor = typeof KATEGORI_CABOR[number]

export const WARNA_KATEGORI: Record<string, string> = {
  BELADIRI:  '#ef4444',
  TERUKUR:   '#38bdf8',
  PENILAIAN: '#a855f7',
  PERMAINAN: '#34d399',
  BEREGU:    '#fbbf24',
}

/** Label pendek untuk kelompok yang belum punya kategori. */
export const TANPA_KATEGORI = 'Belum berkategori'

export const warnaKategori = (k: string | null | undefined) =>
  (k && WARNA_KATEGORI[k]) || '#64748b'

/** Urutan tampil: kategori resmi dulu sesuai KATEGORI_CABOR, sisanya di belakang. */
export function urutKategori(a: string | null, b: string | null): number {
  const i = (k: string | null) => {
    const n = KATEGORI_CABOR.indexOf((k ?? '') as KategoriCabor)
    return n === -1 ? 99 : n
  }
  return i(a) - i(b) || (a ?? '').localeCompare(b ?? '')
}
