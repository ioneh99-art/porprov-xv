import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tanggal = searchParams.get('tanggal')
  const cabor_id = searchParams.get('cabor_id')
  const venue_id = searchParams.get('venue_id')
  const klaster_id = searchParams.get('klaster_id')

  try {
    let query = sb()
      .from('jadwal_pertandingan')
      .select(`
        id, tanggal, waktu_mulai, waktu_selesai, fase, status, keterangan,
        nomor_pertandingan(id, nama, gender, cabor_id, cabang_olahraga(id, nama, klaster_id)),
        venue(id, nama, alamat, klaster_id)
      `)
      .order('tanggal')
      .order('waktu_mulai')

    if (tanggal) query = query.eq('tanggal', tanggal)
    if (venue_id) query = query.eq('venue_id', parseInt(venue_id))

    const { data, error } = await query
    if (error) throw new Error(error.message)

    // Filter cabor & klaster
    let result = data ?? []
    if (cabor_id) {
      result = result.filter((j: any) =>
        j.nomor_pertandingan?.cabor_id === parseInt(cabor_id)
      )
    }
    if (klaster_id) {
      result = result.filter((j: any) =>
        j.venue?.klaster_id === parseInt(klaster_id)
      )
    }

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}