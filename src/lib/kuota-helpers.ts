// src/lib/kuota-helpers.ts
// Helper functions untuk modul Kontrol Kuota PORPROV

export interface CaborMaster {
  id:              number
  kode:            string
  nama:            string
  kategori:        string | null
  klaster_venue:   string | null
  is_aktif:        boolean
  catatan:         string | null
  urutan:          number
  legacy_cabor_id: number | null
}

export interface CaborKuota {
  id:            number
  cabor_id:      number
  kontingen_id:  number
  kuota_total:   number
  kuota_putra:   number
  kuota_putri:   number
  kuota_ofisial: number
  catatan:       string | null
  updated_by:    string | null
  updated_at:    string
}

export type StatusKuota = 'OPEN' | 'KRITIS' | 'PENUH' | 'OVER'

export interface CaborKuotaSummary {
  kuota_id:        number
  kontingen_id:    number
  cabor_id:        number
  cabor_kode:      string
  cabor_nama:      string
  kategori:        string | null
  klaster_venue:   string | null
  kuota_total:     number
  kuota_putra:     number
  kuota_putri:     number
  kuota_ofisial:   number
  aktif:           number
  verified:        number
  posted:          number
  pending:         number
  ditolak:         number
  aktif_putra:     number
  aktif_putri:     number
  total_terdaftar: number
  pct:             number
  status_kuota:    StatusKuota
}

// ── Status configuration ────────────────────────
export const STATUS_KUOTA_CFG: Record<StatusKuota, {
  color: string
  bg: string
  border: string
  label: string
}> = {
  OPEN:   { color: '#00ffaa', bg: 'rgba(0,255,170,0.08)',  border: 'rgba(0,255,170,0.25)',  label: 'OPEN'   },
  KRITIS: { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)', label: 'KRITIS' },
  PENUH:  { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.25)', label: 'PENUH'  },
  OVER:   { color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)', label: 'OVER'  },
}

// ── Klaster venue color ────────────────────────
export const KLASTER_CFG: Record<string, { color: string; emoji: string }> = {
  Bekasi: { color: '#f97316', emoji: '🏟' },
  Bogor:  { color: '#10b981', emoji: '🏔' },
  Depok:  { color: '#3b82f6', emoji: '🏙' },
}

// ── Compute gender percentage ────────────────────
export function computeGenderPct(
  aktif: number,
  kuota: number,
): { pct: number; status: StatusKuota } {
  if (kuota === 0) return { pct: 0, status: 'OPEN' }
  const pct = Math.round((aktif / kuota) * 100)
  let status: StatusKuota = 'OPEN'
  if (aktif > kuota) status = 'OVER'
  else if (aktif >= kuota) status = 'PENUH'
  else if (aktif >= kuota * 0.9) status = 'KRITIS'
  return { pct, status }
}

// ── Compute progress bar color ────────────────────
export function getBarColor(status: StatusKuota): string {
  return STATUS_KUOTA_CFG[status].color
}

// ── Group cabors by klaster ────────────────────────
export function groupByKlaster(
  cabors: CaborKuotaSummary[],
): Record<string, CaborKuotaSummary[]> {
  const map: Record<string, CaborKuotaSummary[]> = {}
  cabors.forEach(c => {
    const k = c.klaster_venue || 'Lainnya'
    if (!map[k]) map[k] = []
    map[k].push(c)
  })
  return map
}

// ── Group cabors by kategori ───────────────────────
export function groupByKategori(
  cabors: CaborKuotaSummary[],
): Record<string, CaborKuotaSummary[]> {
  const map: Record<string, CaborKuotaSummary[]> = {}
  cabors.forEach(c => {
    const k = c.kategori || 'Lainnya'
    if (!map[k]) map[k] = []
    map[k].push(c)
  })
  return map
}

// ── Aggregate KPI ─────────────────────────────────
export function aggregateKpi(cabors: CaborKuotaSummary[]) {
  let totalKuota = 0, totalAktif = 0
  let totalKuotaPutra = 0, totalKuotaPutri = 0
  let totalAktifPutra = 0, totalAktifPutri = 0
  let over = 0, kritis = 0, penuh = 0, open = 0
  
  cabors.forEach(c => {
    totalKuota      += c.kuota_total
    totalAktif      += c.aktif
    totalKuotaPutra += c.kuota_putra
    totalKuotaPutri += c.kuota_putri
    totalAktifPutra += c.aktif_putra
    totalAktifPutri += c.aktif_putri
    if (c.status_kuota === 'OVER')   over++
    if (c.status_kuota === 'KRITIS') kritis++
    if (c.status_kuota === 'PENUH')  penuh++
    if (c.status_kuota === 'OPEN')   open++
  })
  
  return {
    totalKuota, totalAktif,
    sisa: Math.max(0, totalKuota - totalAktif),
    pct: totalKuota > 0 ? Math.round((totalAktif / totalKuota) * 100) : 0,
    totalKuotaPutra, totalKuotaPutri,
    totalAktifPutra, totalAktifPutri,
    pctPutra: totalKuotaPutra > 0 ? Math.round((totalAktifPutra / totalKuotaPutra) * 100) : 0,
    pctPutri: totalKuotaPutri > 0 ? Math.round((totalAktifPutri / totalKuotaPutri) * 100) : 0,
    over, kritis, penuh, open,
    totalCabor: cabors.length,
  }
}

// ── Validation Engine ─────────────────────────────
export interface KuotaAlert {
  severity: 'error' | 'warning' | 'info'
  cabor: string
  message: string
}

export function validateKuota(cabors: CaborKuotaSummary[]): KuotaAlert[] {
  const alerts: KuotaAlert[] = []
  
  cabors.forEach(c => {
    if (c.status_kuota === 'OVER') {
      alerts.push({
        severity: 'error',
        cabor: c.cabor_nama,
        message: `${c.cabor_nama} OVER ${c.aktif - c.kuota_total} atlet (${c.aktif}/${c.kuota_total})`,
      })
    }
    if (c.kuota_putra > 0 && c.aktif_putra > c.kuota_putra) {
      alerts.push({
        severity: 'error',
        cabor: c.cabor_nama,
        message: `${c.cabor_nama} kelebihan ${c.aktif_putra - c.kuota_putra} atlet putra`,
      })
    }
    if (c.kuota_putri > 0 && c.aktif_putri > c.kuota_putri) {
      alerts.push({
        severity: 'error',
        cabor: c.cabor_nama,
        message: `${c.cabor_nama} kelebihan ${c.aktif_putri - c.kuota_putri} atlet putri`,
      })
    }
    if (c.status_kuota === 'KRITIS') {
      alerts.push({
        severity: 'warning',
        cabor: c.cabor_nama,
        message: `${c.cabor_nama} mendekati penuh (${c.aktif}/${c.kuota_total})`,
      })
    }
  })
  
  return alerts.sort((a, b) => {
    const order = { error: 0, warning: 1, info: 2 }
    return order[a.severity] - order[b.severity]
  })
}