import type { Atlet, JarvisIssue } from '../types'

export function validateNIK(atlet: Atlet): JarvisIssue[] {
  const issues: JarvisIssue[] = []

  if (!atlet.no_ktp) {
    issues.push({
      issue_type: 'nik_format',
      severity: 'warning',
      source_record_id: atlet.id,
      title: `NIK kosong: ${atlet.nama_lengkap}`,
      description: 'Atlet tidak memiliki NIK terdaftar',
      suggested_action: 'Tambahkan NIK 16 digit yang valid',
      raw_data: { atlet_id: atlet.id, nik: null },
    })
    return issues
  }

  const nik = String(atlet.no_ktp).replace(/\D/g, '')

  if (nik.length !== 16) {
    issues.push({
      issue_type: 'nik_format',
      severity: 'critical',
      source_record_id: atlet.id,
      title: `NIK invalid: ${atlet.nama_lengkap}`,
      description: `NIK panjang ${nik.length} digit, seharusnya 16 digit`,
      suggested_action: 'Verifikasi NIK dari KTP atau dokumen resmi',
      raw_data: { atlet_id: atlet.id, nik: atlet.no_ktp, length: nik.length },
    })
    return issues
  }

  // Parse tanggal dari NIK: PPKKCC-DDMMYY-NNNN
  const ddRaw = parseInt(nik.substring(6, 8))
  const mm    = parseInt(nik.substring(8, 10))
  const yy    = parseInt(nik.substring(10, 12))
  const isWoman = ddRaw > 40
  const dd = isWoman ? ddRaw - 40 : ddRaw

  if (dd < 1 || dd > 31 || mm < 1 || mm > 12) {
    issues.push({
      issue_type: 'nik_format',
      severity: 'critical',
      source_record_id: atlet.id,
      title: `NIK tgl lahir invalid: ${atlet.nama_lengkap}`,
      description: `NIK menunjukkan tgl ${dd}/${mm}/${yy} (tidak valid)`,
      suggested_action: 'Verifikasi ulang NIK dari KTP',
      raw_data: { atlet_id: atlet.id, nik: atlet.no_ktp, parsed: { dd, mm, yy } },
    })
    return issues
  }

  // Cross-check dengan field tgl_lahir
  if (atlet.tgl_lahir) {
    const d = new Date(atlet.tgl_lahir)
    const tDD = d.getDate()
    const tMM = d.getMonth() + 1
    const tYY = d.getFullYear() % 100
    if (tDD !== dd || tMM !== mm || tYY !== yy) {
      issues.push({
        issue_type: 'nik_birthdate_mismatch',
        severity: 'warning',
        source_record_id: atlet.id,
        title: `NIK vs tgl lahir mismatch: ${atlet.nama_lengkap}`,
        description: `NIK → ${dd}/${mm}/${yy}, data tgl lahir → ${tDD}/${tMM}/${tYY}`,
        suggested_action: 'Verifikasi sumber: KTP atau akta kelahiran',
        raw_data: { atlet_id: atlet.id, nik: atlet.no_ktp, nik_date: `${dd}/${mm}/${yy}`, data_date: `${tDD}/${tMM}/${tYY}` },
      })
    }
  }

  // Cross-check gender
  if (atlet.gender) {
    const nikGender = isWoman ? 'P' : 'L'
    if (atlet.gender !== nikGender) {
      issues.push({
        issue_type: 'nik_gender_mismatch',
        severity: 'critical',
        source_record_id: atlet.id,
        title: `NIK vs gender mismatch: ${atlet.nama_lengkap}`,
        description: `NIK menunjukkan ${nikGender}, data gender ${atlet.gender}`,
        suggested_action: 'Verifikasi data gender atau NIK',
        raw_data: { atlet_id: atlet.id, nik: atlet.no_ktp, nik_gender: nikGender, data_gender: atlet.gender },
      })
    }
  }

  return issues
}
