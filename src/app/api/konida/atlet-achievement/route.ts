// src/app/api/konida/atlet-achievement/route.ts
// KBAAS Fase 1.2 — prestasi terbaru atlet (service-key) untuk Achievement Banner.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET(req: NextRequest) {
  // GERBANG SESI — ditambahkan setelah audit menyeluruh.
  // Rute ini memakai service key (menembus RLS) dan sebelumnya bisa dibuka siapa
  // pun tanpa login. Dua di antaranya mengeluarkan NIK atlet apa adanya.
  // Semua pemanggilnya adalah halaman yang memang di balik login, jadi menutup
  // pintunya tidak memutus apa pun.
  const _sesi = await getServerSession()
  if (!_sesi) return NextResponse.json({ error: 'Silakan login dulu.' }, { status: 401 })

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
