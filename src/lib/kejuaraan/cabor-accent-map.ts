// src/lib/kejuaraan/cabor-accent-map.ts
// Cabor-specific accent colors + slug helpers untuk kejuaraan pages
// Extends baseline/cabor-map.ts dengan coverage cabor PORPROV XV

import {
  Activity, Waves, type LucideIcon,
  Trophy, Target, Shield, Crosshair, Anchor, Heart,
  Zap, Disc, ChevronsUpDown, Star, Award, Flag,
  Hand, Mountain, Bike, Sword, Footprints,
} from 'lucide-react'

// ──────────────────────────────────────────────────────────
// COLOR MAP — sesuaikan dengan baseline untuk Atletik & Akuatik
// ──────────────────────────────────────────────────────────
export const CABOR_ACCENT: Record<string, string> = {
  // Match baseline accent
  'Atletik':              '#f97316',  // orange (cocok baseline)
  'Akuatik':              '#06b6d4',  // cyan (cocok baseline)
  'Renang':               '#06b6d4',  // cyan (alias Akuatik)
  
  // Permainan
  'Sepak Bola':           '#16a34a',  // green
  'Futsal':               '#15803d',  // green-dark
  'Bola Basket':          '#fb923c',  // orange-light
  'Voli':                 '#eab308',  // yellow
  'Voli Pasir':           '#facc15',  // yellow-bright
  'Bola Tangan':          '#f59e0b',  // amber
  'Hoki':                 '#0d9488',  // teal-dark
  
  // Raket
  'Bulu Tangkis':         '#a855f7',  // purple
  'Tenis':                '#22c55e',  // green
  'Tenis Meja':           '#10b981',  // emerald
  'Squash':               '#f43f5e',  // rose
  
  // Bela Diri
  'Pencak Silat':         '#dc2626',  // red
  'Karate':               '#b91c1c',  // red-dark
  'Taekwondo':            '#7c3aed',  // violet
  'Judo':                 '#1e40af',  // blue-dark
  'Gulat':                '#92400e',  // brown
  'Tinju':                '#ef4444',  // red
  'Wushu':                '#be123c',  // crimson
  'Tarung Derajat':       '#9f1239',  // rose-dark
  'Tarung':               '#dc2626',  // red
  
  // Air
  'Dayung':               '#0891b2',  // teal
  'Selam':                '#0e7490',  // teal-darker
  'Layar':                '#0284c7',  // blue
  'Polo Air':             '#0369a1',  // blue-darker
  'Ski Air':              '#0c4a6e',  // navy
  
  // Senam/Estetika
  'Senam':                '#ec4899',  // pink
  'Senam Artistik':       '#db2777',  // pink-dark
  'Senam Ritmik':         '#f472b6',  // pink-light
  
  // Akurasi
  'Panahan':              '#84cc16',  // lime
  'Menembak':             '#475569',  // slate
  'Catur':                '#64748b',  // slate-light
  
  // Olympic Misc
  'Anggar':               '#6366f1',  // indigo
  'Angkat Besi':          '#1c1917',  // stone-darkest
  'Angkat Berat':         '#292524',  // stone-darker
  'Binaraga':             '#44403c',  // stone
  
  // Sepeda
  'Balap Sepeda':         '#fbbf24',  // amber-light
  'Sepeda Gunung':        '#65a30d',  // green-dark
  'BMX':                  '#ea580c',  // orange-dark
  
  // Lainnya
  'Berkuda':              '#78350f',  // brown-dark
  'Golf':                 '#16a34a',  // green
  'Modern Pentathlon':    '#7c3aed',  // violet
  'Petanque':             '#a16207',  // amber-darker
  'Sepak Takraw':         '#0f766e',  // teal
}

export const DEFAULT_ACCENT = '#38bdf8'  // sky

export function getCaborAccent(nama: string | null | undefined): string {
  if (!nama) return DEFAULT_ACCENT
  // Exact match first
  if (CABOR_ACCENT[nama]) return CABOR_ACCENT[nama]
  // Case-insensitive fallback
  const normalized = nama.trim()
  const key = Object.keys(CABOR_ACCENT).find(k => k.toLowerCase() === normalized.toLowerCase())
  return key ? CABOR_ACCENT[key] : DEFAULT_ACCENT
}

// ──────────────────────────────────────────────────────────
// ICON MAP — lucide icon per cabor
// ──────────────────────────────────────────────────────────
export const CABOR_ICON: Record<string, LucideIcon> = {
  'Atletik':              Activity,
  'Akuatik':              Waves,
  'Renang':               Waves,
  'Sepak Bola':           Target,
  'Futsal':               Target,
  'Bola Basket':          Disc,
  'Voli':                 ChevronsUpDown,
  'Voli Pasir':           ChevronsUpDown,
  'Bulu Tangkis':         Disc,
  'Tenis':                Disc,
  'Tenis Meja':           Disc,
  'Pencak Silat':         Shield,
  'Karate':               Shield,
  'Taekwondo':            Shield,
  'Judo':                 Shield,
  'Tinju':                Hand,
  'Gulat':                Hand,
  'Wushu':                Shield,
  'Dayung':               Anchor,
  'Selam':                Anchor,
  'Layar':                Anchor,
  'Polo Air':             Waves,
  'Senam':                Star,
  'Senam Artistik':       Star,
  'Senam Ritmik':         Star,
  'Panahan':              Crosshair,
  'Menembak':             Crosshair,
  'Catur':                Award,
  'Anggar':               Sword,
  'Angkat Besi':          Trophy,
  'Angkat Berat':         Trophy,
  'Balap Sepeda':         Bike,
  'Sepeda Gunung':        Mountain,
  'BMX':                  Bike,
  'Berkuda':              Footprints,
  'Modern Pentathlon':    Flag,
  'Petanque':             Disc,
  'Sepak Takraw':         Target,
}

export function getCaborIcon(nama: string | null | undefined): LucideIcon {
  if (!nama) return Trophy
  return CABOR_ICON[nama] || Trophy
}

// ──────────────────────────────────────────────────────────
// SLUG HELPERS — untuk routing /[cabor_slug]
// ──────────────────────────────────────────────────────────
export function caborToSlug(nama: string): string {
  return nama
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // remove non-alphanumeric except spaces & hyphens
    .replace(/\s+/g, '-')            // spaces → hyphens
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .replace(/^-|-$/g, '')           // trim leading/trailing hyphens
}

export function slugToCaborName(slug: string, allCaborNames: string[]): string | null {
  return allCaborNames.find(n => caborToSlug(n) === slug) || null
}

// ──────────────────────────────────────────────────────────
// CABOR FLAGS — apakah cabor punya baseline data atau tidak
// ──────────────────────────────────────────────────────────
export const CABORS_WITH_BASELINE = ['Atletik', 'Akuatik', 'Renang']

export function hasBaselineData(nama: string): boolean {
  return CABORS_WITH_BASELINE.some(c => c.toLowerCase() === nama.toLowerCase())
}
