/**
 * PentaScore API — Excel Athlete Import Template
 * GET /api/pentascore/athletes/template  → downloads xlsx
 */
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

const HEADERS = [
  'nama_lengkap',
  'uipm_id',
  'gender',
  'tanggal_lahir',
  'negara_code',
  'affiliation_nama',
  'start_number',
]

const SAMPLE_ROWS = [
  {
    nama_lengkap:     'BORIES Leo',
    uipm_id:          'M045470',
    gender:           'L',
    tanggal_lahir:    '2003-04-12',
    negara_code:      'FRA',
    affiliation_nama: 'France National Team',
    start_number:     1,
  },
  {
    nama_lengkap:     'BRYSON Kerenza',
    uipm_id:          'W044215',
    gender:           'P',
    tanggal_lahir:    '2000-07-23',
    negara_code:      'GBR',
    affiliation_nama: 'Great Britain National Team',
    start_number:     2,
  },
  {
    nama_lengkap:     '[ISI DENGAN NAMA ATLET]',
    uipm_id:          '',
    gender:           'L',
    tanggal_lahir:    '2002-01-01',
    negara_code:      'IDN',
    affiliation_nama: 'MPI Jawa Barat',
    start_number:     3,
  },
]

const INSTRUCTIONS_ROWS = [
  ['INSTRUKSI PENGISIAN TEMPLATE'],
  [''],
  ['1. JANGAN ubah nama header di baris pertama sheet "Athletes"'],
  ['2. nama_lengkap: WAJIB. Format: NAMA_BELAKANG NamaDepan (kapital di belakang)'],
  ['3. uipm_id: Opsional. Format UIPM International License (mis. M045470, W044215)'],
  ['4. gender: WAJIB. Isi "L" untuk pria, "P" untuk wanita'],
  ['5. tanggal_lahir: Format YYYY-MM-DD (mis. 2003-04-12). Format Excel "Text" disarankan'],
  ['6. negara_code: Kode 3 huruf ISO (IDN, USA, FRA, JPN). Default: IDN'],
  ['7. affiliation_nama: Nama kontingen/kabupaten/klub (mis. "MPI Jawa Barat")'],
  ['8. start_number: Nomor dada/start number. Opsional, bisa diisi nanti via UI'],
  [''],
  ['HAPUS BARIS CONTOH di sheet "Athletes" sebelum import.'],
  ['Save sebagai .xlsx (Excel Workbook), upload via Import Wizard.'],
]

export async function GET() {
  // Create workbook
  const wb = XLSX.utils.book_new()

  // Sheet 1: Athletes (with sample rows + header)
  const wsAthletes = XLSX.utils.json_to_sheet(SAMPLE_ROWS, { header: HEADERS })

  // Format column widths
  ;(wsAthletes as any)['!cols'] = [
    { wch: 32 }, { wch: 14 }, { wch: 8 }, { wch: 14 },
    { wch: 12 }, { wch: 28 }, { wch: 12 },
  ]

  XLSX.utils.book_append_sheet(wb, wsAthletes, 'Athletes')

  // Sheet 2: Instructions
  const wsInstr = XLSX.utils.aoa_to_sheet(INSTRUCTIONS_ROWS)
  ;(wsInstr as any)['!cols'] = [{ wch: 90 }]
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Petunjuk')

  // Generate buffer
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="pentascore_athletes_template.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
