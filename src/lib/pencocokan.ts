// src/lib/pencocokan.ts
// Mesin pencocokan nama — dipakai bersama oleh impor Data Gateway dan penarikan foto.
//
// Latar: nama yang datang dari lapangan jarang rapi. Dari 828 nama berkas foto
// yang diuji, banyak yang berupa POTONGAN nama lengkap ("M. Jordi" untuk
// "Muhammad Jordi Indra Permana", "reina" untuk "Reina Putri Najiyyah") atau
// berderau ("Pas Foto Rizki(1)", "Copy of nizar", "Raihan (aa ipsc)").
//
// Rumus kemiripan lama menghukum selisih panjang, sehingga nama yang jelas-jelas
// sama dianggap tidak ketemu. Modul ini menambah tiga hal, dan pada uji 80 foto
// menurunkan "tidak ketemu" dari 21% menjadi 1% tanpa memunculkan satu pun
// kecocokan ambigu:
//   1. pembersihan derau nama berkas
//   2. skor kandungan — semua kata nama pendek ada di nama panjang
//   3. inisial ("M" = "Muhammad") dan toleransi salah ketik ringan
//
// Prinsip yang TIDAK berubah: sistem tidak pernah menautkan sendiri kecuali
// namanya persis. Selebihnya menyodorkan kandidat untuk diputuskan manusia.

import { norm, simNama } from './rekonsiliasi'

export const AMBANG_KONFIRMASI = 0.55   // di bawah ini dianggap tidak ketemu
export const AMBANG_AMBIGU = 0.05       // selisih skor 1 & 2 di bawah ini = ambigu

/** Buang derau khas nama berkas foto. Tanda kurung dibuang dari teks MENTAH —
 *  kalau menunggu sesudah norm(), kurungnya sudah jadi spasi dan aturan ini
 *  tidak pernah berfungsi. */
export function bersihkanNamaBerkas(s: string): string {
  let t = String(s ?? '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
  t = ' ' + norm(t) + ' '
  t = t.replace(/\b(PAS\s+FOTO|PASFOTO|FOTO|COPY\s+OF|SALINAN|IMG|IMAGE|WHATSAPP\s+IMAGE|SCAN|DOKUMEN\s+DARI)\b/g, ' ')
  t = t.replace(/\b\d+\b/g, ' ')
  return t.replace(/\s+/g, ' ').trim()
}

/** Apakah satu kata nama pendek mewakili satu kata nama panjang. */
export function tokenCocok(t: string, u: string): boolean {
  if (!t || !u) return false
  if (t === u) return true
  if (t.length === 1) return u.charAt(0) === t          // inisial: "M" → "MUHAMMAD"
  if (t.length >= 4 && u.indexOf(t) === 0) return true   // awalan: "RIFQI" → "RIFQIANSYAH"
  if (t.length >= 5 && simNama(t, u) >= 0.85) return true // salah ketik: "AULIA" ≈ "AULYA"
  return false
}

/** Berapa bagian kata nama pendek yang terwakili di nama panjang (0..1). */
export function skorKandungan(a: string, b: string): number {
  const ta = a.split(' ').filter(Boolean)
  const tb = b.split(' ').filter(Boolean)
  if (!ta.length || !tb.length) return 0
  const pendek = ta.length <= tb.length ? ta : tb
  const panjang = ta.length <= tb.length ? tb : ta
  let cocok = 0
  for (const t of pendek) if (panjang.some(u => tokenCocok(t, u))) cocok++
  return cocok / pendek.length
}

/** Skor gabungan 0..1. Kandungan diberi bobot 0,95 supaya kecocokan
 *  huruf-per-huruf tetap lebih dipercaya daripada kecocokan per kata. */
export function skorNama(a: string, b: string): number {
  return Math.max(simNama(a, b), skorKandungan(a, b) * 0.95)
}

export type MetodeNama = 'persis' | 'mirip' | 'ambigu' | 'tidak_ketemu'

export interface KandidatNama { id: number; nama: string; skor: number }

export interface HasilCocokNama {
  metode: MetodeNama
  id: number | null              // hanya terisi bila 'persis'
  nama: string | null
  skor: number | null
  kandidat: KandidatNama | null  // sodoran untuk dikonfirmasi manusia
  saingan: KandidatNama | null   // terisi bila ambigu — tunjukkan keduanya
}

/**
 * Cocokkan satu nama ke daftar kandidat.
 * `bersihkan` dinyalakan untuk nama yang berasal dari nama berkas.
 */
export function cocokkanNama(
  namaSumber: string,
  daftar: Array<{ id: number; nama_lengkap: string }>,
  opsi: { bersihkan?: boolean } = {},
): HasilCocokNama {
  const n = opsi.bersihkan ? bersihkanNamaBerkas(namaSumber) : norm(namaSumber)
  const kosong: HasilCocokNama = { metode: 'tidak_ketemu', id: null, nama: null, skor: null, kandidat: null, saingan: null }
  if (!n || !daftar.length) return kosong

  // 1. persis — satu-satunya yang boleh ditautkan otomatis
  const persis = daftar.find(a => norm(a.nama_lengkap) === n)
  if (persis) {
    return { metode: 'persis', id: persis.id, nama: persis.nama_lengkap, skor: 1, kandidat: null, saingan: null }
  }

  // 2. peringkat kandidat
  const peringkat = daftar
    .map(a => ({ id: a.id, nama: a.nama_lengkap, skor: Number(skorNama(n, norm(a.nama_lengkap)).toFixed(3)) }))
    .sort((x, y) => y.skor - x.skor)

  const top = peringkat[0]
  const kedua = peringkat[1]
  if (!top || top.skor < AMBANG_KONFIRMASI) {
    return { ...kosong, skor: top ? top.skor : null, kandidat: top ?? null }
  }

  // 3. ambigu bila dua kandidat teratas hampir sama kuat
  if (kedua && kedua.skor >= AMBANG_KONFIRMASI && (top.skor - kedua.skor) < AMBANG_AMBIGU) {
    return { metode: 'ambigu', id: null, nama: null, skor: top.skor, kandidat: top, saingan: kedua }
  }

  return { metode: 'mirip', id: null, nama: null, skor: top.skor, kandidat: top, saingan: null }
}

// ── Peta nama cabor: folder pengumpulan foto → cabor_nama_raw di database ────
// Diturunkan dari perbandingan 56 folder ZIP dengan 61 cabor di database.
const ALIAS_CABOR: Record<string, string> = {
  'BERKUDA': 'Equestrian',
  'HOKI': 'Hockey',
  'KEMPO': 'Shorinji Kempo',
  'PENTHATLON': 'Modern Pentathlon',
  'PENTATHLON': 'Modern Pentathlon',
  'DANSA': 'Dancesport',
  'E SPORTS INDONESIA': 'Esport',
  'ESPORTS INDONESIA': 'Esport',
  'E SPORTS': 'Esport',
  'BILIARD': 'Biliar',
  'BOWLING': 'Boling',
}

/** Nama folder struktural — BUKAN nama cabor. Wajib ditolak lebih dulu.
 *  Tanpa ini "ATLET" akan tercocokkan ke cabor "Atletik", sehingga seluruh
 *  foto satu cabor bisa salah masuk tanpa peringatan apa pun. */
const FOLDER_STRUKTURAL = new Set([
  'ATLET', 'ATLIT', 'PELATIH', 'OFFICIAL', 'PELATIH DAN OFFICIAL',
  'PELATIH OFFICIAL', 'MEKANIK', 'MANAGER', 'MANAJER', 'CONTOH',
  'PENGUMPULAN FOTO', 'FOTO', 'DOKUMEN',
])

export function apakahFolderStruktural(namaFolder: string): boolean {
  return FOLDER_STRUKTURAL.has(norm(namaFolder))
}

/**
 * Terjemahkan nama folder cabor ke nama cabor di database.
 * `caborDb` adalah daftar cabor_nama_raw yang benar-benar ada.
 *
 * Sengaja HANYA menerima kecocokan persis atau lewat peta alias. Pencocokan
 * longgar (awalan) dibuang karena menghasilkan salah tebak berbahaya seperti
 * ATLET→Atletik, sementara seluruh 56 nama folder nyata sudah tercakup oleh
 * kecocokan persis + alias.
 */
export function caborDariFolder(namaFolder: string, caborDb: string[]): string | null {
  const n = norm(namaFolder)
  if (!n || apakahFolderStruktural(n)) return null
  const target = ALIAS_CABOR[n] ?? n
  return caborDb.find(c => norm(c) === norm(target)) ?? null
}

/**
 * Cari cabor dari sebuah jalur berkas, apa pun tingkat folder yang dipilih
 * operator. Menelusuri tiap segmen (kecuali nama berkas) dan mengambil yang
 * pertama dikenali sebagai cabor.
 *
 * Menangani keduanya:
 *   PENGUMPULAN FOTO/AEROMODELLING/ATLET/x.png   (folder induk dipilih)
 *   AEROMODELLING/ATLET/x.png                     (satu folder cabor dipilih)
 *   AKUATIK/OWS/ATLET/x.jpg                       (cabor bercabang)
 */
export function caborDariJalur(jalur: string, caborDb: string[]): string | null {
  const segmen = String(jalur ?? '').split('/').slice(0, -1)
  for (const s of segmen) {
    const c = caborDariFolder(s, caborDb)
    if (c) return c
  }
  return null
}
