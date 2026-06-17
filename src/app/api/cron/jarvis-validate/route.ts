import { NextResponse } from 'next/server'
import { runJarvisQA } from '@/lib/jarvis/engine'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runJarvisQA(4) // KAB. BANDUNG
    return NextResponse.json({ success: true, kontingen: 'KAB. BANDUNG', ...result })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
