// src/lib/jadwal-partai.ts
// Jadwal per partai (satu pertandingan: tanggal, jam, nomor, babak, atlet,
// lawan, venue). Diisi PIC cabor dari HP, KONIDA dari dashboard, atau dari
// kolom Jam/Nomor/Lawan berkas Matriks KONI. Langsung tampil di halaman publik
// (keputusan Bos 21 Okt 2026), termasuk nama atlet.
// Murni hitungan tanpa database (npm run uji:jadwal-partai).

import { periksaJam, tanggalSah } from './lapor'

export const STATUS_PARTAI = ['terjadwal', 'berlangsung', 'ditunda', 'selesai', 'batal'] as const
export type StatusPartai = typeof STATUS_PARTAI[number]
export const LABEL_STATUS_PARTAI: Record<StatusPartai, string> = {
  terjadwal: 'Terjadwal', berlangsung: 'Sedang bertanding', ditunda: 'Ditunda', selesai: 'Selesai', batal: 'Batal',
}
export const WARNA_STATUS_PARTAI: Record<StatusPartai, string> = {
  terjadwal: '#38bdf8', berlangsung: '#34d399', ditunda: '#fbbf24', selesai: '#94a3b8', batal: '#f87171',
}
export const SARAN_BABAK = [
  'Penyisihan', 'Grup A', 'Grup B', 'Grup C', 'Grup D', 'Kualifikasi', 'Heat', 'Babak 16 besar',
  'Perempat final', 'Semifinal', 'Perebutan tempat 3', 'Final',
]

export interface Partai {
  id: number; cabor_id: number; tanggal: string; jam: string | null
  nomor_teks: string; disiplin: string | null; nomor_resmi: string | null; babak: string | null
  atlet_ids: number[]; lawan: string | null; venue: string | null; status: StatusPartai; keterangan: string | null
  sumber: 'pic' | 'konida' | 'matriks'; updated_at?: string
}

export interface IsiPartai {
  tanggal?: string; jam?: string | null; nomor_teks?: string; babak?: string | null; atlet_ids?: number[]
  lawan?: string | null; venue?: string | null; status?: StatusPartai; keterangan?: string | null
}

const teks = (v: unknown, maks: number): string | null =>
  typeof v === 'string' ? (v.replace(/\s+/g, ' ').trim().slice(0, maks) || null) : null

/** Tanggal yang masuk akal untuk PORPROV XV (pertandingan pra-pembukaan mulai akhir Oktober). */
export const tanggalPartaiSah = (t: unknown): t is string => tanggalSah(t) && t >= '2026-10-01' && t <= '2026-12-31'

/**
 * Isian partai dari formulir. `parsial` = hanya kolom yang dikirim yang
 * diperiksa (mis. tombol ubah status). Nomor resmi dan atlet dicocokkan
 * ulang di server oleh pemanggil — fungsi ini hanya memeriksa bentuknya.
 */
export function periksaPartai(b: any, parsial: boolean): { isi: IsiPartai } | { galat: string } {
  if (!b || typeof b !== 'object') return { galat: 'Isian tidak terbaca.' }
  const ada = (k: string) => !parsial || Object.prototype.hasOwnProperty.call(b, k)
  const isi: IsiPartai = {}

  if (ada('tanggal')) {
    if (!tanggalPartaiSah(b.tanggal)) return { galat: 'Tanggal pertandingan belum diisi atau di luar masa PORPROV.' }
    isi.tanggal = b.tanggal
  }
  if (ada('jam')) {
    const j = periksaJam(b.jam)
    if (j === false) return { galat: 'Jam tanding harus berbentuk JJ:MM, misalnya 09:30.' }
    isi.jam = j
  }
  if (ada('nomor_teks')) {
    const n = teks(b.nomor_teks, 160)
    if (!n) return { galat: 'Nomor pertandingan belum diisi.' }
    isi.nomor_teks = n
  }
  if (ada('babak')) isi.babak = teks(b.babak, 40)
  if (ada('lawan')) isi.lawan = teks(b.lawan, 160)
  if (ada('venue')) isi.venue = teks(b.venue, 200)
  if (ada('keterangan')) isi.keterangan = teks(b.keterangan, 300)
  if (ada('atlet_ids')) {
    const a = b.atlet_ids ?? []
    if (!Array.isArray(a) || a.length > 60 || a.some((x: unknown) => !Number.isInteger(x) || (x as number) <= 0))
      return { galat: 'Daftar atlet tidak terbaca.' }
    isi.atlet_ids = Array.from(new Set(a as number[]))
  }
  if (ada('status')) {
    const s = b.status ?? 'terjadwal'
    if (!STATUS_PARTAI.includes(s)) return { galat: 'Status partai tidak dikenali.' }
    isi.status = s
  }
  if (Object.keys(isi).length === 0) return { galat: 'Tidak ada yang diubah.' }
  return { isi }
}

/** Urut tanggal, lalu jam (yang belum berjam di belakang), lalu nomor. */
export function urutPartai<T extends Pick<Partai, 'tanggal' | 'jam' | 'nomor_teks' | 'id'>>(daftar: T[]): T[] {
  return [...daftar].sort((a, b) => a.tanggal.localeCompare(b.tanggal)
    || (a.jam ?? '99:99').localeCompare(b.jam ?? '99:99')
    || a.nomor_teks.localeCompare(b.nomor_teks) || a.id - b.id)
}

/**
 * Partai yang dipajang di halaman publik: hari ini bila ada; bila tidak,
 * tanggal terdekat sesudahnya. Partai batal tidak dipajang.
 */
export function partaiTampil<T extends Pick<Partai, 'tanggal' | 'jam' | 'nomor_teks' | 'id' | 'status'>>(daftar: T[], hariIni: string): { tanggal: string; hari_ini: boolean; partai: T[] } | null {
  const hidup = daftar.filter(p => p.status !== 'batal')
  const kini = hidup.filter(p => p.tanggal === hariIni)
  if (kini.length) return { tanggal: hariIni, hari_ini: true, partai: urutPartai(kini) }
  const berikut = hidup.map(p => p.tanggal).filter(t => t > hariIni).sort()[0]
  return berikut ? { tanggal: berikut, hari_ini: false, partai: urutPartai(hidup.filter(p => p.tanggal === berikut)) } : null
}

/** Partai yang bisa dipakai mengisi formulir lapor hasil: kemarin dan hari ini, belum selesai/batal. */
export function partaiUntukLapor<T extends Pick<Partai, 'tanggal' | 'jam' | 'nomor_teks' | 'id' | 'status'>>(daftar: T[], hariIni: string): T[] {
  const kemarin = new Date(Date.parse(hariIni + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10)
  return urutPartai(daftar.filter(p => (p.tanggal === hariIni || p.tanggal === kemarin) && p.status !== 'selesai' && p.status !== 'batal'))
}

/** "Futsal Putra vs Kota Cirebon" bila lawan diketahui. */
export const tulisLaga = (p: Pick<Partai, 'nomor_teks' | 'lawan'>) => p.lawan ? `${p.nomor_teks} vs ${p.lawan}` : p.nomor_teks
