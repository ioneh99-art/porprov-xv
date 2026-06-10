/**
 * PentaScore API — Cross-Validation Tool (Defense Layer L2)
 *
 * POST /api/pentascore/cross-validate
 *   multipart/form-data:
 *     file:  UIPM-format Excel result file
 *
 * Re-computes MP points using pentascore_v1.ts and compares
 * with UIPM-published values cell-by-cell. Returns diff report.
 *
 * Expected Excel format (case-insensitive headers):
 *   - athlete:    nama atlet
 *   - discipline: fencing_ranking | fencing_de | swimming | obstacle | laserrun
 *   - input:      raw input (V for fencing, time_str for time disciplines)
 *   - total_bouts: required if discipline=fencing_ranking
 *   - red_cards:   optional
 *   - de_position: required if discipline=fencing_de
 *   - uipm_pts:   official UIPM-published MP points
 */
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import {
  fencingRankingPts, fencingDEPts, swimmingPts, obstaclePts, laserRunPts,
  timeStrToCentis, PENTASCORE_VERSION,
} from '@/lib/sport-plugins/pentathlon/pentascore_v1'
import { getPentascoreSession } from '@/lib/pentascore/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RowResult = {
  rowNum: number
  athlete: string
  discipline: string
  input: any
  uipm_pts: number | null
  computed_pts: number | null
  diff: number | null
  match: boolean
  error?: string
}

export async function POST(req: NextRequest) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })

  // Parse Excel
  const bytes = Buffer.from(await file.arrayBuffer())
  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(bytes, { type: 'buffer', cellDates: false })
  } catch (e: any) {
    return NextResponse.json({ error: `Excel parse error: ${e.message}` }, { status: 400 })
  }

  // Pick first sheet (or one named "Results" / "Cross-Validate")
  const sheetName = wb.SheetNames.find(n => /result|cross|validate/i.test(n)) ?? wb.SheetNames[0]
  const sheet = wb.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json<any>(sheet, { raw: true, defval: null })

  if (!rawRows.length) {
    return NextResponse.json({ error: 'No data rows in Excel' }, { status: 400 })
  }
  if (rawRows.length > 5000) {
    return NextResponse.json({ error: `Too many rows: ${rawRows.length} (max 5000)` }, { status: 400 })
  }

  // Normalize headers (case-insensitive)
  const normalize = (raw: any) => {
    const out: any = {}
    for (const [k, v] of Object.entries(raw)) {
      out[String(k).toLowerCase().trim().replace(/[\s_-]+/g, '_')] = v
    }
    return out
  }

  const validated: RowResult[] = []

  for (let i = 0; i < rawRows.length; i++) {
    const raw = normalize(rawRows[i])
    const rowNum = i + 2  // header is row 1

    const athlete    = String(raw.athlete ?? raw.nama ?? raw.name ?? '').trim()
    const discipline = String(raw.discipline ?? raw.event ?? '').trim().toLowerCase()
    const uipm_pts   = raw.uipm_pts != null ? Number(raw.uipm_pts) : null

    const result: RowResult = {
      rowNum, athlete, discipline,
      input: null,
      uipm_pts,
      computed_pts: null,
      diff: null,
      match: false,
    }

    if (!athlete) { result.error = 'athlete missing'; validated.push(result); continue }
    if (!discipline) { result.error = 'discipline missing'; validated.push(result); continue }
    if (uipm_pts == null || isNaN(uipm_pts)) { result.error = 'uipm_pts missing/invalid'; validated.push(result); continue }

    try {
      switch (discipline) {
        case 'fencing_ranking':
        case 'fencing-ranking':
        case 'fencing': {
          const V = parseInt(raw.victories ?? raw.v ?? raw.input, 10)
          const totalBouts = parseInt(raw.total_bouts ?? raw.bouts, 10)
          const redCards = parseInt(raw.red_cards ?? raw.red ?? 0, 10) || 0
          if (isNaN(V) || isNaN(totalBouts)) throw new Error(`need V (got ${raw.victories}) and total_bouts (got ${raw.total_bouts})`)
          result.input = { V, totalBouts, redCards }
          result.computed_pts = fencingRankingPts({ victories: V, totalBouts, redCards })
          break
        }
        case 'fencing_de':
        case 'fencing-de':
        case 'de': {
          const pos = parseInt(raw.de_position ?? raw.position ?? raw.input, 10)
          if (isNaN(pos) || pos < 1 || pos > 18) throw new Error(`de_position must be 1-18, got ${raw.de_position}`)
          result.input = { de_position: pos }
          result.computed_pts = fencingDEPts(pos)
          break
        }
        case 'swimming':
        case 'swim': {
          const tStr = String(raw.time_str ?? raw.time ?? raw.input ?? '').trim()
          const tCentis = raw.time_centis != null ? Number(raw.time_centis) : (tStr ? timeStrToCentis(tStr) : null)
          if (tCentis == null) throw new Error('time_str (MM:SS.cc) or time_centis required')
          const penalty = parseInt(raw.penalty ?? raw.penalty_points ?? 0, 10) || 0
          result.input = { time_str: tStr, time_centis: tCentis, penalty }
          result.computed_pts = Math.max(0, swimmingPts(tCentis) - penalty)
          break
        }
        case 'obstacle':
        case 'oc': {
          const tStr = String(raw.time_str ?? raw.time ?? raw.input ?? '').trim()
          const tCentis = raw.time_centis != null ? Number(raw.time_centis) : (tStr ? timeStrToCentis(tStr) : null)
          if (tCentis == null) throw new Error('time_str or time_centis required')
          const penalty = parseInt(raw.penalty ?? raw.penalty_points ?? 0, 10) || 0
          result.input = { time_str: tStr, time_centis: tCentis, penalty }
          result.computed_pts = Math.max(0, obstaclePts(tCentis) - penalty)
          break
        }
        case 'laserrun':
        case 'laser_run':
        case 'lr': {
          const tStr = String(raw.time_str ?? raw.time ?? raw.input ?? '').trim()
          const tCentis = raw.time_centis != null ? Number(raw.time_centis) : (tStr ? timeStrToCentis(tStr) : null)
          if (tCentis == null) throw new Error('time_str or time_centis required')
          result.input = { time_str: tStr, time_centis: tCentis }
          result.computed_pts = laserRunPts(tCentis)
          break
        }
        default:
          throw new Error(`unknown discipline "${discipline}"`)
      }

      result.diff = (result.computed_pts ?? 0) - (result.uipm_pts ?? 0)
      result.match = result.diff === 0
    } catch (e: any) {
      result.error = e.message
    }

    validated.push(result)
  }

  // Summary
  const total = validated.length
  const withError = validated.filter(r => r.error).length
  const evaluable = total - withError
  const matched = validated.filter(r => r.match).length
  const diffs = validated.filter(r => !r.match && !r.error).map(r => Math.abs(r.diff ?? 0))
  const accuracy = evaluable > 0 ? (matched / evaluable * 100) : 0
  const maxDiff = diffs.length ? Math.max(...diffs) : 0
  const avgDiff = diffs.length ? (diffs.reduce((a, b) => a + b, 0) / diffs.length) : 0

  // Group by discipline
  const byDiscipline: Record<string, { total: number; match: number }> = {}
  for (const r of validated) {
    if (!r.discipline) continue
    if (!byDiscipline[r.discipline]) byDiscipline[r.discipline] = { total: 0, match: 0 }
    byDiscipline[r.discipline].total++
    if (r.match) byDiscipline[r.discipline].match++
  }

  return NextResponse.json({
    file_name:     file.name,
    sheet_name:    sheetName,
    formula_version: PENTASCORE_VERSION,
    summary: {
      total,
      evaluable,
      matched,
      with_error: withError,
      accuracy_pct: parseFloat(accuracy.toFixed(2)),
      max_diff: maxDiff,
      avg_diff: parseFloat(avgDiff.toFixed(2)),
    },
    by_discipline: byDiscipline,
    rows: validated,
  })
}
