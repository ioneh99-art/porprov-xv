// src/app/api/konida/atlet-projection/route.ts
// KBAAS Fase 2.6 — projeksi performa antar-nomor (service-key).

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

  const u = new URL(req.url)
  const atletId = parseInt(u.searchParams.get('atlet_id') || '0')
  const target = u.searchParams.get('target') || ''
  if (!atletId || !target) return NextResponse.json({ error: 'atlet_id & target required' }, { status: 400 })
  try {
    const { data, error } = await sb.rpc('project_athlete_performance', { p_atlet_id: atletId, p_target_nomor: target })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ projections: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
