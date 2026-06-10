/**
 * PentaScore API — Excel Athlete Import
 *
 * POST /api/pentascore/athletes/import
 *   multipart/form-data:
 *     file:       Excel file (.xlsx)
 *     tenant_id:  UUID (required)
 *     event_id:   UUID (optional - auto-enroll if provided)
 *     mode:       'preview' | 'commit'
 *
 * Snapshot pattern:
 *   - Master athlete inserted into ps_athletes
 *   - If event_id, also snapshotted into ps_event_athletes
 */
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import crypto from 'crypto'
import { pscDb, getPentascoreSession, writeAudit } from '@/lib/pentascore/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'  // need Node runtime for Buffer + crypto

type ImportRow = {
  rowNum: number
  data: {
    nama_lengkap:     string
    uipm_id?:         string
    gender:           string
    tanggal_lahir?:   string
    negara_code?:     string
    affiliation_nama?:string
    start_number?:    number
  }
  errors: string[]
  warnings: string[]
}

function normalizeGender(g: any): string | null {
  const s = String(g ?? '').trim().toUpperCase()
  if (s === 'L' || s === 'M' || s === 'PUTRA' || s === 'PRIA' || s === 'MALE') return 'L'
  if (s === 'P' || s === 'F' || s === 'PUTRI' || s === 'WANITA' || s === 'FEMALE') return 'P'
  return null
}

function normalizeDate(d: any): string | null {
  if (!d) return null
  // Excel date number → JS Date
  if (typeof d === 'number') {
    const date = XLSX.SSF.parse_date_code(d)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`
    }
  }
  // String date
  const s = String(d).trim()
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // Try DD/MM/YYYY or MM/DD/YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m) {
    const a = parseInt(m[1], 10)
    const b = parseInt(m[2], 10)
    const y = parseInt(m[3], 10)
    // Assume DD/MM/YYYY for Indonesian context
    if (a <= 31 && b <= 12) return `${y}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')}`
    if (b <= 31 && a <= 12) return `${y}-${String(a).padStart(2,'0')}-${String(b).padStart(2,'0')}`
  }
  return null
}

function validateRow(raw: any, rowNum: number): ImportRow {
  const errors: string[] = []
  const warnings: string[] = []

  // nama_lengkap (REQUIRED)
  const nama = String(raw.nama_lengkap ?? '').trim()
  if (!nama) errors.push('nama_lengkap is required')
  if (nama.startsWith('[')) errors.push('nama_lengkap masih berupa placeholder (e.g. "[ISI DENGAN ...]")')

  // gender (REQUIRED)
  const gender = normalizeGender(raw.gender)
  if (!gender) errors.push(`gender invalid: "${raw.gender}" (expected L or P)`)

  // Optional fields
  const uipm_id = raw.uipm_id ? String(raw.uipm_id).trim() : undefined
  const tanggal_lahir = raw.tanggal_lahir ? normalizeDate(raw.tanggal_lahir) ?? undefined : undefined
  if (raw.tanggal_lahir && !tanggal_lahir) {
    warnings.push(`tanggal_lahir tidak terbaca: "${raw.tanggal_lahir}"`)
  }

  const negara_code = raw.negara_code ? String(raw.negara_code).trim().toUpperCase() : 'IDN'
  if (negara_code.length !== 3) warnings.push(`negara_code biasanya 3 huruf (got "${negara_code}")`)

  const affiliation = raw.affiliation_nama ? String(raw.affiliation_nama).trim() : undefined

  let start_number: number | undefined
  if (raw.start_number != null && raw.start_number !== '') {
    const n = Number(raw.start_number)
    if (Number.isInteger(n) && n > 0) start_number = n
    else warnings.push(`start_number invalid: "${raw.start_number}" (expected positive integer)`)
  }

  return {
    rowNum,
    data: {
      nama_lengkap: nama,
      uipm_id,
      gender: gender ?? '',
      tanggal_lahir,
      negara_code,
      affiliation_nama: affiliation,
      start_number,
    },
    errors,
    warnings,
  }
}

export async function POST(req: NextRequest) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const tenantId = form.get('tenant_id') as string | null
  const eventId = form.get('event_id') as string | null
  const mode = (form.get('mode') as string | null) ?? 'preview'

  if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })
  if (!tenantId) return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })

  // Read file
  const bytes = Buffer.from(await file.arrayBuffer())
  const fileHash = crypto.createHash('sha256').update(bytes).digest('hex')

  // Parse Excel
  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(bytes, { type: 'buffer', cellDates: false })
  } catch (e: any) {
    return NextResponse.json({ error: `Excel parse error: ${e.message}` }, { status: 400 })
  }

  // Find Athletes sheet
  const sheetName = wb.SheetNames.find(n => n.toLowerCase() === 'athletes') ?? wb.SheetNames[0]
  if (!sheetName) {
    return NextResponse.json({ error: 'No sheet "Athletes" found in Excel' }, { status: 400 })
  }
  const sheet = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<any>(sheet, { raw: true, defval: null })

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No data rows in Athletes sheet' }, { status: 400 })
  }
  if (rows.length > 1000) {
    return NextResponse.json({ error: `Too many rows: ${rows.length} (max 1000)` }, { status: 400 })
  }

  // Validate
  const validated = rows.map((r, i) => validateRow(r, i + 2))  // +2 because row 1 = header, sheet rows are 1-indexed
  const validRows = validated.filter(r => r.errors.length === 0)
  const errorRows = validated.filter(r => r.errors.length > 0)

  // Preview mode: return validation results
  if (mode === 'preview') {
    return NextResponse.json({
      file_name:    file.name,
      file_size:    file.size,
      file_hash:    fileHash,
      sheet_name:   sheetName,
      rows_total:   rows.length,
      rows_valid:   validRows.length,
      rows_errors:  errorRows.length,
      preview:      validated.slice(0, 50),  // first 50 for UI preview
      all_validated:validated,                // full set if needed
    })
  }

  // ────────────────────────────────────────────────────────────
  // COMMIT MODE: insert into ps_athletes (+ ps_event_athletes if eventId)
  // ────────────────────────────────────────────────────────────

  // Record import attempt
  const { data: importRec } = await pscDb
    .from('ps_excel_imports')
    .insert({
      tenant_id:    tenantId,
      event_id:     eventId,
      file_name:    file.name,
      file_size:    file.size,
      file_hash:    fileHash,
      sheet_name:   sheetName,
      rows_total:   rows.length,
      status:       'processing',
      imported_by:  session.username,
    })
    .select()
    .single()

  if (!importRec) {
    return NextResponse.json({ error: 'Failed to create import record' }, { status: 500 })
  }

  let inserted = 0
  let failed = 0
  const errors: any[] = []

  // Insert athletes one by one (could batch but easier error handling row-by-row)
  for (const row of validRows) {
    try {
      const athletePayload = {
        tenant_id:        tenantId,
        uipm_id:          row.data.uipm_id ?? null,
        nama_lengkap:     row.data.nama_lengkap,
        gender:           row.data.gender,
        tanggal_lahir:    row.data.tanggal_lahir ?? null,
        negara_code:      row.data.negara_code ?? 'IDN',
        negara_nama:      row.data.negara_code === 'IDN' ? 'Indonesia' : null,
        affiliation_nama: row.data.affiliation_nama ?? null,
        is_active:        true,
        created_by:       session.username,
      }

      const { data: athlete, error: athErr } = await pscDb
        .from('ps_athletes')
        .insert(athletePayload)
        .select()
        .single()

      if (athErr) {
        failed++
        errors.push({ row: row.rowNum, message: athErr.message })
        continue
      }

      // Auto-enroll if event_id
      if (eventId) {
        const snap = {
          event_id:         eventId,
          athlete_id:       athlete.id,
          nama_lengkap:     athlete.nama_lengkap,
          uipm_id:          athlete.uipm_id,
          gender:           athlete.gender,
          tanggal_lahir:    athlete.tanggal_lahir,
          negara_code:      athlete.negara_code,
          affiliation_nama: athlete.affiliation_nama,
          start_number:     row.data.start_number ?? null,
          enrollment_status:'registered',
          enrolled_by:      session.username,
          source:           'excel_import',
          source_ref:       importRec.id,
        }
        const { error: enrErr } = await pscDb.from('ps_event_athletes').insert(snap)
        if (enrErr) {
          errors.push({ row: row.rowNum, message: `Enrollment failed: ${enrErr.message}` })
          // Athlete inserted but not enrolled - partial
        }
      }

      inserted++
    } catch (e: any) {
      failed++
      errors.push({ row: row.rowNum, message: e.message })
    }
  }

  // Also count validation-failed rows
  for (const r of errorRows) {
    errors.push({ row: r.rowNum, message: `Validation: ${r.errors.join('; ')}` })
  }

  // Update import record
  const finalStatus = failed === 0 && errorRows.length === 0 ? 'completed'
                    : inserted === 0 ? 'failed'
                    : 'partial'
  await pscDb
    .from('ps_excel_imports')
    .update({
      rows_success: inserted,
      rows_failed:  failed + errorRows.length,
      errors:       errors.length ? errors : null,
      status:       finalStatus,
    })
    .eq('id', importRec.id)

  await writeAudit({
    tenantId,
    eventId,
    actorUsername: session.username,
    actorRole:     session.role,
    actionType:    'import',
    targetTable:   'ps_excel_imports',
    targetId:      importRec.id,
    newValues:     { file_name: file.name, file_hash: fileHash, inserted, failed: failed + errorRows.length },
  })

  return NextResponse.json({
    import_id:    importRec.id,
    status:       finalStatus,
    rows_total:   rows.length,
    rows_inserted:inserted,
    rows_failed:  failed + errorRows.length,
    errors:       errors.slice(0, 100),  // limit response size
  })
}
