import { NextRequest, NextResponse } from 'next/server'
import { runDataQualitySync } from '@/lib/data-quality/auto-fix-engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 menit — sync bisa lama untuk 1100+ atlet

export async function POST(req: NextRequest) {
  try {
    const { kontingenId } = await req.json()
    if (!kontingenId) return NextResponse.json({ success: false, error: 'kontingenId required' }, { status: 400 })

    const result = await runDataQualitySync(kontingenId)

    return NextResponse.json({ success: true, ...result, timestamp: new Date().toISOString() })
  } catch (error: any) {
    console.error('Data quality sync error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
