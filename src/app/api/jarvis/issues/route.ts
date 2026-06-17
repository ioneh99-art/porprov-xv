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
    const status      = searchParams.get('status') || 'open'

    const { data, error } = await sb
      .from('jarvis_issues')
      .select('*')
      .eq('kontingen_id', kontingenId)
      .eq('status', status)
      .order('severity', { ascending: true })   // critical sorts before warning alphabetically — handled client-side
      .order('detected_at', { ascending: false })

    if (error) throw error

    // Sort: critical → warning → info
    const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 }
    const sorted = (data || []).sort((a: any, b: any) =>
      (SEVERITY_ORDER[a.severity as keyof typeof SEVERITY_ORDER] ?? 9) -
      (SEVERITY_ORDER[b.severity as keyof typeof SEVERITY_ORDER] ?? 9)
    )

    return NextResponse.json({ success: true, issues: sorted, count: sorted.length })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
