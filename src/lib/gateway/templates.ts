// src/lib/gateway/templates.ts
// Definisi template Excel untuk Data Gateway + pembuat berkasnya.
//
// Lima aturan desain (disepakati 2026-09-08):
//  1. NIK jadi kolom kunci, bukan nama — nama untuk mata manusia, NIK untuk mesin.
//  2. Template bernomor versi, supaya template lama ditolak dengan pesan jelas.
//  3. Ada lembar PETUNJUK + satu baris contoh.
//  4. Tanpa dropdown Excel (rapuh saat berkas disalin) — validasi di sisi server.
//  5. Sel kosong berarti "jangan ubah", BUKAN "kosongkan".

import * as XLSX from 'xlsx'

export type JenisTemplate = 'identitas' | 'perlengkapan' | 'biomotorik'

export interface KolomTemplate {
  key: string
  header: string
  desc: string
  wajib: boolean
  contoh: string | number
  tipe: 'teks' | 'angka' | 'tanggal'
  pilihan?: string[]
}

export interface DefinisiTemplate {
  jenis: JenisTemplate
  versi: string
  judul: string
  sasaran: string
  kolom: KolomTemplate[]
  catatan: string[]
}

export const PENANDA_VERSI_SEL = 'B2'   // letak penanda versi di lembar PETUNJUK
export const LEMBAR_DATA = 'DATA'
export const LEMBAR_PETUNJUK = 'PETUNJUK'

const KOLOM_KUNCI: KolomTemplate[] = [
  { key: 'nik', header: 'NIK', desc: 'WAJIB. 16 digit. Kunci pencocokan utama — jangan dikosongkan.', wajib: true, contoh: '3204010101070001', tipe: 'teks' },
  { key: 'nama_lengkap', header: 'NAMA LENGKAP', desc: 'Untuk pemeriksaan mata manusia. Tidak dipakai mencocokkan bila NIK terisi.', wajib: false, contoh: 'Suci Lestari', tipe: 'teks' },
]

export const TEMPLATES: Record<JenisTemplate, DefinisiTemplate> = {
  identitas: {
    jenis: 'identitas',
    versi: 'v1',
    judul: 'Pembaruan Identitas Atlet',
    sasaran: 'atlet',
    kolom: [
      ...KOLOM_KUNCI,
      { key: 'tempat_lahir', header: 'TEMPAT LAHIR', desc: 'Kota/kabupaten kelahiran.', wajib: false, contoh: 'Bandung', tipe: 'teks' },
      { key: 'tgl_lahir', header: 'TANGGAL LAHIR', desc: 'Format YYYY-MM-DD, contoh 2007-02-06.', wajib: false, contoh: '2007-02-06', tipe: 'tanggal' },
      { key: 'gender', header: 'GENDER', desc: 'Isi L atau P saja.', wajib: false, contoh: 'P', tipe: 'teks', pilihan: ['L', 'P'] },
      { key: 'telepon', header: 'TELEPON', desc: 'Nomor HP aktif.', wajib: false, contoh: '081234567890', tipe: 'teks' },
      { key: 'email', header: 'EMAIL', desc: 'Surel aktif bila ada.', wajib: false, contoh: 'atlet@email.com', tipe: 'teks' },
      { key: 'alamat', header: 'ALAMAT', desc: 'Alamat sesuai KTP.', wajib: false, contoh: 'Jl. Raya Soreang No. 10', tipe: 'teks' },
      { key: 'kecamatan', header: 'KECAMATAN', desc: 'Kecamatan domisili.', wajib: false, contoh: 'Soreang', tipe: 'teks' },
      { key: 'nama_bank', header: 'NAMA BANK', desc: 'Untuk transfer bonus atlet.', wajib: false, contoh: 'BJB', tipe: 'teks' },
      { key: 'no_rekening', header: 'NO REKENING', desc: 'Nomor rekening atas nama atlet sendiri.', wajib: false, contoh: '0012345678', tipe: 'teks' },
    ],
    catatan: [
      'Kolom yang dibiarkan KOSONG tidak akan mengubah data yang sudah ada.',
      'Untuk mengosongkan sebuah data, tulis tanda minus: -',
      'NIK tidak dapat diubah lewat template ini. NIK dipakai untuk mencari atletnya.',
    ],
  },

  perlengkapan: {
    jenis: 'perlengkapan',
    versi: 'v1',
    judul: 'Pembaruan Perlengkapan Atlet',
    sasaran: 'atlet_perlengkapan',
    kolom: [
      ...KOLOM_KUNCI,
      { key: 'ukuran_kemeja', header: 'UKURAN KEMEJA', desc: 'Contoh: S, M, L, XL, XXL.', wajib: false, contoh: 'M', tipe: 'teks' },
      { key: 'ukuran_kaos', header: 'UKURAN KAOS', desc: 'Contoh: S, M, L, XL, XXL.', wajib: false, contoh: 'M', tipe: 'teks' },
      { key: 'ukuran_jaket', header: 'UKURAN JAKET', desc: 'Contoh: S, M, L, XL, XXL.', wajib: false, contoh: 'L', tipe: 'teks' },
      { key: 'ukuran_celana', header: 'UKURAN CELANA', desc: 'Contoh: 28, 30, 32 atau S/M/L.', wajib: false, contoh: '30', tipe: 'teks' },
      { key: 'ukuran_training_set', header: 'UKURAN TRAINING SET', desc: 'Contoh: S, M, L, XL.', wajib: false, contoh: 'M', tipe: 'teks' },
      { key: 'ukuran_sepatu', header: 'UKURAN SEPATU', desc: 'Ukuran Eropa, contoh 38, 42.', wajib: false, contoh: '38', tipe: 'teks' },
      { key: 'ukuran_topi', header: 'UKURAN TOPI', desc: 'Contoh: S, M, L atau all size.', wajib: false, contoh: 'M', tipe: 'teks' },
      { key: 'catatan', header: 'CATATAN', desc: 'Keterangan tambahan bila ada.', wajib: false, contoh: '', tipe: 'teks' },
    ],
    catatan: [
      'Kolom yang dibiarkan KOSONG tidak akan mengubah data yang sudah ada.',
      'Ukuran kemeja dan sepatu juga tersimpan di data atlet, dan ikut diperbarui.',
    ],
  },

  biomotorik: {
    jenis: 'biomotorik',
    versi: 'v1',
    judul: 'Hasil Tes Biomotorik Berkala',
    sasaran: 'atlet_tes_fisik',
    kolom: [
      ...KOLOM_KUNCI,
      { key: 'tanggal_tes', header: 'TANGGAL TES', desc: 'WAJIB. Format YYYY-MM-DD. Tanggal pelaksanaan tes.', wajib: true, contoh: '2026-10-15', tipe: 'tanggal' },
      { key: 'tahap', header: 'TAHAP', desc: 'WAJIB. Nomor periode tes. Tes April 2026 = tahap 3, berikutnya 4, lalu 5.', wajib: true, contoh: 4, tipe: 'angka' },
      { key: 'lembaga_penguji', header: 'LEMBAGA PENGUJI', desc: 'Contoh: UPI Sport Science.', wajib: false, contoh: 'UPI Sport Science', tipe: 'teks' },
      { key: 'lokasi_tes', header: 'LOKASI TES', desc: 'Tempat pelaksanaan tes.', wajib: false, contoh: 'GOR Si Jalak Harupat', tipe: 'teks' },
      { key: 'status_tes', header: 'STATUS TES', desc: 'Isi Hadir atau Tidak Hadir.', wajib: false, contoh: 'Hadir', tipe: 'teks', pilihan: ['Hadir', 'Tidak Hadir'] },
      { key: 'berat_badan', header: 'BERAT BADAN (KG)', desc: 'Angka, boleh desimal. Contoh 54.5', wajib: false, contoh: 54.5, tipe: 'angka' },
      { key: 'tinggi_badan', header: 'TINGGI BADAN (CM)', desc: 'Angka, boleh desimal. Contoh 162', wajib: false, contoh: 162, tipe: 'angka' },
      { key: 'kesimpulan_persen', header: 'SKOR KESIMPULAN (%)', desc: 'Angka 0-100. Skor akhir tes.', wajib: false, contoh: 72, tipe: 'angka' },
      { key: 'kesimpulan_kategori', header: 'KATEGORI', desc: 'Baik Sekali / Baik / Cukup / Kurang / Kurang Sekali.', wajib: false, contoh: 'Baik', tipe: 'teks', pilihan: ['Baik Sekali', 'Baik', 'Cukup', 'Kurang', 'Kurang Sekali'] },
      { key: 'penanggung_jawab', header: 'PENANGGUNG JAWAB', desc: 'Nama petugas yang bertanggung jawab atas data ini.', wajib: false, contoh: 'Dr. Andi', tipe: 'teks' },
    ],
    catatan: [
      'Tiap tes menjadi BARIS BARU — data tes sebelumnya tidak ditimpa.',
      'Naikkan nomor TAHAP untuk tiap periode tes. Tes April 2026 sudah memakai tahap 3.',
      'BMI dihitung otomatis dari berat dan tinggi badan, tidak perlu diisi.',
      'Satu atlet hanya boleh muncul sekali dalam satu berkas.',
    ],
  },
}

/** Hitung BMI dari berat (kg) & tinggi (cm). */
export function hitungBmi(beratKg: number | null, tinggiCm: number | null): number | null {
  if (!beratKg || !tinggiCm || tinggiCm <= 0) return null
  const m = tinggiCm / 100
  return Math.round((beratKg / (m * m)) * 10) / 10
}

/** Bangun berkas Excel template untuk satu jenis. */
export function buatTemplate(jenis: JenisTemplate): Buffer {
  const def = TEMPLATES[jenis]
  const wb = XLSX.utils.book_new()

  // ── Lembar PETUNJUK ──
  const petunjuk: (string | number)[][] = [
    ['TEMPLATE DATA GATEWAY — KONI KABUPATEN BANDUNG'],
    ['Versi template', `${def.jenis}:${def.versi}`],
    ['Keperluan', def.judul],
    [''],
    ['CARA PAKAI'],
    ['1. Isi data pada lembar DATA. Jangan mengubah baris judul kolom.'],
    ['2. HAPUS baris contoh (baris bertanda CONTOH) sebelum mengunggah.'],
    ['3. Simpan sebagai .xlsx, lalu unggah lewat menu Data Gateway.'],
    ['4. Sistem akan menampilkan pratinjau dulu. Tidak ada data tersimpan sebelum Anda menyetujui.'],
    [''],
    ['ATURAN PENTING'],
    ...def.catatan.map(c => [`• ${c}`]),
    [''],
    ['KETERANGAN KOLOM'],
    ['KOLOM', 'WAJIB', 'KETERANGAN', 'PILIHAN NILAI'],
    ...def.kolom.map(k => [k.header, k.wajib ? 'YA' : 'tidak', k.desc, k.pilihan ? k.pilihan.join(' / ') : '']),
  ]
  const wsP = XLSX.utils.aoa_to_sheet(petunjuk)
  wsP['!cols'] = [{ wch: 26 }, { wch: 10 }, { wch: 68 }, { wch: 34 }]
  XLSX.utils.book_append_sheet(wb, wsP, LEMBAR_PETUNJUK)

  // ── Lembar DATA ──
  const header = def.kolom.map(k => k.header)
  const contoh = def.kolom.map(k => k.contoh)
  const data = [header, contoh, Array(header.length).fill('')]
  const wsD = XLSX.utils.aoa_to_sheet(data)
  wsD['!cols'] = def.kolom.map(k => ({ wch: Math.max(14, Math.min(30, k.header.length + 6)) }))
  // tandai baris contoh lewat komentar sel pertama
  const selPertamaContoh = XLSX.utils.encode_cell({ r: 1, c: 0 })
  if (wsD[selPertamaContoh]) wsD[selPertamaContoh].c = [{ a: 'Sistem', t: 'CONTOH — hapus baris ini sebelum diunggah.' }]
  XLSX.utils.book_append_sheet(wb, wsD, LEMBAR_DATA)

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export function namaBerkasTemplate(jenis: JenisTemplate): string {
  const def = TEMPLATES[jenis]
  return `Template_${def.judul.replace(/\s+/g, '_')}_${def.versi}.xlsx`
}
