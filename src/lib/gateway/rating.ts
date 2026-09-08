// src/lib/gateway/rating.ts
// Penurunan kategori & rating tes biomotorik dari skor persen.
// Ambangnya diturunkan dari 249 baris tes tahap 3 yang sudah ada, supaya
// data baru konsisten dengan yang lama (bukan angka karangan).

export function kategoriDariPersen(persen: number | null): string | null {
  if (persen == null) return null
  if (persen >= 90) return 'Baik Sekali'
  if (persen >= 75) return 'Baik'
  if (persen >= 60) return 'Cukup'
  if (persen >= 40) return 'Kurang'
  return 'Kurang Sekali'
}

export function ratingDariPersen(persen: number | null, statusTes: string | null): string | null {
  if (statusTes && statusTes.toLowerCase() !== 'hadir') return '⚠️ Tidak Hadir'
  if (persen == null) return null
  if (persen >= 80) return '⭐ ELITE'
  if (persen >= 65) return '✅ READY'
  if (persen >= 50) return '🟡 NEEDS WORK'
  if (persen >= 35) return '🔴 SUB-PAR'
  return '🚨 KRITIS'
}
