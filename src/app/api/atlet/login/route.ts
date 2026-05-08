import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email dan password wajib diisi' },
      { status: 400 }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { data: account, error } = await supabase
    .from('atlet_accounts')
    .select('id, atlet_id, email, password_hash, is_active, is_public')
    .eq('email', email.trim().toLowerCase())
    .eq('password_hash', password)
    .single()

  if (error || !account) {
    return NextResponse.json(
      { error: 'Email atau password salah' },
      { status: 401 }
    )
  }

  if (!account.is_active) {
    return NextResponse.json(
      { error: 'Akun belum aktif — hubungi admin' },
      { status: 403 }
    )
  }

  // Ambil data atlet
  const { data: atlet } = await supabase
    .from('atlet')
    .select('id, nama_lengkap, no_ktp, kontingen_id, cabor_id, cabang_olahraga(nama), kontingen(nama)')
    .eq('id', account.atlet_id)
    .single()

  // Update last login
  await supabase
    .from('atlet_accounts')
    .update({ last_login: new Date().toISOString() })
    .eq('id', account.id)

  const sessionData = JSON.stringify({
    id: account.id,
    atlet_id: account.atlet_id,
    email: account.email,
    nama: (atlet as any)?.nama_lengkap,
    role: 'atlet',
    kontingen_id: (atlet as any)?.kontingen_id,
    cabor_id: (atlet as any)?.cabor_id,
    kontingen_nama: (atlet as any)?.kontingen?.nama,
    cabor_nama: (atlet as any)?.cabang_olahraga?.nama,
    is_public: account.is_public,
  })

  const res = NextResponse.json({
    ok: true,
    redirect: '/atlet/dashboard',
  })

  res.cookies.set('porprov_atlet_session', sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  return res
}