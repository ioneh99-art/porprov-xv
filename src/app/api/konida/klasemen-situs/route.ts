// src/app/api/konida/klasemen-situs/route.ts
// Klasemen resmi situs KONI Jabar apa adanya untuk War Room (pembandingnya — data kita —
// dihitung di War Room dari laporan yang disahkan, lib/klasemen-banding.ts).

import { NextRequest, NextResponse } from 'next/server'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { ambilKlasemenSitus } from '@/lib/klasemen-situs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const k = await ambilKlasemenSitus('KONI-Kab-Bandung-Report/1.0 (+https://www.konikab-bdg.com)')
  if (!k) return NextResponse.json({ error: 'Klasemen situs KONI Jabar tidak terbaca saat ini.' }, { status: 502 })
  return NextResponse.json(k)
}
