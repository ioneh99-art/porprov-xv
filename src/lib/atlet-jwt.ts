// src/lib/atlet-jwt.ts
// Rahasia JWT atlet — fail-fast bila env tidak di-set. TANPA fallback literal.
// Lazy (dipanggil saat request), jadi build tetap hijau meski env belum ada di sana.

let cached: Uint8Array | null = null

export function atletJwtSecret(): Uint8Array {
  if (cached) return cached
  const s = process.env.ATLET_JWT_SECRET
  if (!s || s.length < 16) {
    throw new Error('ATLET_JWT_SECRET belum di-set (atau terlalu pendek) — operasi JWT atlet ditolak.')
  }
  cached = new TextEncoder().encode(s)
  return cached
}
