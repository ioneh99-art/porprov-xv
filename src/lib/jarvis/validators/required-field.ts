import type { Atlet, JarvisIssue } from '../types'

const REQUIRED: { field: keyof Atlet; label: string }[] = [
  { field: 'nama_lengkap', label: 'Nama Lengkap' },
  { field: 'kontingen_id', label: 'Kontingen'    },
  { field: 'gender',       label: 'Gender'        },
]

export function validateRequiredFields(atlet: Atlet): JarvisIssue[] {
  const missing = REQUIRED.filter(({ field }) => !atlet[field]).map(({ label }) => label)
  if (missing.length === 0) return []
  return [{
    issue_type: 'required_field',
    severity: 'critical',
    source_record_id: atlet.id,
    title: `Field wajib kosong: ${atlet.nama_lengkap || `Atlet ID ${atlet.id}`}`,
    description: `Missing: ${missing.join(', ')}`,
    suggested_action: 'Lengkapi field wajib sebelum verifikasi',
    raw_data: { atlet_id: atlet.id, missing_fields: missing },
  }]
}
