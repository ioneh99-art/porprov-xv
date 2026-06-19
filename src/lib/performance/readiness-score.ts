// src/lib/performance/readiness-score.ts
// Combined readiness score untuk Performance module
// Gabungan: fitness (35%) + technical (35%) + career (30%)
// Output: 0-100 score + tier label

export interface ReadinessInput {
  fitnessPersen?:  number | null      // 0-100, dari atlet_tes_fisik.kesimpulan_persen latest
  avgGap?:         number | null      // dari atlet_baseline_performance avg gap %
  topLevel?:       string | null      // dari riwayat_prestasi best level
  totalMedals?:    number             // emas+perak+perunggu count
  emasCount?:      number             // emas count
  perakCount?:     number             // perak count
  perungguCount?:  number             // perunggu count
}

export interface ReadinessResult {
  score:        number   // 0-100
  tier:         'unggulan' | 'potensial' | 'developing' | 'concern' | 'unknown'
  tierLabel:    string
  tierColor:    string
  breakdown: {
    fitness:    number   // 0-100
    technical:  number   // 0-100
    career:     number   // 0-100
  }
  weights: {
    fitness:    number   // 0-1
    technical:  number   // 0-1
    career:     number   // 0-1
  }
  hasData: {
    fitness:    boolean
    technical:  boolean
    career:     boolean
  }
}

const LEVEL_SCORE: Record<string, number> = {
  'Internasional': 100,
  'Nasional':      80,
  'Provinsi':      60,
  'Kabupaten':     40,
  'Lokal':         20,
}

// FIXED P1-10: tiered fitness instead of cliff at 70%
function fitnessScore(persen: number | null | undefined): number {
  if (persen === null || persen === undefined) return 0
  // Direct mapping — no cliff
  return Math.max(0, Math.min(100, persen))
}

function technicalScore(avgGap: number | null | undefined): number {
  if (avgGap === null || avgGap === undefined) return 0
  // Gap 0% = 100 score, gap 20% = 0 score
  const gap = Math.abs(avgGap)
  return Math.max(0, Math.min(100, 100 - gap * 5))
}

function careerScore(input: ReadinessInput): number {
  const levelComp = LEVEL_SCORE[input.topLevel || ''] || 0
  // Medal component: emas=3x, perak=2x, perunggu=1x weight
  const medalRaw = (input.emasCount ?? 0) * 3 + (input.perakCount ?? 0) * 2 + (input.perungguCount ?? 0) * 1
  const medalComp = Math.min(100, medalRaw * 10)  // 10 emas = max
  return Math.round(levelComp * 0.6 + medalComp * 0.4)
}

const TIER_CONFIG = {
  unggulan:   { min: 75, label: 'Unggulan',   color: '#10b981', desc: 'Siap medali — fisik & teknik prima, track record kuat' },
  potensial:  { min: 55, label: 'Potensial',  color: '#3b82f6', desc: 'Promising — perlu kalibrasi salah satu aspek' },
  developing: { min: 35, label: 'Developing', color: '#f59e0b', desc: 'Berkembang — butuh program latihan terstruktur' },
  concern:    { min: 0,  label: 'Perhatian',  color: '#ef4444', desc: 'Kritis — multiple gap, butuh intervensi serius' },
  unknown:    { min: 0,  label: 'Data Kurang',color: '#6b7280', desc: 'Belum cukup data untuk asesmen' },
}

export function calculateReadiness(input: ReadinessInput): ReadinessResult {
  const hasFitness   = input.fitnessPersen !== null && input.fitnessPersen !== undefined
  const hasTechnical = input.avgGap !== null && input.avgGap !== undefined
  const hasCareer    = (input.totalMedals ?? 0) > 0 || (input.topLevel != null)
  
  const dataPoints = [hasFitness, hasTechnical, hasCareer].filter(Boolean).length
  
  if (dataPoints === 0) {
    return {
      score: 0,
      tier: 'unknown',
      tierLabel: TIER_CONFIG.unknown.label,
      tierColor: TIER_CONFIG.unknown.color,
      breakdown: { fitness: 0, technical: 0, career: 0 },
      weights:   { fitness: 0, technical: 0, career: 0 },
      hasData:   { fitness: hasFitness, technical: hasTechnical, career: hasCareer },
    }
  }
  
  // Base weights
  let wF = 0.35, wT = 0.35, wC = 0.30
  
  // Redistribute weight kalau data missing
  const missingWeight = (!hasFitness ? wF : 0) + (!hasTechnical ? wT : 0) + (!hasCareer ? wC : 0)
  const presentCount  = [hasFitness, hasTechnical, hasCareer].filter(Boolean).length
  const redistribute  = presentCount > 0 ? missingWeight / presentCount : 0
  
  if (!hasFitness)   wF = 0
  else               wF += redistribute - (hasFitness   ? 0 : redistribute)
  if (!hasTechnical) wT = 0
  else               wT += redistribute - (hasTechnical ? 0 : redistribute)
  if (!hasCareer)    wC = 0
  else               wC += redistribute - (hasCareer    ? 0 : redistribute)
  
  // Recompute weights cleanly
  const baseW = { fitness: 0.35, technical: 0.35, career: 0.30 }
  const has = { fitness: hasFitness, technical: hasTechnical, career: hasCareer }
  const presentTotal = (has.fitness ? baseW.fitness : 0) + (has.technical ? baseW.technical : 0) + (has.career ? baseW.career : 0)
  const weights = {
    fitness:   has.fitness   && presentTotal > 0 ? baseW.fitness   / presentTotal : 0,
    technical: has.technical && presentTotal > 0 ? baseW.technical / presentTotal : 0,
    career:    has.career    && presentTotal > 0 ? baseW.career    / presentTotal : 0,
  }
  
  const breakdown = {
    fitness:   fitnessScore(input.fitnessPersen),
    technical: technicalScore(input.avgGap),
    career:    careerScore(input),
  }
  
  const score = Math.round(
    breakdown.fitness   * weights.fitness +
    breakdown.technical * weights.technical +
    breakdown.career    * weights.career
  )
  
  let tier: ReadinessResult['tier'] = 'concern'
  if (dataPoints < 2) tier = 'unknown'
  else if (score >= TIER_CONFIG.unggulan.min)   tier = 'unggulan'
  else if (score >= TIER_CONFIG.potensial.min)  tier = 'potensial'
  else if (score >= TIER_CONFIG.developing.min) tier = 'developing'
  else                                          tier = 'concern'
  
  return {
    score,
    tier,
    tierLabel: TIER_CONFIG[tier].label,
    tierColor: TIER_CONFIG[tier].color,
    breakdown,
    weights,
    hasData:   has,
  }
}

export function readinessTierConfig(tier: ReadinessResult['tier']) {
  return TIER_CONFIG[tier]
}
