// src/lib/sport-plugins/dayung/anomaly.ts
// Deteksi anomali waktu lomba (z-score) — dihitung live dari hasil_pertandingan.
// Lower = lebih cepat (untuk Dayung). |z| > threshold = outlier.

export type Severity = 'low' | 'medium' | 'high' | 'critical'

export interface AnomalyResult {
  is_anomaly: boolean
  z_score: number
  severity: Severity
  reason: 'fast_outlier' | 'slow_outlier' | 'impossible_time' | 'normal' | 'insufficient_data'
}

export function detectAnomaly(value: number, sample: number[], threshold = 2.5): AnomalyResult {
  const others = sample.filter(v => v > 0)
  if (others.length < 5) {
    return { is_anomaly: false, z_score: 0, severity: 'low', reason: 'insufficient_data' }
  }
  const mean = others.reduce((a, b) => a + b, 0) / others.length
  const variance = others.reduce((a, b) => a + (b - mean) ** 2, 0) / others.length
  const stddev = Math.sqrt(variance)
  const z = stddev === 0 ? 0 : (value - mean) / stddev
  const absZ = Math.abs(z)

  let severity: Severity = 'low'
  if (absZ > 4) severity = 'critical'
  else if (absZ > 3) severity = 'high'
  else if (absZ > threshold) severity = 'medium'

  const minRealistic = mean * 0.5 // < 50% rata-rata = mustahil
  const impossible = value < minRealistic
  const isAnomaly = absZ > threshold || impossible
  const reason = impossible ? 'impossible_time'
    : absZ > threshold ? (z < 0 ? 'fast_outlier' : 'slow_outlier')
    : 'normal'

  return { is_anomaly: isAnomaly, z_score: Math.round(z * 1000) / 1000, severity, reason }
}

export const SEVERITY_COLOR: Record<Severity, { color: string; bg: string }> = {
  critical: { color: '#fff', bg: '#e11d48' },
  high:     { color: '#fff', bg: '#f97316' },
  medium:   { color: '#78350f', bg: '#fbbf24' },
  low:      { color: '#475569', bg: '#cbd5e1' },
}

export const reasonLabel: Record<AnomalyResult['reason'], string> = {
  fast_outlier: '⚡ Terlalu cepat',
  slow_outlier: '🐢 Terlalu lambat',
  impossible_time: '🚫 Waktu mustahil',
  normal: 'Normal',
  insufficient_data: 'Data kurang',
}
