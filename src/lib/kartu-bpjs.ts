// src/lib/kartu-bpjs.ts
// Aturan murni kartu BPJS Ketenagakerjaan: membaca teks kartu dari PDF,
// membakukan & menyamarkan NIK, dan pembatas tebak-NIK di halaman publik.
// Tanpa akses DB — supaya bisa diuji (scripts/uji-kartu-bpjs.ts).

import { timingSafeEqual } from 'crypto'

export interface IsiKartu { nik: string; kpj: string; nama: string; berlaku: string | null }

/**
 * Baca satu halaman hasil `pdftotext -layout`. Kartu ada di kolom kiri
 * (±25 karakter pertama tiap baris); kolom kanan = teks ketentuan yang sama
 * di semua halaman, jadi diabaikan.
 */
export function bacaHalamanKartu(teks: string): IsiKartu | null {
  // Isi kartu selalu mulai di kolom 0; baris yang diawali spasi = kolom kanan.
  const kiri = teks.split('\n').filter(l => /^\S/.test(l)).map(l => l.slice(0, 25).trim())
    .filter(l => l && !/^\d\.|^[a-b]\.|^-/.test(l))
  const nikBaris = kiri.find(l => /^\d{4} \d{4} \d{4} \d{4}$/.test(l))
  const kpj = kiri.find(l => /^\d{11}$/.test(l))
  const nama = kiri.find(l => /^[A-Z][A-Z .,'`-]+$/.test(l))
  const berlaku = kiri.find(l => /^\d{2}-\d{4}$/.test(l)) ?? null
  if (!nikBaris || !kpj || !nama) return null
  return { nik: nikBaris.replace(/\s/g, ''), kpj, nama: nama.replace(/\s+/g, ' '), berlaku }
}

/** Hanya angka; NIK sah = 16 digit. Selain itu null. */
export function bakukanNik(s: unknown): string | null {
  const d = String(s ?? '').replace(/\D/g, '')
  return d.length === 16 ? d : null
}

/** 3204441901890002 → 3204 •••• •••• 0002 */
export function samarkanNik(nik: string): string {
  const d = String(nik ?? '').replace(/\D/g, '')
  if (d.length < 8) return '••••'
  return `${d.slice(0, 4)} •••• •••• ${d.slice(-4)}`
}

/** Perbandingan waktu-tetap — tidak membocorkan berapa digit yang benar. */
export function nikSama(a: string, b: string): boolean {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b))
  if (x.length !== y.length) return false
  return timingSafeEqual(x, y)
}

/** Untuk pencocokan nama: huruf besar, tanpa spasi/tanda baca. */
export function normNama(s: string | null | undefined): string {
  return String(s ?? '').toUpperCase().replace(/[^A-Z]/g, '')
}

/**
 * Nama di kartu terpotong ±25 huruf. Sama bila persis, atau nama kartu
 * yang panjang (≥20 huruf) adalah awalan nama di database.
 */
export function namaKartuCocok(namaKartu: string, namaDb: string): boolean {
  const k = normNama(namaKartu), d = normNama(namaDb)
  if (!k || !d) return false
  return k === d || (k.length >= 20 && d.startsWith(k))
}

// ── Pembatas tebak-NIK (halaman publik) ─────────────────────────────────────
export const BATAS = {
  /** gagal per alamat IP dalam JENDELA_IP_MENIT */
  gagalIp: 10, jendelaIpMenit: 15,
  /** gagal per kartu dalam JENDELA_KARTU_MENIT — kartu dikunci sementara */
  gagalKartu: 5, jendelaKartuMenit: 30,
}

/** null = boleh mencoba; selain itu pesan penolakan. */
export function putusanBatas(gagalIp: number, gagalKartu: number): string | null {
  if (gagalKartu >= BATAS.gagalKartu)
    return `Terlalu banyak NIK salah untuk kartu ini. Coba lagi ${BATAS.jendelaKartuMenit} menit lagi, atau hubungi KONI Kab. Bandung.`
  if (gagalIp >= BATAS.gagalIp)
    return `Terlalu banyak percobaan dari perangkat ini. Coba lagi ${BATAS.jendelaIpMenit} menit lagi.`
  return null
}

/** Nama berkas unduhan: BPJS_NANO_SUPRIATNA.pdf */
export function namaBerkasUnduh(nama: string): string {
  return `BPJS_${String(nama).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'KARTU'}.pdf`
}
