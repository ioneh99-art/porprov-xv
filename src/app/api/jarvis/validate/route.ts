import { NextRequest, NextResponse } from 'next/server'
import { runJarvisQA } from '@/lib/jarvis/engine'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { kontingenId } = await req.json()
    if (!kontingenId) return NextResponse.json({ success: false, error: 'kontingenId required' }, { status: 400 })

    const result = await runJarvisQA(Number(kontingenId))
    return NextResponse.json({ success: true, ...result, timestamp: new Date().toISOString() })
  } catch (error: any) {
    console.error('Jarvis validate error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
