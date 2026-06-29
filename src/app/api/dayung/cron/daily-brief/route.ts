// src/app/api/dayung/cron/daily-brief/route.ts
// Vercel cron (harian) — pre-generate & cache Strategic Brief Dayung.
// Hobby-plan friendly (harian). Auth: Bearer CRON_SECRET.

import { NextResponse } from 'next/server'
import { generateDayungBrief, saveBriefCache } from '@/lib/sport-plugins/dayung/brief-generator'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const kontingenId = 4 // Kab. Bandung
    const result = await generateDayungBrief(kontingenId)
    await saveBriefCache(kontingenId, result)
    return NextResponse.json({ success: true, cabor: 'Dayung', kontingenId, model: result.model_used, chars: result.brief.length })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
