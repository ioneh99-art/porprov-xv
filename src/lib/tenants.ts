// lib/tenants.ts
// Config per tenant — branding, akses, warna

export type TenantId = 'jabar' | 'bekasi' | 'bogor' | 'depok'

export interface TenantConfig {
  id: TenantId
  nama: string
  namaLengkap: string
  subtitle: string
  logo: string        // path ke public/logos/
  logoBg: string      // warna background logo
  primary: string     // warna utama
  primaryDark: string // warna gelap
  gradient: string    // gradient header
  akses: 'full' | 'konida' | 'konida+penyelenggara'
  klaster_id?: number
  badge?: string      // label tambahan
}

export const TENANTS: Record<TenantId, TenantConfig> = {
  jabar: {
    id: 'jabar',
    nama: 'KONI Jawa Barat',
    namaLengkap: 'Komite Olahraga Nasional Indonesia Jawa Barat',
    subtitle: 'Sistem Informasi PORPROV XV Jawa Barat 2026',
    logo: '/logos/koni-jabar.png',
    logoBg: 'rgba(30,64,175,0.15)',
    primary: '#1d4ed8',
    primaryDark: '#1e3a8a',
    gradient: 'linear-gradient(135deg, #0c1a2e 0%, #0f172a 60%, #0c1a2e 100%)',
    akses: 'full',
    badge: 'Admin Pusat',
  },
  bekasi: {
    id: 'bekasi',
    nama: 'Kota Bekasi',
    namaLengkap: 'Kontingen & Penyelenggara Kota Bekasi',
    subtitle: 'Portal Resmi PORPROV XV — Kota Bekasi',
    logo: '/logos/bekasi.png',
    logoBg: 'rgba(220,38,38,0.15)',
    primary: '#dc2626',
    primaryDark: '#991b1b',
    gradient: 'linear-gradient(135deg, #1c0a0a 0%, #0f172a 60%, #1c0a0a 100%)',
    akses: 'konida+penyelenggara',
    klaster_id: 1,
    badge: 'Tuan Rumah Klaster I',
  },
  bogor: {
    id: 'bogor',
    nama: 'Kota Bogor',
    namaLengkap: 'Kontingen & Penyelenggara Kota Bogor',
    subtitle: 'Portal Resmi PORPROV XV — Kota Bogor',
    logo: '/logos/bogor.png',
    logoBg: 'rgba(22,163,74,0.15)',
    primary: '#16a34a',
    primaryDark: '#14532d',
    gradient: 'linear-gradient(135deg, #0a1c0f 0%, #0f172a 60%, #0a1c0f 100%)',
    akses: 'konida+penyelenggara',
    klaster_id: 2,
    badge: 'Tuan Rumah Klaster II',
  },
  depok: {
    id: 'depok',
    nama: 'Kota Depok',
    namaLengkap: 'Kontingen & Penyelenggara Kota Depok',
    subtitle: 'Portal Resmi PORPROV XV — Kota Depok',
    logo: '/logos/depok.png',
    logoBg: 'rgba(124,58,237,0.15)',
    primary: '#7c3aed',
    primaryDark: '#4c1d95',
    gradient: 'linear-gradient(135deg, #0f0a1c 0%, #0f172a 60%, #0f0a1c 100%)',
    akses: 'konida+penyelenggara',
    klaster_id: 3,
    badge: 'Tuan Rumah Klaster III',
  },
}

// Domain mapping — tambah sesuai domain production
export const DOMAIN_TENANT_MAP: Record<string, TenantId> = {
  // Production
  'porprov.koni-jabar.id':        'jabar',
  'bekasi.porprov.koni-jabar.id': 'bekasi',
  'bogor.porprov.koni-jabar.id':  'bogor',
  'depok.porprov.koni-jabar.id':  'depok',
  // Vercel preview
  'porprov-xv.vercel.app':        'jabar',
  // Local development
  'localhost:3000':               'jabar',
  'localhost:3001':               'bekasi',
  'localhost:3002':               'bogor',
  'localhost:3003':               'depok',
}

export function getTenantId(host: string): TenantId {
  // Strip www. kalau ada
  const cleanHost = host.replace(/^www\./, '')
  return DOMAIN_TENANT_MAP[cleanHost] ?? 'jabar'
}

export function getTenantConfig(host: string): TenantConfig {
  const id = getTenantId(host)
  return TENANTS[id]
}