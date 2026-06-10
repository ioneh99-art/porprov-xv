import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getOperatorContext } from '@/lib/operator-context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const getSb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const RANGE_MONTHS: Record<string, number | null> = {
  '3M': 3, '6M': 6, '12M': 12, 'ALL': null,
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getOperatorContext()
    const range = req.nextUrl.searchParams.get('range') ?? '12M'
    const monthsBack = RANGE_MONTHS[range] ?? null

    let query = getSb()
      .from('kejuaraan_atlet')
      .select('tanggal, medali, cabor')
      .eq('cabor', ctx.cabor)

    if (monthsBack) {
      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - monthsBack)
      query = query.gte('tanggal', cutoff.toISOString().split('T')[0])
    }

    const { data, error } = await query
    if (error) throw error

    // Group by YYYY-MM
    const buckets: Record<string, { emas: number; perak: number; perunggu: number }> = {}
    for (const row of data ?? []) {
      if (!row.tanggal) continue
      const month = String(row.tanggal).slice(0, 7) // YYYY-MM
      if (!buckets[month]) buckets[month] = { emas: 0, perak: 0, perunggu: 0 }
      const m = String(row.medali ?? '').toLowerCase()
      if (m.includes('emas') || m === 'gold') buckets[month].emas++
      else if (m.includes('perak') || m === 'silver') buckets[month].perak++
      else if (m.includes('perunggu') || m === 'bronze') buckets[month].perunggu++
    }

    const points = Object.entries(buckets)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, m]) => ({
        month: formatMonth(month),
        emas: m.emas,
        perak: m.perak,
        perunggu: m.perunggu,
        total: m.emas + m.perak + m.perunggu,
      }))

    return NextResponse.json({ points, cabor: ctx.cabor, range })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, points: [], cabor: '—' }, { status: 200 })
  }
}

function formatMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-')
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  return `${names[parseInt(m) - 1]} ${y.slice(2)}`
}
