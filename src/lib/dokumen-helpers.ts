// src/lib/dokumen-helpers.ts
// Helper functions untuk modul Dokumen Atlet

export interface JenisDokumen {
  id: number
  kode: string
  nama: string
  deskripsi?: string
  is_mandatory: boolean
  has_expiry: boolean
  expiry_months?: number | null
  urutan: number
  icon: string
}

export type DokumenStatus = 'pending' | 'uploaded' | 'verified' | 'rejected' | 'expired'

export interface AtletDokumen {
  id: number
  atlet_id: number
  jenis_id: number
  file_url?: string | null
  file_size?: number | null
  mime_type?: string | null
  nomor_dokumen?: string | null
  tanggal_terbit?: string | null
  tanggal_expired?: string | null
  status: DokumenStatus
  catatan?: string | null
  uploaded_at?: string | null
  verified_at?: string | null
  // Joined fields
  jenis?: JenisDokumen
}

export interface ComplianceStats {
  atlet_id: number
  nama_lengkap: string
  kontingen_id: number
  cabor_nama_raw: string
  status_registrasi: string
  total_mandatory: number
  total_uploaded: number
  total_verified: number
  total_pending: number
  total_rejected: number
  total_expired: number
  compliance_pct: number
  compliance_status: 'complete' | 'pending_review' | 'partial' | 'empty' | 'unknown'
}

export interface DokumenStats {
  jenis_id: number
  kode: string
  nama: string
  is_mandatory: boolean
  has_expiry: boolean
  icon: string
  urutan: number
  total_atlet: number
  verified: number
  uploaded: number
  rejected: number
  expired: number
  submitted_total: number
}

// ── Status configuration ────────────────────────
export const STATUS_CFG: Record<DokumenStatus, {
  color: string; bg: string; text: string; label: string; icon: string
}> = {
  pending:  { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', text: 'Belum Upload',      label: 'Pending',  icon: 'Clock' },
  uploaded: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  text: 'Menunggu Review',   label: 'Pending Review',   icon: 'FileCheck' },
  verified: { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  text: 'Diverifikasi',      label: 'Valid',    icon: 'CheckCircle' },
  rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   text: 'Ditolak',           label: 'Ditolak',  icon: 'XCircle' },
  expired:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  text: 'Sudah Kadaluarsa',  label: 'Expired',  icon: 'AlertTriangle' },
}

export const COMPLIANCE_CFG: Record<string, { color: string; bg: string; label: string }> = {
  complete:       { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: '✅ Lengkap'      },
  pending_review: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: '⏳ Review'        },
  partial:        { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: '⚠ Sebagian'      },
  empty:          { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  label: '❌ Kosong'        },
  unknown:        { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: '? Tidak Diketahui' },
}

// ── Compute compliance score per atlet ─────────
export function computeComplianceScore(
  atletId: number,
  dokumens: AtletDokumen[],
  totalMandatory: number,
): {
  pct: number
  status: ComplianceStats['compliance_status']
  verified: number
  uploaded: number
  total_verified: number
  total_pending: number
  total_rejected: number
} {
  const atletDocs = dokumens.filter(d => d.atlet_id === atletId)
  const verified  = atletDocs.filter(d => d.status === 'verified').length
  const uploaded  = atletDocs.filter(d => d.status === 'uploaded' || d.status === 'verified').length
  const rejected  = atletDocs.filter(d => d.status === 'rejected').length
  const pending   = uploaded - verified

  const pct = totalMandatory > 0
    ? Math.round((verified / totalMandatory) * 100)
    : 0

  let status: ComplianceStats['compliance_status'] = 'empty'
  if (totalMandatory === 0) status = 'unknown'
  else if (verified >= totalMandatory) status = 'complete'
  else if (uploaded >= totalMandatory) status = 'pending_review'
  else if (uploaded > 0) status = 'partial'

  return {
    pct, status, verified, uploaded,
    total_verified: verified,
    total_pending:  pending,
    total_rejected: rejected,
  }
}

// ── Check expiry status ──────────────────────────
export function checkExpiry(tanggalExpired: string | null | undefined): {
  isExpired: boolean
  isExpiringSoon: boolean   // < 30 days
  daysRemaining: number | null
} {
  if (!tanggalExpired) {
    return { isExpired: false, isExpiringSoon: false, daysRemaining: null }
  }
  
  const expiry = new Date(tanggalExpired)
  const now = new Date()
  const diffMs = expiry.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
  return {
    isExpired: diffDays < 0,
    isExpiringSoon: diffDays >= 0 && diffDays < 30,
    daysRemaining: diffDays,
  }
}

// ── Format file size ──────────────────────────
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/(1024*1024)).toFixed(1)} MB`
}

// ── Format relative time ─────────────────────
export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`
  if (diffHr < 24) return `${diffHr} jam lalu`
  if (diffDay < 7) return `${diffDay} hari lalu`
  if (diffDay < 30) return `${Math.floor(diffDay/7)} minggu lalu`
  if (diffDay < 365) return `${Math.floor(diffDay/30)} bulan lalu`
  return `${Math.floor(diffDay/365)} tahun lalu`
}

// ─────────────────────────────────────────────────────────────────────────────
// ── V2 ADDITIONS — Classification taxonomy 5-tier + helpers
// ─────────────────────────────────────────────────────────────────────────────

export type AtletComplianceStatus =
  | 'critical'    // 0 verified, OR ada rejected, OR ada expired
  | 'incomplete'  // missing ≥1 mandatory, no rejected
  | 'in_review'   // semua mandatory uploaded, semua pending verification
  | 'expiring'    // semua verified, TAPI ada ≥1 dokumen <30 hari mau expired
  | 'compliant'   // semua verified, no expiry concern

export interface AtletComplianceClassification {
  status:        AtletComplianceStatus
  urgencyScore:  number
  verified:      number
  pendingReview: number
  rejected:      number
  expired:       number
  expiringSoon:  number
  empty:         number
}

export function classifyAtletCompliance(args: {
  atletId:   number
  dokumens:  AtletDokumen[]
  jenisList: JenisDokumen[]
  now?:      Date
}): AtletComplianceClassification {
  const { atletId, dokumens, jenisList, now = new Date() } = args
  const mandatoryJenis = jenisList.filter(j => j.is_mandatory)
  const totalMandatory = mandatoryJenis.length
  const atletDocs      = dokumens.filter(d => d.atlet_id === atletId)

  let verified = 0, pendingReview = 0, rejected = 0, expired = 0, expiringSoon = 0

  for (const jenis of mandatoryJenis) {
    const doc = atletDocs.find(d => d.jenis_id === jenis.id)
    if (!doc) continue

    if (doc.status === 'verified') {
      verified++
      if (doc.tanggal_expired) {
        const days = Math.ceil((new Date(doc.tanggal_expired).getTime() - now.getTime()) / 86400000)
        if (days < 0)       expired++
        else if (days < 30) expiringSoon++
      }
    } else if (doc.status === 'uploaded') {
      pendingReview++
    } else if (doc.status === 'rejected') {
      rejected++
    }
  }

  const empty = totalMandatory - verified - pendingReview - rejected

  let status: AtletComplianceStatus
  if (verified === 0 || rejected > 0 || expired > 0)                           status = 'critical'
  else if (verified === totalMandatory && expiringSoon > 0)                     status = 'expiring'
  else if (verified === totalMandatory)                                         status = 'compliant'
  else if (verified + pendingReview === totalMandatory)                         status = 'in_review'
  else                                                                          status = 'incomplete'

  let urgencyScore = 0
  if (status === 'critical')        urgencyScore = 1000 + rejected * 100 + expired * 80 + empty * 5
  else if (status === 'expiring')   urgencyScore = 700  + expiringSoon * 50
  else if (status === 'in_review')  urgencyScore = 500  + pendingReview * 5
  else if (status === 'incomplete') urgencyScore = 300  + empty * 20
  else                              urgencyScore = 50

  return {
    status, urgencyScore: Math.round(urgencyScore),
    verified, pendingReview, rejected, expired, expiringSoon, empty,
  }
}

export function countByAtletStatus(items: { status: AtletComplianceStatus }[]) {
  return items.reduce(
    (acc, c) => { acc[c.status]++; return acc },
    { critical: 0, incomplete: 0, in_review: 0, expiring: 0, compliant: 0 } as Record<AtletComplianceStatus, number>
  )
}

export type DocCellState =
  | 'verified'  | 'in_review' | 'rejected'
  | 'expiring'  | 'expired'   | 'empty'

export function getDocCellState(
  jenis: { id: number },
  atletDocs: AtletDokumen[],
  now: Date = new Date(),
): DocCellState {
  const doc = atletDocs.find(d => d.jenis_id === jenis.id)
  if (!doc)                      return 'empty'
  if (doc.status === 'rejected') return 'rejected'
  if (doc.status === 'uploaded') return 'in_review'
  if (doc.status === 'verified') {
    if (doc.tanggal_expired) {
      const days = Math.ceil((new Date(doc.tanggal_expired).getTime() - now.getTime()) / 86400000)
      if (days < 0)       return 'expired'
      if (days < 30)      return 'expiring'
    }
    return 'verified'
  }
  return 'empty'
}
