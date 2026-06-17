import { createClient } from '@supabase/supabase-js'
import path from 'path'
import { parseNIK, formatDateForDB, isBirthdateMatch } from './nik-parser'
import { parseRekapFile, buildRekapNikIndex } from './rekap-parser'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export interface FixResult {
  atlet_id: number
  nama_lengkap: string
  action: 'gender_fix' | 'tgl_lahir_fix' | 'cabor_sync' | 'lock' | 'investigation_flag'
  field: string
  old_value: string | null
  new_value: string | null
  reason: string
}

export interface SyncSummary {
  total_atlet: number
  gender_fixes: number
  tgl_lahir_fixes: number
  cabor_syncs: number
  locked: number
  investigated: number
  total_fixes: number
  skipped_already_locked: number
}

export async function runDataQualitySync(kontingenId: number): Promise<{
  fixes: FixResult[]
  summary: SyncSummary
}> {
  // Load rekap untuk ghost data detection
  const rekapPath = path.join(process.cwd(), 'data', 'rekap', '0rekap.xlsx')
  const rekap     = parseRekapFile(rekapPath)
  const nikIndex  = buildRekapNikIndex(rekap)

  // Build cabor map: LOWER(nama) → id (pakai MIN id untuk handle duplikat seperti IBCA MMA)
  const { data: caborRows } = await sb
    .from('cabang_olahraga')
    .select('id, nama')
  const caborMap = new Map<string, number>()
  for (const c of (caborRows || []).sort((a: any, b: any) => a.id - b.id)) {
    const key = (c.nama as string).toLowerCase().trim()
    if (!caborMap.has(key)) caborMap.set(key, c.id)
  }

  // Fetch semua atlet tenant — pagination
  let athletes: any[] = []
  for (let page = 0; ; page++) {
    const { data } = await sb
      .from('atlet')
      .select('id,nama_lengkap,no_ktp,tgl_lahir,gender,cabor_id,cabor_nama_raw,status_registrasi,is_locked,original_data,data_quality_notes')
      .eq('kontingen_id', kontingenId)
      .range(page * 1000, (page + 1) * 1000 - 1)
    if (!data || data.length === 0) break
    athletes = athletes.concat(data)
    if (data.length < 1000) break
  }

  const fixes: FixResult[] = []
  let skippedLocked = 0

  for (const atlet of athletes) {
    // Skip yang sudah di-lock sebelumnya (jangan overwrite manual review)
    if (atlet.is_locked) { skippedLocked++; continue }

    const nik       = atlet.no_ktp?.toString().trim().replace(/\D/g, '') || ''
    const nikResult = parseNIK(nik)

    // === LOCK: NIK invalid ===
    if (!nikResult.valid) {
      await lockAtlet(atlet, nikResult.errors)
      fixes.push({
        atlet_id: atlet.id, nama_lengkap: atlet.nama_lengkap,
        action: 'lock', field: 'is_locked',
        old_value: 'false', new_value: 'true',
        reason: `NIK invalid: ${nikResult.errors.join('; ')}`,
      })
      continue
    }

    // === INVESTIGATE: tidak ada di rekap KONI ===
    const inRekap = nikIndex.has(nik)
    if (!inRekap) {
      await flagInvestigation(atlet)
      fixes.push({
        atlet_id: atlet.id, nama_lengkap: atlet.nama_lengkap,
        action: 'investigation_flag', field: 'data_quality_status',
        old_value: atlet.data_quality_status || 'unverified',
        new_value: 'investigation_required',
        reason: 'NIK tidak ditemukan di rekap KONI Bandung',
      })
      // Lanjut fix lain yang bisa dikerjakan dari NIK
    }

    // Snapshot data asli sebelum fix pertama
    if (!atlet.original_data) {
      await sb.from('atlet').update({
        original_data: {
          gender:    atlet.gender,
          tgl_lahir: atlet.tgl_lahir,
          cabor_id:  atlet.cabor_id,
          no_ktp:    atlet.no_ktp,
          snapshotted_at: new Date().toISOString(),
        }
      }).eq('id', atlet.id)
    }

    const fieldFixes: { field: string; old: any; new: any; reason: string; action: FixResult['action'] }[] = []

    // === FIX 1: Gender ===
    if (nikResult.derived_gender && atlet.gender !== nikResult.derived_gender) {
      fieldFixes.push({
        field: 'gender', old: atlet.gender, new: nikResult.derived_gender,
        action: 'gender_fix',
        reason: `NIK menunjukkan ${nikResult.derived_gender}, data sebelumnya ${atlet.gender}`,
      })
    }

    // === FIX 2: Tanggal Lahir ===
    if (nikResult.birthdate_full && !isBirthdateMatch(nikResult.birthdate_full, atlet.tgl_lahir)) {
      const newDate = formatDateForDB(nikResult.birthdate_full)
      fieldFixes.push({
        field: 'tgl_lahir', old: atlet.tgl_lahir, new: newDate,
        action: 'tgl_lahir_fix',
        reason: `NIK → ${newDate}, data sebelumnya ${atlet.tgl_lahir}`,
      })
    }

    // === FIX 3: Cabor Sync (dari cabor_nama_raw) ===
    if (!atlet.cabor_id && atlet.cabor_nama_raw) {
      const key    = atlet.cabor_nama_raw.toLowerCase().trim()
      const caborId = caborMap.get(key)
      if (caborId) {
        fieldFixes.push({
          field: 'cabor_id', old: null, new: caborId,
          action: 'cabor_sync',
          reason: `Sync dari cabor_nama_raw: "${atlet.cabor_nama_raw}" → cabor_id ${caborId}`,
        })
      }
    }

    if (fieldFixes.length === 0) {
      // Tandai OK jika memang tidak ada issues
      if (!inRekap) {
        // Sudah di-flag investigation di atas, skip
      } else {
        await sb.from('atlet').update({ data_quality_status: 'ok' }).eq('id', atlet.id)
      }
      continue
    }

    // Apply semua fixes sekaligus
    const updatePayload: Record<string, any> = {
      data_quality_status: 'fixed_by_system',
      rekap_synced_at: new Date().toISOString(),
    }
    for (const f of fieldFixes) updatePayload[f.field] = f.new

    // Append notes
    const currentNotes: any[] = atlet.data_quality_notes || []
    updatePayload.data_quality_notes = [
      ...currentNotes,
      ...fieldFixes.map(f => ({
        field:          f.field,
        original_value: f.old,
        new_value:      f.new,
        fix_reason:     f.reason,
        fix_source:     f.action === 'cabor_sync' ? 'cabor_nama_raw' : 'nik_derivation',
        fixed_at:       new Date().toISOString(),
      })),
    ]

    await sb.from('atlet').update(updatePayload).eq('id', atlet.id)

    // Audit log
    await sb.from('atlet_data_quality_audit').insert(
      fieldFixes.map(f => ({
        atlet_id:    atlet.id,
        action_type: f.action,
        field_name:  f.field,
        old_value:   f.old != null ? String(f.old) : null,
        new_value:   f.new != null ? String(f.new) : null,
        fix_source:  f.action === 'cabor_sync' ? 'cabor_nama_raw' : 'nik_derivation',
        fix_reason:  f.reason,
        performed_by: 'system_auto_fix',
      }))
    )

    for (const f of fieldFixes) {
      fixes.push({
        atlet_id: atlet.id, nama_lengkap: atlet.nama_lengkap,
        action: f.action, field: f.field,
        old_value: f.old != null ? String(f.old) : null,
        new_value: f.new != null ? String(f.new) : null,
        reason: f.reason,
      })
    }
  }

  const summary: SyncSummary = {
    total_atlet:           athletes.length,
    gender_fixes:          fixes.filter(f => f.action === 'gender_fix').length,
    tgl_lahir_fixes:       fixes.filter(f => f.action === 'tgl_lahir_fix').length,
    cabor_syncs:           fixes.filter(f => f.action === 'cabor_sync').length,
    locked:                fixes.filter(f => f.action === 'lock').length,
    investigated:          fixes.filter(f => f.action === 'investigation_flag').length,
    total_fixes:           fixes.filter(f => !['lock','investigation_flag'].includes(f.action)).length,
    skipped_already_locked: skippedLocked,
  }

  // Save import log
  await sb.from('rekap_import_log').insert({
    rekap_file_name:   '0rekap.xlsx',
    total_records:     rekap.length,
    matched_records:   athletes.length - summary.investigated - summary.locked,
    unmatched_records: summary.investigated,
    fixes_applied:     summary.total_fixes,
    errors_found:      summary.locked,
    summary,
  })

  return { fixes, summary }
}

async function lockAtlet(atlet: any, errors: string[]) {
  const reason = `NIK invalid: ${errors.join('; ')}`
  await sb.from('atlet').update({
    data_quality_status: 'manual_review_required',
    is_locked:    true,
    locked_reason: reason,
    locked_at:    new Date().toISOString(),
  }).eq('id', atlet.id)

  await sb.from('atlet_data_quality_audit').insert({
    atlet_id:    atlet.id,
    action_type: 'lock',
    fix_reason:  reason,
    performed_by: 'system_auto_fix',
  })
}

async function flagInvestigation(atlet: any) {
  const currentNotes: any[] = atlet.data_quality_notes || []
  await sb.from('atlet').update({
    data_quality_status: 'investigation_required',
    data_quality_notes: [
      ...currentNotes,
      { field: 'general', fix_reason: 'NIK tidak ditemukan di rekap KONI', fixed_at: new Date().toISOString() },
    ],
  }).eq('id', atlet.id)

  await sb.from('atlet_data_quality_audit').insert({
    atlet_id:    atlet.id,
    action_type: 'investigation_flag',
    fix_reason:  'NIK tidak ditemukan di rekap KONI Bandung',
    performed_by: 'system_auto_fix',
  })
}
