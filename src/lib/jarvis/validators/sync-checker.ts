import { createClient } from '@supabase/supabase-js'
import type { JarvisIssue } from '../types'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export async function checkDataSync(kontingenId: number): Promise<JarvisIssue[]> {
  const issues: JarvisIssue[] = []

  // Atlet Verified tanpa cabor_id
  const { data: verifiedNoCabor } = await sb
    .from('atlet')
    .select('id, nama_lengkap')
    .eq('kontingen_id', kontingenId)
    .in('status_verifikasi', ['Verified', 'Approved Cabor'])
    .is('cabor_id', null)

  if (verifiedNoCabor && verifiedNoCabor.length > 0) {
    issues.push({
      issue_type: 'sync_mismatch',
      severity: 'warning',
      source_record_id: null,
      related_record_ids: verifiedNoCabor.map((a: any) => a.id),
      title: `${verifiedNoCabor.length} atlet verified tanpa cabor_id`,
      description: 'Atlet status Verified seharusnya sudah punya cabor_id',
      suggested_action: 'Bulk-update cabor_id untuk atlet ini',
      raw_data: { count: verifiedNoCabor.length, sample: verifiedNoCabor.slice(0, 5) },
    })
  }

  return issues
}
