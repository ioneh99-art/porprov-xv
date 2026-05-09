import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Helper bersihkan NIK — handle Excel number, string, float
const cleanNIK = (val: any): string => {
  if (!val && val !== 0) return ''
  if (typeof val === 'number') {
    return Math.round(val).toString()
  }
  let s = String(val).trim()
  s = s.replace(/\.0+$/, '')
  s = s.replace(/\D/g, '')
  return s
}

// Helper parse tanggal
const parseTanggal = (val: any): string | null => {
  if (!val) return null
  try {
    if (typeof val === 'number') {
      const date = XLSX.SSF.parse_date_code(val)
      return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`
    }
    const str = String(val).trim()
    if (str.includes('/')) {
      const parts = str.split('/')
      if (parts.length === 3) {
        const d = parts[0].padStart(2,'0')
        const m = parts[1].padStart(2,'0')
        const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
        return `${y}-${m}-${d}`
      }
    }
    if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str
    if (str.includes('-')) {
      const parts = str.split('-')
      if (parts.length === 3 && parts[0].length <= 2) {
        return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`
      }
    }
    return null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const kontingen_id = formData.get('kontingen_id') as string

    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    if (!kontingen_id) return NextResponse.json({ error: 'Kontingen wajib dipilih' }, { status: 400 })

    // Baca file Excel dengan raw: true agar angka tidak kehilangan presisi
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array', cellDates: false })

    const sheetAtlet = wb.Sheets['DATA ATLET']
    const sheetFinansial = wb.Sheets['DATA FINANSIAL']
    const sheetPerlengkapan = wb.Sheets['DATA PERLENGKAPAN']

    if (!sheetAtlet) {
      return NextResponse.json({
        error: 'Sheet "DATA ATLET" tidak ditemukan. Pastikan menggunakan template resmi PORPROV XV.'
      }, { status: 400 })
    }

    // Parse semua sheet dengan raw: true
    const rawAtlet: any[] = XLSX.utils.sheet_to_json(sheetAtlet, {
      header: 1, range: 3, defval: '', raw: true,
    })

    const rawFinansial: any[] = sheetFinansial
      ? XLSX.utils.sheet_to_json(sheetFinansial, { header: 1, range: 3, defval: '', raw: true })
      : []

    const rawPerlengkapan: any[] = sheetPerlengkapan
      ? XLSX.utils.sheet_to_json(sheetPerlengkapan, { header: 1, range: 3, defval: '', raw: true })
      : []

    // Map finansial by NIK
    const finansialMap: Record<string, any> = {}
    for (const row of rawFinansial) {
      const nik = cleanNIK(row[1])
      if (nik.length === 16) {
        finansialMap[nik] = {
          nama_bank: String(row[3] || '').trim() || null,
          no_rekening: String(row[4] || '').trim() || null,
          nama_pemilik_rekening: String(row[5] || '').trim() || null,
          cabang_bank: String(row[6] || '').trim() || null,
          npwp: cleanNIK(row[7]) || null,
          nama_npwp: String(row[8] || '').trim() || null,
          no_bpjs_kesehatan: cleanNIK(row[9]) || null,
          no_bpjs_ketenagakerjaan: cleanNIK(row[10]) || null,
          faskes: String(row[11] || '').trim() || null,
        }
      }
    }

    // Map perlengkapan by NIK
    const perlengkapanMap: Record<string, any> = {}
    for (const row of rawPerlengkapan) {
      const nik = cleanNIK(row[1])
      if (nik.length === 16) {
        perlengkapanMap[nik] = {
          ukuran_kemeja: String(row[4] || '').trim() || null,
          ukuran_celana: String(row[5] || '').trim() || null,
          ukuran_sepatu: String(row[6] || '').trim() || null,
          ukuran_topi: String(row[7] || '').trim() || null,
        }
      }
    }

    const results = {
      total: 0,
      sukses: 0,
      gagal: 0,
      duplikat: 0,
      errors: [] as any[],
      preview: [] as any[],
    }

    const atletToInsert: any[] = []
    const nikSudahDiproses = new Set<string>()

    for (const row of rawAtlet) {
      // Index kolom:
      // 0=No | 1=Status | 2=NIK | 3=Nama | 4=Tempat Lahir
      // 5=Tgl Lahir | 6=Gender | 7=Agama | 8=Gol Darah
      // 9=Alamat | 10=Kelurahan | 11=Kecamatan | 12=Kab/Kota
      // 13=Provinsi | 14=Kode Pos | 15=No HP | 16=Email
      // 17=No HP Darurat | 18=Nama Kontak Darurat

      const nik = cleanNIK(row[2])
      const namaLengkap = String(row[3] || '').trim()

      // Skip baris kosong atau header
      if (!nik && !namaLengkap) continue
      if (namaLengkap === 'NAMA LENGKAP' || nik === 'NIK') continue
      if (!namaLengkap) continue

      results.total++

      // Validasi NIK
      if (nik.length !== 16) {
        results.errors.push({
          nik: nik || '(kosong)',
          nama: namaLengkap,
          error: `NIK tidak valid: ${nik.length} digit (harus 16 digit) — format kolom NIK sebagai TEXT di Excel`
        })
        results.gagal++
        continue
      }

      // Cek duplikat dalam file
      if (nikSudahDiproses.has(nik)) {
        results.errors.push({ nik, nama: namaLengkap, error: 'NIK duplikat dalam file Excel' })
        results.duplikat++
        continue
      }
      nikSudahDiproses.add(nik)

      // Parse kolom
      const status_kontingen = String(row[1] || 'Atlet').trim() || 'Atlet'
      const tempatLahir = String(row[4] || '').trim()
      const tglLahir = parseTanggal(row[5])
      const gender = String(row[6] || '').trim().toUpperCase()
      const agama = String(row[7] || '').trim()
      const golDarah = String(row[8] || '').trim()
      const alamat = String(row[9] || '').trim()
      const kelurahan = String(row[10] || '').trim()
      const kecamatan = String(row[11] || '').trim()
      const kabKota = String(row[12] || '').trim()
      const provinsi = String(row[13] || '').trim()
      const kodePos = String(row[14] || '').trim()
      const noHp = String(row[15] || '').trim().replace(/\s/g, '')
      const email = String(row[16] || '').trim()
      const noHpDarurat = String(row[17] || '').trim().replace(/\s/g, '')
      const namaKontak = String(row[18] || '').trim()

      // Validasi gender
      if (!['L', 'P'].includes(gender)) {
        results.errors.push({
          nik, nama: namaLengkap,
          error: `Jenis kelamin tidak valid: "${gender || '(kosong)'}" — isi L atau P`
        })
        results.gagal++
        continue
      }

      // Validasi no HP
      if (!noHp) {
        results.errors.push({ nik, nama: namaLengkap, error: 'No HP wajib diisi' })
        results.gagal++
        continue
      }

      const fin = finansialMap[nik] ?? {}
      const perl = perlengkapanMap[nik] ?? {}

      atletToInsert.push({
        no_ktp: nik,
        nama_lengkap: namaLengkap,
        tempat_lahir: tempatLahir || null,
        tgl_lahir: tglLahir,
        gender,
        agama: agama || null,
        gol_darah: golDarah || null,
        alamat: alamat || null,
        kelurahan: kelurahan || null,
        kecamatan: kecamatan || null,
        kota_kab: kabKota || null,
        provinsi: provinsi || null,
        kode_pos: kodePos || null,
        telepon: noHp,
        no_hp: noHp,
        email: email || null,
        no_hp_darurat: noHpDarurat || null,
        nama_kontak_darurat: namaKontak || null,
        status_kontingen,
        kontingen_id: parseInt(kontingen_id),
        status_registrasi: 'Draft',
        status_verifikasi: 'Draft',
        is_posted: false,
        nama_bank: fin.nama_bank || null,
        no_rekening: fin.no_rekening || null,
        nama_pemilik_rekening: fin.nama_pemilik_rekening || null,
        cabang_bank: fin.cabang_bank || null,
        npwp: fin.npwp || null,
        nama_npwp: fin.nama_npwp || null,
        no_bpjs_kesehatan: fin.no_bpjs_kesehatan || null,
        no_bpjs_ketenagakerjaan: fin.no_bpjs_ketenagakerjaan || null,
        faskes: fin.faskes || null,
        ukuran_kemeja: perl.ukuran_kemeja || null,
        ukuran_celana: perl.ukuran_celana || null,
        ukuran_sepatu: perl.ukuran_sepatu ? String(perl.ukuran_sepatu) : null,
        ukuran_topi: perl.ukuran_topi || null,
      })

      results.preview.push({
        nik,
        nama: namaLengkap,
        gender,
        tgl_lahir: tglLahir,
        no_hp: noHp,
        status_kontingen,
        has_finansial: !!finansialMap[nik],
        has_perlengkapan: !!perlengkapanMap[nik],
      })
    }

    // Cek duplikat NIK di database
    if (atletToInsert.length > 0) {
      const niks = atletToInsert.map(a => a.no_ktp)
      const { data: existingAtlet } = await sb()
        .from('atlet')
        .select('no_ktp')
        .in('no_ktp', niks)

      const existingNiks = new Set((existingAtlet ?? []).map((a: any) => a.no_ktp))

      const atletBaru = atletToInsert.filter(a => {
        if (existingNiks.has(a.no_ktp)) {
          results.errors.push({
            nik: a.no_ktp,
            nama: a.nama_lengkap,
            error: 'NIK sudah terdaftar di database — data dilewati'
          })
          results.duplikat++
          return false
        }
        return true
      })

      // Insert batch per 100
      const BATCH = 100
      for (let i = 0; i < atletBaru.length; i += BATCH) {
        const batch = atletBaru.slice(i, i + BATCH)
        const { error } = await sb().from('atlet').insert(batch)
        if (error) {
          console.error('Batch insert error:', error)
          results.errors.push({
            nik: '-',
            nama: `Batch ${i+1}–${i+batch.length}`,
            error: error.message
          })
          results.gagal += batch.length
        } else {
          results.sukses += batch.length
        }
      }
    }

    return NextResponse.json({
      ok: true,
      results,
      message: `Import selesai: ${results.sukses} berhasil, ${results.gagal} gagal, ${results.duplikat} duplikat dari ${results.total} total data`
    })

  } catch (e: any) {
    console.error('Import error:', e)
    return NextResponse.json({ error: `Server error: ${e.message}` }, { status: 500 })
  }
}