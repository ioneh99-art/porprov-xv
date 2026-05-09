import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kontingen_id = searchParams.get('kontingen_id')
  const status = searchParams.get('status') // optional filter

  try {
    let query = sb()
      .from('atlet')
      .select(`
        id, no_ktp, nama_lengkap, gender, tgl_lahir,
        tempat_lahir, telepon, email, alamat, kota_kab,
        status_registrasi, status_kontingen, cabor_id,
        nama_bank, no_rekening, npwp, no_bpjs_kesehatan,
        ukuran_kemeja, ukuran_celana, ukuran_sepatu,
        cabang_olahraga(nama), kontingen(nama)
      `)
      .order('nama_lengkap')

    if (kontingen_id) query = query.eq('kontingen_id', parseInt(kontingen_id))
    if (status) query = query.eq('status_registrasi', status)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json(data ?? [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}