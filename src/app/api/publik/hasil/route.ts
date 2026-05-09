import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cabor_id = searchParams.get('cabor_id')
  const kontingen_id = searchParams.get('kontingen_id')

  try {
    let query = sb()
      .from('hasil_pertandingan')
      .select(`
        id, medali, nilai, ranking, satuan_hasil,
        atlet(nama_lengkap, gender),
        kontingen(nama),
        nomor_pertandingan(nama, gender, cabang_olahraga(id, nama))
      `)
      .neq('medali', 'none')
      .order('medali')

    if (kontingen_id) query = query.eq('kontingen_id', parseInt(kontingen_id))

    const { data, error } = await query
    if (error) throw new Error(error.message)

    let result = data ?? []
    if (cabor_id) {
      result = result.filter((h: any) =>
        h.nomor_pertandingan?.cabang_olahraga?.id === parseInt(cabor_id)
      )
    }

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}