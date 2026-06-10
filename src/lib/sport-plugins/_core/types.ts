/**
 * Sport Plugin Architecture — Core Types
 * 
 * Setiap cabor diimplementasikan sebagai plugin.
 * Pentathlon = first POC. Senam, Loncat Indah, Triathlon = future.
 * 
 * Bikin cabor baru = drop folder + register manifest.
 */

import type { SubscriptionTier } from '@/lib/subscription-tier'

export type ScoringStrategy = 
  | 'simple'      // 1 atlet, 1 nilai (lari, lompat jauh)
  | 'time-based'  // waktu (renang, lari)
  | 'judged'      // panel nilai (senam, loncat indah)
  | 'combined'    // multi-disiplin (pentathlon, triathlon)
  | 'tournament'  // bracket KO (badminton, tenis)
  | 'point-set'   // set-based (voli, tenis meja)

export interface SportPluginManifest {
  /** Unique kode plugin, mis. "PENTATHLON", "SENAM" */
  kode: string

  /** Display name */
  nama: string

  /** ID di tabel cabang_olahraga */
  cabor_id: number

  /** Versi plugin */
  version: string

  /** Author/maintainer */
  author: string

  /** Tier minimum subscription untuk akses plugin */
  tier_required: SubscriptionTier

  /** Features yang di-unlock plugin ini */
  features: string[]

  /** Scoring strategy */
  scoring_strategy: ScoringStrategy

  /** Description untuk catalog */
  description: string

  /** Icon (lucide-react atau emoji) */
  icon: string

  /** Color theme */
  color: {
    primary: string    // hex
    accent: string     // tailwind class prefix mis. "yellow"
  }

  /** Custom menu items di sidebar (under "Custom Modules") */
  menu_items: PluginMenuItem[]
}

export interface PluginMenuItem {
  label: string
  href: string
  icon: string        // lucide-react icon name
  step?: string       // workflow step number
  badge?: string      // badge text (mis. "NEW", "BETA")
}

export interface ScoringInput {
  raw: Record<string, any>
  baselines?: any
}

export interface ScoringOutput {
  points: number
  breakdown?: Record<string, number>
  rank?: number
  medali?: 'emas' | 'perak' | 'perunggu' | 'none'
}

export interface SportPlugin {
  manifest: SportPluginManifest
  
  /** Convert raw input to points */
  calculatePoints?: (input: ScoringInput) => ScoringOutput

  /** Custom lineup behavior — berapa nomor per atlet */
  getLineupNomorIds?: (cabor_id: number, gender: 'L' | 'P') => Promise<number[]>

  /** Custom validation */
  validateInput?: (input: any) => { valid: boolean; errors: string[] }
}
