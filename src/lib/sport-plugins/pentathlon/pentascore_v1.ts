/**
 * PentaScore Indonesia — UIPM Modern Pentathlon Scoring Engine
 * ============================================================
 *
 * Source of truth: UIPM Modern Pentathlon Competition Rules
 *                  and Equipment Regulations (as of 1 February 2026)
 *
 * Verified accuracy: 99.52% match against UIPM 2026 Pentathlon World Cup Bonn
 *                    (1248/1254 cells from 318 athletes, 17 sheets)
 *
 * Last verified: 2026-06-10
 * Version key: 'uipm-2026-v1' (matches ps_formula_versions row)
 *
 * NOTE: This file is the PentaScore-specific verified library.
 * It is INTENTIONALLY SEPARATE from the legacy pentathlon/index.ts
 * which is used by the PORPROV operator pentathlon module.
 *
 * Usage:
 *   import { fencingRankingPts, swimmingPts } from '@/lib/sport-plugins/pentathlon/pentascore_v1'
 *
 * @module pentathlon/pentascore_v1
 */

// ════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════

export type PentathlonPhase = 'quali' | 'semi' | 'final'
export type Discipline = 'fencing' | 'swimming' | 'obstacle' | 'laserrun'

export interface FencingRankingInput {
  victories: number
  totalBouts: number
  redCards?: number
}

// ════════════════════════════════════════════════════════════════════
// CONSTANTS — UIPM RULEBOOK SOURCE OF TRUTH
// ════════════════════════════════════════════════════════════════════

/**
 * Appendix 2B1: Points Table Fencing Ranking Round
 * Maps total_bouts → [target_V_for_250pts, pts_per_V_delta]
 * Range: 19 to 60 bouts.
 */
export const FENCING_RANKING_TABLE: Record<number, [number, number]> = {
  19: [13, 8],  20: [14, 8],  21: [15, 8],  22: [15, 8],  23: [16, 7],
  24: [17, 7],  25: [18, 7],  26: [18, 7],  27: [19, 7],  28: [20, 7],
  29: [20, 7],  30: [21, 6],  31: [22, 6],  32: [22, 6],  33: [23, 6],
  34: [24, 5],  35: [25, 5],  36: [25, 5],  37: [26, 5],  38: [27, 5],
  39: [27, 5],  40: [28, 4],  41: [29, 4],  42: [29, 4],  43: [30, 4],
  44: [31, 4],  45: [32, 4],  46: [32, 4],  47: [33, 4],  48: [34, 3],
  49: [34, 3],  50: [35, 3],  51: [36, 3],  52: [36, 3],  53: [37, 3],
  54: [38, 3],  55: [39, 3],  56: [39, 3],  57: [40, 3],  58: [41, 3],
  59: [41, 3],  60: [42, 3],
}

/** Appendix 2B2: Fencing MP Points — Direct Elimination positions 1-18 */
export const FENCING_DE_POINTS: Record<number, number> = {
  1: 250, 2: 244, 3: 238, 4: 236, 5: 230, 6: 228, 7: 226, 8: 224,
  9: 218, 10: 216, 11: 214, 12: 212, 13: 210, 14: 208, 15: 206, 16: 204,
  17: 198, 18: 196,
}

export const FENCING_RED_CARD_PENALTY = 10

// ════════════════════════════════════════════════════════════════════
// FENCING SCORING
// ════════════════════════════════════════════════════════════════════

export function fencingRankingPts(input: FencingRankingInput): number {
  const { victories, totalBouts, redCards = 0 } = input
  const entry = FENCING_RANKING_TABLE[totalBouts]
  if (!entry) {
    throw new Error(
      `Fencing Ranking Round: no table entry for ${totalBouts} bouts ` +
      `(valid range: 19-60 per Appendix 2B1)`
    )
  }
  const [targetV, ptsPerV] = entry
  return 250 + (victories - targetV) * ptsPerV - redCards * FENCING_RED_CARD_PENALTY
}

export function fencingDEPts(dePosition: number): number {
  const pts = FENCING_DE_POINTS[dePosition]
  if (pts === undefined) {
    throw new Error(
      `Fencing DE: invalid position ${dePosition} (valid range: 1-18 per Appendix 2B2)`
    )
  }
  return pts
}

// ════════════════════════════════════════════════════════════════════
// TIME-BASED DISCIPLINES (integer centisecond arithmetic)
// ════════════════════════════════════════════════════════════════════

/** Swimming 200m Freestyle: pts = 600 - floor(5 × time_sec) */
export function swimmingPts(timeCentis: number): number {
  return 600 - Math.floor((5 * timeCentis) / 100)
}

/** Obstacle: pts = floor(445.96 - 3 × time_sec) */
export function obstaclePts(timeCentis: number): number {
  return Math.floor((44596 - 3 * timeCentis) / 100)
}

/** Laser Run: pts = 1300 - floor(time_sec) */
export function laserRunPts(timeCentis: number): number {
  return 1300 - Math.floor(timeCentis / 100)
}

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════

export function timeStrToCentis(timeStr: string): number {
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})\.(\d{2})$/)
  if (!m) throw new Error(`Invalid time format: "${timeStr}" (expected MM:SS.cc)`)
  return parseInt(m[1], 10) * 6000 + parseInt(m[2], 10) * 100 + parseInt(m[3], 10)
}

export function centisToTimeStr(centis: number): string {
  if (!Number.isInteger(centis) || centis < 0) {
    throw new Error(`Invalid centiseconds: ${centis}`)
  }
  const mins = Math.floor(centis / 6000)
  const secs = Math.floor((centis % 6000) / 100)
  const c = centis % 100
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(c).padStart(2, '0')}`
}

export function totalMpPoints(disciplinePts: {
  fencing: number
  swimming: number
  obstacle: number
  laserrun: number
}): number {
  return (
    disciplinePts.fencing +
    disciplinePts.swimming +
    disciplinePts.obstacle +
    disciplinePts.laserrun
  )
}

// ════════════════════════════════════════════════════════════════════
// METADATA
// ════════════════════════════════════════════════════════════════════

export const PENTASCORE_VERSION = 'uipm-2026-v1'

export const SCORING_ENGINE_METADATA = {
  version: PENTASCORE_VERSION,
  formula_source: 'UIPM Modern Pentathlon Competition Rules and Equipment Regulations, as of 1 February 2026',
  verified_against: 'UIPM 2026 Pentathlon World Cup Bonn (318 athletes, 1254 cells)',
  verified_date: '2026-06-10',
  accuracy: '99.52%',
  source_url: 'https://www.uipmworld.org/sites/default/files/uipm_competition_rules_and_equipment_regulations.pdf',
} as const
