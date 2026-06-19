export interface Atlet {
  id: number
  nama_lengkap: string
  no_ktp?: string | null
  tgl_lahir?: string | null
  gender?: 'L' | 'P' | null
  kontingen_id: number
  cabor_id?: number | null
  cabor_nama_raw?: string | null
  status_verifikasi?: string | null
  status_registrasi?: string | null
}

export interface JarvisIssue {
  id?: number
  issue_type: 'nik_format' | 'nik_birthdate_mismatch' | 'nik_gender_mismatch' | 'duplicate' | 'required_field' | 'cabor_null' | 'sync_mismatch'
  severity: 'critical' | 'warning' | 'info'
  source_page?: string
  source_table?: string
  source_record_id?: number | null
  related_record_ids?: number[]
  kontingen_id?: number
  title: string
  description: string
  suggested_action: string
  raw_data?: Record<string, unknown>
  status?: 'open' | 'in_progress' | 'resolved' | 'dismissed' | 'false_positive'
}

export interface JarvisSummary {
  total: number
  critical: number
  warning: number
  info: number
}
