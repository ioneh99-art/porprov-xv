// src/lib/lapor.ts
// Aturan laporan hasil lapangan — murni hitungan, tanpa database, supaya bisa diuji
// (npm run uji:lapor) dan dipakai sama persis oleh form HP maupun rute server.

export const HASIL = ['emas', 'perak', 'perunggu', 'peringkat', 'menang', 'kalah', 'lolos', 'gugur'] as const
export type Hasil = typeof HASIL[number]
export const STATUS = ['menunggu', 'disahkan', 'ditolak'] as const
export type Status = typeof STATUS[number]

export const LABEL_HASIL: Record<Hasil, string> = {
  emas: 'Emas', perak: 'Perak', perunggu: 'Perunggu',
  peringkat: 'Peringkat', lolos: 'Lolos babak berikutnya', gugur: 'Gugur',
  menang: 'Menang (pool)', kalah: 'Kalah – masih bertanding',
}

export const adalahMedali = (h: string) => h === 'emas' || h === 'perak' || h === 'perunggu'
/**
 * Hasil yang belum menutup nomornya: 'lolos' (ke babak berikutnya), serta 'menang'/'kalah'
 * di babak pool/penyisihan setengah kompetisi — kalah pun tim masih bertanding.
 */
export const BELUM_FINAL = ['lolos', 'menang', 'kalah']
export const adalahFinal = (h: string) => !BELUM_FINAL.includes(h)

// ── Kode lapor ───────────────────────────────────────────────────────────────
// Tanpa I, O, 0, 1 — huruf yang paling sering tertukar saat diketik ulang di HP.
export const ABJAD_KODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const PANJANG_KODE = 8

export function buatKode(acak: (n: number) => Uint8Array = n => crypto.getRandomValues(new Uint8Array(n))): string {
  // 256 habis dibagi 32, jadi modulo tidak membuat huruf tertentu lebih sering muncul.
  const b = acak(PANJANG_KODE)
  let s = ''
  for (let i = 0; i < PANJANG_KODE; i++) s += ABJAD_KODE[b[i] % ABJAD_KODE.length]
  return `${s.slice(0, 4)}-${s.slice(4)}`
}

/** Bentuk baku tanpa tanda hubung; '' bila bukan kode yang mungkin sah. */
export function bakukanKode(masukan: unknown): string {
  if (typeof masukan !== 'string') return ''
  const s = masukan.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (s.length !== PANJANG_KODE) return ''
  for (const c of s) if (!ABJAD_KODE.includes(c)) return ''
  return s
}

// ── Tanggal ──────────────────────────────────────────────────────────────────
// Server Vercel berjalan di UTC; laporan pukul 01.00 WIB harus tercatat di hari WIB-nya.
export function tanggalWIB(kini: Date = new Date()): string {
  return new Date(kini.getTime() + 7 * 3600_000).toISOString().slice(0, 10)
}

export const PORPROV_MULAI = '2026-11-07'
export const PORPROV_HARI = 14

/** Hari ke-1..14 PORPROV XV, atau null bila di luar rentang. */
export function hariPorprov(tanggal: string | null | undefined): number | null {
  if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return null
  const selisih = Math.round((Date.parse(tanggal + 'T00:00:00Z') - Date.parse(PORPROV_MULAI + 'T00:00:00Z')) / 86_400_000)
  return selisih >= 0 && selisih < PORPROV_HARI ? selisih + 1 : null
}

// ── Validasi isi laporan ─────────────────────────────────────────────────────
export interface IsiLaporan {
  nomor_id: number | null
  nomor_teks: string
  atlet_ids: number[]
  hasil: Hasil
  peringkat: number | null
  nilai_teks: string | null
  keterangan: string | null
  /** Lawan atau pesaing terdekat; untuk kolom Lawan di matriks KONI. */
  lawan: string | null
  /** Jam tanding HH:MM (WIB). Kosong = jurnal memakai jam laporan dikirim. */
  jam: string | null
}

const rapikan = (v: unknown, maks: number): string =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, maks) : ''

/** Jam HH:MM yang sah, null bila kosong, false bila bentuknya salah. "9:05" diterima dan dijadikan "09:05". */
export function periksaJam(v: unknown): string | null | false {
  if (v == null || v === '') return null
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(String(v).trim())
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return false
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

/** Mengembalikan isi yang sudah dirapikan, atau pesan galat untuk ditampilkan ke PIC. */
export function periksaLaporan(b: any): { isi: IsiLaporan } | { galat: string } {
  const nomor_teks = rapikan(b?.nomor_teks, 120)
  if (!nomor_teks) return { galat: 'Nomor pertandingan belum diisi.' }

  const mentah: unknown[] = Array.isArray(b?.atlet_ids) ? b.atlet_ids : []
  const atlet_ids = Array.from(new Set(mentah.map(Number).filter(n => Number.isInteger(n) && n > 0)))
  if (atlet_ids.length === 0) return { galat: 'Pilih minimal satu atlet.' }
  if (atlet_ids.length > 60) return { galat: 'Terlalu banyak atlet dalam satu laporan (maksimal 60).' }

  if (!HASIL.includes(b?.hasil)) return { galat: 'Pilih hasil pertandingannya.' }
  const hasil = b.hasil as Hasil

  let peringkat: number | null = null
  if (hasil === 'peringkat') {
    peringkat = Number(b?.peringkat)
    if (!Number.isInteger(peringkat) || peringkat < 4 || peringkat > 999)
      return { galat: 'Isi peringkatnya (4 ke atas). Peringkat 1–3 pakai tombol medali.' }
  }

  let nomor_id: number | null = null
  if (b?.nomor_id != null && b.nomor_id !== '') {
    nomor_id = Number(b.nomor_id)
    if (!Number.isInteger(nomor_id) || nomor_id <= 0) return { galat: 'Nomor pertandingan tidak dikenali.' }
  }

  const jam = periksaJam(b?.jam)
  if (jam === false) return { galat: 'Jam tanding tidak dikenali. Tulis seperti 14:30.' }

  return {
    isi: {
      nomor_id, nomor_teks, atlet_ids, hasil, peringkat,
      nilai_teks: rapikan(b?.nilai_teks, 80) || null,
      keterangan: rapikan(b?.keterangan, 300) || null,
      lawan: rapikan(b?.lawan, 120) || null,
      jam,
    },
  }
}

/**
 * Dua laporan dianggap kembar bila nomor, susunan atlet, dan tanggalnya sama.
 * Yang ditolak sebagai kembar hanya bila laporan sebelumnya sudah FINAL: atlet
 * yang 'lolos' pagi hari harus tetap bisa dilaporkan lagi saat finalnya sore.
 */
export function kunciKembar(l: { nomor_teks: string; atlet_ids: number[]; tanggal: string }): string {
  return [l.tanggal, l.nomor_teks.toLowerCase().replace(/\s+/g, ' ').trim(), [...l.atlet_ids].sort((a, b) => a - b).join(',')].join('|')
}

// ── Rekap ────────────────────────────────────────────────────────────────────
export interface Rekap { emas: number; perak: number; perunggu: number; total: number; laga: number }

/**
 * Satu laporan = satu nomor = paling banyak satu medali, berapa pun jumlah atlet di dalamnya.
 * `laga` hanya menghitung nomor yang sudah selesai; laporan 'lolos' belum dihitung
 * supaya penyisihan dan finalnya tidak terhitung dua kali.
 */
export function rekapMedali(laporan: { hasil: string; status: string }[]): Rekap {
  const r: Rekap = { emas: 0, perak: 0, perunggu: 0, total: 0, laga: 0 }
  for (const l of laporan) {
    if (l.status !== 'disahkan' || !adalahFinal(l.hasil)) continue
    r.laga++
    if (l.hasil === 'emas') r.emas++
    else if (l.hasil === 'perak') r.perak++
    else if (l.hasil === 'perunggu') r.perunggu++
  }
  r.total = r.emas + r.perak + r.perunggu
  return r
}

export function tulisHasil(l: { hasil: string; peringkat?: number | null }): string {
  if (l.hasil === 'peringkat') return `Peringkat ${l.peringkat ?? '?'}`
  return LABEL_HASIL[l.hasil as Hasil] ?? l.hasil
}

// ── Sambungan ke klasemen ────────────────────────────────────────────────────
export interface BarisKlasemen { nama: string; emas: number; perak: number; perunggu: number; total: number }

/**
 * Menimpa baris kontingen sendiri di klasemen dengan hitungan laporan lapangan,
 * lalu mengurutkan ulang. Tabel klasemen_medali sendiri TIDAK disentuh: tabel itu
 * memuat angka resmi 27 kontingen yang diisi lewat impor, dan punya pemicu lama
 * yang menghitung per baris atlet. Menulis ke sana berarti dua sumber saling timpa.
 *
 * Selama belum ada satu pun laporan disahkan, klasemen dikembalikan apa adanya.
 */
export function timpaKlasemen<T extends BarisKlasemen>(klasemen: T[], rekap: Rekap, namaKontingen: string): T[] {
  if (rekap.laga === 0) return klasemen
  const kunci = namaKontingen.trim().toUpperCase()
  const hasil = klasemen.map(k =>
    String(k.nama ?? '').trim().toUpperCase() === kunci
      ? { ...k, emas: rekap.emas, perak: rekap.perak, perunggu: rekap.perunggu, total: rekap.total }
      : k)
  return hasil.sort((a, b) => b.emas - a.emas || b.perak - a.perak || b.perunggu - a.perunggu)
}

// ── Target emas lawan kenyataan ──────────────────────────────────────────────
export interface TargetAtlet { atlet_id: number; nama: string; cabang: string; cabor_id: number | null }
export interface LaporanSah { atlet_ids: number[]; hasil: string; peringkat: number | null; nomor_teks: string }
export type StatusTarget = 'tercapai' | 'belum_emas' | 'belum_turun'
export interface CapaianTarget extends TargetAtlet { status: StatusTarget; terbaik: string | null; nomor: string | null }

const URUTAN_HASIL: Record<string, number> = { emas: 0, perak: 1, perunggu: 2, peringkat: 3, lolos: 4, menang: 5, kalah: 6, gugur: 7 }

/**
 * Tiap atlet bertarget emas dicocokkan dengan laporan yang sudah disahkan.
 * Atlet bisa turun di beberapa nomor, jadi "belum emas" hanya berarti belum ada
 * emas sejauh ini — bukan vonis gagal.
 */
export function capaianTarget(target: TargetAtlet[], laporan: LaporanSah[]): CapaianTarget[] {
  const terbaik = new Map<number, LaporanSah>()
  for (const l of laporan) {
    for (const id of l.atlet_ids) {
      const lama = terbaik.get(id)
      const a = URUTAN_HASIL[l.hasil] ?? 9, b = lama ? (URUTAN_HASIL[lama.hasil] ?? 9) : 99
      if (a < b || (a === b && l.hasil === 'peringkat' && (l.peringkat ?? 999) < (lama?.peringkat ?? 999))) terbaik.set(id, l)
    }
  }
  return target.map(t => {
    const l = terbaik.get(t.atlet_id)
    if (!l) return { ...t, status: 'belum_turun' as const, terbaik: null, nomor: null }
    return { ...t, status: l.hasil === 'emas' ? 'tercapai' as const : 'belum_emas' as const, terbaik: tulisHasil(l), nomor: l.nomor_teks }
  })
}

/**
 * Nama cabang di berkas analisis ("HOKI OUTDOOR") tidak sama dengan nama cabor
 * di sistem ("Hockey"). Peta dibuat dari data: cabor terbanyak di antara atlet
 * yang tertaut ke cabang itu. Tautan ke cabor lain dianggap meragukan.
 */
export function petaCabang(taut: { cabang: string; cabor_id: number | null }[]): Map<string, number> {
  const hitung = new Map<string, Map<number, number>>()
  for (const t of taut) {
    if (t.cabor_id == null) continue
    const m = hitung.get(t.cabang) ?? new Map<number, number>()
    m.set(t.cabor_id, (m.get(t.cabor_id) ?? 0) + 1)
    hitung.set(t.cabang, m)
  }
  const peta = new Map<string, number>()
  hitung.forEach((m, cabang) => {
    let juara = -1, terbanyak = 0
    m.forEach((n, id) => { if (n > terbanyak || (n === terbanyak && id < juara)) { juara = id; terbanyak = n } })
    peta.set(cabang, juara)
  })
  return peta
}

// ── Foto bukti ───────────────────────────────────────────────────────────────
export const BATAS_FOTO_BYTE = 3 * 1024 * 1024

/** Jenis gambar dibaca dari isi berkasnya, bukan dari nama atau tipe yang diaku peramban. */
export function jenisGambar(b: Uint8Array): { mime: string; ext: string } | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' }
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: 'image/png', ext: 'png' }
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
    && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { mime: 'image/webp', ext: 'webp' }
  return null
}

export const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/
/** Tanggal ISO yang benar-benar ada di kalender (menolak 2026-02-31). */
export function tanggalSah(t: unknown): t is string {
  if (typeof t !== 'string' || !POLA_TANGGAL.test(t)) return false
  const d = new Date(t + 'T00:00:00Z')
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === t
}

// ── Daftar nomor ─────────────────────────────────────────────────────────────
export interface NomorPilihan { id: number; nama: string; gender: string | null; sub: string | null }

/**
 * Tabel nomor_pertandingan memuat baris kembar (185 baris di 19 cabor: nama,
 * jenis kelamin, dan cabor sama persis, hasil impor ganda). Di form PIC cukup
 * satu yang tampil — yang id-nya paling kecil, supaya pilihannya tetap sama
 * dari waktu ke waktu.
 */
export function buangNomorKembar<T extends NomorPilihan>(nomor: T[]): T[] {
  const terpilih = new Map<string, T>()
  for (const n of nomor) {
    const kunci = [n.sub ?? '', n.gender ?? '', n.nama.toLowerCase().replace(/\s+/g, ' ').trim()].join('|')
    const lama = terpilih.get(kunci)
    if (!lama || n.id < lama.id) terpilih.set(kunci, n)
  }
  // Urutan asli dipertahankan.
  const boleh = new Set(Array.from(terpilih.values()).map(n => n.id))
  return nomor.filter(n => boleh.has(n.id))
}
