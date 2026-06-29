// src/app/api/dayung/brief/route.ts
// GET  -> brief tersimpan (cache, instan)
// POST -> generate baru via Anthropic + simpan cache

import { NextRequest, NextResponse } from 'next/server'
import { generateDayungBrief, saveBriefCache, getBriefCache } from '@/lib/sport-plugins/dayung/brief-generator'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET(req: NextRequest) {
  const kontingenId = Number(new URL(req.url).searchParams.get('kontingenId') ?? 4)
  const cached = await getBriefCache(kontingenId)
  if (!cached) return NextResponse.json({ success: true, brief: null })
  return NextResponse.json({
    success: true, source: 'cache', brief: cached.content_markdown,
    stats: cached.stats, generated_at: cached.generated_at,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const kontingenId = body?.kontingenId ?? 4
    const result = await generateDayungBrief(kontingenId)
    await saveBriefCache(kontingenId, result)
    return NextResponse.json({ success: true, source: 'live', ...result })
  } catch (e: any) {
    console.error('Dayung brief error:', e)
    return NextResponse.json({ success: false, error: e.message || 'Internal error' }, { status: 500 })
  }
}
