// src/app/api/rekonsiliasi/kbaas/route.ts
// Baca data KBAAS (target emas dua-lapis + proyeksi per atlet) dari batch intel confirmed
// terbaru. Guard sesi + kontingen dari sesi.

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
  if (!kontingen_id) return NextResponse.json({ ada: false })

  const db = sb()
  // Batch intel confirmed terbaru = batch yg punya baris intel_target_atlet.
  const { data: last } = await db.from('intel_target_atlet').select('batch_id').eq('kontingen_id', kontingen_id).order('batch_id', { ascending: false }).limit(1).maybeSingle()
  if (!last) return NextResponse.json({ ada: false })
  const batch_id = (last as any).batch_id

  const [{ data: sum }, { data: atlet }] = await Promise.all([
    db.from('v_kbaas_target_summary').select('*').eq('batch_id', batch_id).maybeSingle(),
    db.from('intel_target_atlet').select('nama_file,cabang_file,target_medali,capaian_catatan,pesaing,analisis,atlet_id').eq('batch_id', batch_id).order('cabang_file'),
  ])
  return NextResponse.json({ ada: true, batch_id, summary: sum ?? null, atlet: atlet ?? [] })
}
