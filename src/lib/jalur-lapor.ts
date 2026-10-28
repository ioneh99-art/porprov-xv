// src/lib/jalur-lapor.ts
// Dua jalur mengisi hasil cabor:
//   'pic'    — PIC cabor masuk dengan kode lapor dari WhatsApp.
//   'konida' — tim KONIDA yang sedang login di dashboard membuka formulir cabor
//              mana pun tanpa kode (dipakai bila PIC belum ada / belum aktif).
// Keduanya memakai formulir dan pemeriksaan yang sama, dan hasilnya sama-sama
// masuk Antrean menunggu disahkan. Berkas ini hanya berisi aturan murni (tanpa I/O).

export type Jalur = 'pic' | 'konida'

/** Batas umur sesi jalur KONIDA: tidak pernah lebih lama dari sesi dashboard-nya. */
export const UMUR_SESI_KONIDA_MS = 12 * 60 * 60 * 1000

const adminPusat = (s: any) =>
  ['superadmin', 'koni_jabar'].includes(s?.role) || ['superadmin', 'koni_jabar'].includes(s?.level)

/** Sesi dashboard ini boleh mengisi hasil untuk kontingen itu? (KONIDA kontingennya sendiri, atau admin pusat.) */
export function adminUntukKontingen(sesi: any, kontingenId: number): boolean {
  if (!sesi) return false
  if (adminPusat(sesi)) return true
  return sesi.role === 'konida' && sesi.kontingen_id != null && Number(sesi.kontingen_id) === kontingenId
}

/** Nama yang tercatat sebagai pelapor untuk isian jalur KONIDA — diambil dari sesi dashboard saat itu. */
export function namaPelaporKonida(sesi: any): string {
  const nama = String(sesi?.nama || sesi?.username || 'admin').replace(/\s+/g, ' ').trim().slice(0, 60)
  return `KONIDA · ${nama}`
}

/** Kapan sesi jalur KONIDA berakhir: paling lama 12 jam, dan tidak melewati sesi dashboard. */
export function akhirSesiKonida(kini: number, expDashboard: unknown): number {
  const batas = kini + UMUR_SESI_KONIDA_MS
  return typeof expDashboard === 'number' && expDashboard > kini ? Math.min(batas, expDashboard) : batas
}

export interface AksesRingkas { cabor_id: number; aktif: boolean; terakhir_dipakai: string | null; nama_pic: string; jumlah_laporan?: number }
export type KeadaanPic = 'aktif' | 'belum_dipakai' | 'tidak_ada'

/**
 * Keadaan PIC sebuah cabor, untuk daftar "Input Langsung":
 *   aktif         — ada kode aktif yang sudah pernah dipakai masuk
 *   belum_dipakai — ada kode aktif, tapi belum pernah dipakai (PIC belum konfirmasi)
 *   tidak_ada     — tidak ada kode aktif sama sekali
 */
export function keadaanPic(akses: AksesRingkas[], caborId: number): { keadaan: KeadaanPic; nama: string[] } {
  const milik = akses.filter(a => a.cabor_id === caborId && a.aktif)
  const dipakai = milik.filter(a => a.terakhir_dipakai)
  if (dipakai.length) return { keadaan: 'aktif', nama: dipakai.map(a => a.nama_pic) }
  if (milik.length) return { keadaan: 'belum_dipakai', nama: milik.map(a => a.nama_pic) }
  return { keadaan: 'tidak_ada', nama: [] }
}

const URUT_KEADAAN: Record<KeadaanPic, number> = { tidak_ada: 0, belum_dipakai: 1, aktif: 2 }
/** Cabor yang paling butuh diisi tim KONIDA di atas: tanpa PIC, lalu PIC belum aktif, lalu sisanya; per kelompok urut nama. */
export function urutCaborLangsung<T extends { id: number; nama: string }>(cabor: T[], akses: AksesRingkas[]): (T & { pic: ReturnType<typeof keadaanPic> })[] {
  return cabor
    .map(c => ({ ...c, pic: keadaanPic(akses, c.id) }))
    .sort((a, b) => URUT_KEADAAN[a.pic.keadaan] - URUT_KEADAAN[b.pic.keadaan] || a.nama.localeCompare(b.nama, 'id'))
}
