import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { atletJwtSecret } from '@/lib/atlet-jwt'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function getAtletId(req: NextRequest): Promise<string | null> {
  try {
    const token = req.cookies.get('atlet_token')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, atletJwtSecret())
    const { data } = await sb.from('atlet').select('id').eq('no_ktp', payload.nik as string).maybeSingle()
    return data?.id || null
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const atletId = await getAtletId(req)
  if (!atletId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await sb
    .from('riwayat_kejuaraan')
    .select('*')
    .eq('atlet_id', atletId)
    .order('tahun', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const atletId = await getAtletId(req)
  if (!atletId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const required = ['nama_kejuaraan','tingkat','tahun','nomor_lomba','hasil']
    for (const f of required) {
      if (!body[f]) return NextResponse.json({ error: `Field ${f} wajib diisi` }, { status: 400 })
    }

    const { data, error } = await sb.from('riwayat_kejuaraan').insert({
      atlet_id: atletId,
      nama_kejuaraan: body.nama_kejuaraan,
      penyelenggara: body.penyelenggara || null,
      tingkat: body.tingkat,
      tahun: parseInt(body.tahun),
      tanggal: body.tanggal || null,
      lokasi: body.lokasi || null,
      cabor: body.cabor || null,
      nomor_lomba: body.nomor_lomba,
      hasil: body.hasil,
      deskripsi: body.deskripsi || null,
      status: 'Menunggu KONIDA',
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
