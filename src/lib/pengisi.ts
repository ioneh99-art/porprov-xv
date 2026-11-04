// src/lib/pengisi.ts
// Siapa yang benar-benar mengisi laporan PIC. Satu kode/tautan PIC bisa dipinjam
// orang lain di lapangan, jadi tiap kiriman wajib menyebut nama & jabatan pengisi
// (keputusan KONI Kab. Bandung, 2 Nov 2026). Pemilik kode tetap tercatat terpisah.

export const JABATAN_PENGISI = [
  'PIC Cabor', 'Pelatih', 'Asisten Pelatih', 'Manajer Tim', 'Official', 'Pengurus Cabor', 'Atlet', 'Lainnya',
] as const

export interface Pengisi { nama: string; jabatan: string }

const rapi = (s: unknown, maks: number) => typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, maks) : ''

/**
 * Baca & periksa pengisi dari kiriman (badan JSON atau parameter alamat).
 * Jabatan "Lainnya" wajib disertai tulisan jabatannya sendiri.
 */
export function periksaPengisi(m: any): { pengisi: Pengisi } | { galat: string } {
  const nama = rapi(m?.pengisi_nama, 80)
  if (nama.length < 3) return { galat: 'Tulis nama Anda (yang mengisi laporan ini) di bagian "Siapa yang mengisi?".' }
  const pilih = rapi(m?.pengisi_jabatan, 40)
  if (!pilih) return { galat: 'Pilih jabatan Anda di bagian "Siapa yang mengisi?".' }
  if (!(JABATAN_PENGISI as readonly string[]).includes(pilih)) return { galat: 'Jabatan tidak dikenali.' }
  if (pilih === 'Lainnya') {
    const lain = rapi(m?.pengisi_jabatan_lain, 40)
    if (lain.length < 2) return { galat: 'Tulis jabatan Anda (pilihan "Lainnya").' }
    return { pengisi: { nama, jabatan: lain } }
  }
  return { pengisi: { nama, jabatan: pilih } }
}

/** "Nama (Jabatan)" — untuk kolom teks seperti jadwal_partai.dibuat_oleh. */
export const tulisPengisi = (p: Pengisi) => `${p.nama} (${p.jabatan})`

/** Teks tampilan di KONIDA: "Diisi Budi (Pelatih) · kode PIC Asep". Laporan lama tanpa pengisi → nama pemilik kode saja. */
export function teksPengisi(l: { pengisi_nama?: string | null; pengisi_jabatan?: string | null; pelapor_nama: string }): string {
  if (!l.pengisi_nama) return l.pelapor_nama
  const isi = `${l.pengisi_nama.trim()}${l.pengisi_jabatan ? ` (${l.pengisi_jabatan})` : ''}`
  return l.pengisi_nama.trim().toLowerCase() === l.pelapor_nama.trim().toLowerCase() ? isi : `${isi} · kode PIC ${l.pelapor_nama}`
}

/** "AKUATIK - POLO AIR" → "Polo Air", "DAYUNG CANOEING" → "Canoeing", "HOCKEY INDOOR" → "Hockey Indoor". */
export function judulDisiplin(d: string): string {
  const buang = d.replace(/^(AKUATIK|DAYUNG|BALAP MOTOR|BALAP SEPEDA)\s*-?\s*/i, '').trim()
  return (buang || d).toLowerCase().replace(/\b\w/g, x => x.toUpperCase())
}
