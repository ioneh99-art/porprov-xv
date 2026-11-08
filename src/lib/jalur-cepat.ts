// src/lib/jalur-cepat.ts
// Jalur Cepat medali (keputusan Bos, 7 Nov 2026).
//   1. Superadministrator memasukkan medali dari info grup KONI Kab. → langsung disahkan
//      (ikut dihitung di mana-mana), bertanda "⏳ menunggu PIC" di dalam aplikasi.
//   2. Saat PIC cabor mengirim laporan medali yang SAMA (cabor, nomor, jenis medali, atlet),
//      laporan PIC itu menjadi validasinya: medali jalur cepat → "✓ tervalidasi PIC", laporan
//      PIC tidak dihitung dua kali.
//   3. Bila PIC melapor hal yang BERBEDA untuk nomor itu (medali lain / atlet lain / tanpa
//      medali) → "bentrok": data Superadministrator tetap dipakai dan ditandai merah, KONIDA
//      yang memutuskan di Antrean.
//   4. (8 Nov) Medali sah yang BUKAN dari laporan PIC — dibaca dari situs KONI Jabar, Input
//      Langsung KONIDA, atau dimasukkan tanpa kode — juga menunggu PIC dengan cara yang sama.
//      Dulu laporan PIC untuk medali seperti itu ditolak "sudah dilaporkan", jadi PIC tidak bisa
//      mengirim bukti. PIC juga bisa langsung menekan "Benar" di daftar konfirmasi di HP-nya.
// Fungsi di sini murni (npm run uji:jalur-cepat).

import { LABEL_HASIL, adalahFinal, adalahMedali, bakuNomorMedali, type Hasil } from './lapor'

export type Validasi = 'menunggu_pic' | 'tervalidasi' | 'bentrok'
/** Batas selisih tanggal laporan PIC dan medali jalur cepat (PIC sering melapor belakangan / tanggal partai). */
export const SELISIH_HARI_CEPAT = 2
/** Hanya akun dengan peran ini yang boleh memakai jalur cepat (keputusan Bos: Superadministrator saja). */
export const PERAN_JALUR_CEPAT = 'superadmin'

export const bolehJalurCepat = (sesi: any) => sesi?.role === PERAN_JALUR_CEPAT || sesi?.level === PERAN_JALUR_CEPAT

export interface BarisCepat {
  id: number; cabor_id: number; nomor_teks: string; hasil: string; atlet_ids: number[]; tanggal: string
  status: string; validasi: Validasi | null
  /** Baris ini bukan laporan kode PIC (situs, Input Langsung KONIDA, tanpa kode). */
  bukan_pic?: boolean
}
export interface LaporanPic { cabor_id: number; nomor_teks: string; hasil: string; atlet_ids: number[]; tanggal: string }

export type HasilCocok =
  | { jenis: 'cocok'; id: number }
  | { jenis: 'bentrok'; id: number; alasan: string }
  | null

const selisihHari = (a: string, b: string) => Math.abs(Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86_400_000
const label = (h: string) => LABEL_HASIL[h as Hasil] ?? h

/** Atlet dianggap sama bila salah satu kosong (mis. beregu tanpa nama) atau ada nama yang sama. */
export const atletSejalan = (a: number[], b: number[]) => !a.length || !b.length || a.some(x => b.includes(x))

/** Laporan dari mana pun selain kode PIC: data situs (ref_luar), tanpa kode, atau kode jalur KONIDA. */
export const bukanDariPic = (l: { ref_luar?: string | null; akses_id?: number | null }, aksesKonida: Set<number>) =>
  !!l.ref_luar || l.akses_id == null || aksesKonida.has(l.akses_id)

/** Medali sah yang masih menunggu bukti PIC: jalur cepat yang belum divalidasi, atau medali bukan-PIC yang belum pernah dicek PIC. */
export const menungguPic = (c: Pick<BarisCepat, 'status' | 'hasil' | 'validasi' | 'bukan_pic'>) =>
  c.status === 'disahkan' && adalahMedali(c.hasil) && (c.validasi === 'menunggu_pic' || (c.validasi == null && c.bukan_pic === true))

/** Medali menunggu PIC untuk nomor yang sama (cabor sama, nomor sama dibakukan, tanggal ±2 hari). */
function calonSama(pic: LaporanPic, cepat: BarisCepat[]): BarisCepat[] {
  const n = bakuNomorMedali(pic.nomor_teks)
  return cepat.filter(c => menungguPic(c) && c.cabor_id === pic.cabor_id
    && bakuNomorMedali(c.nomor_teks) === n && selisihHari(c.tanggal, pic.tanggal) <= SELISIH_HARI_CEPAT)
}

/**
 * Laporan PIC yang baru masuk: memvalidasi medali jalur cepat, bentrok dengannya, atau tidak
 * berurusan (null). Hanya hasil akhir yang dicocokkan — "lolos/menang di pool" bukan pembanding.
 */
export function cocokJalurCepat(pic: LaporanPic, cepat: BarisCepat[]): HasilCocok {
  if (!adalahFinal(pic.hasil)) return null
  const calon = calonSama(pic, cepat)
  if (!calon.length) return null
  const sama = calon.find(c => c.hasil === pic.hasil && atletSejalan(c.atlet_ids, pic.atlet_ids))
  if (sama) return { jenis: 'cocok', id: sama.id }
  // Medali sama tapi atletnya lain, padahal ada medali lain di nomor ini yang atletnya cocok → bukan urusan baris itu.
  const c = calon.find(x => atletSejalan(x.atlet_ids, pic.atlet_ids)) ?? calon[0]
  return { jenis: 'bentrok', id: c.id, alasan: alasanBentrok(c, pic) }
}

/** Apa yang berbeda antara medali jalur cepat dan laporan PIC. */
export function alasanBentrok(c: { hasil: string }, pic: { hasil: string }): string {
  return c.hasil !== pic.hasil
    ? `Superadministrator mencatat ${label(c.hasil)}, PIC melapor ${label(pic.hasil)}`
    : 'Medali sama, tetapi atletnya berbeda'
}

export interface LaporanAda { id: number; cabor_id: number; nomor_teks: string; hasil: string; tanggal: string; status: string; ref_luar?: string | null; pelapor_nama?: string | null }

/**
 * Sebelum Superadministrator memasukkan medali jalur cepat: sudah ada laporan PIC (bukan data
 * situs) dengan hasil akhir untuk nomor itu? Bila ada, jalur cepat tidak perlu — sahkan saja yang itu.
 */
export function laporanPicSudahAda(baru: { cabor_id: number; nomor_teks: string; tanggal: string }, ada: LaporanAda[]): LaporanAda | null {
  const n = bakuNomorMedali(baru.nomor_teks)
  return ada.find(l => l.status !== 'ditolak' && !l.ref_luar && adalahFinal(l.hasil) && l.cabor_id === baru.cabor_id
    && bakuNomorMedali(l.nomor_teks) === n && selisihHari(l.tanggal, baru.tanggal) <= SELISIH_HARI_CEPAT) ?? null
}

/** Alasan yang tercatat di laporan PIC yang menjadi validasi (status 'ditolak' supaya tidak dihitung dua kali). */
export const ALASAN_VALIDASI = (idCepat: number) => `Menjadi validasi medali jalur cepat #${idCepat} (tidak dihitung dua kali)`

/** Isian medali jalur cepat yang diisi dari laporan PIC bila masih kosong (foto, skor, lawan, jam, keterangan). */
export function lengkapiDariPic<T extends Record<string, any>>(cepat: T, pic: Record<string, any>): Partial<T> {
  const ubah: Record<string, any> = {}
  for (const k of ['foto_path', 'nilai_teks', 'lawan', 'jam', 'keterangan', 'partai_id'] as const)
    if ((cepat[k] == null || cepat[k] === '') && pic[k] != null && pic[k] !== '') ubah[k] = pic[k]
  return ubah as Partial<T>
}

/** Teks penanda untuk layar (dalam aplikasi saja — halaman publik tidak memakai tanda ini). */
export function tandaValidasi(v: Validasi | null | undefined, oleh?: string | null): { teks: string; warna: string } | null {
  if (v === 'menunggu_pic') return { teks: '⏳ Menunggu PIC', warna: '#fbbf24' }
  if (v === 'tervalidasi') return { teks: `✓ Tervalidasi${oleh ? ` · ${oleh}` : ' PIC'}`, warna: '#34d399' }
  if (v === 'bentrok') return { teks: '⚠ Bentrok dengan laporan PIC', warna: '#f87171' }
  return null
}

export { adalahMedali }
