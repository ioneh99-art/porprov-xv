/**
 * Subscription Tier Helper
 * 
 * Untuk check apakah cabor punya akses ke fitur tertentu
 * berdasarkan tier subscription (basic/pro/elite/champion).
 * 
 * Tier hierarchy:
 *   basic   (free)              → operasional dasar
 *   pro     (Rp 2.5jt/bln)      → + AI assistant, analytics
 *   elite   (Rp 10jt/bln)       → + intelligence, content automation
 *   champion (Rp 25jt+/bln)     → + custom modules (Pentathlon, dll)
 */

import { createClient } from '@supabase/supabase-js'

export type SubscriptionTier = 'basic' | 'pro' | 'elite' | 'champion'

export interface CaborSubscription {
  cabor_id: number
  tier: SubscriptionTier
  features: Record<string, boolean>
  monthly_fee: number
  is_active: boolean
  expires_at?: string
}

// Tier hierarchy: higher tier inherits all lower tier features
const TIER_RANK: Record<SubscriptionTier, number> = {
  basic: 0,
  pro: 1,
  elite: 2,
  champion: 3,
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Get subscription untuk specific cabor.
 *
 * ⚠️ BELUM DIPAKAI (dead code per 2026-07-19) — tak ada pemanggil di kode.
 * ⚠️ CAVEAT RUANG cabor_id: tabel `cabor_subscription.cabor_id` memakai ruang
 *    `cabor_master` (id 1-108), BEDA dari ruang operasional `cabang_olahraga`
 *    (dipakai atlet/nomor_pertandingan/users, id s/d 206+). Sebelum fungsi ini
 *    diwire ke UI, PASTIKAN pemanggil mengirim id di ruang yang benar / lewat
 *    peta nama — kalau tidak, cabor spt Dayung (cabang_olahraga=147) akan salah
 *    baca tier. Lihat memori [[cabor-id-drift]].
 */
export async function getCaborSubscription(cabor_id: number): Promise<CaborSubscription | null> {
  const { data, error } = await supabase
    .from('cabor_subscription')
    .select('*')
    .eq('cabor_id', cabor_id)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return null
  return data as CaborSubscription
}

/**
 * Check apakah cabor punya akses ke tier minimum tertentu
 * 
 * @example
 * await hasTierAccess(67, 'pro')  // true kalau cabor 67 punya tier pro, elite, atau champion
 */
export async function hasTierAccess(cabor_id: number, minTier: SubscriptionTier): Promise<boolean> {
  const sub = await getCaborSubscription(cabor_id)
  if (!sub) return false
  return TIER_RANK[sub.tier] >= TIER_RANK[minTier]
}

/**
 * Check apakah cabor punya fitur spesifik (by feature key)
 * 
 * @example
 * await hasFeature(67, 'uipm_scoring')  // true kalau Pentathlon punya fitur ini
 */
export async function hasFeature(cabor_id: number, featureKey: string): Promise<boolean> {
  const sub = await getCaborSubscription(cabor_id)
  if (!sub) return false
  return sub.features[featureKey] === true
}

/**
 * Get UI badge config untuk tampilkan tier
 */
export function getTierBadgeConfig(tier: SubscriptionTier) {
  const configs = {
    basic: { 
      label: 'BASIC', 
      color: 'slate', 
      bgClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      icon: '🆓',
    },
    pro: { 
      label: 'PRO', 
      color: 'blue', 
      bgClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      icon: '💼',
    },
    elite: { 
      label: 'ELITE', 
      color: 'yellow', 
      bgClass: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      icon: '🏆',
    },
    champion: { 
      label: 'CHAMPION', 
      color: 'purple', 
      bgClass: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30',
      icon: '🌟',
    },
  }
  return configs[tier]
}

/**
 * Pricing constants (untuk landing page nanti)
 */
export const TIER_PRICING = {
  basic: { monthly: 0, label: 'Rp 0 / cabor', description: 'Free forever' },
  pro: { monthly: 2500000, label: 'Rp 2.5 jt / bln', description: 'AI assistant + analytics' },
  elite: { monthly: 10000000, label: 'Rp 10 jt / bln', description: 'Intelligence + content automation' },
  champion: { monthly: 25000000, label: 'Rp 25 jt+ / bln', description: 'Custom modules + dedicated support' },
}
