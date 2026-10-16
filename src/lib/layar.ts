// src/lib/layar.ts
// Susunan isi Mode Layar (videotron) yang boleh dilihat umum: medali per
// tanggal, jadwal cabor kontingen, hitung mundur pembukaan. Murni hitungan
// tanpa database (npm run uji:layar).

import { PORPROV_MULAI, hariPorprov } from './lapor'
import type { BarisJadwal } from './matriks'

export interface MedaliLayar {
  id: number; tanggal: string; cabor: string; nomor: string
  hasil: 'emas' | 'perak' | 'perunggu'; atlet: string[]; nilai: string | null; waktu: string
}
export interface HariMedali { tanggal: string; hari_ke: number | null; emas: number; perak: number; perunggu: number; medali: MedaliLayar[] }

const URUT: Record<string, number> = { emas: 0, perak: 1, perunggu: 2 }

/** Medali dikelompokkan per tanggal (paling awal di atas); dalam sehari emas dulu, lalu perak, perunggu, lalu urutan waktu. */
export function kelompokPerTanggal(medali: MedaliLayar[]): HariMedali[] {
  const peta = new Map<string, MedaliLayar[]>()
  for (const m of medali) peta.set(m.tanggal, [...(peta.get(m.tanggal) ?? []), m])
  return Array.from(peta.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([tanggal, ms]) => {
    const urut = [...ms].sort((a, b) => URUT[a.hasil] - URUT[b.hasil] || a.waktu.localeCompare(b.waktu) || a.id - b.id)
    return {
      tanggal, hari_ke: hariPorprov(tanggal),
      emas: ms.filter(m => m.hasil === 'emas').length,
      perak: ms.filter(m => m.hasil === 'perak').length,
      perunggu: ms.filter(m => m.hasil === 'perunggu').length,
      medali: urut,
    }
  })
}

/** Nama atlet untuk layar: tim besar diringkas supaya tetap satu baris. */
export function namaAtletLayar(atlet: string[]): string {
  if (atlet.length === 0) return '-'
  if (atlet.length <= 2) return atlet.join(' & ')
  return `${atlet[0]} dkk. (${atlet.length} atlet)`
}

const norm = (s: string | null | undefined) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()

/** Kegiatan pertandingan cabor kontingen yang berlangsung pada satu tanggal, urut kota lalu nama. */
export function jadwalPada(jadwal: BarisJadwal[], cabor: string[], tanggal: string): BarisJadwal[] {
  const kita = new Set(cabor.map(norm))
  return jadwal
    .filter(j => j.jenis === 'pertandingan' && kita.has(norm(j.cabor_nama_raw)) && !!j.mulai && !!j.selesai && j.mulai <= tanggal && tanggal <= j.selesai)
    .sort((a, b) => (a.tuan_rumah ?? '').localeCompare(b.tuan_rumah ?? '') || a.cabor_disiplin.localeCompare(b.cabor_disiplin))
}

/**
 * Jadwal yang dipajang: hari ini bila ada pertandingan; bila tidak, hari
 * terdekat sesudahnya yang ada pertandingan cabor kontingen. null bila habis.
 */
export function jadwalTampil(jadwal: BarisJadwal[], cabor: string[], hariIni: string): { tanggal: string; hari_ini: boolean; kegiatan: BarisJadwal[] } | null {
  const sekarang = jadwalPada(jadwal, cabor, hariIni)
  if (sekarang.length) return { tanggal: hariIni, hari_ini: true, kegiatan: sekarang }
  const kita = new Set(cabor.map(norm))
  const berikut = jadwal
    .filter(j => j.jenis === 'pertandingan' && kita.has(norm(j.cabor_nama_raw)) && !!j.mulai && j.mulai > hariIni)
    .map(j => j.mulai as string).sort()[0]
  return berikut ? { tanggal: berikut, hari_ini: false, kegiatan: jadwalPada(jadwal, cabor, berikut) } : null
}

/** Hari tersisa menuju pembukaan; null bila PORPROV sudah dibuka. */
export function hitungMundur(hariIni: string, mulai: string = PORPROV_MULAI): number | null {
  const sisa = Math.round((Date.parse(mulai + 'T00:00:00Z') - Date.parse(hariIni + 'T00:00:00Z')) / 86_400_000)
  return Number.isFinite(sisa) && sisa > 0 ? sisa : null
}
