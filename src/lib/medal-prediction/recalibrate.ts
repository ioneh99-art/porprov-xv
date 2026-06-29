// src/lib/medal-prediction/recalibrate.ts
// KBAAS Fase 2.5 — recalibrate medal_probability dari gap baseline + boost medali nasional terbaru.
// Self-contained (service-key) — bisa dipakai cron route maupun runner script.

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export interface MedalProbability { emas: number; perak: number; perunggu: number }

const MEDAL_BOOST: Record<string, MedalProbability> = {
  EMAS:     { emas: 0.30, perak: 0.15, perunggu: 0.05 },
  PERAK:    { emas: 0.20, perak: 0.25, perunggu: 0.10 },
  PERUNGGU: { emas: 0.10, perak: 0.20, perunggu: 0.25 },
}
const WINDOW_DAYS = 180

function baseProb(gap: number | null): MedalProbability {
  if (gap === null || isNaN(gap)) return { emas: 0.10, perak: 0.20, perunggu: 0.30 }
  const g = Math.abs(gap)
  if (g <= 1)  return { emas: 0.65, perak: 0.25, perunggu: 0.08 }
  if (g <= 3)  return { emas: 0.40, perak: 0.35, perunggu: 0.18 }
  if (g <= 5)  return { emas: 0.25, perak: 0.35, perunggu: 0.30 }
  if (g <= 10) return { emas: 0.12, perak: 0.25, perunggu: 0.35 }
  if (g <= 15) return { emas: 0.05, perak: 0.15, perunggu: 0.30 }
  return { emas: 0.02, perak: 0.08, perunggu: 0.20 }
}
const clamp = (v: number) => Math.min(1, Math.max(0, v))
const r2 = (v: number) => Math.round(v * 100) / 100

export interface RecalcResult {
  atlet_id: number; baseline_id: number; event_name: string
  old: MedalProbability; neu: MedalProbability
}

export async function recalibrateAtlet(atletId: number): Promise<RecalcResult[]> {
  const { data: baselines } = await sb.from('atlet_baseline_performance').select('*').eq('atlet_id', atletId).eq('is_latest', true)
  if (!baselines || baselines.length === 0) return []

  const cutoff = new Date(Date.now() - WINDOW_DAYS * 864e5).toISOString()
  const { data: medals } = await sb.from('event_kejurnas_results')
    .select('id, medal, event_date').eq('atlet_id', atletId).not('medal', 'is', null).gte('event_date', cutoff)
    .order('event_date', { ascending: false })

  const out: RecalcResult[] = []
  for (const b of baselines) {
    const old: MedalProbability = b.medal_probability || { emas: 0, perak: 0, perunggu: 0 }
    const gap = b.gap_percentage != null ? parseFloat(String(b.gap_percentage)) : null
    const neu = baseProb(gap)

    const boost = { emas: 0, perak: 0, perunggu: 0 }
    const sources: any[] = []
    for (const m of medals || []) {
      const bb = MEDAL_BOOST[m.medal as string]; if (!bb) continue
      const days = (Date.now() - new Date(m.event_date).getTime()) / 864e5
      const decay = Math.max(0.3, 1 - days / WINDOW_DAYS)
      boost.emas += bb.emas * decay; boost.perak += bb.perak * decay; boost.perunggu += bb.perunggu * decay
      sources.push({ event_id: m.id, medal: m.medal, date: m.event_date, decay: r2(decay) })
    }
    neu.emas = clamp(neu.emas + boost.emas); neu.perak = clamp(neu.perak + boost.perak); neu.perunggu = clamp(neu.perunggu + boost.perunggu)
    const total = neu.emas + neu.perak + neu.perunggu
    if (total > 1) { neu.emas /= total; neu.perak /= total; neu.perunggu /= total }
    neu.emas = r2(neu.emas); neu.perak = r2(neu.perak); neu.perunggu = r2(neu.perunggu)

    await sb.from('atlet_baseline_performance').update({
      medal_probability: neu,
      last_recalibrated_at: new Date().toISOString(),
      recalibration_source: { gap_pct: gap, base_probability: baseProb(gap), medal_boost: boost, recent_medals_count: medals?.length || 0, boost_sources: sources, calculated_at: new Date().toISOString() },
      national_medal_boost: boost,
    }).eq('id', b.id)

    out.push({ atlet_id: atletId, baseline_id: b.id, event_name: b.event_name, old, neu })
  }
  return out
}

export async function recalibrateAll(kontingenId?: number) {
  // hanya atlet yg punya baseline aktif (jauh lebih sedikit dari seluruh roster)
  const { data: rows } = await sb.from('atlet_baseline_performance')
    .select('atlet_id, atlet:atlet_id(kontingen_id)').eq('is_latest', true)
  const ids = new Set<number>()
  for (const r of (rows ?? []) as any[]) {
    if (!kontingenId || r.atlet?.kontingen_id === kontingenId) ids.add(r.atlet_id)
  }
  let processed = 0, errors = 0
  const idList = Array.from(ids)
  for (const id of idList) {
    try { await recalibrateAtlet(id); processed++ } catch { errors++ }
  }
  return { processed, errors, total: idList.length }
}
