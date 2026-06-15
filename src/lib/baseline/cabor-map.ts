// src/lib/baseline/cabor-map.ts
// Pemetaan cabor untuk fitur Baseline Performance (slug <-> id <-> meta).

export interface CaborMeta {
  slug: string
  id: number
  name: string
  label: string
  icon: 'run' | 'swim'
}

export const CABOR_META: CaborMeta[] = [
  { slug: 'atletik',         id: 10, name: 'Atletik',          label: 'Track & Field', icon: 'run'  },
  { slug: 'akuatik-renang',  id: 7,  name: 'Akuatik – Renang', label: 'Swimming',      icon: 'swim' },
]

export const ACCENT = '#38bdf8' // biru Kab. Bandung

export function caborBySlug(slug: string): CaborMeta | undefined {
  return CABOR_META.find(c => c.slug === slug)
}
export function caborById(id: number): CaborMeta | undefined {
  return CABOR_META.find(c => c.id === id)
}
/** Slug fallback dari id (kalau cabor di luar peta, tetap bisa dirender). */
export function slugForId(id: number): string {
  return caborById(id)?.slug ?? `cabor-${id}`
}
