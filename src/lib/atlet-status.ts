// src/lib/atlet-status.ts
// State machine untuk status_registrasi atlet.
// Gunakan ini sebagai single source of truth untuk semua transisi status.

export type AtletStatus =
  | 'Draft'
  | 'Menunggu Cabor'
  | 'Menunggu Admin'
  | 'Ditolak Cabor'
  | 'Ditolak Admin'
  | 'Verified'
  | 'Posted'

export type VerifikasiAction =
  | 'submit'         // KONIDA submit ke operator cabor
  | 'approve_cabor'  // Operator cabor approve
  | 'reject_cabor'   // Operator cabor tolak
  | 'approve_admin'  // Admin KONI approve
  | 'reject_admin'   // Admin KONI tolak
  | 'posting'        // Admin KONI posting final
  | 'revisi'         // KONIDA revisi setelah ditolak

// Transisi yang valid: [status_saat_ini] → [action] → [status_baru]
const TRANSITIONS: Record<AtletStatus, Partial<Record<VerifikasiAction, AtletStatus>>> = {
  'Draft': {
    submit:         'Menunggu Cabor',
  },
  'Menunggu Cabor': {
    approve_cabor:  'Menunggu Admin',
    reject_cabor:   'Ditolak Cabor',
  },
  'Ditolak Cabor': {
    revisi:         'Menunggu Cabor',
  },
  'Menunggu Admin': {
    approve_admin:  'Verified',
    reject_admin:   'Ditolak Admin',
  },
  'Ditolak Admin': {
    revisi:         'Menunggu Cabor',
  },
  'Verified': {
    posting:        'Posted',
    reject_admin:   'Ditolak Admin',
  },
  'Posted': {
    // Posted adalah state final — tidak ada transisi keluar
  },
}

// Role mana yang boleh melakukan action tertentu
const ACTION_ROLES: Record<VerifikasiAction, string[]> = {
  submit:        ['konida'],
  approve_cabor: ['operator_cabor', 'admin', 'superadmin'],
  reject_cabor:  ['operator_cabor', 'admin', 'superadmin'],
  approve_admin: ['admin', 'koni_jabar', 'superadmin'],
  reject_admin:  ['admin', 'koni_jabar', 'superadmin'],
  posting:       ['admin', 'koni_jabar', 'superadmin'],
  revisi:        ['konida'],
}

export interface TransitionResult {
  ok:        boolean
  newStatus?: AtletStatus
  error?:    string
}

/**
 * Validasi dan kembalikan status baru setelah action.
 * Gunakan ini sebelum update ke database untuk mencegah transisi ilegal.
 */
export function applyTransition(
  currentStatus: AtletStatus,
  action: VerifikasiAction,
  userRole: string
): TransitionResult {
  // Cek apakah role diizinkan
  const allowedRoles = ACTION_ROLES[action]
  if (!allowedRoles.includes(userRole)) {
    return { ok: false, error: `Role '${userRole}' tidak diizinkan melakukan action '${action}'` }
  }

  // Cek apakah transisi valid dari status saat ini
  const nextStatus = TRANSITIONS[currentStatus]?.[action]
  if (!nextStatus) {
    return {
      ok: false,
      error: `Tidak bisa '${action}' dari status '${currentStatus}'`,
    }
  }

  return { ok: true, newStatus: nextStatus }
}

/**
 * Daftar action yang tersedia untuk role tertentu dari status saat ini.
 * Berguna untuk render tombol aksi di UI.
 */
export function getAvailableActions(
  currentStatus: AtletStatus,
  userRole: string
): VerifikasiAction[] {
  const possible = Object.keys(TRANSITIONS[currentStatus] ?? {}) as VerifikasiAction[]
  return possible.filter(action => ACTION_ROLES[action].includes(userRole))
}

/** Label yang ditampilkan ke user per status */
export const STATUS_LABEL: Record<AtletStatus, string> = {
  'Draft':            'Draft',
  'Menunggu Cabor':   'Menunggu Verifikasi Cabor',
  'Menunggu Admin':   'Menunggu Verifikasi Admin',
  'Ditolak Cabor':    'Ditolak oleh Cabor',
  'Ditolak Admin':    'Ditolak oleh Admin',
  'Verified':         'Terverifikasi',
  'Posted':           'Terdaftar Resmi',
}

/** Warna Tailwind per status (text + background) */
export const STATUS_COLOR: Record<AtletStatus, { text: string; bg: string; dot: string }> = {
  'Draft':            { text: 'text-slate-400',   bg: 'bg-slate-800',  dot: 'bg-slate-400' },
  'Menunggu Cabor':   { text: 'text-amber-400',   bg: 'bg-amber-900/30', dot: 'bg-amber-400' },
  'Menunggu Admin':   { text: 'text-blue-400',    bg: 'bg-blue-900/30',  dot: 'bg-blue-400' },
  'Ditolak Cabor':    { text: 'text-red-400',     bg: 'bg-red-900/30',   dot: 'bg-red-400' },
  'Ditolak Admin':    { text: 'text-red-500',     bg: 'bg-red-900/40',   dot: 'bg-red-500' },
  'Verified':         { text: 'text-emerald-400', bg: 'bg-emerald-900/30', dot: 'bg-emerald-400' },
  'Posted':           { text: 'text-green-300',   bg: 'bg-green-900/40', dot: 'bg-green-300' },
}
