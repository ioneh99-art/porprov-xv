import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  const cabor_id = searchParams.get('cabor_id')
  const kontingen_id = searchParams.get('kontingen_id')

  if (q.length < 3 && !cabor_id && !kontingen_id) {
    return NextResponse.json([])
  }

  try {
    let query = sb()
      .from('atlet')
      .select(`
        id, nama_lengkap, gender, tgl_lahir, foto_url,
        status_registrasi, status_kontingen,
        cabang_olahraga(nama), kontingen(nama)
      `)
      .eq('is_posted', true)
      .order('nama_lengkap')
      .limit(50)

    if (q.length >= 3) query = query.ilike('nama_lengkap', `%${q}%`)
    if (cabor_id) query = query.eq('cabor_id', parseInt(cabor_id))
    if (kontingen_id) query = query.eq('kontingen_id', parseInt(kontingen_id))

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json(data ?? [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}