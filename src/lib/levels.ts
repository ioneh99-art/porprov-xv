// lib/levels.ts
// Sistem Level Akses PORPROV XV
// Superadmin | Level 1 (Gold) | Level 2 (Silver) | Level 3 (Basic)

export type UserLevel = 'superadmin' | 'level1' | 'level2' | 'level3'
export type UserRole  = 'superadmin' | 'konida' | 'penyelenggara' | 'operator_cabor' | 'atlet' | 'publik'

// ─── Feature Flags per Level ──────────────────────────────
export interface LevelFeatures {
  // Dashboard
  hasWarRoom: boolean          // peta taktis, cabor ranking, live events
  hasDashboardFull: boolean    // dashboard lengkap dengan semua KPI
  hasDashboardMini: boolean    // dashboard minimal (KPI atlet sendiri)

  // Data Scope
  canViewAllKontingen: boolean // lihat data semua kontingen
  canViewOwnOnly: boolean      // hanya data sendiri
  canCrossQuery: boolean       // query lintas kontingen/cabor

  // Atlet
  canManageAtlet: boolean      // tambah/edit/hapus atlet
  canViewFasilitas: boolean    // lihat detail fasilitas & peruntukan
  canViewAtletAll: boolean     // lihat atlet semua kontingen

  // Kualifikasi & Kejuaraan
  hasKualifikasi: boolean
  hasKejuaraan: boolean
  canVerifikasiKejuaraan: boolean  // approve/reject dokumen

  // Laporan & Export
  hasLaporan: boolean
  canExportFull: boolean       // PDF + Excel semua data
  canExportOwn: boolean        // export data sendiri only
  canExportNone: boolean

  // Penyelenggara
  hasCommandCenter: boolean    // monitor venue, incident
  hasVenueJadwal: boolean
  hasKesiapanTeknis: boolean
  hasAkomodasiTamu: boolean
  hasLaporanHarian: boolean

  // AI
  hasSIPAFull: boolean         // SIPA proaktif + DB context
  hasChatbotFull: boolean      // chatbot dengan role context
  hasChatbotBasic: boolean     // FAQ only
  hasAIAnalytics: boolean      // prediksi medali, trend

  // Admin
  canManageUsers: boolean
  canManageAllTenant: boolean
  canImpersonate: boolean
  canSetKuota: boolean
  canManageCabor: boolean
  canViewSystemHealth: boolean
  canViewAllLogs: boolean

  // UI
  showPeta: boolean
  showMedaliPrediksi: boolean
  showAlertStream: boolean
  showVIPProtocol: boolean
}

// ─── Level Definitions ────────────────────────────────────
export const LEVEL_FEATURES: Record<UserLevel, LevelFeatures> = {

  // ══════════════════════════════════════════════════════════
  superadmin: {
    hasWarRoom: true,
    hasDashboardFull: true,
    hasDashboardMini: false,
    canViewAllKontingen: true,
    canViewOwnOnly: false,
    canCrossQuery: true,
    canManageAtlet: true,
    canViewFasilitas: true,
    canViewAtletAll: true,
    hasKualifikasi: true,
    hasKejuaraan: true,
    canVerifikasiKejuaraan: true,
    hasLaporan: true,
    canExportFull: true,
    canExportOwn: false,
    canExportNone: false,
    hasCommandCenter: true,
    hasVenueJadwal: true,
    hasKesiapanTeknis: true,
    hasAkomodasiTamu: true,
    hasLaporanHarian: true,
    hasSIPAFull: true,
    hasChatbotFull: true,
    hasChatbotBasic: false,
    hasAIAnalytics: true,
    canManageUsers: true,
    canManageAllTenant: true,
    canImpersonate: true,
    canSetKuota: true,
    canManageCabor: true,
    canViewSystemHealth: true,
    canViewAllLogs: true,
    showPeta: true,
    showMedaliPrediksi: true,
    showAlertStream: true,
    showVIPProtocol: true,
  },

  // ══════════════════════════════════════════════════════════
  // Level 1 — GOLD · Kota Bekasi (Top Tier + Penyelenggara)
  level1: {
    hasWarRoom: true,
    hasDashboardFull: true,
    hasDashboardMini: false,
    canViewAllKontingen: false,   // hanya data sendiri + cross read terbatas
    canViewOwnOnly: true,
    canCrossQuery: false,
    canManageAtlet: true,
    canViewFasilitas: true,
    canViewAtletAll: false,
    hasKualifikasi: true,
    hasKejuaraan: true,
    canVerifikasiKejuaraan: false, // hanya superadmin & operator
    hasLaporan: true,
    canExportFull: true,
    canExportOwn: false,
    canExportNone: false,
    hasCommandCenter: true,        // karena juga penyelenggara
    hasVenueJadwal: true,
    hasKesiapanTeknis: true,
    hasAkomodasiTamu: true,
    hasLaporanHarian: true,
    hasSIPAFull: true,
    hasChatbotFull: true,
    hasChatbotBasic: false,
    hasAIAnalytics: true,
    canManageUsers: false,
    canManageAllTenant: false,
    canImpersonate: false,
    canSetKuota: false,
    canManageCabor: false,
    canViewSystemHealth: false,
    canViewAllLogs: false,
    showPeta: true,
    showMedaliPrediksi: true,
    showAlertStream: true,
    showVIPProtocol: true,
  },

  // ══════════════════════════════════════════════════════════
  // Level 2 — SILVER · Kota Bogor, Kota Depok, dll
  level2: {
    hasWarRoom: false,
    hasDashboardFull: true,        // dashboard tapi lebih simpel
    hasDashboardMini: false,
    canViewAllKontingen: false,
    canViewOwnOnly: true,
    canCrossQuery: false,
    canManageAtlet: true,
    canViewFasilitas: true,        // fasilitas atlet sendiri
    canViewAtletAll: false,
    hasKualifikasi: true,
    hasKejuaraan: true,
    canVerifikasiKejuaraan: false,
    hasLaporan: true,              // laporan terbatas
    canExportFull: false,
    canExportOwn: true,            // export data sendiri only
    canExportNone: false,
    hasCommandCenter: false,
    hasVenueJadwal: false,         // hanya lihat jadwal read-only
    hasKesiapanTeknis: false,
    hasAkomodasiTamu: false,
    hasLaporanHarian: false,
    hasSIPAFull: false,
    hasChatbotFull: true,          // chatbot full tapi bukan SIPA
    hasChatbotBasic: false,
    hasAIAnalytics: false,
    canManageUsers: false,
    canManageAllTenant: false,
    canImpersonate: false,
    canSetKuota: false,
    canManageCabor: false,
    canViewSystemHealth: false,
    canViewAllLogs: false,
    showPeta: false,               // tidak ada peta taktis
    showMedaliPrediksi: false,
    showAlertStream: true,         // alert atlet sendiri
    showVIPProtocol: false,
  },

  // ══════════════════════════════════════════════════════════
  // Level 3 — BASIC · KONIDA Peserta Umum
  level3: {
    hasWarRoom: false,
    hasDashboardFull: false,
    hasDashboardMini: true,        // KPI minimal saja
    canViewAllKontingen: false,
    canViewOwnOnly: true,
    canCrossQuery: false,
    canManageAtlet: true,          // input atlet sendiri
    canViewFasilitas: false,       // tidak lihat fasilitas detail
    canViewAtletAll: false,
    hasKualifikasi: false,         // hanya lihat status kual sendiri
    hasKejuaraan: true,            // bisa upload kejuaraan
    canVerifikasiKejuaraan: false,
    hasLaporan: false,
    canExportFull: false,
    canExportOwn: false,
    canExportNone: true,
    hasCommandCenter: false,
    hasVenueJadwal: false,
    hasKesiapanTeknis: false,
    hasAkomodasiTamu: false,
    hasLaporanHarian: false,
    hasSIPAFull: false,
    hasChatbotFull: false,
    hasChatbotBasic: true,         // chatbot FAQ saja
    hasAIAnalytics: false,
    canManageUsers: false,
    canManageAllTenant: false,
    canImpersonate: false,
    canSetKuota: false,
    canManageCabor: false,
    canViewSystemHealth: false,
    canViewAllLogs: false,
    showPeta: false,
    showMedaliPrediksi: false,
    showAlertStream: false,
    showVIPProtocol: false,
  },
}

// ─── Level Metadata ───────────────────────────────────────
export const LEVEL_META: Record<UserLevel, {
  label: string
  badge: string
  color: string
  bg: string
  border: string
  description: string
  icon: string
}> = {
  superadmin: {
    label: 'Super Admin',
    badge: 'SA',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    description: 'Akses penuh ke seluruh sistem, semua tenant, semua data',
    icon: '⚡',
  },
  level1: {
    label: 'Gold · Top Tier',
    badge: 'L1',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    description: 'Kontingen prioritas + Penyelenggara klaster. Semua fitur aktif.',
    icon: '🥇',
  },
  level2: {
    label: 'Silver · Reguler',
    badge: 'L2',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    description: 'Kontingen reguler. Kelola atlet & laporan sendiri.',
    icon: '🥈',
  },
  level3: {
    label: 'Basic · Peserta',
    badge: 'L3',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    description: 'KONIDA peserta. Input atlet & pantau status kualifikasi.',
    icon: '🏅',
  },
}

// ─── Helpers ──────────────────────────────────────────────

/** Ambil features berdasarkan level user */
export function getFeatures(level: UserLevel): LevelFeatures {
  return LEVEL_FEATURES[level]
}

/** Cek apakah user boleh akses fitur tertentu */
export function canAccess(level: UserLevel, feature: keyof LevelFeatures): boolean {
  return !!LEVEL_FEATURES[level][feature]
}

/** Tentukan level dari role string (dari DB/session) */
export function resolveLevel(role: string, kontingen_id?: number): UserLevel {
  if (role === 'superadmin') return 'superadmin'

  // Level 1: Bekasi (kontingen_id tertentu) atau penyelenggara klaster
  const LEVEL1_KONTINGEN_IDS = [
    Number(process.env.NEXT_PUBLIC_LEVEL1_KONTINGEN_IDS ?? '1'),
  ]
  if (role === 'penyelenggara') return 'level1'
  if (kontingen_id && LEVEL1_KONTINGEN_IDS.includes(kontingen_id)) return 'level1'

  // Level 2: konida reguler dengan atlet banyak (threshold)
  const LEVEL2_KONTINGEN_IDS = (process.env.NEXT_PUBLIC_LEVEL2_KONTINGEN_IDS ?? '')
    .split(',').map(Number).filter(Boolean)
  if (kontingen_id && LEVEL2_KONTINGEN_IDS.includes(kontingen_id)) return 'level2'

  // Default: Level 3
  return 'level3'
}

/** Guard: redirect path jika tidak ada akses */
export function getRedirectForLevel(level: UserLevel): string {
  switch (level) {
    case 'superadmin': return '/superadmin'
    case 'level1':     return '/konida/dashboard/bekasi'
    case 'level2':     return '/konida/dashboard'
    case 'level3':     return '/konida/dashboard/basic'
    default:           return '/login'
  }
}

/** Daftar menu sidebar per level */
export function getSidebarMenus(level: UserLevel) {
  const f = LEVEL_FEATURES[level]

  const menus = [
    // Selalu tampil
    { key: 'dashboard',   label: 'Dashboard',      icon: 'LayoutDashboard', path: getRedirectForLevel(level), always: true },

    // Atlet
    { key: 'atlet',       label: 'Atlet',           icon: 'Users',           path: '/konida/atlet',           show: f.canManageAtlet },
    { key: 'kualifikasi', label: 'Kualifikasi',     icon: 'Target',          path: '/konida/kualifikasi',     show: f.hasKualifikasi },
    { key: 'kejuaraan',   label: 'Kejuaraan Atlet', icon: 'Award',           path: '/konida/kejuaraan',       show: f.hasKejuaraan },
    { key: 'laporan',     label: 'Laporan',          icon: 'FileText',        path: '/konida/laporan',         show: f.hasLaporan },

    // Penyelenggara (Level 1 only)
    { key: 'divider_penyelenggara', label: 'PENYELENGGARA', isDivider: true, show: f.hasCommandCenter },
    { key: 'command',     label: 'Command Center',  icon: 'Zap',             path: '/konida/penyelenggara',   show: f.hasCommandCenter },
    { key: 'venue',       label: 'Venue & Jadwal',  icon: 'Building2',       path: '/konida/penyelenggara/venue', show: f.hasVenueJadwal },
    { key: 'kesiapan',    label: 'Kesiapan Teknis', icon: 'CheckCircle',     path: '/konida/penyelenggara/kesiapan', show: f.hasKesiapanTeknis },
    { key: 'akomodasi',   label: 'Akomodasi Tamu',  icon: 'Hotel',           path: '/konida/penyelenggara/akomodasi', show: f.hasAkomodasiTamu },
    { key: 'harian',      label: 'Laporan Harian',  icon: 'ClipboardList',   path: '/konida/penyelenggara/laporan', show: f.hasLaporanHarian },

    // AI
    { key: 'sipa',        label: 'SIPA Intelligence', icon: 'Cpu',           path: '/konida/sipa',            show: f.hasSIPAFull },

    // Superadmin only
    { key: 'divider_admin', label: 'ADMINISTRASI', isDivider: true,          show: level === 'superadmin' },
    { key: 'sa_users',    label: 'Manajemen User', icon: 'UserCog',          path: '/superadmin/users',       show: level === 'superadmin' },
    { key: 'sa_tenant',   label: 'Tenant & Level', icon: 'Layers',           path: '/superadmin/tenant',      show: level === 'superadmin' },
    { key: 'sa_cabor',    label: 'Cabor & Kuota',  icon: 'Trophy',           path: '/superadmin/cabor',       show: level === 'superadmin' },
    { key: 'sa_system',   label: 'System Health',  icon: 'Activity',         path: '/superadmin/system',      show: level === 'superadmin' },
    { key: 'sa_logs',     label: 'Audit Logs',     icon: 'FileSearch',       path: '/superadmin/logs',        show: level === 'superadmin' },
  ]

  return menus.filter(m => m.always || m.show || m.isDivider && m.show)
}

// ─── Env Vars yang dibutuhkan ─────────────────────────────
// NEXT_PUBLIC_LEVEL1_KONTINGEN_IDS=1          (ID kontingen Bekasi)
// NEXT_PUBLIC_LEVEL2_KONTINGEN_IDS=2,3,4,5   (ID kontingen Level 2)