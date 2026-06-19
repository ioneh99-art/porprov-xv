import { createClient } from '@supabase/supabase-js'
import { validateNIK }           from './validators/nik-validator'
import { detectDuplicates }      from './validators/duplicate-detector'
import { validateRequiredFields } from './validators/required-field'
import { detectCaborNull }       from './validators/cabor-null-detector'
import { checkDataSync }         from './validators/sync-checker'
import type { Atlet, JarvisIssue, JarvisSummary } from './types'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export async function runJarvisQA(kontingenId: number): Promise<{
  issues: JarvisIssue[]
  summary: JarvisSummary
}> {
  // Fetch semua atlet tenant — pagination karena PostgREST limit 1000
  let athletes: Atlet[] = []
  for (let page = 0; ; page++) {
    const { data } = await sb
      .from('atlet')
      .select('id,nama_lengkap,no_ktp,tgl_lahir,gender,kontingen_id,cabor_id,cabor_nama_raw,status_verifikasi,status_registrasi')
      .eq('kontingen_id', kontingenId)
      .range(page * 1000, (page + 1) * 1000 - 1)
    if (!data || data.length === 0) break
    athletes = athletes.concat(data as Atlet[])
    if (data.length < 1000) break
  }

  // Skip atlet yang sudah Ditolak Admin — bukan masalah operasional aktif
  const active = athletes.filter(a => a.status_registrasi !== 'Ditolak Admin')

  const allIssues: JarvisIssue[] = []

  // Per-atlet validators (synchronous — fast)
  for (const atlet of active) {
    allIssues.push(
      ...validateNIK(atlet),
      ...validateRequiredFields(atlet),
      ...detectCaborNull(atlet),
    )
  }

  // Batch validators
  allIssues.push(...detectDuplicates(active))
  allIssues.push(...await checkDataSync(kontingenId))

  // Tag kontingen_id ke semua issues
  allIssues.forEach(i => { i.kontingen_id = kontingenId })

  // Prevent concurrent scans: cek apakah ada scan yang baru selesai dalam 30 detik terakhir
  const { data: recentScan } = await sb
    .from('jarvis_issues')
    .select('detected_at')
    .eq('kontingen_id', kontingenId)
    .eq('status', 'open')
    .order('detected_at', { ascending: false })
    .limit(1)

  const lastScanMs = recentScan?.[0]?.detected_at
    ? Date.now() - new Date(recentScan[0].detected_at).getTime()
    : Infinity

  if (lastScanMs < 30_000) {
    // Scan baru saja jalan — skip untuk cegah duplikat (React Strict Mode double-invoke)
    const existing = await sb
      .from('jarvis_issues')
      .select('*')
      .eq('kontingen_id', kontingenId)
      .eq('status', 'open')
    const existingData = existing.data || []
    return {
      issues: existingData as unknown as JarvisIssue[],
      summary: {
        total:    existingData.length,
        critical: existingData.filter((i: any) => i.severity === 'critical').length,
        warning:  existingData.filter((i: any) => i.severity === 'warning').length,
        info:     existingData.filter((i: any) => i.severity === 'info').length,
      }
    }
  }

  // Persist: dismiss issues lama → insert yang baru (dedup by title)
  await sb
    .from('jarvis_issues')
    .update({ status: 'dismissed' })
    .eq('kontingen_id', kontingenId)
    .eq('status', 'open')

  if (allIssues.length > 0) {
    // Dedup by issue_type+source_record_id (bukan title — nama atlet bisa sama!)
    // Untuk group issues (duplicate) yang tidak punya source_record_id unik, fallback ke title
    const seen = new Set<string>()
    const unique = allIssues.filter(i => {
      const key = i.source_record_id != null
        ? `${i.issue_type}|${i.source_record_id}`
        : i.title
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    await sb.from('jarvis_issues').insert(
      unique.map(i => ({
        issue_type:         i.issue_type,
        severity:           i.severity,
        source_record_id:   i.source_record_id ?? null,
        related_record_ids: i.related_record_ids ? JSON.stringify(i.related_record_ids) : null,
        kontingen_id:       i.kontingen_id,
        title:              i.title,
        description:        i.description,
        suggested_action:   i.suggested_action,
        raw_data:           i.raw_data ?? null,
        status:             'open',
      }))
    )
  }

  const summary: JarvisSummary = {
    total:    allIssues.length,
    critical: allIssues.filter(i => i.severity === 'critical').length,
    warning:  allIssues.filter(i => i.severity === 'warning').length,
    info:     allIssues.filter(i => i.severity === 'info').length,
  }

  return { issues: allIssues, summary }
}
