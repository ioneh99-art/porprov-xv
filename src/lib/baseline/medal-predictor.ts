// src/lib/baseline/medal-predictor.ts
// Estimasi probabilitas medali dari gap performa vs rekor PORPROV.

export interface MedalProbability {
  emas: number
  perak: number
  perunggu: number
}

/**
 * Prediksi probabilitas medali (0-100) berdasar gap persentase ke rekor.
 * Makin kecil gap (mendekati rekor), makin tinggi peluang emas.
 * gap null -> semua 0 (tidak ada data waktu/rekor).
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

/** Label kategori gap untuk pewarnaan UI. */
export type GapTier = 'elite' | 'strong' | 'moderate' | 'far' | 'unknown'

export function gapTier(gapPercentage: number | null): GapTier {
  if (gapPercentage === null || Number.isNaN(gapPercentage)) return 'unknown'
  const gap = Math.abs(gapPercentage)
  if (gap <= 3) return 'elite'
  if (gap <= 7) return 'strong'
  if (gap <= 12) return 'moderate'
  return 'far'
}

/** Warna hex per tier (hijau -> amber -> coral -> merah). */
export const GAP_TIER_COLOR: Record<GapTier, string> = {
  elite:    '#22c55e',
  strong:   '#eab308',
  moderate: '#f97316',
  far:      '#ef4444',
  unknown:  '#6b7280',
}
