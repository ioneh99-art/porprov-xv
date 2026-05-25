import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { no_ktp, email, password } = await req.json()

    if (!no_ktp || no_ktp.length !== 16)
      return NextResponse.json({ error: 'NIK harus 16 digit' }, { status: 400 })
    if (!password || password.length < 4)
      return NextResponse.json({ error: 'Password minimal 4 karakter' }, { status: 400 })

    const { data: atlet } = await sb
      .from('atlet')
      .select('id,nama_lengkap,status_registrasi,portal_aktif,atlet_password_hash,no_ktp')
      .eq('no_ktp', no_ktp)
      .maybeSingle()

    if (!atlet)
      return NextResponse.json({ error: 'NIK tidak terdaftar. Hubungi koordinator.' }, { status: 404 })
    if (!['Verified','Posted'].includes(atlet.status_registrasi))
      return NextResponse.json({ error: `Status kamu: "${atlet.status_registrasi}". Harus Verified dulu.` }, { status: 403 })

    const defaultPass = no_ktp.slice(-4)
    if (atlet.portal_aktif && atlet.atlet_password_hash !== defaultPass)
      return NextResponse.json({ error: 'Akun sudah terdaftar. Silakan login.' }, { status: 409 })

    await sb.from('atlet').update({
      atlet_password_hash: password,
      portal_aktif: true,
      email: email || null,
    }).eq('id', atlet.id)

    return NextResponse.json({ success: true, nama: atlet.nama_lengkap })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
