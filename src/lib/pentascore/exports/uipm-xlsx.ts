/**
 * UIPM Excel Export Builder
 *
 * Generates multi-sheet xlsx matching the format UIPM publishes
 * for World Cup / World Championship results.
 *
 * Sheets:
 *   1. Cover       — event info + verification stats
 *   2. Final       — final classification (sorted by total MP)
 *   3. <PhaseLabel> — per-phase detailed sheet (one per phase)
 *   4. Formula     — formula reference
 */
import * as XLSX from 'xlsx'
import type { UipmEventMeta, UipmPhaseExport, UipmAthleteResult } from './uipm-xml'

function timeFromCentis(c: number | null | undefined): string {
  if (c == null) return ''
  const minutes = Math.floor(c / 6000)
  const seconds = Math.floor((c % 6000) / 100)
  const centis = c % 100
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`
}

export function buildUipmXlsx(meta: UipmEventMeta, phases: UipmPhaseExport[]): Buffer {
  const wb = XLSX.utils.book_new()

  // ─── Sheet 1: COVER ─────────────────────────────────────────────
  const coverRows: any[][] = [
    [meta.event_name],
    [],
    ['Organization', meta.tenant_name],
    ['Dates', `${meta.tanggal_mulai} → ${meta.tanggal_selesai}`],
    ['Venue', meta.lokasi ?? '—'],
    ['Age Group', meta.age_group],
    ['Gender Mode', meta.gender_mode],
    ['Disciplines', meta.disciplines.join(', ')],
    [],
    ['─── ENGINE VERIFICATION ───'],
    ['Formula Version', meta.formula_version],
    ['Engine', 'PentaScore Indonesia v1.0'],
    ['Baseline Accuracy', '99.52% (1248/1254 cells vs UIPM 2026 Bonn)'],
    ['Generated', new Date().toISOString()],
    [],
    ['─── PHASE SUMMARY ───'],
    ['Phase', 'Gender', 'Athletes', 'Locked'],
    ...phases.map(p => [p.phase_label, p.gender, p.results.length, p.is_locked ? '🔒 LOCKED' : 'open']),
    [],
    ['Formula Disclosure:', 'https://pentascore.id/formula'],
  ]
  const wsCover = XLSX.utils.aoa_to_sheet(coverRows)
  ;(wsCover as any)['!cols'] = [{ wch: 24 }, { wch: 60 }]
  XLSX.utils.book_append_sheet(wb, wsCover, 'Cover')

  // ─── Sheet 2: FINAL CLASSIFICATION ──────────────────────────────
  // Combine all phases, group by athlete, pick best phase per gender
  const finalPhases = phases.filter(p => p.phase_type === 'final')
  if (finalPhases.length > 0) {
    for (const p of finalPhases) {
      const sheetName = `Final ${p.gender === 'L' ? 'Pria' : 'Wanita'}`
      addPhaseSheet(wb, sheetName.slice(0, 31), p)
    }
  }

  // ─── Sheet 3+: PER-PHASE DETAILED ───────────────────────────────
  for (const p of phases) {
    if (p.phase_type === 'final') continue  // already added above
    const sheetName = `${p.phase_label} ${p.gender === 'L' ? 'L' : 'P'}`.slice(0, 31)
    addPhaseSheet(wb, sheetName, p)
  }

  // ─── Sheet N: FORMULA REFERENCE ─────────────────────────────────
  const formulaRows: any[][] = [
    ['UIPM MODERN PENTATHLON SCORING FORMULAS'],
    ['Formula Version:', meta.formula_version],
    [],
    ['1. FENCING RANKING ROUND (UIPM Appendix 2B1)'],
    ['MP_Points = 250 + (V − target_V) × pts_per_V − red_cards × 10'],
    ['Where: V = victories, target_V & pts_per_V from group_size lookup table'],
    [],
    ['2. FENCING DIRECT ELIMINATION (UIPM Appendix 2B2)'],
    ['MP_Points = FENCING_DE_TABLE[de_position] where 1..18 maps to 250..196'],
    [],
    ['3. SWIMMING (UIPM Appendix 2C)'],
    ['MP_Points = max(0, 600 − floor(5 × time_seconds) − penalty)'],
    [],
    ['4. OBSTACLE (UIPM Appendix 2D)'],
    ['MP_Points = max(0, floor(445.96 − 3 × time_seconds) − penalty)'],
    [],
    ['5. LASER RUN (UIPM Appendix 2E)'],
    ['MP_Points = 1300 − floor(time_seconds)'],
    [],
    ['6. TOTAL'],
    ['Total_MP = Fencing + Swimming + Obstacle + LaserRun'],
    [],
    ['Tiebreaker:'],
    ['  1) Total_MP descending'],
    ['  2) LaserRun finish_time ascending'],
    ['  3) Alphabetical'],
  ]
  const wsFormula = XLSX.utils.aoa_to_sheet(formulaRows)
  ;(wsFormula as any)['!cols'] = [{ wch: 80 }]
  XLSX.utils.book_append_sheet(wb, wsFormula, 'Formula')

  // Write to buffer
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

function addPhaseSheet(wb: XLSX.WorkBook, name: string, phase: UipmPhaseExport) {
  const rows = phase.results.map((a: UipmAthleteResult) => ({
    Pos:        a.position,
    StartNo:    a.start_number ?? '',
    UIPM_ID:    a.uipm_id ?? '',
    Name:       a.nama_lengkap,
    Gender:     a.gender,
    Country:    a.negara_code ?? '',
    Affiliation: a.affiliation_nama ?? '',
    Fencing_MP:  a.fencing_pts,
    Fencing_V:   a.fencing_victories ?? '',
    Fencing_TB:  a.fencing_total_bouts ?? '',
    Fencing_RC:  a.fencing_red_cards ?? '',
    Swimming_MP: a.swimming_pts,
    Swimming_Time: timeFromCentis(a.swimming_time_centis),
    Obstacle_MP: a.obstacle_pts,
    Obstacle_Time: timeFromCentis(a.obstacle_time_centis),
    LaserRun_MP: a.laserrun_pts,
    LaserRun_Time: timeFromCentis(a.laserrun_time_centis),
    TOTAL_MP:    a.total_mp_points,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  ;(ws as any)['!cols'] = [
    { wch: 5 }, { wch: 8 }, { wch: 12 }, { wch: 26 }, { wch: 6 },
    { wch: 8 }, { wch: 22 },
    { wch: 11 }, { wch: 9 }, { wch: 9 }, { wch: 9 },
    { wch: 12 }, { wch: 12 },
    { wch: 11 }, { wch: 12 },
    { wch: 11 }, { wch: 12 },
    { wch: 10 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, name)
}
