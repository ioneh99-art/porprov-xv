import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getOperatorContext } from '@/lib/operator-context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const getSb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET() {
  try {
    const ctx = await getOperatorContext()

    // Pull all medali grouped by kontingen
    const { data: medali, error: e1 } = await getSb()
      .from('kejuaraan_atlet')
      .select('kontingen, medali')
      .eq('cabor', ctx.cabor)
    if (e1) throw e1

    // Pull atlet counts per kontingen
    const { data: atlet, error: e2 } = await getSb()
      .from('atlet')
      .select('kontingen')
      .eq('cabor', ctx.cabor)
    if (e2) throw e2

    const map: Record<string, { emas: number; perak: number; perunggu: number; totalAtlet: number }> = {}

    for (const row of medali ?? []) {
      const k = row.kontingen ?? 'unknown'
      if (!map[k]) map[k] = { emas: 0, perak: 0, perunggu: 0, totalAtlet: 0 }
      const m = String(row.medali ?? '').toLowerCase()
      if (m.includes('emas') || m === 'gold') map[k].emas++
      else if (m.includes('perak') || m === 'silver') map[k].perak++
      else if (m.includes('perunggu') || m === 'bronze') map[k].perunggu++
    }

    for (const row of atlet ?? []) {
      const k = row.kontingen ?? 'unknown'
      if (!map[k]) map[k] = { emas: 0, perak: 0, perunggu: 0, totalAtlet: 0 }
      map[k].totalAtlet++
    }

    const rows = Object.entries(map).map(([kontingen, m]) => ({
      kontingen,
      emas: m.emas,
      perak: m.perak,
      perunggu: m.perunggu,
      total: m.emas + m.perak + m.perunggu,
      totalAtlet: m.totalAtlet,
      isCurrent: kontingen === ctx.kontingen,
    }))

    return NextResponse.json({ rows, currentKontingen: ctx.kontingen, cabor: ctx.cabor })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, rows: [], currentKontingen: '—' }, { status: 200 })
  }
}
