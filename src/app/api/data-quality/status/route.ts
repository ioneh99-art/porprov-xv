import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const kontingenId = parseInt(searchParams.get('kontingen_id') || '0')
    if (!kontingenId) return NextResponse.json({ success: false, error: 'kontingen_id required' }, { status: 400 })

    const { data: athletes } = await sb
      .from('atlet')
      .select('data_quality_status, is_locked')
      .eq('kontingen_id', kontingenId)

    const breakdown = {
      total:                  0,
      ok:                     0,
      fixed_by_system:        0,
      manual_review_required: 0,
      investigation_required: 0,
      unverified:             0,
      locked:                 0,
    }

    for (const a of athletes || []) {
      breakdown.total++
      const s = (a.data_quality_status || 'unverified') as keyof typeof breakdown
      if (s in breakdown) (breakdown[s] as number)++
      if (a.is_locked) breakdown.locked++
    }

    const { data: lastImport } = await sb
      .from('rekap_import_log')
      .select('*')
      .order('imported_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ success: true, breakdown, last_import: lastImport })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
