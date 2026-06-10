/**
 * Cross-Validation Excel template
 * GET /api/pentascore/cross-validate/template
 */
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

const HEADERS = ['athlete','discipline','victories','total_bouts','red_cards','de_position','time_str','penalty','uipm_pts']

const SAMPLE = [
  { athlete: 'BORIES Leo',     discipline: 'fencing_ranking', victories: 25, total_bouts: 35, red_cards: 0, de_position: '', time_str: '', penalty: 0, uipm_pts: 250 },
  { athlete: 'BORIES Leo',     discipline: 'fencing_de',      victories: '', total_bouts: '',  red_cards: 0, de_position: 1,  time_str: '', penalty: 0, uipm_pts: 250 },
  { athlete: 'BORIES Leo',     discipline: 'swimming',        victories: '', total_bouts: '',  red_cards: 0, de_position: '', time_str: '01:55.00', penalty: 0, uipm_pts: 25 },
  { athlete: 'BORIES Leo',     discipline: 'obstacle',        victories: '', total_bouts: '',  red_cards: 0, de_position: '', time_str: '00:55.50', penalty: 0, uipm_pts: 279 },
  { athlete: 'BORIES Leo',     discipline: 'laserrun',        victories: '', total_bouts: '',  red_cards: 0, de_position: '', time_str: '12:30.00', penalty: 0, uipm_pts: 550 },
]

const INSTR = [
  ['PETUNJUK CROSS-VALIDATION'],
  [''],
  ['Tool ini membandingkan output PentaScore (pakai pentascore_v1.ts) dengan'],
  ['data resmi UIPM untuk verifikasi keakuratan engine.'],
  [''],
  ['Kolom required:'],
  ['  athlete       = nama atlet'],
  ['  discipline    = fencing_ranking | fencing_de | swimming | obstacle | laserrun'],
  ['  uipm_pts      = angka MP points resmi UIPM'],
  [''],
  ['Kolom sesuai discipline:'],
  ['  fencing_ranking: victories + total_bouts (+optional red_cards)'],
  ['  fencing_de:      de_position (1-18)'],
  ['  swimming/obstacle/laserrun: time_str (MM:SS.cc) atau time_centis'],
  ['                              (+optional penalty)'],
  [''],
  ['Output yang diharapkan: accuracy > 99% (Sprint 1 verified 99.52%)'],
]

export async function GET() {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(SAMPLE, { header: HEADERS })
  ;(ws as any)['!cols'] = [
    { wch: 24 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Results')

  const wsInstr = XLSX.utils.aoa_to_sheet(INSTR)
  ;(wsInstr as any)['!cols'] = [{ wch: 80 }]
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Petunjuk')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="pentascore_cross_validate_template.xlsx"',
      'Cache-Control': 'no-store',
    },
  })
}
