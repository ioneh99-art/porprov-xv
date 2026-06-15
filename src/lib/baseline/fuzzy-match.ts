// src/lib/baseline/fuzzy-match.ts
// Pencocokan nama atlet dari Excel ke record DB (toleran beda spasi/typo ringan).

export interface AtletLite {
  id: number
  nama_lengkap: string
  [key: string]: any
}

/** Normalisasi: uppercase, buang prefix "1. " / "2) ", rapikan spasi. */
export function normalizeName(raw: string): string {
  return (raw || '')
    .toUpperCase()
    .replace(/^\s*\d+\s*[.)-]\s*/, '') // buang "1. " / "2) " / "3 - "
    .replace(/[^A-Z\s]/g, ' ')          // buang karakter non-huruf
    .replace(/\s+/g, ' ')
    .trim()
}

/** Levenshtein distance (untuk toleransi typo seperti HUDSON vs HUDZON). */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  const dp = Array.from({ length: m + 1 }, (_, i) => i)
  for (let j = 1; j <= n; j++) {
    let prev = dp[0]
    dp[0] = j
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i]
      dp[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[i], dp[i - 1])
      prev = tmp
    }
  }
  return dp[m]
}

/**
 * Cari atlet yang cocok dengan nama dari Excel.
 * Strategi berjenjang: exact -> contains -> 2 kata pertama -> fuzzy (Levenshtein <= 2).
 */
export function fuzzyMatchAtlet(excelName: string, dbAthletes: AtletLite[]): AtletLite | null {
  const target = normalizeName(excelName)
  if (!target) return null

  // 1. Exact
  const exact = dbAthletes.find(a => normalizeName(a.nama_lengkap) === target)
  if (exact) return exact

  // 2. Contains (dua arah)
  const contains = dbAthletes.find(a => {
    const db = normalizeName(a.nama_lengkap)
    return db.includes(target) || target.includes(db)
  })
  if (contains) return contains

  // 3. Dua kata pertama sama
  const firstTwo = target.split(' ').slice(0, 2).join(' ')
  const twoWords = dbAthletes.find(a => normalizeName(a.nama_lengkap).startsWith(firstTwo))
  if (twoWords) return twoWords

  // 4. Fuzzy: jarak Levenshtein terkecil pada 2 kata pertama, ambang <= 2
  let best: AtletLite | null = null
  let bestDist = Infinity
  for (const a of dbAthletes) {
    const dbTwo = normalizeName(a.nama_lengkap).split(' ').slice(0, 2).join(' ')
    const d = levenshtein(firstTwo, dbTwo)
    if (d < bestDist) { bestDist = d; best = a }
  }
  return bestDist <= 2 ? best : null
}
