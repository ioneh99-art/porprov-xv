// src/lib/papan-kerja.ts
// Hitungan yang menggerakkan Papan Pekerjaan Data dan Papan Keberangkatan.
//
// Dipisah dari rute API supaya bisa diuji tanpa basis data. Yang perlu diuji
// bukan tampilannya, tapi dua hal yang kalau salah, salahnya tidak kelihatan:
// ambang "berapa hari lagi" dan pengelompokan rombongan per kota.

/** Berapa hari lagi dari hari ini, dihitung di zona waktu setempat.
 *
 *  Sengaja TIDAK memakai toISOString(): mesin ini berzona Asia/Jakarta, dan
 *  konversi ke UTC menggeser tanggal mundur sehari — cacat yang sudah dua kali
 *  muncul di proyek ini (tanggal lahir atlet, lalu tanggal kedua upacara). */
export function hariLagi(tanggal: string | null | undefined, hariIni = new Date()): number | null {
  if (!tanggal) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(tanggal)
  if (!m) return null
  const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const nol = new Date(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate())
  return Math.round((target.getTime() - nol.getTime()) / 86400000)
}

/** Ambang "mendesak" untuk papan pekerjaan: cabor yang bertanding dalam
 *  rentang ini DAN berkasnya belum lengkap didahulukan. Empat puluh lima hari
 *  dipilih karena pengurusan pasfoto sampai kartu identitas tercetak memakan
 *  waktu berminggu-minggu, bukan berhari-hari. */
export const AMBANG_MENDESAK_HARI = 45

export function apakahMendesak(tanggal: string | null | undefined, hariIni = new Date()): boolean {
  const h = hariLagi(tanggal, hariIni)
  return h !== null && h >= 0 && h <= AMBANG_MENDESAK_HARI
}

export interface BarisJadwalRombongan {
  cabor_nama_raw: string | null
  tuan_rumah: string | null
  akomodasi: string | null
  mulai: string | null
  selesai: string | null
}

export interface Rombongan {
  kota: string
  cabor: string[]
  mulai: string | null
  selesai: string | null
}

/**
 * Kelompokkan baris jadwal jadi rombongan per kota tujuan.
 *
 * Kota diambil dari kolom akomodasi bila ada, selebihnya dari kota tuan rumah —
 * sebab yang menentukan logistik adalah tempat menginap, bukan tempat
 * bertanding. Baris tanpa cabor (upacara, atau cabor yang bukan milik kita)
 * sengaja dibuang: rombongan dihitung dari atlet yang benar-benar berangkat.
 */
export function kelompokkanRombongan(baris: BarisJadwalRombongan[]): Rombongan[] {
  const peta = new Map<string, Rombongan>()
  for (const b of baris) {
    if (!b.cabor_nama_raw) continue
    const kota = (b.akomodasi || b.tuan_rumah || 'Belum ditentukan').trim()
    if (!peta.has(kota)) peta.set(kota, { kota, cabor: [], mulai: null, selesai: null })
    const e = peta.get(kota)!
    if (!e.cabor.includes(b.cabor_nama_raw)) e.cabor.push(b.cabor_nama_raw)
    if (b.mulai   && (!e.mulai   || b.mulai   < e.mulai))   e.mulai = b.mulai
    if (b.selesai && (!e.selesai || b.selesai > e.selesai)) e.selesai = b.selesai
  }
  return Array.from(peta.values())
    .sort((a, b) => (a.mulai ?? '9').localeCompare(b.mulai ?? '9'))
}

/**
 * Cabor yang punya atlet tapi namanya tidak dikenali di daftar rujukan
 * (jadwal atau klasifikasi).
 *
 * Penautan di aplikasi ini memakai cabor_nama_raw — teks bebas — karena
 * penomoran cabor berbeda antar tabel dan tidak bisa dijadikan sandaran.
 * Konsekuensinya: satu salah ketik memutus atlet dari jadwal dan kategorinya
 * tanpa peringatan apa pun. Fungsi ini yang membuat putusnya bersuara.
 */
export function caborTakDikenali(
  caborAtlet: (string | null)[], daftarRujukan: (string | null)[],
): string[] {
  const dikenal = new Set(daftarRujukan.filter(Boolean).map(c => c!.trim().toUpperCase()))
  const keluar = new Set<string>()
  for (const c of caborAtlet) {
    const n = (c ?? '').trim()
    if (!n) continue
    if (!dikenal.has(n.toUpperCase())) keluar.add(n)
  }
  return Array.from(keluar).sort()
}
