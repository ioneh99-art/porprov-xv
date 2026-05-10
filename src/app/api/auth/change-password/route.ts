import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  const session = req.cookies.get('porprov_session')?.value

  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan — coba login ulang' }, { status: 401 })
  }

  let user: any
  try {
    user = JSON.parse(session)
  } catch {
    return NextResponse.json({ error: 'Sesi tidak valid — coba login ulang' }, { status: 401 })
  }

  if (!user?.id) {
    return NextResponse.json({ error: 'ID user tidak ditemukan' }, { status: 401 })
  }

  const body = await req.json()
  const { password_lama, password_baru } = body

  if (!password_lama || !password_baru)
    return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 })

  if (password_baru.length < 8)
    return NextResponse.json({ error: 'Password baru minimal 8 karakter' }, { status: 400 })

  // Ambil password hash saat ini
  const { data: userData, error } = await sb()
    .from('users')
    .select('password_hash')
    .eq('id', user.id)
    .single()

  if (error || !userData)
    return NextResponse.json({ error: 'User tidak ditemukan di database' }, { status: 404 })

  // Verifikasi password lama
  const valid = await bcrypt.compare(password_lama, userData.password_hash)
  if (!valid)
    return NextResponse.json({ error: 'Password lama tidak sesuai' }, { status: 400 })

  // Update password baru
  const password_hash = await bcrypt.hash(password_baru, 12)
  const { error: updateError } = await sb()
    .from('users')
    .update({ password_hash })
    .eq('id', user.id)

  if (updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}