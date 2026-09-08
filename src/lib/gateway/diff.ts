// src/lib/gateway/diff.ts
// Menghitung apa yang BERUBAH sebelum data ditulis.
//
// Alasan keberadaan berkas ini: sebelumnya pratinjau impor hanya memberitahu
// "nama ini cocok ke atlet ini", tanpa memperlihatkan bahwa alamat atau tanggal
// lahir yang sudah benar akan tertimpa. Operator menyetujui tanpa tahu apa yang
// akan hilang. Modul ini menutup lubang itu.
//
// Dipakai DUA tempat dengan aturan yang sama persis — pratinjau dan penyimpanan —
// supaya yang dilihat operator benar-benar yang akan terjadi.

import { TEMPLATES, type JenisTemplate, type KolomTemplate } from './templates'

export const KOSONGKAN = '-'

export type JenisUbah = 'tambah' | 'ubah' | 'kosongkan' | 'sama'

export interface Perubahan {
  kolom: string
  header: string
  lama: any
  baru: any
  jenis: JenisUbah
}

export interface RingkasUbah {
  tambah: number      // kolom tadinya kosong, sekarang terisi
  ubah: number        // kolom sudah berisi, isinya DITIMPA — ini yang berisiko
  kosongkan: number   // sengaja dikosongkan lewat tanda "-"
  sama: number        // tidak ada bedanya
}

/** Kolom tabel `atlet` yang boleh disentuh template identitas. */
export const KOLOM_ATLET = [
  'tempat_lahir', 'tgl_lahir', 'gender', 'telepon', 'email',
  'alamat', 'kecamatan', 'nama_bank', 'no_rekening',
] as const

/** Kolom tabel `atlet_perlengkapan` yang boleh disentuh template perlengkapan. */
export const KOLOM_PERLENGKAPAN = [
  'ukuran_kemeja', 'ukuran_jaket', 'ukuran_kaos', 'ukuran_celana',
  'ukuran_sepatu', 'ukuran_topi', 'ukuran_training_set', 'catatan',
] as const

/** Kolom `atlet_tes_fisik` yang dibandingkan bila baris tahap itu sudah ada. */
export const KOLOM_BIOMOTORIK = [
  'tanggal_tes', 'lembaga_penguji', 'lokasi_tes', 'status_tes',
  'berat_badan', 'tinggi_badan', 'kesimpulan_persen', 'kesimpulan_kategori',
  'penanggung_jawab',
] as const

export function kolomTerpakai(jenis: JenisTemplate): readonly string[] {
  if (jenis === 'identitas') return KOLOM_ATLET
  if (jenis === 'perlengkapan') return KOLOM_PERLENGKAPAN
  return KOLOM_BIOMOTORIK
}

/** Samakan bentuk sebelum dibandingkan — supaya "30" dan 30, atau spasi
 *  di ujung, tidak dianggap perubahan padahal isinya sama. */
function samakan(v: any): string | null {
  if (v == null) return null
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const s = String(v).trim()
  if (s === '') return null
  // tanggal ISO dengan jam → ambil tanggalnya saja
  const m = s.match(/^(\d{4}-\d{2}-\d{2})T/)
  if (m) return m[1]
  const n = Number(s)
  return Number.isFinite(n) && s !== '' ? String(n) : s
}

/**
 * Bandingkan nilai baru dari berkas dengan nilai yang sekarang ada di database.
 *
 * Aturan (sama dengan yang dipakai saat menyimpan):
 *   sel KOSONG   → kolom tidak disentuh sama sekali, tidak muncul di daftar
 *   tanda "-"    → kolom dikosongkan
 *   selain itu   → ditulis
 */
export function hitungPerubahan(
  jenis: JenisTemplate,
  nilaiBaru: Record<string, any>,
  nilaiLama: Record<string, any> | null,
): Perubahan[] {
  const def = TEMPLATES[jenis]
  const petaKolom = new Map<string, KolomTemplate>(def.kolom.map(k => [k.key, k]))
  const hasil: Perubahan[] = []

  for (const kolom of kolomTerpakai(jenis)) {
    const baruMentah = nilaiBaru?.[kolom]
    if (baruMentah == null || baruMentah === '') continue      // sel kosong → jangan sentuh

    const kosongkan = typeof baruMentah === 'string' && baruMentah.trim() === KOSONGKAN
    const lama = samakan(nilaiLama?.[kolom])
    const baru = kosongkan ? null : samakan(baruMentah)

    let jenisUbah: JenisUbah
    if (kosongkan)            jenisUbah = lama == null ? 'sama' : 'kosongkan'
    else if (lama == null)    jenisUbah = 'tambah'
    else if (lama === baru)   jenisUbah = 'sama'
    else                      jenisUbah = 'ubah'

    hasil.push({
      kolom,
      header: petaKolom.get(kolom)?.header ?? kolom,
      lama: nilaiLama?.[kolom] ?? null,
      baru: kosongkan ? null : baruMentah,
      jenis: jenisUbah,
    })
  }
  return hasil
}

export function ringkasPerubahan(semua: Perubahan[][]): RingkasUbah {
  const r: RingkasUbah = { tambah: 0, ubah: 0, kosongkan: 0, sama: 0 }
  semua.forEach(baris => baris.forEach(p => { r[p.jenis]++ }))
  return r
}

/** Nilai siap tulis untuk satu baris — HANYA kolom yang benar-benar berubah.
 *  Kolom bernilai sama tidak ikut ditulis, supaya jejak audit tidak berisik
 *  dan `updated_at` tidak bergerak tanpa alasan. */
export function nilaiUntukDitulis(perubahan: Perubahan[]): Record<string, any> {
  const set: Record<string, any> = {}
  for (const p of perubahan) {
    if (p.jenis === 'sama') continue
    set[p.kolom] = p.jenis === 'kosongkan' ? null : p.baru
  }
  return set
}

/** Ringkasan sebelum/sesudah untuk disimpan ke jejak audit. */
export function untukAudit(perubahan: Perubahan[]): Record<string, { lama: any; baru: any }> {
  const j: Record<string, { lama: any; baru: any }> = {}
  for (const p of perubahan) {
    if (p.jenis === 'sama') continue
    j[p.kolom] = { lama: p.lama, baru: p.jenis === 'kosongkan' ? null : p.baru }
  }
  return j
}
