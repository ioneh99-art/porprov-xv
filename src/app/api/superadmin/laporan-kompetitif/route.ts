// src/app/api/superadmin/laporan-kompetitif/route.ts
// P1g — laporan kekompetitifan nomor (jml kontingen per nomor). Superadmin lintas tenant.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (s.level !== 'superadmin' && s.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  // Hanya nomor yang SUDAH ada peserta; urut paling kurang kompetitif dulu.
  const { data, error } = await sb.from('v_nomor_kompetitif')
    .select('*').gt('jml_atlet', 0).order('jml_kontingen', { ascending: true }).order('cabor', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
