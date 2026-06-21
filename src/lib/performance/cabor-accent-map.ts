// src/lib/performance/cabor-accent-map.ts
// Unified cabor metadata: accent color, icon, slug, peak age window
// Used by Performance module (baseline + kejuaraan unified)

import {
  Activity, Waves, type LucideIcon,
  Trophy, Target, Shield, Crosshair, Anchor, Heart,
  Zap, Disc, ChevronsUpDown, Star, Award, Flag,
  Hand, Mountain, Bike, Sword, Footprints,
} from 'lucide-react'

// ──────────────────────────────────────────────────────────
// PEAK AGE WINDOW — per cabor, used as FALLBACK
// Priority: DB cabang_olahraga.{min_umur,avg_umur,max_umur} > this map > generic 20-30
// ──────────────────────────────────────────────────────────
export interface PeakAgeWindow {
  min:   number    // batas bawah window
  max:   number    // batas atas window
  avg:   number    // typical peak
  label: string    // descriptive
}

export const CABOR_PEAK_AGE: Record<string, PeakAgeWindow> = {
  // Aquatic / Time-based
  'Atletik':              { min: 21, max: 30, avg: 25, label: 'Track & Field — peak fisik dewasa awal' },
  'Akuatik':              { min: 16, max: 24, avg: 20, label: 'Renang — peak muda' },
  'Renang':               { min: 16, max: 24, avg: 20, label: 'Renang — peak muda' },
  'Selam':                { min: 22, max: 32, avg: 27, label: 'Selam — peak dewasa pertengahan' },
  'Polo Air':             { min: 22, max: 30, avg: 26, label: 'Polo Air' },
  'Dayung':               { min: 22, max: 30, avg: 26, label: 'Dayung — power endurance' },
  'Layar':                { min: 22, max: 35, avg: 28, label: 'Layar' },
  
  // Permainan tim
  'Sepak Bola':           { min: 24, max: 30, avg: 27, label: 'Sepak Bola — peak teknis' },
  'Futsal':               { min: 22, max: 28, avg: 25, label: 'Futsal' },
  'Bola Basket':          { min: 24, max: 32, avg: 27, label: 'Basket — peak athletic' },
  'Voli':                 { min: 22, max: 30, avg: 26, label: 'Voli' },
  'Voli Pasir':           { min: 24, max: 32, avg: 28, label: 'Voli Pasir' },
  'Bola Tangan':          { min: 22, max: 30, avg: 26, label: 'Bola Tangan' },
  'Hoki':                 { min: 22, max: 30, avg: 26, label: 'Hoki' },
  
  // Raket
  'Bulu Tangkis':         { min: 22, max: 28, avg: 25, label: 'Bulu Tangkis — peak teknis' },
  'Tenis':                { min: 22, max: 30, avg: 26, label: 'Tenis' },
  'Tenis Meja':           { min: 22, max: 30, avg: 25, label: 'Tenis Meja' },
  'Squash':               { min: 22, max: 30, avg: 26, label: 'Squash' },
  
  // Bela Diri
  'Pencak Silat':         { min: 20, max: 28, avg: 24, label: 'Pencak Silat' },
  'Karate':               { min: 20, max: 28, avg: 24, label: 'Karate' },
  'Taekwondo':            { min: 20, max: 28, avg: 24, label: 'Taekwondo' },
  'Judo':                 { min: 20, max: 30, avg: 25, label: 'Judo — peak power' },
  'Gulat':                { min: 22, max: 30, avg: 26, label: 'Gulat' },
  'Tinju':                { min: 20, max: 30, avg: 25, label: 'Tinju' },
  'Wushu':                { min: 20, max: 28, avg: 24, label: 'Wushu' },
  'Tarung Derajat':       { min: 20, max: 28, avg: 24, label: 'Tarung Derajat' },
  'Tarung':               { min: 20, max: 28, avg: 24, label: 'Tarung' },
  
  // Senam / Estetika — early peak
  'Senam':                { min: 18, max: 25, avg: 21, label: 'Senam — peak early adult' },
  'Senam Artistik':       { min: 18, max: 25, avg: 21, label: 'Senam Artistik — peak early' },
  'Senam Ritmik':         { min: 18, max: 23, avg: 20, label: 'Senam Ritmik — peak very early' },
  
  // Akurasi — late peak
  'Panahan':              { min: 22, max: 32, avg: 27, label: 'Panahan — mature peak' },
  'Menembak':             { min: 25, max: 40, avg: 30, label: 'Menembak — peak senior' },
  'Catur':                { min: 25, max: 40, avg: 30, label: 'Catur — peak senior' },
  
  // Olympic misc
  'Anggar':               { min: 22, max: 30, avg: 26, label: 'Anggar' },
  'Angkat Besi':          { min: 24, max: 32, avg: 28, label: 'Angkat Besi — peak power' },
  'Angkat Berat':         { min: 24, max: 32, avg: 28, label: 'Angkat Berat' },
  'Binaraga':             { min: 25, max: 40, avg: 32, label: 'Binaraga' },
  
  // Sepeda
  'Balap Sepeda':         { min: 24, max: 32, avg: 28, label: 'Balap Sepeda — peak endurance' },
  'Sepeda Gunung':        { min: 22, max: 30, avg: 26, label: 'Sepeda Gunung' },
  'BMX':                  { min: 20, max: 28, avg: 24, label: 'BMX' },
  
  // Lainnya
  'Berkuda':              { min: 25, max: 40, avg: 30, label: 'Berkuda — peak senior' },
  'Golf':                 { min: 25, max: 38, avg: 30, label: 'Golf' },
  'Modern Pentathlon':    { min: 22, max: 30, avg: 26, label: 'Modern Pentathlon' },
  'Petanque':             { min: 25, max: 50, avg: 35, label: 'Petanque — bebas usia' },
  'Sepak Takraw':         { min: 22, max: 30, avg: 26, label: 'Sepak Takraw' },
}

export function getPeakAgeWindow(nama: string | null | undefined, dbValues?: { min_umur?: number; avg_umur?: number; max_umur?: number }): PeakAgeWindow | null {
  // Priority 1: DB values from cabang_olahraga
  if (dbValues && dbValues.min_umur && dbValues.max_umur) {
    return {
      min:   dbValues.min_umur,
      max:   dbValues.max_umur,
      avg:   dbValues.avg_umur ?? Math.round((dbValues.min_umur + dbValues.max_umur) / 2),
      label: `${nama || 'Cabor'} — dari data cabor`,
    }
  }
  
  // Priority 2: Hardcoded map (case-sensitive first, then case-insensitive)
  if (!nama) return null
  if (CABOR_PEAK_AGE[nama]) return CABOR_PEAK_AGE[nama]
  const key = Object.keys(CABOR_PEAK_AGE).find(k => k.toLowerCase() === nama.toLowerCase())
  return key ? CABOR_PEAK_AGE[key] : null
}

// ──────────────────────────────────────────────────────────
// COLOR MAP — sesuaikan dengan baseline untuk Atletik & Akuatik
// ──────────────────────────────────────────────────────────
export const CABOR_ACCENT: Record<string, string> = {
  'Atletik':              '#f97316',  // orange (cocok baseline)
  'Akuatik':              '#06b6d4',  // cyan
  'Renang':               '#06b6d4',
  'Sepak Bola':           '#16a34a',  // green
  'Futsal':               '#15803d',
  'Bola Basket':          '#fb923c',
  'Voli':                 '#eab308',
  'Voli Pasir':           '#facc15',
  'Bola Tangan':          '#f59e0b',
  'Hoki':                 '#0d9488',
  'Bulu Tangkis':         '#a855f7',
  'Tenis':                '#22c55e',
  'Tenis Meja':           '#10b981',
  'Squash':               '#f43f5e',
  'Pencak Silat':         '#dc2626',
  'Karate':               '#b91c1c',
  'Taekwondo':            '#7c3aed',
  'Judo':                 '#1e40af',
  'Gulat':                '#92400e',
  'Tinju':                '#ef4444',
  'Wushu':                '#be123c',
  'Tarung Derajat':       '#9f1239',
  'Tarung':               '#dc2626',
  'Dayung':               '#0891b2',
  'Selam':                '#0e7490',
  'Layar':                '#0284c7',
  'Polo Air':             '#0369a1',
  'Ski Air':              '#0c4a6e',
  'Senam':                '#ec4899',
  'Senam Artistik':       '#db2777',
  'Senam Ritmik':         '#f472b6',
  'Panahan':              '#84cc16',
  'Menembak':             '#475569',
  'Catur':                '#64748b',
  'Anggar':               '#6366f1',
  'Angkat Besi':          '#1c1917',
  'Angkat Berat':         '#292524',
  'Binaraga':             '#44403c',
  'Balap Sepeda':         '#fbbf24',
  'Sepeda Gunung':        '#65a30d',
  'BMX':                  '#ea580c',
  'Berkuda':              '#78350f',
  'Golf':                 '#16a34a',
  'Modern Pentathlon':    '#7c3aed',
  'Petanque':             '#a16207',
  'Sepak Takraw':         '#0f766e',
}

export const DEFAULT_ACCENT = '#38bdf8'  // sky

export function getCaborAccent(nama: string | null | undefined): string {
  if (!nama) return DEFAULT_ACCENT
  if (CABOR_ACCENT[nama]) return CABOR_ACCENT[nama]
  const key = Object.keys(CABOR_ACCENT).find(k => k.toLowerCase() === nama.toLowerCase())
  return key ? CABOR_ACCENT[key] : DEFAULT_ACCENT
}

// ──────────────────────────────────────────────────────────
// ICON MAP
// ──────────────────────────────────────────────────────────
export const CABOR_ICON: Record<string, LucideIcon> = {
  'Atletik': Activity, 'Akuatik': Waves, 'Renang': Waves,
  'Sepak Bola': Target, 'Futsal': Target,
  'Bola Basket': Disc, 'Voli': ChevronsUpDown, 'Voli Pasir': ChevronsUpDown,
  'Bulu Tangkis': Disc, 'Tenis': Disc, 'Tenis Meja': Disc,
  'Pencak Silat': Shield, 'Karate': Shield, 'Taekwondo': Shield, 'Judo': Shield,
  'Tinju': Hand, 'Gulat': Hand, 'Wushu': Shield,
  'Dayung': Anchor, 'Selam': Anchor, 'Layar': Anchor, 'Polo Air': Waves,
  'Senam': Star, 'Senam Artistik': Star, 'Senam Ritmik': Star,
  'Panahan': Crosshair, 'Menembak': Crosshair, 'Catur': Award,
  'Anggar': Sword, 'Angkat Besi': Trophy, 'Angkat Berat': Trophy,
  'Balap Sepeda': Bike, 'Sepeda Gunung': Mountain, 'BMX': Bike,
  'Berkuda': Footprints, 'Modern Pentathlon': Flag, 'Petanque': Disc,
  'Sepak Takraw': Target,
}

export function getCaborIcon(nama: string | null | undefined): LucideIcon {
  if (!nama) return Trophy
  return CABOR_ICON[nama] || Trophy
}

// ──────────────────────────────────────────────────────────
// EMOJI MAP — lebih ekspresif untuk cabor cards
// ──────────────────────────────────────────────────────────
const CABOR_EMOJI: Record<string, string> = {
  'Atletik':          '🏃',
  'Akuatik':          '🏊',
  'Renang':           '🏊',
  'Akuatik - Renang': '🏊',
  'Angkat Berat':     '🏋',
  'Angkat Besi':      '🏋',
  'Binaraga':         '💪',
  'Panahan':          '🏹',
  'Menembak':         '🎯',
  'Catur':            '♟️',
  'Bulu Tangkis':     '🏸',
  'Tenis':            '🎾',
  'Tenis Meja':       '🏓',
  'Sepak Bola':       '⚽',
  'Futsal':           '⚽',
  'Bola Basket':      '🏀',
  'Voli':             '🏐',
  'Voli Pasir':       '🏐',
  'Bola Tangan':      '🤾',
  'Hoki':             '🏑',
  'Polo Air':         '🤽',
  'Dayung':           '🚣',
  'Selam':            '🤿',
  'Layar':            '⛵',
  'Ski Air':          '🎿',
  'Pencak Silat':     '🥋',
  'Karate':           '🥋',
  'Taekwondo':        '🥋',
  'Judo':             '🥋',
  'Wushu':            '🥋',
  'Tinju':            '🥊',
  'Gulat':            '🤼',
  'Tarung Derajat':   '🥊',
  'Senam':            '🤸',
  'Senam Artistik':   '🤸',
  'Senam Ritmik':     '🤸',
  'Balap Sepeda':     '🚴',
  'Sepeda Gunung':    '🚵',
  'BMX':              '🚴',
  'Berkuda':          '🏇',
  'Golf':             '⛳',
  'Petanque':         '🎳',
  'Sepak Takraw':     '🦵',
  'Anggar':           '🤺',
  'Modern Pentathlon':'🎖️',
  'Squash':           '🎾',
}

export function getCaborEmoji(nama: string | null | undefined): string {
  if (!nama) return '🏆'
  return CABOR_EMOJI[nama] || '🏆'
}

// ──────────────────────────────────────────────────────────
// SLUG HELPERS
// ──────────────────────────────────────────────────────────
export function caborToSlug(nama: string): string {
  return nama.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function slugToCaborName(slug: string, allCaborNames: string[]): string | null {
  return allCaborNames.find(n => caborToSlug(n) === slug) || null
}

// ──────────────────────────────────────────────────────────
// CABOR FLAGS
// ──────────────────────────────────────────────────────────
export const CABORS_WITH_BASELINE = [
  'Atletik', 'Akuatik', 'Renang',
  'Angkat Berat', 'Angkat Besi', 'Panahan', 'Menembak', 'Catur',
]

export function hasBaselineData(nama: string): boolean {
  return CABORS_WITH_BASELINE.some(c => c.toLowerCase() === nama.toLowerCase())
}
