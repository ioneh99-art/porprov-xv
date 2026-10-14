// src/lib/catatan.ts
// Catatan lapangan dari PIC cabor — kejadian di luar hasil pertandingan.
// Tiga jenisnya mengikuti bagian III–V format Laporan Monitoring PORPROV XV,
// dipersempit ke kepentingan kontingen sendiri. Murni hitungan, tanpa database
// (npm run uji:catatan).

import { periksaJam } from './lapor'

export const JENIS_CATATAN = ['aturan', 'teknis', 'nonteknis'] as const
export type JenisCatatan = typeof JENIS_CATATAN[number]

export const LABEL_JENIS: Record<JenisCatatan, string> = {
  aturan: 'Tidak sesuai aturan/THB',
  teknis: 'Masalah teknis pertandingan',
  nonteknis: 'Di luar teknis pertandingan',
}

/** Contoh yang ditampilkan di bawah tiap pilihan, supaya PIC tidak ragu memilih. */
export const CONTOH_JENIS: Record<JenisCatatan, string> = {
  aturan: 'Kelas, jadwal, atau undian diubah mendadak; penilaian atau keputusan wasit tidak sesuai aturan; bahan protes.',
  teknis: 'Alat atau lapangan bermasalah, perangkat pertandingan, pertandingan tertunda, atlet cedera saat bertanding.',
  nonteknis: 'Akomodasi, transportasi, konsumsi, kesehatan atlet, atau hal lain di luar pertandingan.',
}

/** Judul bagian di laporan cabor — urutannya sama dengan format Monev. */
export const JUDUL_BAGIAN: Record<JenisCatatan, string> = {
  aturan: 'KESESUAIAN PELAKSANAAN PERTANDINGAN DENGAN ATURAN (THB)',
  teknis: 'PERMASALAHAN TEKNIS PERTANDINGAN',
  nonteknis: 'LAIN-LAIN (DI LUAR TEKNIS PERTANDINGAN)',
}

export const STATUS_CATATAN = ['baru', 'ditangani', 'selesai', 'diabaikan'] as const
export type StatusCatatan = typeof STATUS_CATATAN[number]

export const LABEL_STATUS_CATATAN: Record<StatusCatatan, string> = {
  baru: 'Belum ditangani',
  ditangani: 'Sedang ditangani',
  selesai: 'Selesai',
  diabaikan: 'Diabaikan',
}

export const ISI_MIN = 10
export const ISI_MAKS = 1000

export interface IsiCatatan {
  jenis: JenisCatatan
  mendesak: boolean
  jam: string | null
  nomor_teks: string | null
  atlet_ids: number[]
  isi: string
}

const rapikan = (v: unknown, maks: number): string =>
  typeof v === 'string' ? v.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, maks) : ''

/** Mengembalikan isi yang sudah dirapikan, atau pesan galat untuk ditampilkan ke PIC. */
export function periksaCatatan(b: any): { isi: IsiCatatan } | { galat: string } {
  if (!JENIS_CATATAN.includes(b?.jenis)) return { galat: 'Pilih jenis catatannya.' }

  const isi = rapikan(b?.isi, ISI_MAKS)
  if (isi.length < ISI_MIN) return { galat: `Ceritakan kejadiannya sedikit lebih jelas (minimal ${ISI_MIN} huruf).` }

  const mentah: unknown[] = Array.isArray(b?.atlet_ids) ? b.atlet_ids : []
  const atlet_ids = Array.from(new Set(mentah.map(Number).filter(n => Number.isInteger(n) && n > 0)))
  if (atlet_ids.length > 60) return { galat: 'Terlalu banyak atlet dalam satu catatan (maksimal 60).' }

  const jam = periksaJam(b?.jam)
  if (jam === false) return { galat: 'Jam kejadian tidak dikenali. Tulis seperti 14:30.' }

  return {
    isi: {
      jenis: b.jenis,
      mendesak: b?.mendesak === true,
      jam,
      nomor_teks: rapikan(b?.nomor_teks, 120).replace(/\s+/g, ' ') || null,
      atlet_ids,
      isi,
    },
  }
}

/** Tanggapan KONIDA: dirapikan; '' berarti tidak diisi. */
export const rapikanTanggapan = (v: unknown): string => rapikan(v, 500)

/**
 * Urutan tampil untuk KONIDA: yang mendesak dan belum ditangani paling atas,
 * lalu menurut status, lalu yang terbaru.
 */
export function urutCatatan<T extends { status: string; mendesak: boolean; created_at: string; id: number }>(daftar: T[]): T[] {
  const bobotStatus: Record<string, number> = { baru: 0, ditangani: 1, selesai: 2, diabaikan: 3 }
  return [...daftar].sort((a, b) =>
    Number(b.mendesak && b.status === 'baru') - Number(a.mendesak && a.status === 'baru')
    || (bobotStatus[a.status] ?? 9) - (bobotStatus[b.status] ?? 9)
    || b.created_at.localeCompare(a.created_at)
    || b.id - a.id)
}

/**
 * Tautan WhatsApp ke nomor PIC. Nomor Indonesia ditulis macam-macam
 * (0812…, 62812…, +62 812…); wa.me hanya menerima 62812… tanpa tanda.
 * null bila nomornya tidak masuk akal.
 */
export function tautanWA(noWa: string | null | undefined): string | null {
  const d = String(noWa ?? '').replace(/\D/g, '')
  const baku = d.startsWith('62') ? d : d.startsWith('0') ? '62' + d.slice(1) : d.startsWith('8') ? '62' + d : ''
  return /^628\d{7,12}$/.test(baku) ? `https://wa.me/${baku}` : null
}
