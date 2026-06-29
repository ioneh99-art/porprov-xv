// src/app/api/konida/atlet-achievement/route.ts
// KBAAS Fase 1.2 — prestasi terbaru atlet (service-key) untuk Achievement Banner.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET(req: NextRequest) {
  const atletId = parseInt(new URL(req.url).searchParams.get('atlet_id') || '0')
  if (!atletId) return NextResponse.json({ error: 'atlet_id required' }, { status: 400 })
  try {
    const { data, error } = await sb
      .from('v_atlet_recent_achievements')
      .select('*')
      .eq('atlet_id', atletId)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ achievement: data ?? null })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
