// src/lib/subscriptions.ts
// Sprint 2 — Subscription Layer — v5: pakai API ROUTE untuk bypass RLS

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // 🆕 PURE anon key (read-only)
)

// ─── Feature Keys ─────────────────────────────────────────
export const F = {
  DASHBOARD_BASIC:    'dashboard_basic',
  DASHBOARD_FULL:     'dashboard_full',
  WAR_ROOM:           'war_room',
  MANAGE_ATLET:       'manage_atlet',
  VIEW_FASILITAS:     'view_fasilitas',
  KUALIFIKASI:        'kualifikasi',
  KEJUARAAN:          'kejuaraan',
  LAPORAN:            'laporan',
  EXPORT_PDF:         'export_pdf',
  EXPORT_EXCEL:       'export_excel',
  COMMAND_CENTER:     'command_center',
  VENUE_JADWAL:       'venue_jadwal',
  KESIAPAN_TEKNIS:    'kesiapan_teknis',
  AKOMODASI:          'akomodasi',
  LAPORAN_HARIAN:     'laporan_harian',
  SIPA_FULL:          'sipa_full',
  CHATBOT:            'chatbot',
  AI_ANALYTICS:       'ai_analytics',
  AI_NLQ:             'ai_nlq',
  UNLIMITED_ATLET:    'unlimited_atlet',
  UNLIMITED_USERS:    'unlimited_users',
  API_ACCESS:         'api_access',
  WHITE_LABEL:        'white_label',
  MULTI_EVENT:        'multi_event',
  BROADCAST_ALERT:    'broadcast_alert',
} as const

export type FeatureKey = typeof F[keyof typeof F]
export type UserLevel = 'superadmin' | 'koni_jabar' | 'level1' | 'level2' | 'level3'

export const PLAN_TO_LEVEL_MAP: Record<number, UserLevel> = {
  0: 'level3',
  1: 'level3',
  2: 'level2',
  3: 'level1',
  4: 'koni_jabar',
}

export interface Plan {
  id:          string
  nama:        string
  deskripsi?:  string
  harga_bulan: number
  features:    string[]
  max_users:   number
  max_atlet:   number
  urutan?:     number
}

export interface Subscription {
  id:           string
  kontingen_id: number
  plan_id:      string
  features:     string[]
  max_users:    number
  max_atlet:    number
  valid_until:  string | null
  is_active:    boolean
  is_trial:     boolean
  is_expired:   boolean
}

const cache = new Map<number, { data: Subscription; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000

// ─── Get subscription (READ — anon OK) ───────────────────
export async function getSubscription(kontingenId: number): Promise<Subscription | null> {
  const cached = cache.get(kontingenId)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  const { data, error } = await sb
    .from('subscriptions')
    .select(`
      id, kontingen_id, plan_id,
      features, features_add, features_remove,
      max_users, max_atlet,
      valid_until, is_active, is_trial,
      plans!inner (features, max_users, max_atlet)
    `)
    .eq('kontingen_id', kontingenId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  const isExpired = data.valid_until ? new Date(data.valid_until) < new Date() : false
  const subFeatures: string[]    = data.features ?? []
  const planFeatures: string[]   = (data.plans as any)?.features ?? []
  const featuresAdd: string[]    = data.features_add ?? []
  const featuresRemove: string[] = data.features_remove ?? []
  const baseFeatures = subFeatures.length > 0 ? subFeatures : planFeatures
  const resolvedFeatures = Array.from(new Set(baseFeatures.concat(featuresAdd)))
    .filter(f => !featuresRemove.includes(f))

  const sub: Subscription = {
    id:           data.id,
    kontingen_id: data.kontingen_id,
    plan_id:      data.plan_id,
    features:     isExpired ? [F.DASHBOARD_BASIC] : resolvedFeatures,
    max_users:    data.max_users ?? (data.plans as any)?.max_users ?? 5,
    max_atlet:    data.max_atlet ?? (data.plans as any)?.max_atlet ?? 50,
    valid_until:  data.valid_until,
    is_active:    data.is_active,
    is_trial:     data.is_trial ?? false,
    is_expired:   isExpired,
  }

  cache.set(kontingenId, { data: sub, ts: Date.now() })
  return sub
}

// ─── Get all plans (READ — anon OK) ──────────────────────
export async function getPlans(): Promise<Plan[]> {
  const { data, error } = await sb
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('urutan', { nullsFirst: false })

  if (error) {
    console.error('[getPlans] error:', error)
    return []
  }

  return (data ?? []).map((p: any) => ({
    ...p,
    harga_bulan: p.harga_bulan ?? p.harga ?? 0,
  }))
}

// ─── Get tenant levels (READ — anon OK) ──────────────────
export async function getTenantLevels(): Promise<Record<number, UserLevel>> {
  const { data, error } = await sb
    .from('tenants')
    .select('kontingen_id, level')
    .not('kontingen_id', 'is', null)

  if (error) {
    console.error('[getTenantLevels] error:', error)
    return {}
  }

  const map: Record<number, UserLevel> = {}
  for (const row of data ?? []) {
    if (row.kontingen_id != null) {
      map[row.kontingen_id] = (row.level ?? 'level3') as UserLevel
    }
  }
  return map
}

// ═══════════════════════════════════════════════════════════
// 🆕 ASSIGN PLAN — call API route (bypass RLS via SERVICE_ROLE)
// ═══════════════════════════════════════════════════════════
export async function assignPlan(params: {
  kontingen_id:     number
  plan_id:          string
  level?:           UserLevel
  valid_until?:     string | null
  max_users?:       number
  max_atlet?:       number
  features_add?:    string[]
  features_remove?: string[]
  catatan?:         string
  created_by:       string
  is_trial?:        boolean
}): Promise<{ ok: boolean; error?: string; warnings?: string[] }> {
  console.log('[assignPlan] calling API /api/superadmin/assign-plan', params)

  try {
    const res = await fetch('/api/superadmin/assign-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    const data = await res.json()
    console.log('[assignPlan] API response:', data)

    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error ?? `HTTP ${res.status}`,
      }
    }

    cache.delete(params.kontingen_id)
    return {
      ok: true,
      warnings: data.warnings,
    }
  } catch (e: any) {
    console.error('[assignPlan] fetch exception:', e)
    return {
      ok: false,
      error: `Network error: ${e.message ?? 'unknown'}`,
    }
  }
}

// ─── Set kontingen level via API (juga via API biar konsisten) ──
export async function setKontingenLevel(
  kontingenId: number,
  level: UserLevel
): Promise<{ ok: boolean; error?: string }> {
  console.log('[setKontingenLevel] via API', { kontingenId, level })

  // Re-use assignPlan endpoint with minimal payload
  // Atau bikin endpoint khusus — untuk sekarang gunakan tenants update via service role
  try {
    const res = await fetch('/api/superadmin/set-level', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kontingen_id: kontingenId, level }),
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error ?? `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: `Network: ${e.message ?? 'unknown'}` }
  }
}

// ─── Cache invalidation ───────────────────────────────────
export function invalidateSubscriptionCache(kontingenId?: number): void {
  if (kontingenId != null) {
    cache.delete(kontingenId)
  } else {
    cache.clear()
  }
}

// ─── Helpers ──────────────────────────────────────────────
export function canAccess(features: string[], feature: FeatureKey): boolean {
  return features.includes(feature)
}

export async function getMyFeatures(): Promise<string[]> {
  try {
    const res  = await fetch('/api/auth/me')
    const data = await res.json()
    return data?.features ?? [F.DASHBOARD_BASIC]
  } catch {
    return [F.DASHBOARD_BASIC]
  }
}