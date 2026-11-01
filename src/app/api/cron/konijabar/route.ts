// src/app/api/cron/konijabar/route.ts
// Cron harian: baca hasil laga Kab. Bandung dari situs panitia ke antrean pengesahan,
// walau tidak ada yang membuka Report Pertandingan hari itu. Auth: Bearer CRON_SECRET.
// Proyek Vercel lain yang berbagi kode ini (porprov-xv, dayung-jabar) melewatinya.

import { NextRequest, NextResponse } from 'next/server'
import { sinkronKonijabar } from '@/lib/konijabar-sinkron'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  // Pola sama dengan cron lain: bila CRON_SECRET terpasang, wajib cocok. Tanpa itu pun
  // aman — pembacaan tetap dibatasi jeda 15 menit dan tidak bisa dipaksa dari sini.
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const alamat = `${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? ''} ${process.env.VERCEL_URL ?? ''}`.toLowerCase()
  const kabBandung = process.env.DEFAULT_TENANT === 'kabbandung' || /konikab|kab-bandung|kabbandung/.test(alamat)
  if (!kabBandung) return NextResponse.json({ dilewati: 'bukan proyek Kab. Bandung' })
  try {
    return NextResponse.json(await sinkronKonijabar(4, { oleh: 'cron harian' }))
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
