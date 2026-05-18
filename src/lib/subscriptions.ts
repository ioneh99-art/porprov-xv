// src/lib/subscriptions.ts
// Sprint 2 — Subscription Layer — v3 fix query

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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

export interface Plan {
  id:          string
  nama:        string
  deskripsi?:  string
  harga_bulan: number
  features:    string[]
  max_users:   number
  max_atlet:   number
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

// Cache in-memory
const cache = new Map<number, { data: Subscription; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000

// ─── Get subscription ─────────────────────────────────────
export async function getSubscription(kontingenId: number): Promise<Subscription | null> {
  const cached = cache.get(kontingenId)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  // Query subscription + join plans untuk ambil features
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

  // Resolve features: dari kolom features subscription ATAU dari plan
  const subFeatures: string[]    = data.features ?? []
  const planFeatures: string[]   = (data.plans as any)?.features ?? []
  const featuresAdd: string[]    = data.features_add ?? []
  const featuresRemove: string[] = data.features_remove ?? []

  // Gabung: pakai subFeatures kalau ada, fallback ke planFeatures
  const baseFeatures = subFeatures.length > 0 ? subFeatures : planFeatures
  const resolvedFeatures = [...new Set([...baseFeatures, ...featuresAdd])]
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

// ─── Get all plans ────────────────────────────────────────
export async function getPlans(): Promise<Plan[]> {
  const { data } = await sb
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('urutan', { nullsFirst: false })

  return (data ?? []).map((p: any) => ({
    ...p,
    harga_bulan: p.harga_bulan ?? p.harga ?? 0,
  }))
}

// ─── Assign plan ──────────────────────────────────────────
export async function assignPlan(params: {
  kontingen_id:     number
  plan_id:          string
  valid_until?:     string | null
  max_users?:       number
  max_atlet?:       number
  features_add?:    string[]
  features_remove?: string[]
  catatan?:         string
  created_by:       string
}): Promise<{ ok: boolean; error?: string }> {
  // Nonaktifkan subscription lama
  await sb
    .from('subscriptions')
    .update({ is_active: false })
    .eq('kontingen_id', params.kontingen_id)
    .eq('is_active', true)

  // Ambil features dari plan baru
  const { data: planData } = await sb
    .from('plans')
    .select('features')
    .eq('id', params.plan_id)
    .single()

  const planFeatures = planData?.features ?? []
  const featuresAdd  = params.features_add ?? []
  const featuresRemove = params.features_remove ?? []
  const resolvedFeatures = [...new Set([...planFeatures, ...featuresAdd])]
    .filter(f => !featuresRemove.includes(f))

  const { error } = await sb.from('subscriptions').insert({
    kontingen_id:     params.kontingen_id,
    plan_id:          params.plan_id,
    features:         resolvedFeatures,
    valid_until:      params.valid_until ?? null,
    max_users:        params.max_users ?? null,
    max_atlet:        params.max_atlet ?? null,
    features_add:     params.features_add ?? [],
    features_remove:  params.features_remove ?? [],
    catatan:          params.catatan ?? null,
    created_by:       params.created_by,
    is_active:        true,
    is_trial:         false,
  })

  cache.delete(params.kontingen_id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
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