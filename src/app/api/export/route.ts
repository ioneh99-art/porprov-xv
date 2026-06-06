import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req, { limit: 15, windowMs: 60_000, key: 'export', scope: 'ip+user' })
  if (limited) return limited

  const { searchParams } = new URL(req.url)
  const kontingen_id = searchParams.get('kontingen_id')
  const status       = searchParams.get('status')
  const page         = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
  const limit        = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') ?? '100')))
  const from         = (page - 1) * limit
  const to           = from + limit - 1

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
      `, { count: 'exact' })
      .order('nama_lengkap')
      .range(from, to)

    if (kontingen_id) query = query.eq('kontingen_id', parseInt(kontingen_id))
    if (status) query = query.eq('status_registrasi', status)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json({
      data: data ?? [],
      meta: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}