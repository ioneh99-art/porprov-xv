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

export async function GET(req: NextRequest) {
  try {
    const ctx = await getOperatorContext()
    const q = req.nextUrl.searchParams.get('q')
    const atletId = req.nextUrl.searchParams.get('atletId')

    // Mode 1: search by name
    if (q && !atletId) {
      const { data, error } = await getSb()
        .from('atlet')
        .select('id, nama, nik, cabor, kontingen, jenis_kelamin, usia, tanggal_lahir')
        .eq('cabor', ctx.cabor)
        .ilike('nama', `%${q}%`)
        .limit(15)
      if (error) throw error

      return NextResponse.json({
        atlet: (data ?? []).map(a => ({
          ...a,
          usia: a.usia ?? computeUsia(a.tanggal_lahir),
        }))
      })
    }

    // Mode 2: genome of specific atlet
    if (atletId) {
      const { data: a, error: e1 } = await getSb()
        .from('atlet')
        .select('id, nama, nik, cabor, kontingen, jenis_kelamin, usia, tanggal_lahir')
        .eq('id', atletId)
        .single()
      if (e1) throw e1

      // Pull medali history
      const { data: medali } = await getSb()
        .from('kejuaraan_atlet')
        .select('medali, tanggal, kejuaraan')
        .eq('atlet_id', atletId)

      let emasCount = 0, perakCount = 0, perungguCount = 0
      for (const row of medali ?? []) {
        const m = String(row.medali ?? '').toLowerCase()
        if (m.includes('emas')) emasCount++
        else if (m.includes('perak')) perakCount++
        else if (m.includes('perunggu')) perungguCount++
      }
      const totalMedali = emasCount + perakCount + perungguCount

      // Compute consistency: based on medali / kejuaraan attended
      const uniqueKejuaraan = new Set((medali ?? []).map(m => m.kejuaraan)).size
      const consistency = uniqueKejuaraan > 0
        ? Math.min(100, Math.round((totalMedali / uniqueKejuaraan) * 100))
        : 0

      // Derive 6 attributes (synthesized from medali profile + biomotor if available)
      const { data: biomotor } = await getSb()
        .from('biomotor_atlet')
        .select('*')
        .eq('atlet_id', atletId)
        .single()
        .then(r => r, () => ({ data: null }))

      const attributes = [
        {
          label: 'Endurance',
          value: biomotor?.endurance_score ?? Math.min(100, 50 + emasCount * 8),
          max: 100,
          pctile: 60 + emasCount * 5,
        },
        {
          label: 'Strength',
          value: biomotor?.strength_score ?? Math.min(100, 45 + totalMedali * 5),
          max: 100,
          pctile: 55 + totalMedali * 3,
        },
        {
          label: 'Speed',
          value: biomotor?.speed_score ?? Math.min(100, 55 + emasCount * 7),
          max: 100,
          pctile: 60 + emasCount * 4,
        },
        {
          label: 'Agility',
          value: biomotor?.agility_score ?? Math.min(100, 50 + (totalMedali - perungguCount) * 6),
          max: 100,
          pctile: 50 + totalMedali * 3,
        },
        {
          label: 'Consistency',
          value: consistency,
          max: 100,
          pctile: consistency,
        },
        {
          label: 'Experience',
          value: Math.min(100, uniqueKejuaraan * 15),
          max: 100,
          pctile: Math.min(95, uniqueKejuaraan * 12),
        },
      ]

      return NextResponse.json({
        atlet: { ...a, usia: a.usia ?? computeUsia(a.tanggal_lahir) },
        attributes,
        totalMedali,
        emasCount,
        consistency,
      })
    }

    return NextResponse.json({ atlet: [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, atlet: [] }, { status: 200 })
  }
}

function computeUsia(tglLahir?: string | null): number | undefined {
  if (!tglLahir) return undefined
  const t = new Date(tglLahir).getTime()
  if (isNaN(t)) return undefined
  const diffMs = Date.now() - t
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))
}

