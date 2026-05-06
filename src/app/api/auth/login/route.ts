import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { username, password } = body

  if (!username || !password) {
    return NextResponse.json(
      { error: 'Username dan password wajib diisi' },
      { status: 400 }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { data, error } = await supabase
    .from('users')
    .select('id, username, nama, role, kontingen_id, cabor_id, is_active')
    .eq('username', username.trim().toLowerCase())
    .eq('password_hash', password)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Username atau password salah' },
      { status: 401 }
    )
  }

  if (!data.is_active) {
    return NextResponse.json(
      { error: 'Akun tidak aktif, hubungi admin' },
      { status: 403 }
    )
  }

  const sessionData = JSON.stringify({
    id: data.id,
    username: data.username,
    nama: data.nama,
    role: data.role,
    kontingen_id: data.kontingen_id ?? null,
    cabor_id: data.cabor_id ?? null,
  })

  const redirect =
    data.role === 'admin' ? '/dashboard' :
    data.role === 'konida' ? '/konida/dashboard' :
    '/operator/dashboard'

  const res = NextResponse.json({ ok: true, role: data.role, redirect })

  res.cookies.set('porprov_session', sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  return res
}