// src/app/api/cache/invalidate/route.ts
// Dipanggil superadmin setelah update subscription agar perubahan plan
// langsung efektif tanpa tunggu cache TTL 5 menit.

import { NextRequest, NextResponse } from 'next/server'
import { invalidateSubscriptionCache } from '@/lib/subscriptions'
import { getServerSession } from '@/lib/guard'

export async function POST(req: NextRequest) {
  const user = await getServerSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const OK = ['superadmin', 'koni_jabar']
  if (!OK.includes(user.role) && !OK.includes(user.level)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const kontingenId: number | undefined = body.kontingen_id
    ? parseInt(body.kontingen_id)
    : undefined

  invalidateSubscriptionCache(kontingenId)

  return NextResponse.json({
    ok: true,
    message: kontingenId
      ? `Cache subscription kontingen ${kontingenId} telah dihapus`
      : 'Seluruh cache subscription telah dihapus',
  })
}
