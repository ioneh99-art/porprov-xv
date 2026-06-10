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

    // Try to fetch from mutasi_atlet table
    const { data, error } = await getSb()
      .from('mutasi_atlet')
      .select('id, atlet_nama, type, from_value, to_value, tanggal, alasan, status')
      .or(`from_value.eq.${ctx.kontingen},to_value.eq.${ctx.kontingen},cabor.eq.${ctx.cabor}`)
      .order('tanggal', { ascending: false })
      .limit(200)

    if (error) {
      // Table might not exist
      return NextResponse.json({
        mutations: [],
        stats: { totalMutasi: 0, byType: [], byMonth: [], inflow: 0, outflow: 0 },
        warning: 'Table mutasi_atlet belum ada di getSb(). Bikin migration dulu.',
      })
    }

    const mutations = (data ?? []).map(m => ({
      id: m.id,
      atletNama: m.atlet_nama,
      type: m.type,
      fromValue: m.from_value,
      toValue: m.to_value,
      tanggal: m.tanggal,
      alasan: m.alasan,
      status: m.status,
    }))

    // Compute stats
    const byTypeMap: Record<string, number> = {}
    const byMonthMap: Record<string, number> = {}
    let inflow = 0
    let outflow = 0

    for (const m of mutations) {
      byTypeMap[m.type] = (byTypeMap[m.type] ?? 0) + 1
      if (m.tanggal) {
        const month = String(m.tanggal).slice(0, 7)
        byMonthMap[month] = (byMonthMap[month] ?? 0) + 1
      }
      if (m.type === 'kontingen') {
        if (m.toValue === ctx.kontingen) inflow++
        if (m.fromValue === ctx.kontingen) outflow++
      }
    }

    return NextResponse.json({
      mutations,
      stats: {
        totalMutasi: mutations.length,
        byType: Object.entries(byTypeMap).map(([type, count]) => ({ type, count })),
        byMonth: Object.entries(byMonthMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([month, count]) => ({ month: formatMonth(month), count })),
        inflow,
        outflow,
      },
    })
  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
      mutations: [],
      stats: { totalMutasi: 0, byType: [], byMonth: [], inflow: 0, outflow: 0 },
    }, { status: 200 })
  }
}

function formatMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-')
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  return `${names[parseInt(m) - 1]} ${y.slice(2)}`
}

