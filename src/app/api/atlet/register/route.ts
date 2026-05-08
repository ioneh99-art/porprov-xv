import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, password, no_ktp } = body

  if (!email || !password || !no_ktp) {
    return NextResponse.json(
      { error: 'Email, password, dan NIK wajib diisi' },
      { status: 400 }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // Cek apakah NIK terdaftar di sistem
  const { data: atlet, error: atletError } = await supabase
    .from('atlet')
    .select('id, nama_lengkap, no_ktp, kontingen_id, cabor_id')
    .eq('no_ktp', no_ktp.trim())
    .single()

  if (atletError || !atlet) {
    return NextResponse.json(
      { error: 'NIK tidak ditemukan — pastikan sudah terdaftar sebagai atlet PORPROV XV' },
      { status: 404 }
    )
  }

  // Cek apakah email sudah dipakai
  const { data: existing } = await supabase
    .from('atlet_accounts')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'Email sudah terdaftar' },
      { status: 409 }
    )
  }

  // Cek apakah atlet sudah punya akun
  const { data: existingAccount } = await supabase
    .from('atlet_accounts')
    .select('id')
    .eq('atlet_id', atlet.id)
    .single()

  if (existingAccount) {
    return NextResponse.json(
      { error: 'Atlet ini sudah memiliki akun — silakan login' },
      { status: 409 }
    )
  }

  // Buat akun
  const { error: insertError } = await supabase
    .from('atlet_accounts')
    .insert({
      atlet_id: atlet.id,
      email: email.trim().toLowerCase(),
      password_hash: password,
      is_active: true,
    })

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    message: 'Akun berhasil dibuat!',
    nama: atlet.nama_lengkap,
  })
}