import * as XLSX from 'xlsx'

export interface RekapAtlet {
  koni_id: number
  nama_lengkap: string
  cabang_olahraga: string
  gender: 'L' | 'P'
  nik: string
}

export function parseRekapFile(filePath: string): RekapAtlet[] {
  const wb   = XLSX.readFile(filePath)
  const sheet = wb.Sheets['Export']
  if (!sheet) throw new Error('Sheet "Export" tidak ditemukan di rekap file')

  const rows: any[] = XLSX.utils.sheet_to_json(sheet)

  return rows
    .map(row => ({
      koni_id:         parseInt(row['ID']) || 0,
      nama_lengkap:    (row['NAMA LENGKAP'] || '').toString().trim().toUpperCase(),
      cabang_olahraga: (row['CABANG OLAHRAGA'] || '').toString().trim().toUpperCase(),
      gender:          row['GENDER'] === 'PEREMPUAN' ? 'P' : 'L' as 'L' | 'P',
      nik:             row['NOMOR KTP'].toString().trim().replace(/\D/g, ''),
    }))
    .filter(a => a.nama_lengkap && a.nik)
}

// Buat index NIK → RekapAtlet untuk O(1) lookup
export function buildRekapNikIndex(rekap: RekapAtlet[]): Map<string, RekapAtlet> {
  const map = new Map<string, RekapAtlet>()
  for (const a of rekap) {
    if (a.nik) map.set(a.nik, a)
  }
  return map
}
