// src/lib/baseline/time-parser.ts
// Parsing catatan waktu atlet (mm:ss.ss / hh:mm:ss / dst) -> detik, dan hitung gap vs rekor.

/**
 * Ubah string waktu ke total detik.
 * Mendukung format: "54.20", "2.05.18", "01:00.14", "16:51.14", "1:23:45.6".
 * Mengembalikan null untuk nilai kosong / "NT" / "-".
 */
export function parseTimeToSeconds(timeStr: string | number | null | undefined): number | null {
  if (timeStr === null || timeStr === undefined) return null
  const cleaned = timeStr.toString().trim()
  if (!cleaned || /^(nt|n\/a|na|-|–|—)$/i.test(cleaned)) return null

  // Pisah dengan ':' atau '.' sebagai separator menit/detik.
  // Catatan: file Atletik kadang pakai titik sbg separator (mis. "2.05.18" = 2 mnt 5.18 dtk).
  // Heuristik: jika ada ':', itu separator utama; '.' terakhir adalah desimal detik.
  let parts: string[]
  if (cleaned.includes(':')) {
    parts = cleaned.split(':')
  } else if ((cleaned.match(/\./g) || []).length >= 2) {
    // "2.05.18" -> ["2","05","18"]  /  "04.22.15" -> ["04","22","15"]
    parts = cleaned.split('.')
    // gabungkan kembali sbg mm:ss.frac
    if (parts.length === 3) {
      parts = [parts[0], `${parts[1]}.${parts[2]}`]
    }
  } else {
    parts = [cleaned] // murni detik, "54.20"
  }

  const nums = parts.map(p => Number(p.replace(',', '.')))
  if (nums.some(n => Number.isNaN(n))) return null

  let seconds: number
  if (nums.length === 1) seconds = nums[0]
  else if (nums.length === 2) seconds = nums[0] * 60 + nums[1]
  else if (nums.length === 3) seconds = nums[0] * 3600 + nums[1] * 60 + nums[2]
  else return null

  return Math.round(seconds * 1000) / 1000
}

/**
 * Gap persentase atlet vs rekor: ((waktu - rekor) / rekor) * 100.
 * Positif = lebih lambat dari rekor. Null bila salah satu tidak valid.
 */
export function calculateGap(
  athleteTime: string | number | null | undefined,
  recordTime: string | number | null | undefined,
): number | null {
  const athlete = parseTimeToSeconds(athleteTime)
  const record = parseTimeToSeconds(recordTime)
  if (athlete === null || record === null || record === 0) return null
  return Math.round(((athlete - record) / record) * 10000) / 100
}
