// src/app/api/rekonsiliasi/status/route.ts
// Angka ringkas utk dashboard: peserta resmi (dari v_peserta_resmi) vs total atlet.
// Guard sesi + kontingen dari sesi.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const kontingen_id = s.kontingen_id
  if (!kontingen_id) return NextResponse.json({ peserta_resmi: null, total_atlet: null, terekonsiliasi: false })

  const db = sb()
  const [{ count: resmi }, { count: total }] = await Promise.all([
    db.from('v_peserta_resmi').select('atlet_id', { count: 'exact', head: true }).eq('kontingen_id', kontingen_id),
    db.from('atlet').select('id', { count: 'exact', head: true }).eq('kontingen_id', kontingen_id),
  ])
  return NextResponse.json({
    peserta_resmi: resmi ?? 0,
    total_atlet: total ?? 0,
    terekonsiliasi: (resmi ?? 0) > 0,
  })
}
