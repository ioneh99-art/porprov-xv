export interface NIKParseResult {
  valid: boolean
  errors: string[]
  provinsi_code: string
  kabupaten_code: string
  kecamatan_code: string
  day_raw: number
  is_female: boolean
  day: number
  month: number
  year: number
  full_year: number
  birthdate_full: Date | null
  sequence: string
  derived_gender: 'L' | 'P' | null
}

export function parseNIK(nik: string | number | null | undefined): NIKParseResult {
  const result: NIKParseResult = {
    valid: false, errors: [],
    provinsi_code: '', kabupaten_code: '', kecamatan_code: '',
    day_raw: 0, is_female: false, day: 0, month: 0, year: 0, full_year: 0,
    birthdate_full: null, sequence: '', derived_gender: null,
  }

  if (!nik) { result.errors.push('NIK kosong'); return result }

  const nikStr = nik.toString().trim().replace(/\D/g, '')
  if (nikStr.length !== 16) {
    result.errors.push(`NIK panjang ${nikStr.length} digit, harus 16 digit`)
    return result
  }

  result.provinsi_code  = nikStr.substring(0, 2)
  result.kabupaten_code = nikStr.substring(2, 4)
  result.kecamatan_code = nikStr.substring(4, 6)
  result.day_raw        = parseInt(nikStr.substring(6, 8))
  result.month          = parseInt(nikStr.substring(8, 10))
  result.year           = parseInt(nikStr.substring(10, 12))
  result.sequence       = nikStr.substring(12, 16)

  result.is_female      = result.day_raw > 40
  result.day            = result.is_female ? result.day_raw - 40 : result.day_raw
  result.derived_gender = result.is_female ? 'P' : 'L'

  if (result.day < 1 || result.day > 31)
    result.errors.push(`Tanggal ${result.day} tidak valid (harus 1-31)`)
  if (result.month < 1 || result.month > 12)
    result.errors.push(`Bulan ${result.month} tidak valid (harus 1-12)`)

  if (result.errors.length > 0) return result

  const currentYY  = new Date().getFullYear() % 100
  result.full_year = result.year > currentYY ? 1900 + result.year : 2000 + result.year

  try {
    const d = new Date(result.full_year, result.month - 1, result.day)
    if (d.getDate() === result.day && d.getMonth() === result.month - 1 && d.getFullYear() === result.full_year) {
      result.birthdate_full = d
      result.valid = true
    } else {
      result.errors.push('Tanggal tidak ada (misal 30 Feb)')
    }
  } catch {
    result.errors.push('Tanggal tidak dapat di-parse')
  }

  return result
}

export function formatDateForDB(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function isBirthdateMatch(nikDate: Date, dbDate: string | null): boolean {
  if (!dbDate) return false
  const d = new Date(dbDate)
  return d.getUTCDate() === nikDate.getDate() &&
         d.getUTCMonth() + 1 === nikDate.getMonth() + 1 &&
         d.getUTCFullYear() === nikDate.getFullYear()
}
