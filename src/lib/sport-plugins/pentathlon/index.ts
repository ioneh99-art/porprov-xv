/**
 * Pentathlon Sport Plugin — POC
 * 
 * Pattern reusable untuk cabor combined-scoring lain (Senam, Loncat Indah, Triathlon).
 */

import { createClient } from '@supabase/supabase-js'
import type { SportPlugin, SportPluginManifest, ScoringInput, ScoringOutput } from '../_core/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─────────────────────────────────────────────
// MANIFEST
// ─────────────────────────────────────────────
const manifest: SportPluginManifest = {
  kode: 'PENTATHLON',
  nama: 'Modern Pentathlon',
  cabor_id: 67,
  version: '1.0.0',
  author: 'Iwan / PORPROV XV',
  tier_required: 'champion',
  features: [
    'uipm-scoring',
    '5-nomor-lineup',
    'combined-klasemen',
    'settings-formula',
    'realtime',
    'auto-medali',
  ],
  scoring_strategy: 'combined',
  description: 'Modern Pentathlon LA 2028 format: Fencing + Swimming + Obstacle + Laser Run. UIPM official scoring.',
  icon: 'Medal',
  color: {
    primary: '#eab308',
    accent: 'yellow',
  },
  menu_items: [
    { label: 'Dashboard',  href: '/operator/pentathlon',          icon: 'LayoutDashboard' },
    { label: 'Lineup',     href: '/operator/pentathlon/lineup',   icon: 'Users',         step: '1' },
    { label: 'Input Skor', href: '/operator/pentathlon/input',    icon: 'Edit3',         step: '2' },
    { label: 'Klasemen',   href: '/operator/pentathlon/klasemen', icon: 'BarChart2',     step: '3' },
    { label: 'Settings',   href: '/operator/pentathlon/settings', icon: 'Settings' },
  ],
}

// ─────────────────────────────────────────────
// UIPM BASELINES (default, loaded from DB at runtime)
// ─────────────────────────────────────────────
export const DEFAULT_UIPM_BASELINES = {
  fencing: { target_win_percent: 0.7, target_points: 250, points_per_match: 6, total_matches: 10 },
  swimming: { target_seconds: 150, target_points: 250, seconds_per_point: 0.33 },
  obstacle: { target_seconds: 70, target_points: 300, seconds_per_point: 0.33 },
  laser_run: { target_seconds: 660, target_points: 600, seconds_per_point: 0.33 },
}

let CACHED_BASELINES = { ...DEFAULT_UIPM_BASELINES }
let CACHE_LOADED_AT: number | null = null
const CACHE_TTL_MS = 60 * 1000

export type UIPMBaselines = typeof DEFAULT_UIPM_BASELINES

export async function loadUIPMBaselines(forceRefresh = false): Promise<UIPMBaselines> {
  const now = Date.now()
  if (!forceRefresh && CACHE_LOADED_AT && (now - CACHE_LOADED_AT) < CACHE_TTL_MS) {
    return CACHED_BASELINES
  }
  try {
    const { data } = await supabase.from('pentathlon_config')
      .select('baselines').eq('is_active', true)
      .order('updated_at', { ascending: false }).limit(1).maybeSingle()
    if (data?.baselines) {
      CACHED_BASELINES = { ...DEFAULT_UIPM_BASELINES, ...data.baselines }
      CACHE_LOADED_AT = now
    }
    return CACHED_BASELINES
  } catch {
    return DEFAULT_UIPM_BASELINES
  }
}

export async function saveUIPMBaselines(baselines: UIPMBaselines, notes?: string, updated_by?: string): Promise<boolean> {
  try {
    await supabase.from('pentathlon_config').update({ is_active: false }).eq('is_active', true)
    const { error } = await supabase.from('pentathlon_config').insert({
      baselines, is_active: true, notes: notes ?? 'Updated via settings', updated_by,
    })
    if (error) return false
    CACHE_LOADED_AT = null
    await loadUIPMBaselines(true)
    return true
  } catch { return false }
}

// ─────────────────────────────────────────────
// SCORING FUNCTIONS
// ─────────────────────────────────────────────
export interface PentathlonRawScore {
  fencing_victories?: number
  fencing_total_matches?: number
  swimming_seconds?: number
  obstacle_seconds?: number
  laser_run_seconds?: number
}

export interface PentathlonPointsBreakdown {
  fencing: number; swimming: number; obstacle: number; laser_run: number; total: number
}

export function fencingToPoints(wins: number, total: number, baselines = CACHED_BASELINES): number {
  if (!total) return 0
  const b = baselines.fencing
  const diff = (wins / total - b.target_win_percent) * total
  return Math.max(0, Math.round(b.target_points + diff * b.points_per_match))
}

export function swimmingToPoints(seconds: number, baselines = CACHED_BASELINES): number {
  if (!seconds) return 0
  const b = baselines.swimming
  return Math.max(0, Math.round(b.target_points + (b.target_seconds - seconds) / b.seconds_per_point))
}

export function obstacleToPoints(seconds: number, baselines = CACHED_BASELINES): number {
  if (!seconds) return 0
  const b = baselines.obstacle
  return Math.max(0, Math.round(b.target_points + (b.target_seconds - seconds) / b.seconds_per_point))
}

export function laserRunToPoints(seconds: number, baselines = CACHED_BASELINES): number {
  if (!seconds) return 0
  const b = baselines.laser_run
  return Math.max(0, Math.round(b.target_points + (b.target_seconds - seconds) / b.seconds_per_point))
}

export function calculatePentathlonTotal(raw: PentathlonRawScore): PentathlonPointsBreakdown {
  const fencing = (raw.fencing_victories !== undefined && raw.fencing_total_matches !== undefined)
    ? fencingToPoints(raw.fencing_victories, raw.fencing_total_matches) : 0
  const swimming = raw.swimming_seconds ? swimmingToPoints(raw.swimming_seconds) : 0
  const obstacle = raw.obstacle_seconds ? obstacleToPoints(raw.obstacle_seconds) : 0
  const laser_run = raw.laser_run_seconds ? laserRunToPoints(raw.laser_run_seconds) : 0
  return { fencing, swimming, obstacle, laser_run, total: fencing + swimming + obstacle + laser_run }
}

export function parseTime(input: string): number {
  if (!input) return 0
  const t = input.trim()
  if (t.includes(':')) {
    const [mm, ss] = t.split(':')
    return (parseInt(mm) || 0) * 60 + (parseFloat(ss) || 0)
  }
  return parseFloat(t) || 0
}

export function formatTime(seconds: number): string {
  if (!seconds) return '-'
  const mm = Math.floor(seconds / 60)
  const ss = (seconds % 60).toFixed(2)
  return `${String(mm).padStart(2, '0')}:${ss.padStart(5, '0')}`
}

export const UIPM_BASELINES = CACHED_BASELINES

// ─────────────────────────────────────────────
// LINEUP STRATEGY: 1 atlet = 5 nomor
// ─────────────────────────────────────────────
async function getLineupNomorIds(cabor_id: number, gender: 'L' | 'P'): Promise<number[]> {
  const { data } = await supabase.from('nomor_pertandingan')
    .select('id, nama').eq('cabor_id', cabor_id).eq('gender', gender)
  if (!data) return []
  // Exclude Relay (special handling)
  return data.filter(n => !n.nama.includes('Relay')).map(n => n.id)
}

// ─────────────────────────────────────────────
// PLUGIN EXPORT
// ─────────────────────────────────────────────
const PentathlonPlugin: SportPlugin = {
  manifest,
  calculatePoints: (input: ScoringInput): ScoringOutput => {
    const breakdown = calculatePentathlonTotal(input.raw as PentathlonRawScore)
    return { points: breakdown.total, breakdown: { ...breakdown } }
  },
  getLineupNomorIds,
}

export default PentathlonPlugin
