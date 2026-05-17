// lib/subscriptions.ts
// Sprint 2 — Subscription Layer
// Single source of truth untuk fitur per tenant

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Feature Keys ─────────────────────────────────────────
export const F = {
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
  KESIAPAN_TEKNIS:   'kesiapan_teknis',
  AKOMODASI:         'akomodasi',
  LAPORAN_HARIAN:    'laporan_harian',

  // AI
  SIPA_FULL:         'sipa_full',
  CHATBOT:           'chatbot',
  AI_ANALYTICS:      'ai_analytics',
  AI_NLQ:            'ai_nlq',

  // Limits
  UNLIMITED_ATLET:   'unlimited_atlet',
  UNLIMITED_USERS:   'unlimited_users',

  // Enterprise
  API_ACCESS:        'api_access',
  WHITE_LABEL:       'white_label',
  MULTI_EVENT:       'multi_event',
  BROADCAST_ALERT:   'broadcast_alert',
} as const

export type FeatureKey = typeof F[keyof typeof F]

// ─── Types ────────────────────────────────────────────────
export interface Subscription {
  id:              string
  kontingen_id:    number
  plan_id:         string
  features:        string[]   // resolved: plan features + add - remove
  max_users:       number
  max_atlet:       number
  cabor_ids:       number[]   // kosong = semua
  valid_until:     string | null
  is_active:       boolean
  is_trial:        boolean
  is_expired:      boolean
}

export interface Plan {
  id:          string
  nama:        string
  deskripsi:   string
  harga_bulan: number
  features:    string[]
  max_users:   number
  max_atlet:   number
}

// ─── Cache sederhana (in-memory, reset per request) ───────
const cache = new Map<number, { data: Subscription; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000  // 5 menit

// ─── Get subscription + resolved features ─────────────────
export async function getSubscription(kontingenId: number): Promise<Subscription | null> {
  // Cek cache dulu
  const cached = cache.get(kontingenId)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  const { data, error } = await sb
    .from('subscriptions')
    .select(`
      id, kontingen_id, plan_id,
      features_add, features_remove,
      max_users, max_atlet, cabor_ids,
      valid_until, is_active, is_trial,
      plans (features, max_users, max_atlet)
    `)
    .eq('kontingen_id', kontingenId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null

  // Check expired
  const isExpired = data.valid_until
    ? new Date(data.valid_until) < new Date()
    : false

  // Resolve features: plan.features + features_add - features_remove
  const planFeatures: string[] = (data.plans as any)?.features ?? []
  const featuresAdd: string[]  = data.features_add ?? []
  const featuresRemove: string[] = data.features_remove ?? []

  const resolvedFeatures = [
    ...new Set([...planFeatures, ...featuresAdd])
  ].filter(f => !featuresRemove.includes(f))

  const sub: Subscription = {
    id:           data.id,
    kontingen_id: data.kontingen_id,
    plan_id:      data.plan_id,
    features:     isExpired ? [F.DASHBOARD_BASIC] : resolvedFeatures,
    max_users:    data.max_users ?? (data.plans as any)?.max_users ?? 5,
    max_atlet:    data.max_atlet ?? (data.plans as any)?.max_atlet ?? 50,
    cabor_ids:    data.cabor_ids ?? [],
    valid_until:  data.valid_until,
    is_active:    data.is_active,
    is_trial:     data.is_trial,
    is_expired:   isExpired,
  }

  cache.set(kontingenId, { data: sub, ts: Date.now() })
  return sub
}

// ─── Cek satu fitur ───────────────────────────────────────
export function canAccess(features: string[], feature: FeatureKey): boolean {
  return features.includes(feature)
}

// ─── Cek banyak fitur sekaligus ───────────────────────────
export function canAccessAll(features: string[], ...required: FeatureKey[]): boolean {
  return required.every(f => features.includes(f))
}

export function canAccessAny(features: string[], ...options: FeatureKey[]): boolean {
  return options.some(f => features.includes(f))
}

// ─── Get features dari session (client-side) ──────────────
// Dipanggil dari komponen — hit API /api/auth/me yang sudah include features
export async function getMyFeatures(): Promise<string[]> {
  try {
    const res  = await fetch('/api/auth/me')
    const data = await res.json()
    return data?.features ?? [F.DASHBOARD_BASIC]
  } catch {
    return [F.DASHBOARD_BASIC]
  }
}

// ─── Redirect berdasarkan features ────────────────────────
export function getDashboardUrl(features: string[], role: string): string {
  if (role === 'superadmin') return '/superadmin'
  if (features.includes(F.WAR_ROOM)) return '/konida/dashboard/bekasi'
  if (features.includes(F.DASHBOARD_FULL)) return '/konida/dashboard'
  return '/konida/dashboard/basic'
}

// ─── Get semua plans ──────────────────────────────────────
export async function getPlans(): Promise<Plan[]> {
  const { data } = await sb
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('urutan')
  return data ?? []
}

// ─── Assign plan ke kontingen (superadmin only) ───────────
export async function assignPlan(params: {
  kontingen_id: number
  plan_id:      string
  valid_until?: string | null
  max_users?:   number
  max_atlet?:   number
  features_add?:    string[]
  features_remove?: string[]
  catatan?:     string
  created_by:   string
}): Promise<{ ok: boolean; error?: string }> {
  // Nonaktifkan subscription lama
  await sb
    .from('subscriptions')
    .update({ is_active: false })
    .eq('kontingen_id', params.kontingen_id)
    .eq('is_active', true)

  // Buat subscription baru
  const { error } = await sb.from('subscriptions').insert({
    kontingen_id:     params.kontingen_id,
    plan_id:          params.plan_id,
    valid_until:      params.valid_until ?? null,
    max_users:        params.max_users ?? null,
    max_atlet:        params.max_atlet ?? null,
    features_add:     params.features_add ?? [],
    features_remove:  params.features_remove ?? [],
    catatan:          params.catatan ?? null,
    created_by:       params.created_by,
    is_active:        true,
  })

  // Invalidate cache
  cache.delete(params.kontingen_id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ─── Cek kuota atlet ──────────────────────────────────────
export async function checkAtletQuota(kontingenId: number): Promise<{
  current: number
  max: number
  canAdd: boolean
}> {
  const sub = await getSubscription(kontingenId)
  if (!sub) return { current: 0, max: 50, canAdd: true }

  const { count } = await sb
    .from('atlet')
    .select('*', { count: 'exact', head: true })
    .eq('kontingen_id', kontingenId)

  const current = count ?? 0
  const max     = sub.features.includes(F.UNLIMITED_ATLET) ? Infinity : sub.max_atlet
  return { current, max, canAdd: current < max }
}

// ─── Cek kuota user ───────────────────────────────────────
export async function checkUserQuota(kontingenId: number): Promise<{
  current: number
  max: number
  canAdd: boolean
}> {
  const sub = await getSubscription(kontingenId)
  if (!sub) return { current: 0, max: 5, canAdd: true }

  const { count } = await sb
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('kontingen_id', kontingenId)
    .eq('is_active', true)

  const current = count ?? 0
  const max     = sub.features.includes(F.UNLIMITED_USERS) ? Infinity : sub.max_users
  return { current, max, canAdd: current < max }
}