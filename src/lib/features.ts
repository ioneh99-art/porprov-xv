// lib/features.ts
export const FEATURES = {
  // Dashboard
  WAR_ROOM:          'war_room',
  DASHBOARD_FULL:    'dashboard_full',
  DASHBOARD_BASIC:   'dashboard_basic',

  // Atlet
  MANAGE_ATLET:      'manage_atlet',
  VIEW_FASILITAS:    'view_fasilitas',

  // Modul
  KUALIFIKASI:       'kualifikasi',
  KEJUARAAN:         'kejuaraan',
  LAPORAN:           'laporan',
  EXPORT_PDF:        'export_pdf',
  EXPORT_EXCEL:      'export_excel',

  // Penyelenggara
  COMMAND_CENTER:    'command_center',
  VENUE_JADWAL:      'venue_jadwal',
  AKOMODASI:         'akomodasi',

  // AI
  SIPA_FULL:         'sipa_full',
  CHATBOT:           'chatbot',
  AI_ANALYTICS:      'ai_analytics',

  // Limit
  UNLIMITED_ATLET:   'unlimited_atlet',
  UNLIMITED_USERS:   'unlimited_users',
} as const

// Plan templates
export const PLAN_FEATURES = {
  basic: [
    FEATURES.DASHBOARD_BASIC,
    FEATURES.MANAGE_ATLET,
    FEATURES.KEJUARAAN,
    FEATURES.CHATBOT,
  ],
  standard: [
    FEATURES.DASHBOARD_FULL,
    FEATURES.MANAGE_ATLET,
    FEATURES.VIEW_FASILITAS,
    FEATURES.KUALIFIKASI,
    FEATURES.KEJUARAAN,
    FEATURES.LAPORAN,
    FEATURES.EXPORT_EXCEL,
    FEATURES.CHATBOT,
  ],
  premium: [
    FEATURES.WAR_ROOM,
    FEATURES.DASHBOARD_FULL,
    FEATURES.MANAGE_ATLET,
    FEATURES.VIEW_FASILITAS,
    FEATURES.KUALIFIKASI,
    FEATURES.KEJUARAAN,
    FEATURES.LAPORAN,
    FEATURES.EXPORT_PDF,
    FEATURES.EXPORT_EXCEL,
    FEATURES.COMMAND_CENTER,
    FEATURES.VENUE_JADWAL,
    FEATURES.AKOMODASI,
    FEATURES.SIPA_FULL,
    FEATURES.AI_ANALYTICS,
    FEATURES.UNLIMITED_ATLET,
  ],
  enterprise: [
    // semua features + custom
    ...Object.values(FEATURES),
  ],
}