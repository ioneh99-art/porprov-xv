// src/app/api/atlet/auth/login/route.ts — FIXED v2
// Fix: id = integer, nama kolom sesuai schema real DB

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose'
import { atletJwtSecret } from '@/lib/atlet-jwt'
import { verifyAtletPassword } from '@/lib/atlet-password'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { nik, password } = await req.json()
    if (!nik || nik.length !== 16)
      return NextResponse.json({ error: 'NIK harus 16 digit' }, { status: 400 })
    if (!password)
      return NextResponse.json({ error: 'Password wajib diisi' }, { status: 400 })

    // Kolom sesuai schema real DB
    const { data: atlet, error } = await sb
      .from('atlet')
      .select(`
        id, nama_lengkap, no_ktp, cabor_nama_raw,
        status_registrasi, portal_aktif,
        atlet_password_hash, kontingen_id,
        gender, nama_asal_daerah,
        ukuran_kemeja, ukuran_sepatu,
        nama_bank, no_rekening, login_count
      `)
      .eq('no_ktp', nik)
      .maybeSingle()

    if (error) {
      console.error('DB error:', error)
      return NextResponse.json({ error: 'Database error: ' + error.message }, { status: 500 })
    }
    if (!atlet)
      return NextResponse.json({ error: 'NIK tidak terdaftar' }, { status: 401 })
    if (!atlet.portal_aktif)
      return NextResponse.json({ error: 'Akun belum aktif. Status pendaftaran belum Verified.' }, { status: 403 })
    const pwOk = await verifyAtletPassword(atlet.atlet_password_hash, password, async (h) => {
      await sb.from('atlet').update({ atlet_password_hash: h }).eq('id', atlet.id)
    })
    if (!pwOk)
      return NextResponse.json({ error: 'Password salah' }, { status: 401 })

    // Update last_login — id adalah integer
    await sb.from('atlet')
      .update({
        last_login:  new Date().toISOString(),
        login_count: (atlet.login_count || 0) + 1,
      })
      .eq('id', atlet.id)

    // JWT — simpan id sebagai number
    const token = await new SignJWT({
      atlet_id:  atlet.id,          // integer
      nik:       atlet.no_ktp,
      nama:      atlet.nama_lengkap,
      cabor:     atlet.cabor_nama_raw,
      kontingen: atlet.kontingen_id,
      role:      'atlet',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(atletJwtSecret())

    return NextResponse.json({
      token,
      redirect: '/atlet/dashboard',
      atlet: {
        nama:   atlet.nama_lengkap,
        cabor:  atlet.cabor_nama_raw,
        status: atlet.status_registrasi,
        gender: atlet.gender,
      }
    })

  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
