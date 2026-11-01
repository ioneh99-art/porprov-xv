// src/lib/command-center.ts
// Hitungan untuk 3 layar command center (murni, tanpa database — diuji: npm run uji).

import { klasemenDimulai, type BarisKlasemenWR } from './warroom'

export const LAYAR = [
  { no: 1, judul: 'Posisi kita', isi: 'Peringkat, medali, target emas, klasemen' },
  { no: 2, judul: 'Hari ini, sekarang', isi: 'Sedang main, berikutnya, misi emas, hasil terbaru' },
  { no: 3, judul: 'Sebaran dan wajah', isi: 'Peta kota, peraih medali, medali per cabor' },
  { no: 4, judul: 'Perburuan emas', isi: 'Kalender panas, wajah calon peraih emas, hitungan target' },
] as const

const urut = (k: BarisKlasemenWR[]) => [...k].sort((a, b) => b.emas - a.emas || b.perak - a.perak || b.perunggu - a.perunggu || a.nama.localeCompare(b.nama, 'id'))
const sama = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase()

export interface BarisPapan extends BarisKlasemenWR { peringkat: number; kita: boolean }

/**
 * Potongan klasemen untuk layar: n teratas; bila kontingen kita di luar n, baris
 * terakhir diganti kita (supaya tetap terlihat). Peringkat bersama bila medali sama persis.
 */
export function papanKlasemen(k: BarisKlasemenWR[], nama: string, n = 8): BarisPapan[] {
  if (!klasemenDimulai(k)) return []
  const u = urut(k)
  const semua: BarisPapan[] = []
  u.forEach((r, i) => {
    const prev = semua[i - 1]
    const seri = prev && prev.emas === r.emas && prev.perak === r.perak && prev.perunggu === r.perunggu
    semua.push({ ...r, peringkat: seri ? prev.peringkat : i + 1, kita: sama(r.nama, nama) })
  })
  const atas = semua.slice(0, n)
  if (atas.some(r => r.kita)) return atas
  const kita = semua.find(r => r.kita)
  return kita ? [...atas.slice(0, n - 1), kita] : atas
}

/** Selisih emas ke kontingen tepat di atas dan di bawah kita (null bila tidak ada / belum mulai). */
export function selisihTetangga(k: BarisKlasemenWR[], nama: string): { atas: { nama: string; emas: number } | null; bawah: { nama: string; emas: number } | null } {
  if (!klasemenDimulai(k)) return { atas: null, bawah: null }
  const u = urut(k)
  const i = u.findIndex(r => sama(r.nama, nama))
  if (i < 0) return { atas: null, bawah: null }
  return {
    atas: i > 0 ? { nama: u[i - 1].nama, emas: u[i - 1].emas - u[i].emas } : null,
    bawah: i < u.length - 1 ? { nama: u[i + 1].nama, emas: u[i].emas - u[i + 1].emas } : null,
  }
}

/** Kalimat ringkas 30 detik untuk pendamping tamu. */
export function kalimatRingkas(o: { hariKe: number | null; peringkat: number | null; jumlahKontingen: number; emas: number; target: number; besok: number }): string[] {
  const bagian: string[] = []
  bagian.push(o.hariKe ? `Hari ke-${o.hariKe}` : 'Pra-PORPROV')
  bagian.push(o.peringkat ? `Peringkat ${o.peringkat} dari ${o.jumlahKontingen}` : 'Klasemen belum dimulai')
  bagian.push(o.target > 0 ? `${o.emas} emas dari target ${o.target}` : `${o.emas} emas`)
  if (o.besok > 0) bagian.push(`Besok ${o.besok} peluang emas`)
  return bagian
}

/** Persen capaian target (0–100, dibulatkan). */
export const persenTarget = (emas: number, target: number) => target > 0 ? Math.min(100, Math.round((emas / target) * 100)) : 0

/** Nomor layar dari alamat (1–3); selain itu null. */
export function nomorLayar(s: string | null | undefined): 1 | 2 | 3 | 4 | null {
  const n = Number(s)
  return n === 1 || n === 2 || n === 3 || n === 4 ? n : null
}
