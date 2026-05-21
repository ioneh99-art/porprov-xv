// src/lib/tenants.ts
// White label tenant system — query dari DB, bukan hardcode

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface TenantConfig {
  id:              string
  kontingen_id:    number | null
  nama:            string
  nama_pendek:     string
  color_primary:   string
  color_secondary: string
  color_accent:    string
  logo_url:        string
  tagline:         string
  login_slug:      string
  login_title:     string
  login_subtitle:  string
  login_hero_text: string
  login_theme:     'dark' | 'light'
  login_layout:    'split' | 'centered' | 'minimal'
  dashboard_type:  string
  level:           string
  plan_id:         string
  login_stats:     { label: string; value: string; color: string }[]
  login_venues:    { nama: string; status: string; color: string }[]
  is_active:       boolean
}

// Default fallback kalau tenant tidak ditemukan
export const DEFAULT_TENANT: TenantConfig = {
  id:              'jabar',
  kontingen_id:    null,
  nama:            'PORPROV XV',
  nama_pendek:     'PORPROV',
  color_primary:   '2563eb',
  color_secondary: '1d4ed8',
  color_accent:    'F5C518',
  logo_url:        '/logos/porprov.png',
  tagline:         'Jawa Barat 2026',
  login_slug:      'jabar',
  login_title:     'Masuk ke Portal',
  login_subtitle:  'Sistem Informasi PORPROV XV',
  login_hero_text: '',
  login_theme:     'dark',
  login_layout:    'split',
  dashboard_type:  'standard',
  level:           'level3',
  plan_id:         'basic',
  login_stats:     [],
  login_venues:    [],
  is_active:       true,
}

// Cache in-memory per request cycle
const tenantCache = new Map<string, { data: TenantConfig; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 menit

// ─── Get tenant by slug ───────────────────────────────────
export async function getTenantBySlug(slug: string): Promise<TenantConfig> {
  const cached = tenantCache.get(`slug:${slug}`)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  const { data, error } = await sb
    .from('tenants')
    .select('*')
    .eq('login_slug', slug)
    .eq('is_active', true)
    .single()

  const tenant = (error || !data) ? DEFAULT_TENANT : data as TenantConfig
  tenantCache.set(`slug:${slug}`, { data: tenant, ts: Date.now() })
  return tenant
}

// ─── Get tenant by kontingen_id ───────────────────────────
export async function getTenantByKontingenId(kontingenId: number): Promise<TenantConfig> {
  const cached = tenantCache.get(`kid:${kontingenId}`)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  const { data, error } = await sb
    .from('tenants')
    .select('*')
    .eq('kontingen_id', kontingenId)
    .eq('is_active', true)
    .single()

  const tenant = (error || !data) ? DEFAULT_TENANT : data as TenantConfig
  tenantCache.set(`kid:${kontingenId}`, { data: tenant, ts: Date.now() })
  return tenant
}

// ─── Get all active tenants ───────────────────────────────
export async function getAllTenants(): Promise<TenantConfig[]> {
  const { data } = await sb
    .from('tenants')
    .select('*')
    .eq('is_active', true)
    .order('nama')
  return (data ?? []) as TenantConfig[]
}

// ─── Get tenant by role (server-side) ────────────────────
export async function getTenantByRole(role: string, kontingenId: number | null): Promise<TenantConfig> {
  if (role === 'superadmin') return getTenantBySlug('superadmin')
  if (role === 'koni_jabar') return getTenantBySlug('jabar')
  if (kontingenId) return getTenantByKontingenId(kontingenId)
  return DEFAULT_TENANT
}

// ─── Helper: CSS color dengan # ──────────────────────────
export function tc(hex: string): string {
  return hex.startsWith('#') ? hex : `#${hex}`
}

// ─── Helper: dashboard href dari tenant ──────────────────
export function getDashboardHref(tenant: TenantConfig): string {
  switch (tenant.dashboard_type) {
    case 'war_room':   return '/konida/dashboard/bekasi'
    case 'koni_exec':  return '/dashboard'
    case 'superadmin': return '/superadmin'
    case 'basic':      return '/konida/dashboard/basic'
    default:           return '/konida/dashboard'
  }
}

// ─── Helper: login redirect dari slug ────────────────────
export function getLoginHref(slug: string): string {
  if (slug === 'jabar') return '/login'
  if (slug === 'superadmin') return '/login/superadmin'
  return `/login/${slug}`
}

// ─── Invalidate cache ─────────────────────────────────────
export function invalidateTenantCache(key?: string) {
  if (key) {
    tenantCache.delete(`slug:${key}`)
    tenantCache.delete(`kid:${key}`)
  } else {
    tenantCache.clear()
  }
}