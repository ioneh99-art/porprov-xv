// src/app/api/konida/pipeline-watch/route.ts
// KBAAS Fase 0 — serve view v_pipeline_watch_jabar (service-key, bypass RLS).
// Atlet Jabar di event kejurnas eksternal (incl. Kab. Bandung).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET(_req: NextRequest) {
  try {
    const { data, error } = await sb
      .from('v_pipeline_watch_jabar')
      .select('*')
      .order('event_date', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = data ?? []
    const summary = {
      total: rows.length,
      kontingen: rows.filter((r: any) => r.atlet_kontingen_id === 4).length,
      jabar: rows.filter((r: any) => String(r.pipeline_tag).includes('JABAR')).length,
      unlinked: rows.filter((r: any) => !r.atlet_id).length,
      medals: rows.filter((r: any) => r.medal).length,
    }
    return NextResponse.json({ rows, summary })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
