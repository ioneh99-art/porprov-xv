import type { Atlet, JarvisIssue } from '../types'

// Tanpa salah satu dari ini, barisnya gagal dipakai hampir di semua laporan.
const WAJIB: { field: keyof Atlet; label: string }[] = [
  { field: 'nama_lengkap', label: 'Nama Lengkap' },
  { field: 'kontingen_id', label: 'Kontingen'    },
  { field: 'gender',       label: 'Gender'        },
]

// Perlu, tapi tidak melumpuhkan — dipisah supaya tidak menenggelamkan yang kritis.
const PERLU: { field: keyof Atlet; label: string }[] = [
  { field: 'no_registrasi_koni', label: 'Nomor Registrasi KONI' },
]

export function validateRequiredFields(atlet: Atlet): JarvisIssue[] {
  const hasil: JarvisIssue[] = []
  const nama = atlet.nama_lengkap || `Atlet ID ${atlet.id}`

  const kosong = WAJIB.filter(({ field }) => !atlet[field]).map(({ label }) => label)
  if (kosong.length > 0) {
    hasil.push({
      issue_type: 'required_field',
      severity: 'critical',
      source_record_id: atlet.id,
      title: `Field wajib kosong: ${nama}`,
      description: `Missing: ${kosong.join(', ')}`,
      suggested_action: 'Lengkapi field wajib sebelum verifikasi',
      raw_data: { atlet_id: atlet.id, missing_fields: kosong },
    })
  }

  const belum = PERLU.filter(({ field }) => !atlet[field]).map(({ label }) => label)
  if (belum.length > 0) {
    hasil.push({
      issue_type: 'required_field',
      severity: 'warning',
      source_record_id: atlet.id,
      title: `Belum lengkap: ${nama}`,
      description: `Belum terisi: ${belum.join(', ')}`,
      suggested_action: 'Isi dari dokumen resmi KONI — dibutuhkan saat pencocokan daftar peserta',
      raw_data: { atlet_id: atlet.id, missing_fields: belum },
    })
  }

  return hasil
}
