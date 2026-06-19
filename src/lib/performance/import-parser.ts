import * as XLSX from 'xlsx'
import type { CaborConfig } from './excel-template'

export interface ParsedRow {
  rowNum:               number
  atlet_nama:           string
  gender?:              string
  event_name:           string
  weight_class?:        string
  periode:              string
  score_raw?:           string
  normalized_score?:    number
  rekor_porprov?:       number
  target_kompetitor?:   number
  gap_percentage?:      number
  target_medali_calc?:  string
  target_medali_pelatih?: string
  raw_metrics:          Record<string, string | number>
  catatan?:             string
  warning?:             string
}

export interface ImportResult {
  rows:        ParsedRow[]
  errors:      string[]
  totalRows:   number
  skippedRows: number
}

// Parse "4:12.50" / "1:52:30" / "52.40" / "1136" → seconds
export function parseTimeToSeconds(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return val

  const s = String(val).trim()
  if (!s) return null
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s)

  // mm:ss.ms
  const m = s.match(/^(\d{1,2}):(\d{2})(?:[.,](\d+))?$/)
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2]) + (m[3] ? parseFloat('0.' + m[3]) : 0)

  // hh:mm:ss.ms
  const h = s.match(/^(\d+):(\d{2}):(\d{2})(?:[.,](\d+))?$/)
  if (h) return parseInt(h[1]) * 3600 + parseInt(h[2]) * 60 + parseInt(h[3]) + (h[4] ? parseFloat('0.' + h[4]) : 0)

  return null
}

export function calculateGap(score: number, rekor: number, lowerIsBetter: boolean): number {
  if (rekor === 0) return 0
  return lowerIsBetter
    ? ((score - rekor) / rekor) * 100
    : ((rekor - score) / rekor) * 100
}

export function gapToMedali(gap: number): string {
  if (gap <= 3)  return 'Emas'
  if (gap <= 7)  return 'Perak'
  if (gap <= 12) return 'Perunggu'
  return 'Peserta'
}

export function gapColor(gap: number | undefined): string {
  if (gap === undefined) return '#475569'
  if (gap <= 3)  return '#10b981'
  if (gap <= 7)  return '#06b6d4'
  if (gap <= 12) return '#f59e0b'
  return '#ef4444'
}

function toScore(val: unknown, sportType: string): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return val
  const s = String(val).trim()
  if (!s) return null
  if (sportType === 'time_lower') return parseTimeToSeconds(s)
  const n = parseFloat(s.replace(',', '.'))
  return isNaN(n) ? null : n
}

// Header text → internal field name
const HEADER_FIELD: Record<string, string> = {
  'Nama Atlet':            'atlet_nama',
  'Gender':                'gender',
  'Nomor Pertandingan':    'event_name',
  'Nomor Event':           'event_name',
  'Kategori':              'kategori',
  'Sub-Cabor':             'sub_cabor',
  'Kelas Berat':           'weight_class',
  'Periode Test':          'periode',
  'Waktu/Jarak Terbaik':   'score_raw',
  'Waktu/Skor Terbaik':    'score_raw',
  'Total Skor Terbaik':    'score_raw',
  'Total Poin':            'score_raw',
  'Skor Terbaik':          'score_raw',
  'Rekor PORPROV':         'rekor_raw',
  'Target Medali Pelatih': 'target_medali_pelatih',
  'Pesaing Utama':         'pesaing_nama',
  'Nama Lawan Utama':      'pesaing_nama',
  'Total Lawan (kg)':      'target_kompetitor',
  'Catatan':               'catatan',
  'Squat (kg)':            'squat_kg',
  'Bench Press (kg)':      'bench_kg',
  'Deadlift (kg)':         'deadlift_kg',
  'Total (kg)':            'total_kg',
  'Snatch (kg)':           'snatch_kg',
  'Clean & Jerk (kg)':     'cj_kg',
  'Jenis Busur':           'jenis_busur',
  'Alat/Nomor':            'alat_nomor',
  'Rating FIDE':           'rating_fide',
  'Rating Percasi':        'rating_percasi',
  'Ranking Jabar':         'ranking_jabar',
  'Win Rate (%)':          'win_rate',
}

export function parseImportBuffer(buffer: Buffer, config: CaborConfig): ImportResult {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets['Data'] ?? wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })

  // Find header row (contains "Nama Atlet")
  let headerRowIdx = -1
  for (let i = 0; i < Math.min(raw.length, 15); i++) {
    const row = raw[i] as string[]
    if (row.some(c => String(c ?? '').trim() === 'Nama Atlet')) {
      headerRowIdx = i
      break
    }
  }

  if (headerRowIdx === -1) {
    return {
      rows: [], errors: ['Header "Nama Atlet" tidak ditemukan. Gunakan template yang disediakan.'],
      totalRows: 0, skippedRows: 0,
    }
  }

  const headers = (raw[headerRowIdx] as string[]).map(h => String(h ?? '').trim())
  const colMap: Record<number, string> = {}
  headers.forEach((h, i) => { colMap[i] = HEADER_FIELD[h] ?? `extra_${i}` })

  const dataStart = headerRowIdx + 2  // skip example row
  const rows: ParsedRow[] = []
  let skippedRows = 0

  for (let i = dataStart; i < raw.length; i++) {
    const row = raw[i] as unknown[]
    if (row.every(c => c === '' || c === null || c === undefined)) { skippedRows++; continue }

    const f: Record<string, unknown> = {}
    row.forEach((val, ci) => { f[colMap[ci]] = val })

    const atlet_nama = String(f['atlet_nama'] ?? '').trim()
    if (!atlet_nama) { skippedRows++; continue }

    const gender      = String(f['gender'] ?? '').trim() || undefined
    const sub_cabor   = String(f['sub_cabor'] ?? '').trim() || undefined
    const kategori    = String(f['kategori'] ?? '').trim() || undefined
    const weight_class = String(f['weight_class'] ?? '').trim() || undefined
    const periode     = String(f['periode'] ?? 'baseline').trim() || 'baseline'
    const catatan     = String(f['catatan'] ?? '').trim() || undefined

    // event_name: prefer explicit, fallback to weight_class or kategori
    let event_name = String(f['event_name'] ?? '').trim()
    if (!event_name) event_name = kategori ?? weight_class ?? config.cabor_nama
    if (sub_cabor && !event_name.startsWith(sub_cabor)) {
      event_name = `${sub_cabor} — ${event_name}`
    }

    // Normalized score
    let normalized_score: number | undefined
    let score_raw: string | undefined

    if (config.sport_type === 'multi_lift') {
      const tv = f['total_kg'] ?? f[config.normalized_field]
      const n = tv !== '' && tv !== undefined ? parseFloat(String(tv)) : NaN
      if (!isNaN(n)) normalized_score = n
      score_raw = normalized_score?.toString()
    } else {
      const rv = f['score_raw']
      score_raw = String(rv ?? '').trim() || undefined
      const n = toScore(rv, config.sport_type)
      if (n !== null) normalized_score = n
    }

    // Rekor
    const rekor_raw = f['rekor_raw']
    const rekor_porprov = toScore(rekor_raw, config.sport_type) ?? undefined

    // Target kompetitor
    const tk = f['target_kompetitor']
    const target_kompetitor = tk !== '' && tk !== undefined ? (parseFloat(String(tk)) || undefined) : undefined

    // Gap
    let gap_percentage: number | undefined
    let target_medali_calc: string | undefined
    const ref = rekor_porprov ?? target_kompetitor
    if (normalized_score !== undefined && ref !== undefined) {
      const g = calculateGap(normalized_score, ref, config.lower_is_better)
      gap_percentage = parseFloat(Math.max(0, g).toFixed(2))
      target_medali_calc = gapToMedali(gap_percentage)
    }

    const target_medali_pelatih = String(f['target_medali_pelatih'] ?? '').trim() || undefined

    // raw_metrics
    const raw_metrics: Record<string, string | number> = {}
    if (sub_cabor) raw_metrics['sub_cabor'] = sub_cabor
    if (score_raw) raw_metrics['score_raw'] = score_raw
    for (const k of ['squat_kg','bench_kg','deadlift_kg','total_kg','snatch_kg','cj_kg']) {
      if (f[k] !== '' && f[k] !== undefined) {
        const n = parseFloat(String(f[k]))
        if (!isNaN(n)) raw_metrics[k === 'cj_kg' ? 'clean_jerk_kg' : k] = n
      }
    }
    for (const k of ['jenis_busur','alat_nomor']) {
      if (f[k]) raw_metrics[k] = String(f[k])
    }
    for (const k of ['rating_fide','rating_percasi','ranking_jabar','win_rate']) {
      if (f[k] !== '' && f[k] !== undefined) {
        const n = parseFloat(String(f[k]))
        if (!isNaN(n)) raw_metrics[k] = n
      }
    }

    // Warnings
    const warns: string[] = []
    if (normalized_score === undefined && !['head_to_head','weight_class_combat','team_sport','rating_elo'].includes(config.sport_type)) {
      warns.push('Score tidak terparsing')
    }
    if (!ref) warns.push('Tidak ada rekor pembanding — gap tidak dihitung')

    rows.push({
      rowNum: i + 1,
      atlet_nama, gender, event_name, weight_class, periode,
      score_raw, normalized_score, rekor_porprov, target_kompetitor,
      gap_percentage, target_medali_calc, target_medali_pelatih,
      raw_metrics, catatan,
      warning: warns.length ? warns.join('; ') : undefined,
    })
  }

  return { rows, errors: [], totalRows: rows.length, skippedRows }
}
