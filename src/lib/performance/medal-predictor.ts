// src/lib/performance/medal-predictor.ts
// FIX P0-2: per-event probability + clear "best event" indicator
// Avoids misleading max-across-events aggregation

export interface MedalProbability {
  emas:     number   // 0-100
  perak:    number   // 0-100
  perunggu: number   // 0-100
}

export interface EventProbability {
  event_name: string
  is_relay:   boolean
  gap:        number | null
  prob:       MedalProbability
  best_medal: 'emas' | 'perak' | 'perunggu' | null   // medali dengan prob tertinggi di event ini
  best_prob:  number    // value dari best_medal
}

export interface AggregateMedalForecast {
  by_event:        EventProbability[]
  best_event:      EventProbability | null   // event dengan best_prob TERTINGGI overall
  expected_medals: { emas: number; perak: number; perunggu: number }  // sum of probabilities / 100
  reachable_count: number                     // jumlah event dengan ≥1 medal prob ≥ 50%
}

/**
 * Predict medal probability untuk SATU event dari gap percentage.
 * Logika dari baseline lama, tetap stabil.
 */
export function predictMedalProbability(gapPercentage: number | null): MedalProbability {
  if (gapPercentage === null || Number.isNaN(gapPercentage)) {
    return { emas: 0, perak: 0, perunggu: 0 }
  }
  
  const gap = Math.abs(gapPercentage)
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
  
  let emas = 0, perak = 0, perunggu = 0
  if (gap <= 3) {
    emas = 75 - gap * 10
    perak = 90 - gap * 5
    perunggu = 95
  } else if (gap <= 7) {
    emas = 45 - gap * 5
    perak = 80 - gap * 5
    perunggu = 90 - gap * 2
  } else if (gap <= 12) {
    emas = 20 - gap * 2
    perak = 50 - gap * 3
    perunggu = 80 - gap * 3
  } else {
    emas = 0
    perak = 20 - gap
    perunggu = 50 - gap
  }
  
  return { emas: clamp(emas), perak: clamp(perak), perunggu: clamp(perunggu) }
}

/**
 * Aggregate forecast across multiple events.
 * Returns per-event breakdown + best event + expected medal count.
 */
export function aggregateMedalForecast(
  events: Array<{ event_name: string; is_relay?: boolean; gap_percentage: number | null; medal_probability?: MedalProbability | null }>
): AggregateMedalForecast {
  const byEvent: EventProbability[] = events.map(e => {
    // Prefer DB-stored medal_probability, else compute from gap
    const prob = e.medal_probability ?? predictMedalProbability(e.gap_percentage)
    const bestMedal = (['emas', 'perak', 'perunggu'] as const)
      .reduce<{ key: 'emas' | 'perak' | 'perunggu'; val: number } | null>((best, k) => {
        if (prob[k] <= 0) return best
        if (!best || prob[k] > best.val) return { key: k, val: prob[k] }
        return best
      }, null)
    
    return {
      event_name: e.event_name,
      is_relay:   !!e.is_relay,
      gap:        e.gap_percentage,
      prob,
      best_medal: bestMedal?.key ?? null,
      best_prob:  bestMedal?.val ?? 0,
    }
  })
  
  // Best event = event with highest single-medal probability
  const bestEvent = byEvent.reduce<EventProbability | null>((best, ev) => {
    if (ev.best_prob === 0) return best
    if (!best || ev.best_prob > best.best_prob) return ev
    return best
  }, null)
  
  // Expected medals (sum of probabilities, weighted)
  // Reasoning: atlet kompete di multiple event, total medal expected adalah sum probability per event
  // But we cap at 1 medal per event (atlet can win at most 1 medal per event)
  const expected = byEvent.reduce(
    (acc, ev) => ({
      emas:     acc.emas + ev.prob.emas / 100,
      perak:    acc.perak + ev.prob.perak / 100,
      perunggu: acc.perunggu + ev.prob.perunggu / 100,
    }),
    { emas: 0, perak: 0, perunggu: 0 }
  )
  
  // Reachable: event dengan setidaknya satu medal prob ≥ 50%
  const reachable = byEvent.filter(ev => 
    ev.prob.emas >= 50 || ev.prob.perak >= 50 || ev.prob.perunggu >= 50
  ).length
  
  return {
    by_event:        byEvent,
    best_event:      bestEvent,
    expected_medals: expected,
    reachable_count: reachable,
  }
}

// ──────────────────────────────────────────────────────────
// GAP TIER + COLORS — improved (P1-12 fix)
// ──────────────────────────────────────────────────────────
export type GapTier = 'elite' | 'strong' | 'moderate' | 'far' | 'unknown'

export function gapTier(gapPercentage: number | null): GapTier {
  if (gapPercentage === null || Number.isNaN(gapPercentage)) return 'unknown'
  const gap = Math.abs(gapPercentage)
  if (gap <= 3) return 'elite'
  if (gap <= 7) return 'strong'
  if (gap <= 12) return 'moderate'
  return 'far'
}

// FIXED P1-12: better gradient (emerald → sky → amber → red)
export const GAP_TIER_COLOR: Record<GapTier, string> = {
  elite:    '#10b981',   // emerald (was green)
  strong:   '#06b6d4',   // sky/cyan (was yellow, confusing)
  moderate: '#f59e0b',   // amber
  far:      '#ef4444',   // red
  unknown:  '#6b7280',   // gray
}

export const GAP_TIER_LABEL: Record<GapTier, string> = {
  elite:    'Elite (≤3% dari rekor)',
  strong:   'Kuat (3-7% dari rekor)',
  moderate: 'Sedang (7-12% dari rekor)',
  far:      'Jauh (>12% dari rekor)',
  unknown:  'Data tidak lengkap',
}
