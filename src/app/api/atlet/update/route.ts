import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { atletJwtSecret } from '@/lib/atlet-jwt'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get('atlet_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { payload } = await jwtVerify(token, atletJwtSecret())
    const nik = payload.nik as string
    const body = await req.json()

    // Field yang boleh diupdate oleh atlet sendiri
    const allowed = ['ukuran_kemeja','ukuran_sepatu','nama_bank','no_rekening','is_public']
    const updates: Record<string, any> = {}
    allowed.forEach(f => { if (body[f] !== undefined) updates[f] = body[f] })

    if (Object.keys(updates).length === 0)
      return NextResponse.json({ error: 'Tidak ada field valid' }, { status: 400 })

    const { error } = await sb.from('atlet').update(updates).eq('no_ktp', nik)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
