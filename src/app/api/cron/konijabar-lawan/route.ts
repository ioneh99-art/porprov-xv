// src/app/api/cron/konijabar-lawan/route.ts
// Cron harian: tarik peserta (cabor target) & bagan nomor target dari situs panitia untuk
// Head-to-Head, walau tidak ada yang membuka halamannya. Auth: Bearer CRON_SECRET.
// Pembacaan bertahap (± 40 dtk per jalan); sisanya dilanjutkan saat halaman dibuka.

import { NextRequest, NextResponse } from 'next/server'
import { sinkronLawan } from '@/lib/lawan-sinkron'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const alamat = `${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? ''} ${process.env.VERCEL_URL ?? ''}`.toLowerCase()
  const kabBandung = process.env.DEFAULT_TENANT === 'kabbandung' || /konikab|kab-bandung|kabbandung/.test(alamat)
  if (!kabBandung) return NextResponse.json({ dilewati: 'bukan proyek Kab. Bandung' })
  try {
    return NextResponse.json(await sinkronLawan(4, { oleh: 'cron harian' }))
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
