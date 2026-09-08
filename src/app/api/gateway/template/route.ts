// src/app/api/gateway/template/route.ts
// Unduh template Excel Data Gateway. Wajib sesi.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/guard'
import { buatTemplate, namaBerkasTemplate, TEMPLATES, type JenisTemplate } from '@/lib/gateway/templates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Silakan login dulu.' }, { status: 401 })

  const jenis = new URL(req.url).searchParams.get('jenis') as JenisTemplate | null
  if (!jenis || !(jenis in TEMPLATES)) {
    return NextResponse.json(
      { error: `jenis wajib: ${Object.keys(TEMPLATES).join(' | ')}` }, { status: 400 })
  }

  const buf = buatTemplate(jenis)
  return new NextResponse(buf as any, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${namaBerkasTemplate(jenis)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
