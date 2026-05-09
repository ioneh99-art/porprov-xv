import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kontingen_id = searchParams.get('kontingen_id')
  const atlet_id = searchParams.get('atlet_id')

  try {
    let query = sb()
      .from('atlet')
      .select(`
        id, no_ktp, nama_lengkap, gender, tgl_lahir,
        tempat_lahir, telepon, foto_url, status_registrasi,
        status_kontingen, cabor_id, kontingen_id,
        cabang_olahraga(nama, kode), kontingen(nama)
      `)
      .order('nama_lengkap')

    if (atlet_id) {
      query = query.eq('id', parseInt(atlet_id))
    } else if (kontingen_id) {
      query = query.eq('kontingen_id', parseInt(kontingen_id))
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json(data ?? [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}