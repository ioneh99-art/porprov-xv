// src/lib/sport-plugins/dayung/config.ts
// Konstanta & metadata plugin Operator Dayung (PORPROV XV).
// Catatan arsitektur: Dayung dikonsolidasikan ke cabang_olahraga id 147.
// (Data lama tersebar di 34/35/36; id 2 = Paramotor, BUKAN Dayung.)

export const DAYUNG = {
  caborId: 147,
  caborName: 'Dayung',
  kontingenId: 4, // Kab. Bandung (default tenant)
  route: '/operator/dayung',
  // id cabang_olahraga lama yang sudah dimerge ke 147 (untuk query historis bila perlu)
  legacyCaborIds: [34, 35, 36],
} as const

export const DAYUNG_DISIPLIN = ['Canoe', 'Kayak', 'Rowing', 'TBR'] as const
export type DayungDisiplin = (typeof DAYUNG_DISIPLIN)[number]

export const DAYUNG_COLORS = {
  primary: '#0EA5E9',     // sky-500 (water blue)
  primaryDark: '#0369A1', // sky-700
  accent: '#FBBF24',      // amber-400 (gold)
  bgDeep: '#0F172A',      // slate-900
}

// Kategori kesiapan fisik (dari atlet_tes_fisik.kesimpulan_kategori / persen)
export function fitnessTier(persen: number | null | undefined): {
  label: string; color: string; bg: string
} {
  if (persen == null) return { label: 'Belum Tes', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
  if (persen >= 85) return { label: 'ELITE',  color: '#fbbf24', bg: 'rgba(251,191,36,0.14)' }
  if (persen >= 70) return { label: 'BAGUS',  color: '#34d399', bg: 'rgba(52,211,153,0.14)' }
  if (persen >= 55) return { label: 'CUKUP',  color: '#facc15', bg: 'rgba(250,204,21,0.14)' }
  return { label: 'KURANG', color: '#f87171', bg: 'rgba(248,113,113,0.14)' }
}

export const genderLabel = (g: string | null) => (g === 'L' ? 'Putra' : g === 'P' ? 'Putri' : g === 'MIX' || g === 'MIXED' ? 'Mixed' : (g ?? '-'))

export function umurDari(tglLahir: string | null): number | null {
  if (!tglLahir) return null
  const b = new Date(tglLahir)
  const now = new Date('2026-11-07') // patokan PORPROV XV
  let u = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) u--
  return u
}
