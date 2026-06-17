import type { Atlet, JarvisIssue } from '../types'

const VERIFIED_STATUSES = ['Verified', 'Approved Cabor']

export function detectCaborNull(atlet: Atlet): JarvisIssue[] {
  if (!atlet.status_verifikasi || !VERIFIED_STATUSES.includes(atlet.status_verifikasi)) return []
  if (atlet.cabor_id) return []
  return [{
    issue_type: 'cabor_null',
    severity: 'warning',
    source_record_id: atlet.id,
    title: `Cabor belum di-assign: ${atlet.nama_lengkap}`,
    description: `Status ${atlet.status_verifikasi} tapi cabor_id masih NULL`,
    suggested_action: 'Assign cabor_id sesuai cabang olahraga atlet',
    raw_data: { atlet_id: atlet.id, status: atlet.status_verifikasi },
  }]
}
