import * as XLSX from 'xlsx'

export interface ExcelColumn {
  col: string
  header: string
  desc: string
  required: boolean
}

export interface CaborConfig {
  id: number
  cabor_nama: string
  sport_type: string
  normalized_field: string
  lower_is_better: boolean
  score_unit: string
  has_weight_class: boolean
  weight_classes: string[]
  has_multi_periode: boolean
  periode_options: string[]
  excel_template_columns: ExcelColumn[]
  operator_notes: string
  metrics_schema: Array<{
    key: string; label: string; type: string
    required: boolean; desc?: string; options?: string[]
  }>
}

// Example rows per cabor for row 6 of template
const EXAMPLE_ROWS: Record<string, (string | number)[]> = {
  'Atletik':       ['1500 M', 'Pa', 'Budi Santoso', '4:12.50', '4:05.00', 'Perak', 'Asep (Kota Bdg)', ''],
  'Akuatik':       ['Pool', '100M Gaya Bebas', 'Pa', 'Rizky Pratama', '52.40', '51.00', 'Emas', ''],
  'Angkat Berat':  ['Siti Rahayu', 'Pi', '59 Kg', 95, 60, 120, 275, 'bk_porprov', 'Dewi (Jabar)', 280, ''],
  'Angkat Besi':   ['Ahmad Fauzi', 'Pa', '66 Kg', 130, 160, 290, 'Perak', ''],
  'Panahan':       ['Recurve Pa 70M', 'Pa', 'Deni Kurnia', 'Recurve', 652, 680, 'Perak'],
  'Senam':         ['Artistik', 'Lantai', 'Pi', 'Sari Dewi', 13.25, 14.00, 'Perunggu'],
  'Menembak':      ['10M Senapan Angin Pa', 'Pa', 'Eko Priyanto', 617.5, 625.0, 'Perak'],
  'Pencak Silat':  ['Tanding', '55 Kg', 'Pa', 'Agus Salim', 'Perak', 'Juara Haornas 2024'],
  'Bulu Tangkis':  ['Tunggal Pa', 'Hendra Saputra', 3, 'Emas', 'Reza (Kota Bdg)'],
  'Catur':         ['Rapid Pa', 'Rudi Hermawan', 1850, 2100, 'Perak', 'FM'],
}

export function generateExcelTemplate(config: CaborConfig): Buffer {
  const wb = XLSX.utils.book_new()
  const cols = config.excel_template_columns

  const reqRow  = cols.map(c => c.required ? '★ WAJIB'   : '○ Opsional')
  const descRow = cols.map(c => c.desc)
  const headers = cols.map(c => c.header)

  const example = [...(EXAMPLE_ROWS[config.cabor_nama] ?? [])]
  while (example.length < cols.length) example.push('')

  const aoa: (string | number | undefined)[][] = [
    [`TEMPLATE IMPORT — ${config.cabor_nama.toUpperCase()}`],
    [config.operator_notes ?? ''],
    [],
    reqRow,
    descRow,
    headers,          // row index 5 — HEADER ROW (parser detects via "Nama Atlet")
    example,          // row index 6 — CONTOH (parser skips)
    ...Array(50).fill(Array(cols.length).fill('')),
  ]

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = cols.map(() => ({ wch: 26 }))
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: cols.length - 1 } }]
  XLSX.utils.book_append_sheet(wb, ws, 'Data')

  // Panduan sheet
  const ref: (string | undefined)[][] = [
    ['PANDUAN KOLOM — ' + config.cabor_nama],
    [],
    ['Kolom', 'Header', 'Keterangan', 'Wajib?'],
    ...cols.map(c => [c.col, c.header, c.desc, c.required ? 'Ya' : 'Tidak']),
  ]

  if (config.has_weight_class && config.weight_classes.length > 0) {
    ref.push([], ['', 'DAFTAR KELAS BERAT VALID:'])
    config.weight_classes.forEach(w => ref.push(['', w]))
  }
  if (config.has_multi_periode && config.periode_options.length > 0) {
    ref.push([], ['', 'NILAI PERIODE VALID:'])
    config.periode_options.forEach(p => ref.push(['', p]))
  }
  ref.push(
    [],
    ['', 'ARTI GAP%:'],
    ['', '≤ 3%',  '', 'Peluang Emas'],
    ['', '3–7%',  '', 'Peluang Perak'],
    ['', '7–12%', '', 'Peluang Perunggu'],
    ['', '> 12%', '', 'Perlu Kerja Keras'],
  )

  const wsRef = XLSX.utils.aoa_to_sheet(ref)
  wsRef['!cols'] = [{ wch: 8 }, { wch: 28 }, { wch: 55 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsRef, 'Panduan')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
