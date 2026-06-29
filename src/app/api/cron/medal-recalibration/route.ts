// src/app/api/cron/medal-recalibration/route.ts
// KBAAS Fase 2.5 — cron harian recalibrate prediksi medali. Auth: Bearer CRON_SECRET.

import { NextRequest, NextResponse } from 'next/server'
import { recalibrateAll } from '@/lib/medal-prediction/recalibrate'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const kontingenId = new URL(req.url).searchParams.get('kontingen_id')
  try {
    const result = await recalibrateAll(kontingenId ? parseInt(kontingenId) : undefined)
    return NextResponse.json({ message: 'recalibration complete', ...result, at: new Date().toISOString() })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
