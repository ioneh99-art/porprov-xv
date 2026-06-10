import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getOperatorContext, daysToEvent } from '@/lib/operator-context'

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

    // Count atlet untuk cabor operator
    const { count: atletCount } = await getSb()
      .from('atlet')
      .select('*', { count: 'exact', head: true })
      .eq('cabor', ctx.cabor)

    // Count medali dari kejuaraan_atlet
    const { data: medaliData } = await getSb()
      .from('kejuaraan_atlet')
      .select('medali')
      .eq('cabor', ctx.cabor)

    let emas = 0, perak = 0, perunggu = 0
    for (const row of medaliData ?? []) {
      const m = String(row.medali ?? '').toLowerCase()
      if (m.includes('emas') || m === 'gold') emas++
      else if (m.includes('perak') || m === 'silver') perak++
      else if (m.includes('perunggu') || m === 'bronze') perunggu++
    }

    // Ranking kontingen — count medali per kontingen, sort
    const { data: allMedali } = await getSb()
      .from('kejuaraan_atlet')
      .select('kontingen, medali')

    const kontMap: Record<string, number> = {}
    for (const row of allMedali ?? []) {
      const k = row.kontingen ?? 'unknown'
      const m = String(row.medali ?? '').toLowerCase()
      if (!kontMap[k]) kontMap[k] = 0
      // Weighted: emas=3, perak=2, perunggu=1
      if (m.includes('emas')) kontMap[k] += 3
      else if (m.includes('perak')) kontMap[k] += 2
      else if (m.includes('perunggu')) kontMap[k] += 1
    }
    const sortedKont = Object.entries(kontMap).sort((a, b) => b[1] - a[1])
    const rankIdx = sortedKont.findIndex(([k]) => k === ctx.kontingen)
    const rankingKontingen = rankIdx >= 0 ? rankIdx + 1 : null

    return NextResponse.json({
      totalAtlet: atletCount ?? 0,
      totalMedaliEmas: emas,
      totalMedaliPerak: perak,
      totalMedaliPerunggu: perunggu,
      rankingKontingen,
      cabor: ctx.cabor,
      kontingen: ctx.kontingen,
      daysToEvent: daysToEvent(),
    })
  } catch (err: any) {
    return NextResponse.json({
      error: err.message ?? 'unknown',
      totalAtlet: 0,
      totalMedaliEmas: 0,
      totalMedaliPerak: 0,
      totalMedaliPerunggu: 0,
      rankingKontingen: null,
      cabor: '—',
      daysToEvent: null,
    }, { status: 200 })
  }
}

