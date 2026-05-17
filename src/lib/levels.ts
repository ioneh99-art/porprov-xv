// lib/levels.ts — FINAL
// Sistem Level: superadmin | koni_jabar | level1 | level2 | level3

export type UserLevel = 'superadmin' | 'koni_jabar' | 'level1' | 'level2' | 'level3'
export type UserRole  = 'superadmin' | 'koni_jabar' | 'konida' | 'penyelenggara' | 'operator_cabor' | 'atlet' | 'admin'

// ─── Feature Flags ────────────────────────────────────────
export interface LevelFeatures {
  hasWarRoom: boolean
  hasDashboardFull: boolean
  hasDashboardMini: boolean
  canViewAllKontingen: boolean
  canViewOwnOnly: boolean
  canCrossQuery: boolean
  canManageAtlet: boolean
  canViewFasilitas: boolean
  canViewAtletAll: boolean
  hasKualifikasi: boolean
  hasKejuaraan: boolean
  canVerifikasiKejuaraan: boolean
  hasLaporan: boolean
  canExportFull: boolean
  canExportOwn: boolean
  canExportNone: boolean
  hasCommandCenter: boolean
  hasVenueJadwal: boolean
  hasKesiapanTeknis: boolean
  hasAkomodasiTamu: boolean
  hasLaporanHarian: boolean
  hasSIPAFull: boolean
  hasChatbotFull: boolean
  hasChatbotBasic: boolean
  hasAIAnalytics: boolean
  canManageUsers: boolean
  canManageAllTenant: boolean
  canImpersonate: boolean
  canSetKuota: boolean
  canManageCabor: boolean
  canViewSystemHealth: boolean
  canViewAllLogs: boolean
  showPeta: boolean
  showMedaliPrediksi: boolean
  showAlertStream: boolean
  showVIPProtocol: boolean
}

export const LEVEL_FEATURES: Record<UserLevel, LevelFeatures> = {

  // ── Superadmin: semua akses ───────────────────────────────
  superadmin: {
    hasWarRoom: true, hasDashboardFull: true, hasDashboardMini: false,
    canViewAllKontingen: true, canViewOwnOnly: false, canCrossQuery: true,
    canManageAtlet: true, canViewFasilitas: true, canViewAtletAll: true,
    hasKualifikasi: true, hasKejuaraan: true, canVerifikasiKejuaraan: true,
    hasLaporan: true, canExportFull: true, canExportOwn: false, canExportNone: false,
    hasCommandCenter: true, hasVenueJadwal: true, hasKesiapanTeknis: true,
    hasAkomodasiTamu: true, hasLaporanHarian: true,
    hasSIPAFull: true, hasChatbotFull: true, hasChatbotBasic: false, hasAIAnalytics: true,
    canManageUsers: true, canManageAllTenant: true, canImpersonate: true,
    canSetKuota: true, canManageCabor: true, canViewSystemHealth: true, canViewAllLogs: true,
    showPeta: true, showMedaliPrediksi: true, showAlertStream: true, showVIPProtocol: true,
  },

  // ── KONI Jabar: lihat semua, no manage sistem ─────────────
  koni_jabar: {
    hasWarRoom: true, hasDashboardFull: true, hasDashboardMini: false,
    canViewAllKontingen: true,   // ← bisa lihat semua kontingen
    canViewOwnOnly: false, canCrossQuery: true,
    canManageAtlet: false,       // ← tidak bisa edit atlet
    canViewFasilitas: true, canViewAtletAll: true,
    hasKualifikasi: true, hasKejuaraan: true,
    canVerifikasiKejuaraan: true, // ← bisa verifikasi
    hasLaporan: true, canExportFull: true, canExportOwn: false, canExportNone: false,
    hasCommandCenter: true, hasVenueJadwal: true, hasKesiapanTeknis: true,
    hasAkomodasiTamu: true, hasLaporanHarian: true,
    hasSIPAFull: true, hasChatbotFull: true, hasChatbotBasic: false, hasAIAnalytics: true,
    canManageUsers: false,       // ← tidak bisa manage user
    canManageAllTenant: false,   // ← tidak bisa manage tenant
    canImpersonate: false,
    canSetKuota: false, canManageCabor: false,
    canViewSystemHealth: true,   // ← bisa lihat health
    canViewAllLogs: false,       // ← tidak bisa lihat audit log
    showPeta: true, showMedaliPrediksi: true, showAlertStream: true, showVIPProtocol: true,
  },

  // ── Level 1: Kota Bekasi — War Room + Penyelenggara ───────
  level1: {
    hasWarRoom: true, hasDashboardFull: true, hasDashboardMini: false,
    canViewAllKontingen: false, canViewOwnOnly: true, canCrossQuery: false,
    canManageAtlet: true, canViewFasilitas: true, canViewAtletAll: false,
    hasKualifikasi: true, hasKejuaraan: true, canVerifikasiKejuaraan: false,
    hasLaporan: true, canExportFull: true, canExportOwn: false, canExportNone: false,
    hasCommandCenter: true, hasVenueJadwal: true, hasKesiapanTeknis: true,
    hasAkomodasiTamu: true, hasLaporanHarian: true,
    hasSIPAFull: true, hasChatbotFull: true, hasChatbotBasic: false, hasAIAnalytics: true,
    canManageUsers: false, canManageAllTenant: false, canImpersonate: false,
    canSetKuota: false, canManageCabor: false, canViewSystemHealth: false, canViewAllLogs: false,
    showPeta: true, showMedaliPrediksi: true, showAlertStream: true, showVIPProtocol: true,
  },

  // ── Level 2: Kota Bogor/Depok — Kontingen Reguler ─────────
  level2: {
    hasWarRoom: false, hasDashboardFull: true, hasDashboardMini: false,
    canViewAllKontingen: false, canViewOwnOnly: true, canCrossQuery: false,
    canManageAtlet: true, canViewFasilitas: true, canViewAtletAll: false,
    hasKualifikasi: true, hasKejuaraan: true, canVerifikasiKejuaraan: false,
    hasLaporan: true, canExportFull: false, canExportOwn: true, canExportNone: false,
    hasCommandCenter: false, hasVenueJadwal: false, hasKesiapanTeknis: false,
    hasAkomodasiTamu: false, hasLaporanHarian: false,
    hasSIPAFull: false, hasChatbotFull: true, hasChatbotBasic: false, hasAIAnalytics: false,
    canManageUsers: false, canManageAllTenant: false, canImpersonate: false,
    canSetKuota: false, canManageCabor: false, canViewSystemHealth: false, canViewAllLogs: false,
    showPeta: false, showMedaliPrediksi: false, showAlertStream: true, showVIPProtocol: false,
  },

  // ── Level 3: KONIDA Basic ─────────────────────────────────
  level3: {
    hasWarRoom: false, hasDashboardFull: false, hasDashboardMini: true,
    canViewAllKontingen: false, canViewOwnOnly: true, canCrossQuery: false,
    canManageAtlet: true, canViewFasilitas: false, canViewAtletAll: false,
    hasKualifikasi: false, hasKejuaraan: true, canVerifikasiKejuaraan: false,
    hasLaporan: false, canExportFull: false, canExportOwn: false, canExportNone: true,
    hasCommandCenter: false, hasVenueJadwal: false, hasKesiapanTeknis: false,
    hasAkomodasiTamu: false, hasLaporanHarian: false,
    hasSIPAFull: false, hasChatbotFull: false, hasChatbotBasic: true, hasAIAnalytics: false,
    canManageUsers: false, canManageAllTenant: false, canImpersonate: false,
    canSetKuota: false, canManageCabor: false, canViewSystemHealth: false, canViewAllLogs: false,
    showPeta: false, showMedaliPrediksi: false, showAlertStream: false, showVIPProtocol: false,
  },
}

// ─── Level Metadata ───────────────────────────────────────
export const LEVEL_META: Record<UserLevel, {
  label: string; badge: string; color: string
  bg: string; border: string; description: string; icon: string
}> = {
  superadmin: { label:'Super Admin',    badge:'SA', color:'text-red-400',    bg:'bg-red-950/30',    border:'border-red-800/40',    description:'Akses penuh ke seluruh sistem',                         icon:'⚡' },
  koni_jabar: { label:'KONI Jabar',     badge:'JB', color:'text-green-400',  bg:'bg-green-950/30',  border:'border-green-800/40',  description:'Executive view semua kontingen, no manage sistem',      icon:'🏛️' },
  level1:     { label:'Gold · Bekasi',  badge:'L1', color:'text-yellow-400', bg:'bg-yellow-950/30', border:'border-yellow-800/40', description:'War Room + Penyelenggara Klaster I',                    icon:'🥇' },
  level2:     { label:'Silver · Reguler',badge:'L2',color:'text-slate-400',  bg:'bg-slate-800/30',  border:'border-slate-700/40',  description:'Kontingen reguler — kelola atlet & laporan',            icon:'🥈' },
  level3:     { label:'Basic · Peserta',badge:'L3', color:'text-blue-400',   bg:'bg-blue-950/30',   border:'border-blue-800/40',   description:'Input atlet & pantau status kualifikasi',               icon:'🏅' },
}

// ─── Helpers ──────────────────────────────────────────────
export function getFeatures(level: UserLevel): LevelFeatures {
  return LEVEL_FEATURES[level]
}

export function canAccess(level: UserLevel, feature: keyof LevelFeatures): boolean {
  return !!LEVEL_FEATURES[level]?.[feature]
}

export function resolveLevel(role: string, kontingenId?: number | null, levelDb?: string | null): UserLevel {
  if (role === 'superadmin') return 'superadmin'
  if (role === 'koni_jabar') return 'koni_jabar'

  // Pakai kolom level dari DB kalau sudah terisi
  if (levelDb && ['superadmin','koni_jabar','level1','level2','level3'].includes(levelDb)) {
    return levelDb as UserLevel
  }

  if (role === 'penyelenggara') return 'level1'

  if (kontingenId) {
    const l1 = (process.env.NEXT_PUBLIC_LEVEL1_KONTINGEN_IDS ?? '23').split(',').map(Number).filter(Boolean)
    const l2 = (process.env.NEXT_PUBLIC_LEVEL2_KONTINGEN_IDS ?? '19,24').split(',').map(Number).filter(Boolean)
    if (l1.includes(kontingenId)) return 'level1'
    if (l2.includes(kontingenId)) return 'level2'
  }

  return 'level3'
}

export function getRedirectForLevel(level: UserLevel, role?: string): string {
  switch (level) {
    case 'superadmin': return '/superadmin'
    case 'koni_jabar': return '/konida/dashboard/jabar'
    case 'level1':     return role === 'penyelenggara' ? '/konida/penyelenggara' : '/konida/dashboard/bekasi'
    case 'level2':     return '/konida/dashboard'
    case 'level3':     return '/konida/dashboard/basic'
    default:           return '/konida/dashboard/basic'
  }
}

export function getSidebarMenus(level: UserLevel) {
  const f = LEVEL_FEATURES[level]
  return [
    { key:'dashboard',  label:'Dashboard',       icon:'LayoutDashboard', path:getRedirectForLevel(level), always:true },
    { key:'atlet',      label:'Atlet',            icon:'Users',           path:'/konida/atlet',             show:f.canManageAtlet },
    { key:'kualifikasi',label:'Kualifikasi',      icon:'Target',          path:'/konida/kualifikasi',       show:f.hasKualifikasi },
    { key:'kejuaraan',  label:'Kejuaraan Atlet',  icon:'Award',           path:'/konida/kejuaraan',         show:f.hasKejuaraan },
    { key:'laporan',    label:'Laporan',           icon:'FileText',        path:'/konida/laporan',           show:f.hasLaporan },
    { key:'_pen',       label:'PENYELENGGARA',     isDivider:true,         show:f.hasCommandCenter },
    { key:'command',    label:'Command Center',   icon:'Zap',             path:'/konida/penyelenggara',     show:f.hasCommandCenter },
    { key:'venue',      label:'Venue & Jadwal',   icon:'Building2',       path:'/konida/penyelenggara/venue',show:f.hasVenueJadwal },
    { key:'kesiapan',   label:'Kesiapan Teknis',  icon:'CheckCircle',     path:'/konida/penyelenggara/kesiapan',show:f.hasKesiapanTeknis },
    { key:'akomodasi',  label:'Akomodasi Tamu',   icon:'Hotel',           path:'/konida/penyelenggara/akomodasi',show:f.hasAkomodasiTamu },
    { key:'harian',     label:'Laporan Harian',   icon:'ClipboardList',   path:'/konida/penyelenggara/laporan',show:f.hasLaporanHarian },
    { key:'sipa',       label:'SIPA Intelligence',icon:'Cpu',             path:'/konida/sipa',              show:f.hasSIPAFull },
    { key:'_admin',     label:'ADMINISTRASI',      isDivider:true,         show:level==='superadmin' },
    { key:'sa_users',   label:'Manajemen User',   icon:'UserCog',         path:'/superadmin/users',         show:level==='superadmin' },
    { key:'sa_sub',     label:'Subscription',     icon:'Package',         path:'/superadmin/subscriptions', show:level==='superadmin' },
    { key:'sa_system',  label:'System Health',    icon:'Activity',        path:'/superadmin/system',        show:f.canViewSystemHealth && level==='superadmin' },
    { key:'sa_logs',    label:'Audit Logs',        icon:'FileSearch',      path:'/superadmin/logs',          show:f.canViewAllLogs },
  ].filter(m => m.always || m.show)
}