import type { Atlet, JarvisIssue } from '../types'

const VERIFIED_STATUSES = ['Verified', 'Approved Cabor']

export function detectCaborNull(atlet: Atlet): JarvisIssue[] {
  if (!atlet.status_verifikasi || !VERIFIED_STATUSES.includes(atlet.status_verifikasi)) return []
  if (atlet.cabor_id) return []
  // cabor_nama_raw terisi tapi cabor_id belum — data tidak sinkron antar field
  if (atlet.cabor_nama_raw?.trim()) {
    return [{
      issue_type: 'cabor_null',
      severity: 'warning',
      source_record_id: atlet.id,
      title: `Cabor belum di-assign (FK): ${atlet.nama_lengkap}`,
      description: `cabor_nama_raw="${atlet.cabor_nama_raw}" tapi cabor_id masih NULL — perlu sinkronisasi ke cabang_olahraga`,
      suggested_action: 'Cari id di tabel cabang_olahraga berdasarkan cabor_nama_raw lalu set cabor_id',
      raw_data: { atlet_id: atlet.id, cabor_nama_raw: atlet.cabor_nama_raw },
    }]
  }
  return [{
    issue_type: 'cabor_null',
    severity: 'warning',
    source_record_id: atlet.id,
    title: `Cabor belum di-assign: ${atlet.nama_lengkap}`,
    description: `Status ${atlet.status_verifikasi} tapi cabor_id masih NULL dan cabor_nama_raw kosong`,
    suggested_action: 'Assign cabor_id sesuai cabang olahraga atlet',
    raw_data: { atlet_id: atlet.id, status: atlet.status_verifikasi },
  }]
}
